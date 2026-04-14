# Poway Symphony Orchestra Website Project Makefile
# Generic targets: build, assets, clean, watch, docs, docs-clean

PROJECT_SRC = $(CURDIR)
PROJECT_NAME = $(notdir $(PROJECT_SRC))
WORKSPACE_ROOT = ../..

SITE_DOCS_SRC = $(PROJECT_SRC)/docs/site
SITE_PAGES_SRC = $(SITE_DOCS_SRC)/pages/poway_symphony
PROJECT_POSTS_SRC = $(PROJECT_SRC)/docs
INCLUDES_SRC = $(PROJECT_SRC)/includes
SECTIONS_SRC = $(INCLUDES_SRC)/sections
CSS_SRC = $(PROJECT_SRC)/assets/css/capstones/powayorchestra
JS_SRC = $(PROJECT_SRC)/assets/js/capstones/powayorchestra
AUDIO_SRC = $(PROJECT_SRC)/assets/audio/poway-orchestra
IMAGES_SRC = $(PROJECT_SRC)/images

ROOT_DOCS_DEST = $(WORKSPACE_ROOT)
SITE_PAGES_DEST = $(WORKSPACE_ROOT)/pages/poway_symphony
PROJECT_POSTS_DEST = $(WORKSPACE_ROOT)/_posts/poway_symphony
INCLUDES_DEST = $(WORKSPACE_ROOT)/_includes/powayorchestra
SECTIONS_DEST = $(INCLUDES_DEST)/sections
CSS_DEST = $(WORKSPACE_ROOT)/assets/css/capstones/powayorchestra
JS_DEST = $(WORKSPACE_ROOT)/assets/js/capstones/powayorchestra
AUDIO_DEST = $(WORKSPACE_ROOT)/assets/audio/poway-orchestra
CAPSTONE_IMAGE_DEST = $(WORKSPACE_ROOT)/images/capstone/powaysymphonyorchestra
CAPSTONE_LOGO_IMAGE_DEST = $(CAPSTONE_IMAGE_DEST)/pso_logo.png
ROOT_LOGO_IMAGE_DEST = $(WORKSPACE_ROOT)/images/pso_logo.png

build: assets static
	@echo "✅ $(PROJECT_NAME) built successfully"
	@echo "   Source: _projects/$(PROJECT_NAME)/"
	@echo "   Includes: _includes/powayorchestra/"
	@echo "   CSS: assets/css/capstones/powayorchestra/"
	@echo "   JavaScript: assets/js/capstones/powayorchestra/"
	@echo "   Audio: assets/audio/poway-orchestra/"
	@echo "   Images: images/capstone/powaysymphonyorchestra/"

assets:
	@mkdir -p $(CSS_DEST)
	@cp $(CSS_SRC)/* $(CSS_DEST)/ 2>/dev/null || true
	@mkdir -p $(JS_DEST)
	@cp $(JS_SRC)/* $(JS_DEST)/ 2>/dev/null || true
	@mkdir -p $(AUDIO_DEST)
	@cp $(AUDIO_SRC)/* $(AUDIO_DEST)/ 2>/dev/null || true
	@mkdir -p $(CAPSTONE_IMAGE_DEST)
	@find $(IMAGES_SRC) -mindepth 1 -maxdepth 1 \
		! -name 'pso_logo.png' \
		-exec cp -r {} $(CAPSTONE_IMAGE_DEST)/ \; 2>/dev/null || true
	@cp $(IMAGES_SRC)/pso_logo.png $(CAPSTONE_LOGO_IMAGE_DEST) 2>/dev/null || true
	@cp $(IMAGES_SRC)/pso_logo.png $(ROOT_LOGO_IMAGE_DEST) 2>/dev/null || true

static:
	@mkdir -p $(INCLUDES_DEST)
	@cp $(INCLUDES_SRC)/*.html $(INCLUDES_DEST)/ 2>/dev/null || true
	@mkdir -p $(SECTIONS_DEST)
	@cp $(SECTIONS_SRC)/* $(SECTIONS_DEST)/ 2>/dev/null || true

clean:
	@echo "🧹 Cleaning $(PROJECT_NAME) distribution..."
	@rm -rf $(CSS_DEST)
	@rm -rf $(JS_DEST)
	@rm -rf $(AUDIO_DEST)
	@rm -rf $(CAPSTONE_IMAGE_DEST)
	@rm -f $(ROOT_LOGO_IMAGE_DEST)
	@rm -rf $(INCLUDES_DEST)
	@echo "✓ Static distribution cleaned (source preserved in _projects/$(PROJECT_NAME))"

watch:
	@echo "👀 Watching $(PROJECT_NAME) project (auto-copy on save)..."
	@if command -v fswatch >/dev/null 2>&1; then \
		fswatch -l 0.3 -r $(PROJECT_SRC) 2>/dev/null | while read changed_file; do \
			echo "  🔄 Syncing $$changed_file"; \
			$(MAKE) build >/dev/null; \
			$(MAKE) docs >/dev/null; \
		done; \
	else \
		echo "⚠️  fswatch not installed (brew install fswatch or apt install fswatch for auto-watch)"; \
		echo "   Falling back to manual: run 'make -C _projects/$(PROJECT_NAME) build docs' after edits"; \
		while true; do sleep 3600; done; \
	fi

docs:
	@echo "📚 Publishing $(PROJECT_NAME) documentation..."
	@for file in $(SITE_DOCS_SRC)/*.md; do \
		if [ -f "$$file" ]; then \
			filename=$$(basename "$$file"); \
			if [ "$$filename" = "index.md" ]; then \
				dest_name="powayorchestra.md"; \
			else \
				dest_name="$$filename"; \
			fi; \
			cp "$$file" $(ROOT_DOCS_DEST)/$$dest_name 2>/dev/null || true; \
		fi; \
	done
	@mkdir -p $(SITE_PAGES_DEST)
	@cp $(SITE_PAGES_SRC)/*.md $(SITE_PAGES_DEST)/ 2>/dev/null || true
	@mkdir -p $(PROJECT_POSTS_DEST)
	@for doc in $(PROJECT_POSTS_SRC)/*.md; do \
		if [ -f "$$doc" ]; then \
			cp "$$doc" $(PROJECT_POSTS_DEST)/ 2>/dev/null || true; \
		fi; \
	done
	@echo "✓ Documentation published to runtime Jekyll folders"

docs-clean:
	@for file in $(SITE_DOCS_SRC)/*.md; do \
		if [ -f "$$file" ]; then \
			filename=$$(basename "$$file"); \
			if [ "$$filename" = "index.md" ]; then \
				dest_name="powayorchestra.md"; \
			else \
				dest_name="$$filename"; \
			fi; \
			rm -f $(ROOT_DOCS_DEST)/$$dest_name; \
		fi; \
	done
	@rm -rf $(SITE_PAGES_DEST)
	@rm -rf $(PROJECT_POSTS_DEST)

.PHONY: build assets static clean watch docs docs-clean