.PHONY: help venv deps clean download download-realistic download-all clean-tiles

# Virtual environment directory
VENV := venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

# Map version (update when map data changes)
VERSION := 1763022054

help:
	@echo "Satisfactory Map Tile Downloader - Make targets:"
	@echo ""
	@echo "  make venv               - Create virtual environment and install dependencies"
	@echo "  make deps               - Install/update dependencies in existing venv"
	@echo "  make download           - Download game layer tiles (10 parallel workers)"
	@echo "  make download-realistic - Download realistic layer tiles (10 parallel workers)"
	@echo "  make download-all       - Download both game and realistic layer tiles"
	@echo "  make clean-tiles        - Clean all tiles in output/ (remove background)"
	@echo "  make clean              - Remove virtual environment and output"
	@echo "  make help               - Show this help message"
	@echo ""
	@echo "Output structure: output/<version>/<game|realistic>/<zoom>/<x>/<y>.png"
	@echo "Current version: $(VERSION)"
	@echo ""
	@echo "Workflow:"
	@echo "  1. make download        # Download tiles"
	@echo "  2. make clean-tiles     # Remove gray background"
	@echo ""
	@echo "Manual usage:"
	@echo "  source venv/bin/activate && python download_tiles.py --help"
	@echo "  source venv/bin/activate && python clean_tiles.py --help"

# Create virtual environment and install dependencies
venv: $(VENV)/bin/activate

$(VENV)/bin/activate: requirement.txt
	@echo "Creating virtual environment..."
	python3 -m venv $(VENV)
	@echo "Installing dependencies..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirement.txt
	@echo ""
	@echo "✓ Virtual environment ready!"
	@echo "  Activate with: source $(VENV)/bin/activate"

# Install or update dependencies
deps: $(VENV)/bin/activate
	@echo "Installing/updating dependencies..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirement.txt
	@echo "✓ Dependencies updated!"

# Download game layer tiles (10 parallel workers)
download: $(VENV)/bin/activate
	@echo "Downloading game layer tiles to output/$(VERSION)/game/..."
	$(PYTHON) download_tiles.py --layer gameLayer -j 10

# Download realistic layer tiles (10 parallel workers)
download-realistic: $(VENV)/bin/activate
	@echo "Downloading realistic layer tiles to output/$(VERSION)/realistic/..."
	$(PYTHON) download_tiles.py --layer realisticLayer -j 10

# Download both layers
download-all: download download-realistic
	@echo "✓ All tiles downloaded!"

# Clean all tiles in output/ (remove background)
clean-tiles: $(VENV)/bin/activate
	@echo "Cleaning all tiles in output/..."
	$(PYTHON) clean_tiles.py --input output -j 20

# Clean up virtual environment and output
clean:
	@echo "Removing virtual environment..."
	rm -rf $(VENV)
	@echo "Removing output directory..."
	rm -rf output
	@echo "✓ Cleanup complete!"
