#!/usr/bin/env python3
"""
Download images from image_source.json manifest.
"""

import json
import os
import sys
import time
import signal
import argparse
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError


class ColoredLogger:
    """Simple colored logger for terminal output."""

    COLORS = {
        "reset": "\033[0m",
        "bold": "\033[1m",
        "dim": "\033[90m",
        "red": "\033[91m",
        "green": "\033[92m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "magenta": "\033[95m",
        "cyan": "\033[96m",
        "white": "\033[37m",
    }

    @classmethod
    def info(cls, msg: str):
        print(f"{cls.COLORS['cyan']}{msg}{cls.COLORS['reset']}")

    @classmethod
    def success(cls, msg: str):
        print(f"{cls.COLORS['green']}{msg}{cls.COLORS['reset']}")

    @classmethod
    def warning(cls, msg: str):
        print(f"{cls.COLORS['yellow']}{msg}{cls.COLORS['reset']}")

    @classmethod
    def error(cls, msg: str):
        print(f"{cls.COLORS['red']}{msg}{cls.COLORS['reset']}")

    @classmethod
    def progress(cls, current: int, total: int, filename: str, status: str, detail: str = ""):
        """Print progress with colored counter and filename."""
        counter = f"{cls.COLORS['magenta']}[{current}/{total}]{cls.COLORS['reset']}"
        name = f"{cls.COLORS['bold']}{cls.COLORS['white']}{filename}{cls.COLORS['reset']}"

        if status == "downloaded":
            status_str = f"{cls.COLORS['green']}downloaded{cls.COLORS['reset']}"
        elif status == "skipped":
            status_str = f"{cls.COLORS['dim']}skipped (exists){cls.COLORS['reset']}"
        elif status == "skipped_format":
            status_str = f"{cls.COLORS['dim']}skipped (not PNG){cls.COLORS['reset']}"
        elif status == "failed":
            status_str = f"{cls.COLORS['red']}FAILED{cls.COLORS['reset']}"
        else:
            status_str = status

        if detail:
            detail_str = f" {cls.COLORS['dim']}- {detail}{cls.COLORS['reset']}"
        else:
            detail_str = ""

        print(f"  {counter} {name} {status_str}{detail_str}")


class ImageDownloader:
    """Downloads images from manifest with retry and rate limiting."""

    def __init__(self, delay: float = 0.3, timeout: int = 30, retries: int = 3):
        self.delay = delay
        self.timeout = timeout
        self.retries = retries
        self.interrupted = False
        self.stats = {"downloaded": 0, "skipped": 0, "skipped_format": 0, "failed": 0}
        self.failures = []  # Track failed downloads for summary

        # Set up signal handler for graceful Ctrl+C
        signal.signal(signal.SIGINT, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle Ctrl+C gracefully."""
        if self.interrupted:
            ColoredLogger.error("\nForce quit!")
            sys.exit(1)
        self.interrupted = True
        ColoredLogger.warning("\nInterrupted! Finishing current download... (Ctrl+C again to force quit)")

    def download_image(self, url: str, filepath: str, filename: str, current: int, total: int) -> bool:
        """Download a single image with retries and detailed error reporting."""
        last_error = None

        for attempt in range(1, self.retries + 1):
            try:
                response = requests.get(url, timeout=self.timeout)

                if response.status_code == 200:
                    with open(filepath, "wb") as f:
                        f.write(response.content)
                    ColoredLogger.progress(current, total, filename, "downloaded")
                    self.stats["downloaded"] += 1
                    return True

                elif response.status_code == 404:
                    last_error = "HTTP 404 - Image not found on wiki"
                    break  # Don't retry 404s

                elif response.status_code == 403:
                    last_error = "HTTP 403 - Access forbidden"
                    break  # Don't retry 403s

                elif response.status_code == 429:
                    wait_time = 5 * attempt
                    last_error = f"HTTP 429 - Rate limited, waiting {wait_time}s"
                    ColoredLogger.warning(f"    Rate limited, waiting {wait_time}s before retry...")
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
        self.stats["failed"] += 1
        self.failures.append({"name": filename, "url": url, "error": last_error})
        return False

    def run(self, manifest_path: str, output_dir: str, force: bool = False):
        """Download all images from the manifest."""
        if not os.path.exists(manifest_path):
            ColoredLogger.error(f"Manifest not found: {manifest_path}")
            ColoredLogger.info("Run 'make run' first to generate the manifest.")
            sys.exit(1)

        os.makedirs(output_dir, exist_ok=True)

        with open(manifest_path, "r", encoding="utf-8") as f:
            images = json.load(f)

        total = len(images)
        ColoredLogger.info(f"Downloading {total} images to {output_dir}/\n")

        for i, image in enumerate(images, 1):
            if self.interrupted:
                break

            name = image["name"]
            url = image["url"]
            filepath = os.path.join(output_dir, name)

            # Skip non-PNG files
            if not name.lower().endswith(".png"):
                ColoredLogger.progress(i, total, name, "skipped_format")
                self.stats["skipped_format"] += 1
                continue

            # Skip if already exists (unless force mode)
            if not force and os.path.exists(filepath):
                ColoredLogger.progress(i, total, name, "skipped")
                self.stats["skipped"] += 1
                continue

            self.download_image(url, filepath, name, i, total)

            # Rate limiting between downloads
            if i < total and not self.interrupted:
                time.sleep(self.delay)

        # Print summary
        self._print_summary()

    def _print_summary(self):
        """Print download summary."""
        print()
        ColoredLogger.info("=" * 50)
        ColoredLogger.info("Download Summary")
        ColoredLogger.info("=" * 50)
        ColoredLogger.success(f"  Downloaded:   {self.stats['downloaded']}")
        print(f"  Skipped:      {self.stats['skipped']}")
        print(f"  Non-PNG:      {self.stats['skipped_format']}")
        if self.stats["failed"] > 0:
            ColoredLogger.error(f"  Failed:       {self.stats['failed']}")
            print()
            ColoredLogger.warning("Failed downloads:")
            for fail in self.failures[:10]:  # Show first 10 failures
                print(f"  - {fail['name']}")
                print(f"    {ColoredLogger.COLORS['dim']}{fail['error']}{ColoredLogger.COLORS['reset']}")
            if len(self.failures) > 10:
                print(f"  ... and {len(self.failures) - 10} more")
        ColoredLogger.info("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="Download images from image_source.json manifest",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python download_images.py              # Download all images
  python download_images.py --force      # Re-download all images
  python download_images.py --delay 1.0  # Slower downloads (rate limiting)
        """,
    )
    parser.add_argument(
        "--manifest",
        default="image_source.json",
        help="Path to manifest JSON file (default: image_source.json)",
    )
    parser.add_argument(
        "--output",
        default="output/original",
        help="Output directory for images (default: output/original)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.3,
        help="Delay between downloads in seconds (default: 0.3)",
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
        help="Re-download all images even if they exist",
    )

    args = parser.parse_args()

    downloader = ImageDownloader(
        delay=args.delay,
        timeout=args.timeout,
        retries=args.retries,
    )
    downloader.run(args.manifest, args.output, force=args.force)


if __name__ == "__main__":
    main()
