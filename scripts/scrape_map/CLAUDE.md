# CLAUDE.md - Map Tile Downloader

## Purpose

Downloads map tiles from satisfactory-calculator.com and processes them for the dashboard's Leaflet map component.

## Key Files

| File | Purpose |
|------|---------|
| `download_tiles.py` | Fetches tiles from remote server with parallel workers |
| `clean_tiles.py` | Removes gray background from downloaded tiles |
| `Makefile` | Build automation and workflow |

## Architecture

- **Source**: satisfactory-calculator.com interactive map API
- **Layers**: `gameLayer` (stylized) and `realisticLayer` (satellite-style)
- **Output**: Tile pyramid structure `<version>/<layer>/<zoom>/<x>/<y>.png`
- **Destination**: `dashboard/public/assets/images/satisfactory/map/<version>/`

## Version Management

The `VERSION` variable in Makefile (currently `1763022054`) should be updated when the game map data changes significantly.

## Common Tasks

### Updating Map Tiles
```bash
make download-all && make prod
```

### Downloading Single Layer
```bash
make download-game    # or
make download-realistic
```

## Notes

- Downloads use 10 parallel workers by default
- Background cleaning uses 20 parallel workers
- The `prod` target copies the entire version folder to dashboard
