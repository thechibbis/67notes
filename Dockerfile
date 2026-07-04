# syntax=docker/dockerfile:1

# ---- frontend: build web/dist (embedded into the Go binary via go:embed) ----
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---- backend: static Go binary with the UI embedded ----
FROM golang:1.25-alpine AS go
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Always embed the freshly built UI, not whatever web/dist exists locally.
COPY --from=web /web/dist ./web/dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /out/67notes .

# ---- runtime ----
FROM alpine:3
RUN apk add --no-cache ca-certificates wget
COPY --from=go /out/67notes /usr/local/bin/67notes
EXPOSE 6767
ENTRYPOINT ["/usr/local/bin/67notes"]
