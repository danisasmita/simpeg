.PHONY: build run test lint docker-build docker-run clean

# Build
build:
	go build -o simpeg-go ./cmd/main.go

# Run locally
run: build
	./simpeg-go

# Test
test:
	go test -cover ./...

# Lint
lint:
	golangci-lint run

# Docker
docker-build:
	docker compose build

docker-run:
	docker compose up -d

docker-stop:
	docker compose down

# Clean
clean:
	rm -f simpeg-go
	docker compose down -v
