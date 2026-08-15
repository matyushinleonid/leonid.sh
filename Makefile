.PHONY: install run stop check format build cv

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
