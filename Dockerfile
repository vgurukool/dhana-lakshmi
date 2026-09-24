# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# Stage 2: Production Python Runtime
FROM python:3.11-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=3002

RUN pip install --no-cache-dir \
    fastapi>=0.110.0 \
    "uvicorn[standard]>=0.28.0" \
    pydantic>=2.6.0 \
    python-multipart>=0.0.9 \
    pypdf>=4.0.0 \
    "mcp>=1.3.0" \
    fastmcp

RUN mkdir -p /app/data /app/storage

COPY server/ ./server/
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:3002/api/health')" || exit 1

CMD ["python3", "-m", "uvicorn", "main:app", "--app-dir", "server", "--host", "0.0.0.0", "--port", "3002"]
