.PHONY: build run rund deploy

ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

build:
	docker compose build

run:
	@echo "Serving at: http://localhost:8080/torch-uv/"
	docker compose up

rund:
	@echo "Serving at: http://localhost:8080/torch-uv/"
	docker compose up -d

deploy:
	@test -f .env || { echo "create .env from .env.example first"; exit 1; }
	@set -a; . ./.env; set +a; \
	 eval "$$(ENDPOINT=$$ENDPOINT sh scripts/derive-endpoint.sh)"; \
	 echo "Deploying $$ENDPOINT  (VITE_BASE=$$VITE_BASE  rule=$$TRAEFIK_RULE)"; \
	 VITE_BASE="$$VITE_BASE" TRAEFIK_RULE="$$TRAEFIK_RULE" \
	   docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d --build