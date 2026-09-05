.PHONY: install run stop check format build cv markdown indexnow gemini-cert

NODE_VERSION ?= 26.5.1
INDEXNOW_KEY ?= 7bf76050d5f4b620d153a4b560e06886
SITE ?= https://leonid.sh
GEMINI_HOST ?= leonid.sh
GEMINI_IMAGE ?= ghcr.io/mbrubeck/agate:latest

install:
	npm ci

run:
	docker compose --profile $(if $(PROD),prod,dev) up --build

stop:
	docker compose --profile dev --profile prod down

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

indexnow:
	@curl -sS -X POST https://yandex.com/indexnow \
	  -H "Content-Type: application/json; charset=utf-8" \
	  -w "\nHTTP %{http_code}\n" \
	  -d '{"host":"leonid.sh","key":"$(INDEXNOW_KEY)","keyLocation":"$(SITE)/$(INDEXNOW_KEY).txt","urlList":["$(SITE)/","$(SITE)/ru/"]}'

gemini-cert:
	@out="build/gemini-cert"; rm -rf "$$out"; mkdir -p "$$out/certs" "$$out/gmi"; chmod 777 "$$out/certs"; \
	  cid="$$(docker run -d --user "$$(id -u):$$(id -g)" -v "$$PWD/$$out/gmi":/gmi -v "$$PWD/$$out/certs":/certs $(GEMINI_IMAGE) --hostname $(GEMINI_HOST))"; \
	  for i in $$(seq 1 30); do [ -f "$$out/certs/$(GEMINI_HOST)/cert.der" ] && break; sleep 1; done; \
	  docker rm -f "$$cid" >/dev/null; \
	  test -f "$$out/certs/$(GEMINI_HOST)/cert.der" || { echo "agate did not generate a certificate" >&2; exit 1; }; \
	  echo; echo "generated $$out/certs/$(GEMINI_HOST)/{cert.der,key.der}"; \
	  echo -n "sha256 fingerprint: "; openssl x509 -inform DER -in "$$out/certs/$(GEMINI_HOST)/cert.der" -noout -fingerprint -sha256 | cut -d= -f2; \
	  openssl x509 -inform DER -in "$$out/certs/$(GEMINI_HOST)/cert.der" -noout -subject -dates; \
	  printf '[{"key":"cert.der","text_value":"%s"},{"key":"key.der","text_value":"%s"}]\n' \
	    "$$(base64 < "$$out/certs/$(GEMINI_HOST)/cert.der" | tr -d '\n')" \
	    "$$(base64 < "$$out/certs/$(GEMINI_HOST)/key.der" | tr -d '\n')" > "$$out/lockbox-payload.json"; \
	  python3 -c "import json,sys,base64; d=json.load(open(sys.argv[1])); assert len(d)==2, 'expected two entries'; [__import__('sys').exit('empty '+e['key']) for e in d if not base64.b64decode(e['text_value'], validate=True)]" "$$out/lockbox-payload.json" \
	    || { echo "lockbox payload is empty or malformed — is base64 available?" >&2; exit 1; }; \
	  echo "wrote $$out/lockbox-payload.json"
