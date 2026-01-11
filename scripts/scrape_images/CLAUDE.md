# CLAUDE.md - Image Scraper

## Purpose

Scrapes item/building icons from the Satisfactory Wiki (wiki.gg) and generates multiple resolution variants for dashboard use.

## Key Files

| File | Purpose |
|------|---------|
| `extract_images_wiki_gg.py` | Scrapes wiki pages and generates `image_source.json` |
| `download_images.py` | Downloads images from manifest |
| `scale_images.py` | Generates multiple resolution variants |
| `Makefile` | Build automation and workflow |

## Architecture

- **Source**: satisfactory.wiki.gg
- **Manifest**: `image_source.json` contains all discovered image URLs
- **Resolutions**: 16x16, 32x32, 64x64, 128x128, 256x256 (deployed), 512x512, original (kept locally)
- **Destination**: `dashboard/public/assets/images/satisfactory/<size>/`

## Data Flow

```
Wiki Pages → extract_images_wiki_gg.py → image_source.json
image_source.json → download_images.py → downloads/
downloads/ → scale_images.py → output/<size>/
output/ → make prod → dashboard/public/assets/
```

## Common Tasks

### Full Refresh
```bash
make scrape && make download && make prod
```

### Re-scale Only (no re-download)
```bash
make scale
```

## Notes

- Only 16x16 through 256x256 are deployed to dashboard
- 512x512 and original remain in output/ for archival
- The `prod` target copies images to dashboard (both folders are gitignored)
