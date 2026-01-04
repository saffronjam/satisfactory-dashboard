#!/usr/bin/env python3
"""
Extract image metadata from Satisfactory wiki.gg HTML files.

This script parses local HTML files, extracts File: page links, fetches those pages
(with caching), extracts image URLs, and generates an image_source.json manifest.
"""

import argparse
import hashlib
import json
import os
import re
import signal
import sys
import time
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from urllib.parse import urlparse, unquote

import requests
from bs4 import BeautifulSoup


class ColoredLogger:
    """Simple colored logger for terminal output."""

    # ANSI color codes
    RESET = "\033[0m"
    BOLD = "\033[1m"

    # Regular colors
    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"

    # Bright colors
    BRIGHT_BLACK = "\033[90m"
    BRIGHT_RED = "\033[91m"
    BRIGHT_GREEN = "\033[92m"
    BRIGHT_YELLOW = "\033[93m"
    BRIGHT_BLUE = "\033[94m"
    BRIGHT_MAGENTA = "\033[95m"
    BRIGHT_CYAN = "\033[96m"
    BRIGHT_WHITE = "\033[97m"

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
    def dry_mode(message: str):
        """Print dry mode message in bright yellow."""
        print(f"{ColoredLogger.BRIGHT_YELLOW}[DRY MODE] {message}{ColoredLogger.RESET}")

    @staticmethod
    def filename(name: str) -> str:
        """Format filename in bold white."""
        return f"{ColoredLogger.BOLD}{ColoredLogger.WHITE}{name}{ColoredLogger.RESET}"

    @staticmethod
    def progress(current: int, total: int) -> str:
        """Format progress indicator in bright magenta."""
        return f"{ColoredLogger.BRIGHT_MAGENTA}[{current}/{total}]{ColoredLogger.RESET}"

    @staticmethod
    def status_cached() -> str:
        """Format cached status in bright black (gray)."""
        return f"{ColoredLogger.BRIGHT_BLACK}(cached){ColoredLogger.RESET}"

    @staticmethod
    def status_fetching() -> str:
        """Format fetching status in cyan."""
        return f"{ColoredLogger.CYAN}(fetching...){ColoredLogger.RESET}"

    @staticmethod
    def plain(message: str):
        """Print plain message without color."""
        print(message)


class ImageScraper:
    """Scraper for extracting image metadata from wiki.gg HTML files."""

    def __init__(
        self,
        html_dir: str,
        output_file: str,
        cache_dir: str,
        dry_mode: bool = False,
        force_refresh: bool = False,
        request_delay: float = 0.5,
        filename_map_file: Optional[str] = None,
    ):
        self.html_dir = Path(html_dir)
        self.output_file = Path(output_file)
        self.cache_dir = Path(cache_dir)
        self.dry_mode = dry_mode
        self.force_refresh = force_refresh
        self.request_delay = request_delay
        self.last_request_time = 0.0
        self.warnings: List[str] = []
        self.filename_map: Dict[str, List[str]] = {}
        self.stats = {
            "total_links": 0,
            "after_dedup": 0,
            "successfully_processed": 0,
            "rate_limited": 0,
            "mapped_copies": 0,
        }

        # Load filename mappings if provided
        if filename_map_file:
            self._load_filename_map(filename_map_file)

    def _load_filename_map(self, filepath: str) -> None:
        """Load filename mappings from JSON file."""
        map_path = Path(filepath)
        if not map_path.exists():
            ColoredLogger.warning(f"Filename map not found: {filepath}")
            return

        try:
            with open(map_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Extract mappings, ignoring _comment and other non-mapping keys
            if "mappings" in data:
                self.filename_map = data["mappings"]
            else:
                # Support flat structure (no "mappings" wrapper)
                self.filename_map = {k: v for k, v in data.items() if not k.startswith("_")}

            if self.filename_map:
                ColoredLogger.info(f"Loaded {len(self.filename_map)} filename mappings from {filepath}")
        except json.JSONDecodeError as e:
            ColoredLogger.warning(f"Failed to parse filename map: {e}")
        except Exception as e:
            ColoredLogger.warning(f"Failed to load filename map: {e}")

    def apply_filename_mappings(self, image_entries: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Apply filename mappings to create additional entries with custom names.

        For each image entry, if its name has mappings defined, create additional
        entries with the mapped names pointing to the same URL.

        Args:
            image_entries: List of {"name": filename, "url": image_url} dictionaries

        Returns:
            Extended list with additional mapped entries
        """
        if not self.filename_map:
            return image_entries

        ColoredLogger.plain(f"\nApplying filename mappings...")
        extended_entries = list(image_entries)  # Copy original entries
        mapped_count = 0

        for entry in image_entries:
            original_name = entry["name"]
            if original_name in self.filename_map:
                mapped_names = self.filename_map[original_name]
                for mapped_name in mapped_names:
                    extended_entries.append({
                        "name": mapped_name,
                        "url": entry["url"],
                    })
                    mapped_count += 1
                    ColoredLogger.plain(
                        f"  {ColoredLogger.filename(original_name)} → {ColoredLogger.filename(mapped_name)}"
                    )

        self.stats["mapped_copies"] = mapped_count
        if mapped_count > 0:
            ColoredLogger.info(f"  Created {mapped_count} additional mapped entries")

        return extended_entries

    def run(self) -> int:
        """Main entry point for the scraper."""
        if self.dry_mode:
            ColoredLogger.dry_mode(f"Parsing HTML files from {self.html_dir}...")
        else:
            ColoredLogger.info(f"Parsing HTML files from {self.html_dir}...")

        # Check if HTML directory exists
        if not self.html_dir.exists():
            ColoredLogger.error(f"HTML directory not found: {self.html_dir}")
            return 1

        # Parse HTML files and extract File: page links
        file_page_links = self.parse_html_files()
        if not file_page_links:
            ColoredLogger.error("No image links found in HTML files")
            return 1

        ColoredLogger.plain(f"\nTotal raw image links: {len(file_page_links)}")
        self.stats["total_links"] = len(file_page_links)

        # Deduplicate and sort images alphabetically
        unique_links = self.deduplicate_images(file_page_links)
        unique_links.sort(key=lambda x: x[0].lower())
        ColoredLogger.plain(f"\nDeduplicating and sorting images...")
        ColoredLogger.info(f"  After deduplication: {len(unique_links)} unique images")
        self.stats["after_dedup"] = len(unique_links)

        # Fetch File: pages and extract image URLs
        ColoredLogger.plain(f"\nFetching File: pages...")
        image_entries = self.process_file_pages(unique_links)

        # Apply filename mappings to create additional copies
        if self.filename_map:
            image_entries = self.apply_filename_mappings(image_entries)

        # Generate or display manifest
        if self.dry_mode:
            self.display_dry_mode_results(image_entries)
        else:
            self.generate_manifest(image_entries)

        # Print summary
        self.print_summary()

        return 0

    def parse_html_files(self) -> List[Tuple[str, str]]:
        """
        Parse all HTML files and extract File: page links.

        Returns:
            List of tuples (filename, file_page_url)
        """
        file_page_links = []
        html_files = sorted(self.html_dir.glob("*.html"))

        if not html_files:
            ColoredLogger.warning(f"No HTML files found in {self.html_dir}")
            return []

        ColoredLogger.info(f"Found {len(html_files)} HTML files\n")

        for html_file in html_files:
            ColoredLogger.plain(f"Processing: {ColoredLogger.filename(html_file.name)}")
            try:
                with open(html_file, "r", encoding="utf-8") as f:
                    html_content = f.read()

                soup = BeautifulSoup(html_content, "lxml")

                # Find all links to File: pages
                links = soup.find_all("a", href=lambda h: h and "/wiki/File:" in h)

                # Extract URLs and filenames
                for link in links:
                    href = link.get("href", "")
                    # Ensure it's a full URL
                    if href.startswith("/"):
                        href = f"https://satisfactory.wiki.gg{href}"
                    elif not href.startswith("http"):
                        continue

                    # Extract filename from URL
                    filename = self.extract_filename_from_url(href)
                    if filename:
                        file_page_links.append((filename, href))

                ColoredLogger.plain(f"  Found {len(links)} image links")

            except Exception as e:
                warning = f"Failed to parse {html_file.name}: {e}"
                ColoredLogger.warning(warning)
                self.warnings.append(warning)

        return file_page_links

    def normalize_filename(self, filename: str) -> str:
        """
        Normalize filename by replacing underscores with spaces.

        Args:
            filename: Original filename (e.g., "Name_Like_This.png")

        Returns:
            Normalized filename (e.g., "Name Like This.png")
        """
        # Split filename and extension
        name_parts = filename.rsplit('.', 1)
        if len(name_parts) == 2:
            name, ext = name_parts
            # Replace underscores with spaces in the name part only
            normalized_name = name.replace('_', ' ')
            return f"{normalized_name}.{ext}"
        else:
            # No extension, just replace underscores
            return filename.replace('_', ' ')

    def extract_filename_from_url(self, url: str) -> Optional[str]:
        """Extract filename from File: page URL."""
        try:
            # URL format: https://satisfactory.wiki.gg/wiki/File:Arrow.png
            parts = url.split("/wiki/File:")
            if len(parts) == 2:
                # Decode URL encoding and clean up
                filename = unquote(parts[1].split("#")[0].split("?")[0])
                # Normalize filename (replace underscores with spaces)
                return self.normalize_filename(filename)
        except Exception:
            pass
        return None

    def deduplicate_images(
        self, file_page_links: List[Tuple[str, str]]
    ) -> List[Tuple[str, str]]:
        """
        Remove duplicate images, keeping first occurrence.

        Args:
            file_page_links: List of (filename, url) tuples

        Returns:
            Deduplicated list of (filename, url) tuples
        """
        seen = set()
        unique = []

        for filename, url in file_page_links:
            if filename not in seen:
                seen.add(filename)
                unique.append((filename, url))

        return unique

    def get_cache_path(self, url: str) -> Path:
        """Generate cache file path from URL."""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return self.cache_dir / f"{url_hash}.html"

    def rate_limit_wait(self):
        """Wait if necessary to respect rate limiting."""
        if self.request_delay > 0:
            elapsed = time.time() - self.last_request_time
            if elapsed < self.request_delay:
                time.sleep(self.request_delay - elapsed)
        self.last_request_time = time.time()

    def fetch_file_page(self, url: str, retry_count: int = 0) -> tuple[Optional[str], Optional[str]]:
        """
        Fetch a File: page with caching support and rate limiting.

        Args:
            url: URL of the File: page
            retry_count: Number of retries attempted (for backoff)

        Returns:
            Tuple of (HTML content or None if failed, error message or None)
        """
        cache_path = self.get_cache_path(url)

        # Check cache (no rate limiting needed for cache hits)
        if not self.force_refresh and cache_path.exists():
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    return f.read(), None
            except Exception as e:
                error_msg = f"Failed to read cache: {type(e).__name__}: {str(e)}"
                self.warnings.append(f"{error_msg} for {url}")
                # Try to fetch from network instead
                pass

        # Rate limiting before network request
        self.rate_limit_wait()

        # Fetch from network
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            html = response.text

            # Save to cache
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            with open(cache_path, "w", encoding="utf-8") as f:
                f.write(html)

            return html, None

        except requests.HTTPError as e:
            error_msg = f"HTTP {e.response.status_code} error"

            # Handle rate limiting with exponential backoff
            if e.response.status_code == 429:
                self.stats["rate_limited"] += 1
                if retry_count < 3:  # Max 3 retries
                    backoff_time = (2 ** retry_count) * 5  # 5s, 10s, 20s
                    ColoredLogger.warning(f"  Rate limited! Waiting {backoff_time}s before retry...")
                    time.sleep(backoff_time)
                    return self.fetch_file_page(url, retry_count + 1)
                else:
                    error_msg = "Rate limited (429) - max retries exceeded"
            elif e.response.status_code == 404:
                error_msg = "Page not found (404)"
            elif e.response.status_code == 403:
                error_msg = "Access forbidden (403)"
            elif e.response.status_code == 500:
                error_msg = "Server error (500)"

            self.warnings.append(f"{error_msg} for {url}")
            return None, error_msg
        except requests.Timeout:
            error_msg = "Request timeout (10s)"
            self.warnings.append(f"{error_msg} for {url}")
            return None, error_msg
        except requests.ConnectionError as e:
            error_msg = f"Connection error: {str(e)[:50]}"
            self.warnings.append(f"{error_msg} for {url}")
            return None, error_msg
        except requests.RequestException as e:
            error_msg = f"Request error: {type(e).__name__}: {str(e)[:50]}"
            self.warnings.append(f"{error_msg} for {url}")
            return None, error_msg
        except Exception as e:
            error_msg = f"Unexpected error: {type(e).__name__}: {str(e)[:50]}"
            self.warnings.append(f"{error_msg} for {url}")
            return None, error_msg

    def extract_image_url(self, html: str, filename: str) -> Optional[str]:
        """
        Extract the actual image download URL from a File: page.

        Args:
            html: HTML content of the File: page
            filename: Expected filename for better error messages

        Returns:
            Image URL (absolute) or None if not found
        """
        BASE_URL = "https://satisfactory.wiki.gg"

        def make_absolute(url: str) -> str:
            """Convert relative URL to absolute."""
            if url.startswith("/"):
                return BASE_URL + url
            return url

        try:
            soup = BeautifulSoup(html, "lxml")

            # Look for the fullMedia div which contains the original image link
            full_media_div = soup.find("div", class_="fullMedia")
            if full_media_div:
                # Find the link with format=original parameter
                link = full_media_div.find("a", href=lambda h: h and "format=original" in h)
                if link:
                    return make_absolute(link.get("href"))

            # Fallback: Search for any link with format=original
            pattern = re.compile(
                r"(https://satisfactory\.wiki\.gg)?/images/.*?\.(png|jpg|jpeg|gif|webp)\?.*?format=original",
                re.IGNORECASE,
            )

            # Try to find in href attributes
            link = soup.find("a", href=pattern)
            if link:
                return make_absolute(link.get("href"))

            # Last resort: Try to find in any text/attributes
            match = pattern.search(str(soup))
            if match:
                return make_absolute(match.group(0))

        except Exception as e:
            warning = f"Error parsing File: page for {filename}: {e}"
            self.warnings.append(warning)

        return None

    def process_file_pages(self, unique_links: List[Tuple[str, str]]) -> List[Dict[str, str]]:
        """
        Fetch File: pages and extract image URLs.

        Args:
            unique_links: List of (filename, file_page_url) tuples

        Returns:
            List of {"name": filename, "url": image_url} dictionaries
        """
        image_entries = []
        total = len(unique_links)

        for idx, (filename, file_page_url) in enumerate(unique_links, start=1):
            # Determine if cached
            cache_path = self.get_cache_path(file_page_url)
            is_cached = cache_path.exists() and not self.force_refresh
            status = ColoredLogger.status_cached() if is_cached else ColoredLogger.status_fetching()

            ColoredLogger.plain(f"  {ColoredLogger.progress(idx, total)} {ColoredLogger.filename(filename)} {status}")

            # Fetch File: page
            html, error = self.fetch_file_page(file_page_url)
            if html is None:
                warning = f"Could not fetch File: page for {filename}"
                if error:
                    warning += f" - {error}"
                ColoredLogger.warning(f"  {warning}")
                continue

            # Extract image URL
            image_url = self.extract_image_url(html, filename)
            if image_url is None:
                warning = f"Could not find image URL for {filename}"
                ColoredLogger.warning(f"  {warning}")
                continue

            # Add to results
            image_entries.append({"name": filename, "url": image_url})
            self.stats["successfully_processed"] += 1

        return image_entries

    def generate_manifest(self, image_entries: List[Dict[str, str]]) -> None:
        """Generate image_source.json manifest."""
        ColoredLogger.plain(f"\nGenerating {ColoredLogger.filename(self.output_file.name)}...")

        # Sort by name for consistent output
        sorted_entries = sorted(image_entries, key=lambda x: x["name"].lower())

        try:
            with open(self.output_file, "w", encoding="utf-8") as f:
                json.dump(sorted_entries, f, indent=2, ensure_ascii=False)

            ColoredLogger.success(f"Written {len(image_entries)} image entries to {self.output_file}")
            ColoredLogger.plain(f"\nNext steps:")
            ColoredLogger.info(f"  python download_images.py  # Download all {len(image_entries)} images")
            ColoredLogger.info(f"  python scale_images.py     # Scale to multiple resolutions")

        except Exception as e:
            ColoredLogger.error(f"Failed to write manifest: {e}")

    def display_dry_mode_results(self, image_entries: List[Dict[str, str]]) -> None:
        """Display what would be generated in dry mode."""
        ColoredLogger.dry_mode(f"Would generate {ColoredLogger.filename(self.output_file.name)} with {len(image_entries)} entries:")

        # Show first few entries
        for entry in image_entries[:5]:
            ColoredLogger.plain(f"  - {ColoredLogger.filename(entry['name'])} → {entry['url']}")

        if len(image_entries) > 5:
            ColoredLogger.plain(f"  ... and {len(image_entries) - 5} more")

    def print_summary(self) -> None:
        """Print execution summary."""
        ColoredLogger.plain(f"\n{'='*60}")
        ColoredLogger.plain(f"Summary:")
        ColoredLogger.plain(f"  Total image links found: {self.stats['total_links']}")
        ColoredLogger.plain(f"  After deduplication: {self.stats['after_dedup']}")
        ColoredLogger.success(f"Successfully processed: {self.stats['successfully_processed']}")
        if self.stats['mapped_copies'] > 0:
            ColoredLogger.info(f"  Additional mapped copies: {self.stats['mapped_copies']}")
            total = self.stats['successfully_processed'] + self.stats['mapped_copies']
            ColoredLogger.success(f"Total entries in manifest: {total}")
        if self.stats['rate_limited'] > 0:
            ColoredLogger.info(f"Rate limited and retried: {self.stats['rate_limited']} times")
        if len(self.warnings) > 0:
            ColoredLogger.warning(f"Total warnings: {len(self.warnings)}")
        else:
            ColoredLogger.success("No warnings!")
        ColoredLogger.plain(f"{'='*60}")


def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Extract image metadata from Satisfactory wiki.gg HTML files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example usage:
  python extract_images_wiki_gg.py
  python extract_images_wiki_gg.py --dry-mode
  python extract_images_wiki_gg.py --force-refresh
  python extract_images_wiki_gg.py --delay 1.0  # Wait 1 second between requests
  python extract_images_wiki_gg.py --html-dir ./html --output-file images.json
  python extract_images_wiki_gg.py --filename-map ./filename_map.json  # Use custom filename mappings

Filename map format (filename_map.json):
  {
    "mappings": {
      "Assembler.png": ["Assembler Alt.png", "Assembler Copy.png"]
    }
  }

After generating image_source.json:
  python download_images.py    # Download all images from manifest
  python scale_images.py       # Scale images to multiple resolutions
        """,
    )

    parser.add_argument(
        "--html-dir",
        type=str,
        default="./html",
        help="Directory containing HTML files (default: ./html)",
    )

    parser.add_argument(
        "--output-file",
        type=str,
        default="./image_source.json",
        help="Output JSON manifest file (default: ./image_source.json)",
    )

    parser.add_argument(
        "--cache-dir",
        type=str,
        default="./downloads/cache",
        help="Cache directory for File: pages (default: ./downloads/cache)",
    )

    parser.add_argument(
        "--dry-mode",
        action="store_true",
        help="Download HTML but not generate manifest, list what would be found",
    )

    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Force re-fetch of cached File: pages",
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay between requests in seconds (default: 0.5). Use higher values to avoid rate limiting.",
    )

    parser.add_argument(
        "--filename-map",
        type=str,
        default="./filename_map.json",
        help="JSON file with filename mappings for creating additional copies (default: ./filename_map.json)",
    )

    args = parser.parse_args()

    # Set up signal handler for graceful Ctrl+C
    def signal_handler(sig, frame):
        ColoredLogger.plain("\n")
        ColoredLogger.warning("Interrupted by user (Ctrl+C)")
        ColoredLogger.plain("Exiting gracefully...")
        sys.exit(130)  # Standard exit code for SIGINT

    signal.signal(signal.SIGINT, signal_handler)

    # Create scraper and run
    scraper = ImageScraper(
        html_dir=args.html_dir,
        output_file=args.output_file,
        cache_dir=args.cache_dir,
        dry_mode=args.dry_mode,
        force_refresh=args.force_refresh,
        request_delay=args.delay,
        filename_map_file=args.filename_map,
    )

    return scraper.run()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        # Backup handler in case signal handler doesn't catch it
        ColoredLogger.plain("\n")
        ColoredLogger.warning("Interrupted by user (Ctrl+C)")
        ColoredLogger.plain("Exiting gracefully...")
        sys.exit(130)
