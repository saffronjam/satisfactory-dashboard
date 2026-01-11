# Satisfactory Image Scraper

Scrapes item and building icons from the Satisfactory Wiki and generates multiple resolution variants for the dashboard.

## Quick Start

```bash
make venv       # Set up Python environment
make scrape     # Generate image manifest from wiki
make download   # Download all images
make prod       # Scale and move to dashboard
```

## Available Commands

| Command | Description |
|---------|-------------|
| `make venv` | Create virtual environment and install dependencies |
| `make deps` | Update dependencies in existing venv |
| `make scrape` | Scrape wiki and generate `image_source.json` |
| `make dry-run` | Test scraper without generating manifest |
| `make download` | Download images from manifest |
| `make scale` | Generate multiple resolutions |
| `make prod` | Scale and move to dashboard |
| `make clean` | Remove venv and downloads |

## Output Structure

```
output/
├── 16x16/
├── 32x32/
├── 64x64/
├── 128x128/
├── 256x256/
├── 512x512/
└── original/
```

## Workflow

1. **Scrape**: `make scrape` extracts image URLs from wiki.gg
2. **Download**: `make download` fetches all images
3. **Deploy**: `make prod` scales and moves to dashboard

## Manual Usage

```bash
source venv/bin/activate
python extract_images_wiki_gg.py --help
python download_images.py --help
python scale_images.py --help
```

## Generated Files

- `image_source.json` - Manifest of all image URLs
- `filename_map.json` - Mapping of wiki names to local filenames
- `downloads/` - Raw downloaded images
- `output/` - Scaled images by resolution

## Dependencies

- Python 3.x
- See `requirement.txt` for packages
