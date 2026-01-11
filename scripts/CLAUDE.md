# CLAUDE.md - Scripts Directory

## Overview

This directory contains standalone Python scripts for fetching and processing external assets used by the dashboard. Each subdirectory is self-contained with its own virtual environment and Makefile.

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `scrape_images/` | Item and building icons from wiki |
| `scrape_map/` | Map tiles for Leaflet component |

## Common Patterns

All script directories follow the same conventions:

- **Virtual environment**: Each has its own `venv/` managed via Makefile
- **Dependencies**: Listed in `requirement.txt`
- **Output**: Generated files go to `output/`
- **Production**: `make prod` processes and moves assets to dashboard

## Asset Workflow

```
scripts/<tool>/     →  make download/scrape  →  output/
output/             →  make prod             →  dashboard/public/assets/
dashboard/assets/   →  make pack-assets      →  assets/*.tar.gz (LFS)
```

## When to Run Scripts

These scripts are typically run when:
- Game updates add new items/buildings (scrape_images)
- Map data changes significantly (scrape_map)
- Assets need to be refreshed from source

## Notes

- Scripts output to local `output/` directories (gitignored)
- Final assets are committed via Git LFS as tar.gz archives
- See individual subdirectory CLAUDE.md files for tool-specific details
