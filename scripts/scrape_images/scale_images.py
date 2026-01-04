#!/usr/bin/env python3
"""
Scale images from output/original to multiple resolutions.

This script reads images from the original directory and creates scaled versions
at various resolutions (16x16, 32x32, 64x64, 128x128, 256x256, 512x512).
"""

import argparse
import os
import signal
import sys
from pathlib import Path
from typing import List

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

    @staticmethod
    def info(message: str):
        """Print info message in cyan."""
        print(f"{ColoredLogger.CYAN}{message}{ColoredLogger.RESET}")

    @staticmethod
    def success(message: str):
        """Print success message in green."""
        print(f"{ColoredLogger.GREEN}✓ {message}{ColoredLogger.RESET}")

    @staticmethod
    def warning(message: str):
        """Print warning message in yellow."""
        print(f"{ColoredLogger.YELLOW}⚠ WARNING: {message}{ColoredLogger.RESET}")

    @staticmethod
    def error(message: str):
        """Print error message in red."""
        print(f"{ColoredLogger.BRIGHT_RED}✗ ERROR: {message}{ColoredLogger.RESET}")

    @staticmethod
    def filename(name: str) -> str:
        """Format filename in bold white."""
        return f"{ColoredLogger.BOLD}{ColoredLogger.WHITE}{name}{ColoredLogger.RESET}"

    @staticmethod
    def progress(current: int, total: int) -> str:
        """Format progress indicator in bright magenta."""
        return f"{ColoredLogger.BRIGHT_MAGENTA}[{current}/{total}]{ColoredLogger.RESET}"

    @staticmethod
    def status_scaled() -> str:
        """Format scaled status in green."""
        return f"{ColoredLogger.GREEN}scaled{ColoredLogger.RESET}"

    @staticmethod
    def status_skipped() -> str:
        """Format skipped status in bright black (gray)."""
        return f"{ColoredLogger.BRIGHT_BLACK}skipped (exists){ColoredLogger.RESET}"

    @staticmethod
    def status_failed() -> str:
        """Format failed status in red."""
        return f"{ColoredLogger.BRIGHT_RED}FAILED{ColoredLogger.RESET}"

    @staticmethod
    def plain(message: str):
        """Print plain message without color."""
        print(message)


class ImageScaler:
    """Scaler for creating multiple resolution versions of images."""

    DEFAULT_SCALES = [16, 32, 64, 128, 256, 512]

    def __init__(
        self,
        input_dir: str,
        output_dir: str,
        scales: List[int] = None,
        force: bool = False,
    ):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.scales = scales or self.DEFAULT_SCALES
        self.force = force
        self.interrupted = False
        self.stats = {
            "processed": 0,
            "skipped": 0,
            "failed": 0,
            "total_scaled": 0,
        }
        self.failures: List[dict] = []

        # Set up signal handler for graceful Ctrl+C
        signal.signal(signal.SIGINT, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle Ctrl+C gracefully."""
        if self.interrupted:
            ColoredLogger.error("\nForce quit!")
            sys.exit(1)
        self.interrupted = True
        ColoredLogger.warning("\nInterrupted! Finishing current image... (Ctrl+C again to force quit)")

    def run(self) -> int:
        """Main entry point for the scaler."""
        # Validate input directory
        if not self.input_dir.exists():
            ColoredLogger.error(f"Input directory not found: {self.input_dir}")
            ColoredLogger.info("Run 'python download_images.py' first to download images.")
            return 1

        # Get list of images
        images = self._get_image_files()
        if not images:
            ColoredLogger.error(f"No images found in {self.input_dir}")
            return 1

        total = len(images)
        ColoredLogger.info(f"Scaling {total} images to {len(self.scales)} resolutions")
        ColoredLogger.plain(f"  Input:  {self.input_dir}")
        ColoredLogger.plain(f"  Output: {self.output_dir}")
        ColoredLogger.plain(f"  Scales: {', '.join(f'{s}x{s}' for s in self.scales)}\n")

        # Create output directories
        for scale in self.scales:
            scale_dir = self.output_dir / f"{scale}x{scale}"
            scale_dir.mkdir(parents=True, exist_ok=True)

        # Process each image
        for idx, image_file in enumerate(images, start=1):
            if self.interrupted:
                break

            self._process_image(image_file, idx, total)

        # Print summary
        self._print_summary()

        return 0 if self.stats["failed"] == 0 else 1

    def _get_image_files(self) -> List[Path]:
        """Get list of image files from input directory."""
        extensions = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
        images = []

        for file in sorted(self.input_dir.iterdir()):
            if file.suffix.lower() in extensions and file.is_file():
                images.append(file)

        return images

    def _process_image(self, image_file: Path, current: int, total: int):
        """Process a single image, creating scaled versions."""
        filename = image_file.name

        # Check if all scales already exist (unless force mode)
        if not self.force:
            all_exist = all(
                (self.output_dir / f"{scale}x{scale}" / filename).exists()
                for scale in self.scales
            )
            if all_exist:
                ColoredLogger.plain(
                    f"  {ColoredLogger.progress(current, total)} "
                    f"{ColoredLogger.filename(filename)} {ColoredLogger.status_skipped()}"
                )
                self.stats["skipped"] += 1
                return

        try:
            with Image.open(image_file) as img:
                # Convert to RGBA if needed for consistency
                if img.mode != "RGBA":
                    img = img.convert("RGBA")

                scales_created = 0
                for scale in self.scales:
                    output_path = self.output_dir / f"{scale}x{scale}" / filename

                    # Skip if exists (unless force mode)
                    if not self.force and output_path.exists():
                        continue

                    # Resize using high-quality resampling
                    scaled = img.resize((scale, scale), Image.Resampling.LANCZOS)
                    scaled.save(output_path)
                    scales_created += 1

                self.stats["processed"] += 1
                self.stats["total_scaled"] += scales_created

                ColoredLogger.plain(
                    f"  {ColoredLogger.progress(current, total)} "
                    f"{ColoredLogger.filename(filename)} {ColoredLogger.status_scaled()} "
                    f"{ColoredLogger.BRIGHT_BLACK}({scales_created} sizes){ColoredLogger.RESET}"
                )

        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)[:50]}"
            ColoredLogger.plain(
                f"  {ColoredLogger.progress(current, total)} "
                f"{ColoredLogger.filename(filename)} {ColoredLogger.status_failed()} "
                f"{ColoredLogger.BRIGHT_BLACK}- {error_msg}{ColoredLogger.RESET}"
            )
            self.stats["failed"] += 1
            self.failures.append({"name": filename, "error": error_msg})

    def _print_summary(self):
        """Print scaling summary."""
        print()
        ColoredLogger.plain("=" * 50)
        ColoredLogger.plain("Scaling Summary")
        ColoredLogger.plain("=" * 50)
        ColoredLogger.success(f"Processed: {self.stats['processed']} images")
        ColoredLogger.plain(f"  Skipped:   {self.stats['skipped']}")
        ColoredLogger.plain(f"  Total scaled files created: {self.stats['total_scaled']}")

        if self.stats["failed"] > 0:
            ColoredLogger.error(f"Failed:    {self.stats['failed']}")
            print()
            ColoredLogger.warning("Failed images:")
            for fail in self.failures[:10]:
                print(f"  - {fail['name']}")
                print(f"    {ColoredLogger.BRIGHT_BLACK}{fail['error']}{ColoredLogger.RESET}")
            if len(self.failures) > 10:
                print(f"  ... and {len(self.failures) - 10} more")

        ColoredLogger.plain("=" * 50)


def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Scale images from original to multiple resolutions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scale_images.py                    # Scale all images to default sizes
  python scale_images.py --force            # Re-scale all images even if they exist
  python scale_images.py --scales 32 64 128 # Only create specific sizes
  python scale_images.py --input ./my_images --output ./scaled

Default scales: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512
        """,
    )

    parser.add_argument(
        "--input",
        type=str,
        default="output/original",
        help="Input directory with original images (default: output/original)",
    )

    parser.add_argument(
        "--output",
        type=str,
        default="output",
        help="Output base directory for scaled images (default: output)",
    )

    parser.add_argument(
        "--scales",
        type=int,
        nargs="+",
        default=ImageScaler.DEFAULT_SCALES,
        help="List of scales to generate (default: 16 32 64 128 256 512)",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-scale all images even if they already exist",
    )

    args = parser.parse_args()

    scaler = ImageScaler(
        input_dir=args.input,
        output_dir=args.output,
        scales=args.scales,
        force=args.force,
    )

    return scaler.run()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        # Backup handler in case signal handler doesn't catch it
        print()
        ColoredLogger.warning("Interrupted by user (Ctrl+C)")
        ColoredLogger.plain("Exiting gracefully...")
        sys.exit(130)
