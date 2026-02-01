# Makefile for ad-freedom-grade.q10elabs.com
#
# Targets:
#   sync-to-www  Copy deployable files to ../../www/ad-freedom-grade.q10elabs.com/
#                (index.html, script.js, configs/, example.png only; no LICENSE/README)

WWW_DIR := ../../www/ad-freedom-grade.q10elabs.com

.PHONY: sync-to-www
sync-to-www:
	@mkdir -p "$(WWW_DIR)/configs"
	cp index.html script.js example.png "$(WWW_DIR)/"
	cp configs/v1.json configs/v2.json "$(WWW_DIR)/configs/"
	@echo "Synced to $(WWW_DIR)"
