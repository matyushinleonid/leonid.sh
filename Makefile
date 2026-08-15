.PHONY: install run stop check format build cv markdown

NODE_VERSION ?= 26.5.1

install:
	npm ci

run:
	docker compose up --build

stop:
	docker compose down

check:
	npm run format:check
	npm run check
	npm run build

format:
	npm run format

build:
	docker build --target production --tag leonid-sh:local .

cv:
	docker build --target cv --output type=local,dest=public/cv .

markdown:
	@test -n "$(FILE)" || { echo "usage: make markdown FILE=<path/to/index.md>" >&2; exit 1; }
	@out='$(FILE)'; case "$$out" in "~/"*) out="$$HOME/$${out#\~/}";; esac; \
	  mkdir -p "$$(dirname "$$out")"; \
	  docker run --rm --user "$$(id -u):$$(id -g)" \
	    -v "$(CURDIR)":/app:ro -v "$$(cd "$$(dirname "$$out")" && pwd)":/out -w /app \
	    node:$(NODE_VERSION)-alpine node scripts/generate-markdown.mjs "/out/$$(basename "$$out")" >/dev/null; \
	  echo "content/cv.{en,ru}.yaml -> $$out"
