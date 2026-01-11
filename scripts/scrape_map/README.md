# Satisfactory Map Tile Downloader

Downloads and processes map tiles from the Satisfactory Interactive Map for use in the dashboard's Leaflet map component.

## Quick Start

```bash
make venv           # Set up Python environment
make download-all   # Download all map tiles
make prod           # Process and move to dashboard
```

## Available Commands

| Command | Description |
|---------|-------------|
| `make venv` | Create virtual environment and install dependencies |
| `make deps` | Update dependencies in existing venv |
| `make download-game` | Download game-style map tiles |
| `make download-realistic` | Download realistic map tiles |
| `make download-all` | Download both tile sets |
| `make clean-tiles` | Remove gray background from tiles |
| `make prod` | Clean tiles and move to dashboard |
| `make clean` | Remove venv and output |

## Output Structure

```
output/
└── <version>/
    ├── game/
    │   └── <zoom>/<x>/<y>.png
    └── realistic/
        └── <zoom>/<x>/<y>.png
```

Current version: `1763022054`

## Workflow

1. **Download**: `make download-all` fetches tiles from satisfactory-calculator.com
2. **Process**: `make prod` removes background and moves to dashboard

## Manual Usage

```bash
source venv/bin/activate
python download_tiles.py --help
python clean_tiles.py --help
```

## Dependencies

- Python 3.x
- See `requirement.txt` for packages
