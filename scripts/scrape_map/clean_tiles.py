#!/usr/bin/env python3
"""
Clean map tiles by replacing background colors with transparency.

This script processes PNG tiles and replaces a specified background color
with transparency, making them suitable for map overlays.
"""

import argparse
import os
import signal
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Tuple

from PIL import Image


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

        if status == "cleaned":
            status_str = f"{cls.GREEN}cleaned{cls.RESET}"
        elif status == "skipped":
            status_str = f"{cls.BRIGHT_BLACK}skipped (no changes){cls.RESET}"
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


class TileCleaner:
    """Cleans map tiles by replacing background colors with transparency."""

    DEFAULT_BG_COLOR = (221, 221, 221)  # Light gray background

    def __init__(
        self,
        input_dir: str = "output",
        bg_color: Tuple[int, int, int] = None,
        parallel: int = 1,
    ):
        self.input_dir = input_dir
        self.bg_color = bg_color or self.DEFAULT_BG_COLOR
        self.parallel = parallel
        self.interrupted = False
        self.stats = {"cleaned": 0, "skipped": 0, "failed": 0}
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
            os._exit(1)
        self.interrupted = True
        ColoredLogger.warning("\nInterrupted! Finishing current processing... (Ctrl+C again to force quit)")

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

    def find_tiles(self) -> List[str]:
        """
        Find all PNG tiles in the input directory.

        Returns:
            List of file paths to PNG files.
        """
        tiles = []
        for root, _, files in os.walk(self.input_dir):
            for file in files:
                if file.endswith(".png"):
                    tiles.append(os.path.join(root, file))
        return sorted(tiles)

    def clean_tile(self, filepath: str, total: int) -> bool:
        """
        Clean a single tile by replacing background color with transparency.

        Args:
            filepath: Path to the tile file.
            total: Total tiles (for progress).

        Returns:
            True if tile was modified, False otherwise.
        """
        if self.interrupted:
            return False

        current = self._increment_progress()
        filename = os.path.relpath(filepath, self.input_dir)

        try:
            img = Image.open(filepath)
            img = img.convert("RGBA")
            data = img.getdata()

            # Replace background color with transparency
            new_data = []
            pixels_changed = 0
            for item in data:
                if (item[0], item[1], item[2]) == self.bg_color:
                    new_data.append((255, 255, 255, 0))
                    pixels_changed += 1
                else:
                    new_data.append(item)

            if pixels_changed > 0:
                img.putdata(new_data)
                img.save(filepath, "PNG")
                ColoredLogger.progress(current, total, filename, "cleaned", f"{pixels_changed} pixels")
                self._increment_stat("cleaned")
                return True
            else:
                ColoredLogger.progress(current, total, filename, "skipped")
                self._increment_stat("skipped")
                return False

        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)[:50]}"
            ColoredLogger.progress(current, total, filename, "failed", error_msg)
            self._increment_stat("failed")
            self._add_failure({"name": filename, "error": error_msg})
            return False

    def run(self) -> int:
        """
        Clean all tiles in the input directory.

        Returns:
            Exit code (0 for success, 1 for failures).
        """
        # Validate input directory
        if not os.path.exists(self.input_dir):
            ColoredLogger.error(f"Input directory not found: {self.input_dir}")
            ColoredLogger.info("Run 'make download' first to download tiles.")
            return 1

        # Find all tiles
        tiles = self.find_tiles()
        if not tiles:
            ColoredLogger.error(f"No PNG files found in {self.input_dir}")
            return 1

        total = len(tiles)
        r, g, b = self.bg_color

        ColoredLogger.info(f"Cleaning {total} tiles in {self.input_dir}/")
        ColoredLogger.plain(f"  Background color: RGB({r}, {g}, {b})")
        ColoredLogger.plain(f"  Parallel workers: {self.parallel}\n")

        # Process tiles (parallel or sequential)
        if self.parallel > 1:
            self._clean_parallel(tiles, total)
        else:
            self._clean_sequential(tiles, total)

        # Print summary
        self._print_summary()

        return 0 if self.stats["failed"] == 0 else 1

    def _clean_sequential(self, tiles: List[str], total: int):
        """Clean tiles sequentially."""
        for filepath in tiles:
            if self.interrupted:
                break
            self.clean_tile(filepath, total)

    def _clean_parallel(self, tiles: List[str], total: int):
        """Clean tiles in parallel using thread pool."""
        with ThreadPoolExecutor(max_workers=self.parallel) as executor:
            futures = {
                executor.submit(self.clean_tile, filepath, total): filepath
                for filepath in tiles
            }

            try:
                for future in as_completed(futures):
                    if self.interrupted:
                        for f in futures:
                            f.cancel()
                        break
                    try:
                        future.result()
                    except Exception as e:
                        filepath = futures[future]
                        ColoredLogger.error(f"Unexpected error processing {filepath}: {e}")
            except KeyboardInterrupt:
                self.interrupted = True
                for f in futures:
                    f.cancel()

    def _print_summary(self):
        """Print cleaning summary."""
        print()
        ColoredLogger.plain("=" * 50)
        ColoredLogger.plain("Cleaning Summary")
        ColoredLogger.plain("=" * 50)
        ColoredLogger.success(f"  Cleaned: {self.stats['cleaned']}")
        ColoredLogger.plain(f"  Skipped: {self.stats['skipped']}")
        if self.stats["failed"] > 0:
            ColoredLogger.error(f"  Failed:  {self.stats['failed']}")
            print()
            ColoredLogger.warning("Failed files:")
            for fail in self.failures[:10]:
                print(f"  - {fail['name']}")
                print(f"    {ColoredLogger.BRIGHT_BLACK}{fail['error']}{ColoredLogger.RESET}")
            if len(self.failures) > 10:
                print(f"  ... and {len(self.failures) - 10} more")
        ColoredLogger.plain("=" * 50)


def parse_color(color_str: str) -> Tuple[int, int, int]:
    """
    Parse a color string into RGB tuple.

    Args:
        color_str: Color in format "R,G,B" (e.g., "221,221,221")

    Returns:
        Tuple of (R, G, B) integers.

    Raises:
        argparse.ArgumentTypeError: If format is invalid.
    """
    try:
        parts = color_str.split(",")
        if len(parts) != 3:
            raise ValueError("Expected 3 components")
        r, g, b = int(parts[0]), int(parts[1]), int(parts[2])
        if not all(0 <= c <= 255 for c in (r, g, b)):
            raise ValueError("Values must be 0-255")
        return (r, g, b)
    except ValueError as e:
        raise argparse.ArgumentTypeError(f"Invalid color format: {e}. Use 'R,G,B' (e.g., '221,221,221')")


def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Clean map tiles by replacing background colors with transparency",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python clean_tiles.py                      # Clean all tiles in output/
  python clean_tiles.py -j 10                # Clean with 10 parallel workers
  python clean_tiles.py --color 200,200,200  # Replace different background color
  python clean_tiles.py --input output/1763022054/game  # Specific directory

Default background color: RGB(221, 221, 221) - light gray
        """,
    )

    parser.add_argument(
        "-j", "--parallel",
        type=int,
        default=1,
        metavar="N",
        help="Number of parallel workers (default: 1)",
    )

    parser.add_argument(
        "--input",
        type=str,
        default="output",
        help="Input directory containing tiles (default: output)",
    )

    parser.add_argument(
        "--color",
        type=parse_color,
        default=TileCleaner.DEFAULT_BG_COLOR,
        metavar="R,G,B",
        help="Background color to replace (default: 221,221,221)",
    )

    args = parser.parse_args()

    # Validate parallel count
    if args.parallel < 1:
        ColoredLogger.error(f"Invalid parallel count: {args.parallel}. Must be >= 1.")
        return 1

    cleaner = TileCleaner(
        input_dir=args.input,
        bg_color=args.color,
        parallel=args.parallel,
    )

    return cleaner.run()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        ColoredLogger.warning("Interrupted by user (Ctrl+C)")
        ColoredLogger.plain("Exiting gracefully...")
        sys.exit(130)
