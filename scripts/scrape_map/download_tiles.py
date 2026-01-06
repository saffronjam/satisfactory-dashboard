#!/usr/bin/env python3
"""
Download map tiles from Satisfactory Calculator.

This script downloads map tiles at various zoom levels from the
satisfactory-calculator.com static image server.
"""

import argparse
import os
import signal
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Tuple

import requests
from requests.exceptions import RequestException, Timeout, ConnectionError


class ColoredLogger:
    """Simple colored logger for terminal output."""

    # ANSI color codes
    RESET = "\033[0m"
    BOLD = "\033[1m"

    # Regular colors
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"

    # Bright colors
    BRIGHT_BLACK = "\033[90m"
    BRIGHT_RED = "\033[91m"
    BRIGHT_MAGENTA = "\033[95m"

    # Lock for thread-safe printing
    _lock = threading.Lock()

    @classmethod
    def info(cls, message: str):
        """Print info message in cyan."""
        with cls._lock:
            print(f"{cls.CYAN}{message}{cls.RESET}")

    @classmethod
    def success(cls, message: str):
        """Print success message in green."""
        with cls._lock:
            print(f"{cls.GREEN}{message}{cls.RESET}")

    @classmethod
    def warning(cls, message: str):
        """Print warning message in yellow."""
        with cls._lock:
            print(f"{cls.YELLOW}WARNING: {message}{cls.RESET}")

    @classmethod
    def error(cls, message: str):
        """Print error message in red."""
        with cls._lock:
            print(f"{cls.BRIGHT_RED}ERROR: {message}{cls.RESET}")

    @classmethod
    def progress(cls, current: int, total: int, filename: str, status: str, detail: str = ""):
        """Print progress with colored counter and filename."""
        counter = f"{cls.BRIGHT_MAGENTA}[{current}/{total}]{cls.RESET}"
        name = f"{cls.BOLD}{cls.WHITE}{filename}{cls.RESET}"

        if status == "downloaded":
            status_str = f"{cls.GREEN}downloaded{cls.RESET}"
        elif status == "skipped":
            status_str = f"{cls.BRIGHT_BLACK}skipped (exists){cls.RESET}"
        elif status == "failed":
            status_str = f"{cls.BRIGHT_RED}FAILED{cls.RESET}"
        else:
            status_str = status

        if detail:
            detail_str = f" {cls.BRIGHT_BLACK}- {detail}{cls.RESET}"
        else:
            detail_str = ""

        with cls._lock:
            print(f"  {counter} {name} {status_str}{detail_str}")

    @classmethod
    def plain(cls, message: str):
        """Print plain message without color."""
        with cls._lock:
            print(message)


class TileDownloader:
    """Downloads map tiles from satisfactory-calculator.com."""

    BASE_URL = "https://static.satisfactory-calculator.com/imgMap"
    DEFAULT_ZOOM_LEVELS = [3, 4, 5, 6, 7, 8]

    def __init__(
        self,
        layer: str = "gameLayer",
        version: str = "1763022054",
        output_dir: str = "output/tiles",
        delay: float = 0.1,
        timeout: int = 30,
        retries: int = 3,
        zoom_levels: List[int] = None,
        parallel: int = 1,
    ):
        self.layer = layer
        self.version = version
        self.output_dir = output_dir
        self.delay = delay
        self.timeout = timeout
        self.retries = retries
        self.zoom_levels = zoom_levels or self.DEFAULT_ZOOM_LEVELS
        self.parallel = parallel
        self.interrupted = False
        self.stats = {"downloaded": 0, "skipped": 0, "failed": 0}
        self.stats_lock = threading.Lock()
        self.failures: List[dict] = []
        self.failures_lock = threading.Lock()
        self.progress_counter = 0
        self.progress_lock = threading.Lock()

        # Set up signal handler for graceful Ctrl+C
        signal.signal(signal.SIGINT, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle Ctrl+C gracefully."""
        if self.interrupted:
            ColoredLogger.error("\nForce quit!")
            os._exit(1)  # Force exit when using threads
        self.interrupted = True
        ColoredLogger.warning("\nInterrupted! Finishing current downloads... (Ctrl+C again to force quit)")

    @staticmethod
    def get_dimensions(zoom: int) -> int:
        """
        Get the tile grid dimensions for a given zoom level.

        The dimensions are calculated as 5 * 2^(zoom - 3).

        Args:
            zoom: The zoom level (must be >= 3).

        Returns:
            The grid dimension (number of tiles per axis).

        Raises:
            ValueError: If zoom level is less than 3.
        """
        if zoom < 3:
            raise ValueError("Zoom level must be 3 or higher.")
        return 5 * 2 ** (zoom - 3)

    def get_tile_urls(self, zoom: int) -> List[Tuple[str, str, str]]:
        """
        Generate tile URLs for a given zoom level.

        Args:
            zoom: The zoom level.

        Returns:
            List of tuples (url, flat_filepath, filename).
        """
        dimensions = self.get_dimensions(zoom)
        tiles = []

        for y in range(dimensions):
            for x in range(dimensions):
                url = f"{self.BASE_URL}/{self.layer}/Stable/{zoom}/{x}/{y}.png?v={self.version}"
                filename = f"{zoom}_{x}_{y}.png"
                filepath = os.path.join(self.output_dir, filename)
                tiles.append((url, filepath, filename))

        return tiles

    def get_organized_path(self, filename: str) -> str:
        """
        Get the organized folder path for a tile.

        Args:
            filename: Flat filename like "3_0_0.png"

        Returns:
            Organized path like "output/tiles/3/0/0.png"
        """
        # Parse zoom_x_y.png -> zoom/x/y.png
        name = filename.rsplit('.', 1)[0]  # Remove .png
        parts = name.split('_')
        if len(parts) == 3:
            zoom, x, y = parts
            return os.path.join(self.output_dir, zoom, x, f"{y}.png")
        return os.path.join(self.output_dir, filename)

    def tile_exists(self, flat_filepath: str, filename: str) -> bool:
        """
        Check if tile exists in either flat or organized structure.

        Args:
            flat_filepath: Path like "output/tiles/3_0_0.png"
            filename: Filename like "3_0_0.png"

        Returns:
            True if file exists in either location.
        """
        # Check flat structure first
        if os.path.exists(flat_filepath):
            return True
        # Check organized folder structure
        organized_path = self.get_organized_path(filename)
        return os.path.exists(organized_path)

    def _increment_progress(self) -> int:
        """Thread-safe progress counter increment."""
        with self.progress_lock:
            self.progress_counter += 1
            return self.progress_counter

    def _increment_stat(self, stat: str):
        """Thread-safe stats increment."""
        with self.stats_lock:
            self.stats[stat] += 1

    def _add_failure(self, failure: dict):
        """Thread-safe failure tracking."""
        with self.failures_lock:
            self.failures.append(failure)

    def download_tile(self, url: str, filepath: str, filename: str, total: int) -> bool:
        """
        Download a single tile with retries and detailed error reporting.

        Args:
            url: The tile URL.
            filepath: The local file path to save to.
            filename: The filename (for display).
            total: Total tiles (for progress).

        Returns:
            True if download succeeded, False otherwise.
        """
        if self.interrupted:
            return False

        current = self._increment_progress()
        last_error = None

        for attempt in range(1, self.retries + 1):
            if self.interrupted:
                return False

            try:
                response = requests.get(url, timeout=self.timeout)

                if response.status_code == 200:
                    with open(filepath, "wb") as f:
                        f.write(response.content)
                    ColoredLogger.progress(current, total, filename, "downloaded")
                    self._increment_stat("downloaded")
                    return True

                elif response.status_code == 404:
                    last_error = "HTTP 404 - Tile not found"
                    break  # Don't retry 404s

                elif response.status_code == 403:
                    last_error = "HTTP 403 - Access forbidden"
                    break  # Don't retry 403s

                elif response.status_code == 429:
                    wait_time = 5 * attempt
                    last_error = f"HTTP 429 - Rate limited, waiting {wait_time}s"
                    ColoredLogger.warning(f"    Rate limited on {filename}, waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue

                elif response.status_code >= 500:
                    last_error = f"HTTP {response.status_code} - Server error"
                    if attempt < self.retries:
                        time.sleep(2 * attempt)
                        continue

                else:
                    last_error = f"HTTP {response.status_code} - Unexpected status"

            except Timeout:
                last_error = f"Timeout after {self.timeout}s"
                if attempt < self.retries:
                    continue

            except ConnectionError as e:
                last_error = f"Connection error: {str(e)[:50]}"
                if attempt < self.retries:
                    time.sleep(2)
                    continue

            except RequestException as e:
                last_error = f"Request error: {str(e)[:50]}"

            except IOError as e:
                last_error = f"File write error: {str(e)[:50]}"
                break  # Don't retry file errors

        # If we get here, all retries failed
        ColoredLogger.progress(current, total, filename, "failed", last_error)
        self._increment_stat("failed")
        self._add_failure({"name": filename, "url": url, "error": last_error})
        return False

    def run(self, force: bool = False) -> int:
        """
        Download all tiles for configured zoom levels.

        Args:
            force: If True, re-download tiles even if they exist.

        Returns:
            Exit code (0 for success, 1 for failures).
        """
        # Create output directory
        os.makedirs(self.output_dir, exist_ok=True)

        # Calculate total tiles
        all_tiles = []
        for zoom in self.zoom_levels:
            all_tiles.extend(self.get_tile_urls(zoom))

        total = len(all_tiles)

        ColoredLogger.info(f"Downloading {total} tiles to {self.output_dir}/")
        ColoredLogger.plain(f"  Layer: {self.layer}")
        ColoredLogger.plain(f"  Version: {self.version}")
        ColoredLogger.plain(f"  Zoom levels: {', '.join(map(str, self.zoom_levels))}")
        ColoredLogger.plain(f"  Parallel workers: {self.parallel}\n")

        # Filter tiles to download
        tiles_to_download = []
        for url, filepath, filename in all_tiles:
            if self.interrupted:
                break

            # Skip if already exists in either flat or organized structure (unless force mode)
            if not force and self.tile_exists(filepath, filename):
                current = self._increment_progress()
                ColoredLogger.progress(current, total, filename, "skipped")
                self._increment_stat("skipped")
                continue

            tiles_to_download.append((url, filepath, filename))

        if not tiles_to_download:
            ColoredLogger.info("All tiles already downloaded!")

        # Download tiles (parallel or sequential)
        if tiles_to_download:
            if self.parallel > 1:
                self._download_parallel(tiles_to_download, total)
            else:
                self._download_sequential(tiles_to_download, total)

        # Print summary
        self._print_summary()

        # Organize tiles into folder structure
        if not self.interrupted:
            self.organize_tiles()

        return 0 if self.stats["failed"] == 0 else 1

    def _download_sequential(self, tiles: List[Tuple[str, str, str]], total: int):
        """Download tiles sequentially."""
        for url, filepath, filename in tiles:
            if self.interrupted:
                break

            self.download_tile(url, filepath, filename, total)

            # Rate limiting between downloads
            if not self.interrupted:
                time.sleep(self.delay)

    def _download_parallel(self, tiles: List[Tuple[str, str, str]], total: int):
        """Download tiles in parallel using thread pool."""
        with ThreadPoolExecutor(max_workers=self.parallel) as executor:
            # Submit all download tasks
            futures = {
                executor.submit(self.download_tile, url, filepath, filename, total): filename
                for url, filepath, filename in tiles
            }

            # Wait for completion
            try:
                for future in as_completed(futures):
                    if self.interrupted:
                        # Cancel pending futures
                        for f in futures:
                            f.cancel()
                        break
                    # Get result to propagate any exceptions
                    try:
                        future.result()
                    except Exception as e:
                        filename = futures[future]
                        ColoredLogger.error(f"Unexpected error downloading {filename}: {e}")
            except KeyboardInterrupt:
                # Additional safety for Ctrl+C during parallel execution
                self.interrupted = True
                for f in futures:
                    f.cancel()

    def organize_tiles(self):
        """
        Organize flat tiles into folder structure.

        Moves files from zoom_x_y.png to zoom/x/y.png
        """
        ColoredLogger.info("\nOrganizing tiles into folders...")

        # Find all flat tile files
        flat_files = []
        try:
            for filename in os.listdir(self.output_dir):
                if filename.endswith('.png') and '_' in filename:
                    # Check if it matches zoom_x_y.png pattern
                    name = filename.rsplit('.', 1)[0]
                    parts = name.split('_')
                    if len(parts) == 3 and all(p.isdigit() for p in parts):
                        flat_files.append(filename)
        except OSError as e:
            ColoredLogger.error(f"Failed to list directory: {e}")
            return

        if not flat_files:
            ColoredLogger.plain("  No flat tiles to organize.")
            return

        moved = 0
        for filename in flat_files:
            if self.interrupted:
                break

            flat_path = os.path.join(self.output_dir, filename)
            organized_path = self.get_organized_path(filename)

            # Create parent directories
            os.makedirs(os.path.dirname(organized_path), exist_ok=True)

            try:
                os.rename(flat_path, organized_path)
                moved += 1
            except OSError as e:
                ColoredLogger.warning(f"Failed to move {filename}: {e}")

        ColoredLogger.success(f"  Organized {moved} tiles into folder structure.")

    def _print_summary(self):
        """Print download summary."""
        print()
        ColoredLogger.plain("=" * 50)
        ColoredLogger.plain("Download Summary")
        ColoredLogger.plain("=" * 50)
        ColoredLogger.success(f"  Downloaded: {self.stats['downloaded']}")
        ColoredLogger.plain(f"  Skipped:    {self.stats['skipped']}")
        if self.stats["failed"] > 0:
            ColoredLogger.error(f"  Failed:     {self.stats['failed']}")
            print()
            ColoredLogger.warning("Failed downloads:")
            for fail in self.failures[:10]:  # Show first 10 failures
                print(f"  - {fail['name']}")
                print(f"    {ColoredLogger.BRIGHT_BLACK}{fail['error']}{ColoredLogger.RESET}")
            if len(self.failures) > 10:
                print(f"  ... and {len(self.failures) - 10} more")
        ColoredLogger.plain("=" * 50)


def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Download map tiles from Satisfactory Calculator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python download_tiles.py                         # Download to output/<version>/game/
  python download_tiles.py -j 10                   # Download with 10 parallel workers
  python download_tiles.py --force                 # Re-download all tiles
  python download_tiles.py --layer realisticLayer  # Download to output/<version>/realistic/
  python download_tiles.py --zoom-levels 3 4 5     # Only specific zoom levels
  python download_tiles.py --output ./my-tiles     # Custom output directory

Default zoom levels: 3, 4, 5, 6, 7, 8
Default output: output/<version>/<game|realistic>/
        """,
    )

    parser.add_argument(
        "-j", "--parallel",
        type=int,
        default=1,
        metavar="N",
        help="Number of parallel downloads (default: 1)",
    )

    parser.add_argument(
        "--layer",
        type=str,
        choices=["gameLayer", "realisticLayer"],
        default="gameLayer",
        help="Map layer to download (default: gameLayer)",
    )

    parser.add_argument(
        "--version",
        type=str,
        default="1763022054",
        help="Map version string (default: 1763022054)",
    )

    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output directory for tiles (default: output/<version>/<layer>)",
    )

    parser.add_argument(
        "--zoom-levels",
        type=int,
        nargs="+",
        default=TileDownloader.DEFAULT_ZOOM_LEVELS,
        help="List of zoom levels to download (default: 3 4 5 6 7 8)",
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=0.1,
        help="Delay between downloads in seconds (default: 0.1, ignored with -j > 1)",
    )

    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Request timeout in seconds (default: 30)",
    )

    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="Number of retry attempts for failed downloads (default: 3)",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download all tiles even if they exist",
    )

    args = parser.parse_args()

    # Validate zoom levels
    for zoom in args.zoom_levels:
        if zoom < 3:
            ColoredLogger.error(f"Invalid zoom level: {zoom}. Zoom must be >= 3.")
            return 1

    # Validate parallel count
    if args.parallel < 1:
        ColoredLogger.error(f"Invalid parallel count: {args.parallel}. Must be >= 1.")
        return 1

    # Default output directory: output/<version>/<layer>
    # Map layer names to shorter folder names
    layer_folder = {
        "gameLayer": "game",
        "realisticLayer": "realistic",
    }.get(args.layer, args.layer)

    output_dir = args.output
    if output_dir is None:
        output_dir = os.path.join("output", args.version, layer_folder)

    downloader = TileDownloader(
        layer=args.layer,
        version=args.version,
        output_dir=output_dir,
        delay=args.delay,
        timeout=args.timeout,
        retries=args.retries,
        zoom_levels=args.zoom_levels,
        parallel=args.parallel,
    )

    return downloader.run(force=args.force)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        # Backup handler in case signal handler doesn't catch it
        print()
        ColoredLogger.warning("Interrupted by user (Ctrl+C)")
        ColoredLogger.plain("Exiting gracefully...")
        sys.exit(130)
