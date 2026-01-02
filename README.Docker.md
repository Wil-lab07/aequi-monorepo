# Docker Setup for Aequi Monorepo

> **⚠️ WORK IN PROGRESS**
>
> This project is currently under active development. Features, APIs, and contracts are subject to change. Not audited for production use.

This guide explains how to run the Aequi monorepo using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- (Optional) Bun 1.2.20+ for local development

## Quick Start

### Production Build

1. **Create environment files:**
   ```bash
   # Server environment
   cp apps/server/.env.example apps/server/.env
   
   # Web environment
   cp apps/web/.env.example apps/web/.env
   ```

2. **Configure your environment variables** in `apps/server/.env`:
   ```env
   ETHEREUM_RPC_URL=your_ethereum_rpc_url
   BSC_RPC_URL=your_bsc_rpc_url
   # Add other required variables
   ```

3. **Build and run:**
   ```bash
   docker-compose up -d
   ```

4. **Access the applications:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

### Development Build (with Hot Reload)

For development with hot reload and volume mounting:

```bash
docker-compose -f docker-compose.dev.yml up
```

Access:
- Frontend: http://localhost:5173 (Vite dev server)
- Backend API: http://localhost:3000 (with auto-restart)

## Architecture

### Production Setup
- **Server**: Bun runtime with TypeScript, runs on port 3000
- **Web**: Nginx serving static Vite build, runs on port 80 (mapped to 8080)
- **Network**: Bridge network for service communication

### Development Setup
- **Server**: Bun with `--watch` flag for hot reload
- **Web**: Vite dev server with HMR on port 5173
- **Volumes**: Source code mounted for instant updates

## Commands

### Build images
```bash
# Production
docker-compose build

# Development
docker-compose -f docker-compose.dev.yml build
```

### Start services
```bash
# Production (detached)
docker-compose up -d

# Development (with logs)
docker-compose -f docker-compose.dev.yml up
```

### Stop services
```bash
# Production
docker-compose down

# Development
docker-compose -f docker-compose.dev.yml down
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f web
```

### Rebuild after changes
```bash
# Production - rebuild and restart
docker-compose up -d --build

# Development - restart with new code
docker-compose -f docker-compose.dev.yml restart
```

### Health checks
```bash
# Check server health
curl http://localhost:3000/exchange?chain=ethereum

# Check web health
curl http://localhost:8080/health
```

## Turborepo Compatibility

The Docker setup is fully compatible with Turborepo:

1. **Workspace resolution**: Root `package.json` and `turbo.json` are copied for proper workspace detection
2. **Build pipeline**: Respects Turborepo's build cache and task dependencies
3. **Monorepo structure**: Maintains the `apps/*` structure in containers
4. **Shared dependencies**: Node modules installed at root with workspace linking

## Customization

### Change API URL for Web

Edit `docker-compose.yml` and modify the build arg:

```yaml
services:
  web:
    build:
      args:
        - VITE_API_BASE_URL=http://your-api-url:3000
```

### Add environment variables

Edit `apps/server/.env` or modify `docker-compose.yml`:

```yaml
services:
  server:
    environment:
      - CUSTOM_VAR=value
```

### Expose different ports

Modify port mappings in `docker-compose.yml`:

```yaml
services:
  server:
    ports:
      - "3001:3000"  # host:container
```

## Troubleshooting

### Port conflicts
If ports 3000 or 8080 are in use, change the host port in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Use 3001 instead of 3000
```

### Build fails
```bash
# Clear Docker cache and rebuild
docker-compose build --no-cache
```

### Container won't start
```bash
# Check logs
docker-compose logs server
docker-compose logs web

# Inspect container
docker inspect aequi-server
```

### Dependencies not found
```bash
# Rebuild with fresh install
docker-compose down -v
docker-compose up --build
```

## Production Deployment

For production deployment:

1. **Use production compose file**: Already configured in `docker-compose.yml`
2. **Set proper environment variables**: Never commit `.env` files
3. **Configure reverse proxy**: Use Nginx/Traefik in front of services
4. **Enable HTTPS**: Add SSL certificates and update nginx config
5. **Set resource limits**: Add memory/CPU limits in compose file
6. **Monitor health**: Use the built-in health checks

Example with resource limits:

```yaml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Multi-stage Build Optimization

The Dockerfiles use multi-stage builds to minimize image size:

1. **deps**: Install dependencies only
2. **builder**: Build the application
3. **runner**: Minimal runtime image

This results in smaller production images and faster deployments.
