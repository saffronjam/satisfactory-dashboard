.PHONY: help venv deps clean scrape dry-run download scale prod

# Virtual environment directory
VENV := venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

help:
	@echo "Satisfactory Image Scraper - Make targets:"
	@echo ""
	@echo "  make venv        - Create virtual environment and install dependencies"
	@echo "  make deps        - Install/update dependencies in existing venv"
	@echo "  make scrape      - Run scraper to generate image_source.json"
	@echo "  make dry-run     - Run scraper in dry mode (no manifest generation)"
	@echo "  make download    - Download images from image_source.json"
	@echo "  make scale       - Scale downloaded images to multiple resolutions"
	@echo "  make prod        - Scale images and copy to dashboard"
	@echo "  make clean       - Remove virtual environment and cache"
	@echo "  make help        - Show this help message"
	@echo ""
	@echo "Workflow:"
	@echo "  1. make scrape    # Generate image_source.json from wiki"
	@echo "  2. make download  # Download all images"
	@echo "  3. make prod      # Scale and move to dashboard"
	@echo ""
	@echo "Manual usage:"
	@echo "  source venv/bin/activate && python extract_images_wiki_gg.py --help"

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

# Run scraper in normal mode
scrape: $(VENV)/bin/activate
	@echo "Running image scraper..."
	$(PYTHON) extract_images_wiki_gg.py

# Run scraper in dry mode
dry-run: $(VENV)/bin/activate
	@echo "Running image scraper in dry mode..."
	$(PYTHON) extract_images_wiki_gg.py --dry-mode

# Download images from manifest
download: $(VENV)/bin/activate
	@echo "Downloading images from image_source.json..."
	$(PYTHON) download_images.py

# Scale images to multiple resolutions
scale: $(VENV)/bin/activate
	@echo "Scaling images to multiple resolutions..."
	$(PYTHON) scale_images.py

# Scale and copy images to dashboard
prod: scale
	@echo "Copying images to dashboard..."
	@mkdir -p ../../dashboard/public/assets/images/satisfactory
	@rm -rf ../../dashboard/public/assets/images/satisfactory/16x16
	@rm -rf ../../dashboard/public/assets/images/satisfactory/32x32
	@rm -rf ../../dashboard/public/assets/images/satisfactory/64x64
	@rm -rf ../../dashboard/public/assets/images/satisfactory/128x128
	@rm -rf ../../dashboard/public/assets/images/satisfactory/256x256
	cp -r output/16x16 ../../dashboard/public/assets/images/satisfactory/
	cp -r output/32x32 ../../dashboard/public/assets/images/satisfactory/
	cp -r output/64x64 ../../dashboard/public/assets/images/satisfactory/
	cp -r output/128x128 ../../dashboard/public/assets/images/satisfactory/
	cp -r output/256x256 ../../dashboard/public/assets/images/satisfactory/
	@echo "Images copied to dashboard!"

# Clean up virtual environment and cache
clean:
	@echo "Removing virtual environment..."
	rm -rf $(VENV)
	@echo "Removing downloads directory..."
	rm -rf downloads
	@echo "✓ Cleanup complete!"
