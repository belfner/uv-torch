.PHONY: build run rund

ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

build:
	docker compose build

run:
	@echo "Serving at: http://localhost:8080/torch-uv/"
	docker compose up

rund:
	@echo "Serving at: http://localhost:8080/torch-uv/"
	docker compose up -d