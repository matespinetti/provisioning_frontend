# Sona Provisioning Frontend - Production Deployment Guide

This guide covers deploying the Next.js frontend application to a VPS using Docker.

## Prerequisites

Before deploying, ensure you have:

- ✅ Docker Engine installed (version 20.10+)
- ✅ Docker Compose installed (version 2.0+)
- ✅ Backend container already running on the VPS
- ✅ Git installed on the VPS
- ✅ Nginx reverse proxy configured at VPS level (for SSL/HTTPS)

## Architecture Overview

```
Internet → VPS Nginx (SSL) → Frontend Container → Backend Container
                                 (port 3000)        (port 3333)
                                      ↓                    ↓
                                   Docker Network (sona-network)
```

- **Frontend**: Next.js 16 standalone app in Docker container
- **Backend**: Separate Docker container (already running)
- **Networking**: Both containers communicate via shared Docker network
- **SSL/TLS**: Handled by VPS-level nginx reverse proxy

## Initial Setup

### Step 1: Discover Backend Container Name

Find your backend container's name to configure networking:

```bash
# List all running containers
docker ps

# Or filter by backend port
docker ps --filter "expose=3333"

# Or format output for easier reading
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
```

**Example output:**
```
NAMES                    PORTS                     STATUS
sona-backend             0.0.0.0:3333->3333/tcp   Up 2 hours
```

Note down the backend container name (e.g., `sona-backend`) - you'll need it for configuration.

### Step 2: Create Docker Network

Create a shared Docker network for frontend-backend communication:

```bash
# Create the network
docker network create sona-network

# Verify it was created
docker network ls | grep sona-network
```

### Step 3: Connect Backend to Network

Connect your existing backend container to the shared network:

```bash
# Replace <backend-container-name> with your actual backend container name
docker network connect sona-network <backend-container-name>

# Verify both containers are connected
docker network inspect sona-network
```

You should see your backend container listed in the network's containers.

### Step 4: Clone Repository

If you haven't already, clone the frontend repository:

```bash
# Navigate to your projects directory
cd /opt/projects  # Or your preferred location

# Clone the repository
git clone <repository-url> provisioning_frontend
cd provisioning_frontend
```

### Step 5: Configure Environment Variables

Create your production environment file from the template:

```bash
# Copy the template
cp .env.example .env.production

# Edit the file
nano .env.production
```

**Configure these variables in `.env.production`:**

```bash
# Port Configuration
# Set the port where the frontend will be accessible on the VPS host
PROVISIONING_FRONTEND_PORT=3000

# Backend API URL
# IMPORTANT: Use your backend container name from Step 1
# Format: http://<backend-container-name>:<backend-port>
NEXT_PUBLIC_API_URL=http://sona-backend:3333

# Node Environment
NODE_ENV=production
```

**Critical Notes:**
- Replace `sona-backend` with your actual backend container name
- The port `3333` should match your backend's exposed port
- `PROVISIONING_FRONTEND_PORT` determines which localhost port nginx proxies to

Save and exit (`Ctrl+X`, then `Y`, then `Enter` in nano).

### Step 6: Build and Run

Build and start the frontend container:

```bash
# Build and start in detached mode
docker-compose up -d --build

# This will:
# 1. Build the Docker image using the multi-stage Dockerfile
# 2. Create the container named "sona-provisioning-frontend"
# 3. Connect it to the sona-network
# 4. Expose it on localhost:${PROVISIONING_FRONTEND_PORT}
```

### Step 7: Verify Deployment

Check that the container is running and healthy:

```bash
# Check container status
docker ps

# Expected output shows "healthy" in STATUS column after ~40 seconds:
# CONTAINER ID   IMAGE     STATUS                    PORTS
# abc123...      ...       Up 1 minute (healthy)     0.0.0.0:3000->3000/tcp
```

View container logs:

```bash
# Follow logs in real-time
docker-compose logs -f

# Or view last 100 lines
docker-compose logs --tail=100

# Exit log view with Ctrl+C
```

### Step 8: Test Backend Connectivity

Verify the frontend can reach the backend:

```bash
# Shell into the frontend container
docker exec -it sona-provisioning-frontend sh

# Test backend connectivity (replace with your backend container name)
wget -O- http://sona-backend:3333/api/v1/subscribers
# Or use curl if available: curl http://sona-backend:3333/api/v1/subscribers

# Exit the container
exit
```

If you see a response from the backend, connectivity is working!

### Step 9: Configure VPS Nginx

Your VPS nginx should proxy requests to the frontend container. Example configuration:

```nginx
upstream provisioning_frontend {
    server localhost:3000;  # Or whatever PROVISIONING_FRONTEND_PORT you set
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL configuration (your existing setup)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Proxy to frontend
    location / {
        proxy_pass http://provisioning_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Reload nginx after updating configuration:

```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### Step 10: Access Application

Open your browser and navigate to your domain:

```
https://yourdomain.com
```

You should see the Sona Provisioning login page!

## Updating the Application

When you need to deploy updates:

```bash
# Navigate to project directory
cd /path/to/provisioning_frontend

# Pull latest code
git pull origin main  # Or your branch name

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Verify
docker-compose logs -f
```

## Common Operations

### View Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 50 lines
docker-compose logs --tail=50

# Logs since 1 hour ago
docker-compose logs --since=1h

# Save logs to file
docker-compose logs > frontend-logs.txt
```

### Restart Container

```bash
# Restart without rebuilding
docker-compose restart

# Stop and start (recreate container)
docker-compose down
docker-compose up -d
```

### Check Health Status

```bash
# View container health
docker ps

# Detailed health check logs
docker inspect sona-provisioning-frontend | grep -A 10 Health
```

### Shell into Container

```bash
# Access container shell
docker exec -it sona-provisioning-frontend sh

# View container filesystem
ls -la

# Check environment variables
env | grep NEXT

# Exit
exit
```

## Troubleshooting

### Issue: Container Won't Start

**Symptoms:** Container exits immediately after starting

**Debug steps:**
```bash
# Check logs for errors
docker-compose logs

# Common issues:
# - .env.production not found
# - Syntax error in .env.production
# - Port already in use
```

**Solutions:**
- Ensure `.env.production` exists and is valid
- Check if port is available: `sudo lsof -i :3000`
- Verify Docker Compose syntax: `docker-compose config`

### Issue: Can't Connect to Backend

**Symptoms:**
- Frontend loads but API calls fail
- Browser console shows network errors

**Debug steps:**
```bash
# 1. Verify backend is running
docker ps | grep backend

# 2. Check network connectivity
docker network inspect sona-network

# 3. Verify both containers are in network
# Should show both frontend and backend containers

# 4. Test from inside frontend container
docker exec -it sona-provisioning-frontend sh
wget -O- http://sona-backend:3333/  # Replace with your backend name
```

**Solutions:**
- Ensure `NEXT_PUBLIC_API_URL` uses correct container name
- Verify backend container is on `sona-network`
- Check backend container name: `docker ps --format "{{.Names}}"`
- Reconnect backend to network: `docker network connect sona-network <backend-name>`

### Issue: Health Check Failing

**Symptoms:** Container shows "unhealthy" status

**Debug steps:**
```bash
# Check health logs
docker inspect sona-provisioning-frontend --format='{{json .State.Health}}' | jq

# Test health check manually
docker exec sona-provisioning-frontend wget --quiet --tries=1 --spider http://localhost:3000/
echo $?  # Should output 0 if healthy
```

**Solutions:**
- Wait 40 seconds for startup period
- Check application logs: `docker-compose logs`
- Verify Next.js is listening on port 3000

### Issue: 502 Bad Gateway from Nginx

**Symptoms:** Nginx returns 502 error

**Debug steps:**
```bash
# Check if container is running
docker ps | grep frontend

# Test direct connection to container
curl -I http://localhost:3000

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

**Solutions:**
- Ensure container is running and healthy
- Verify `PROVISIONING_FRONTEND_PORT` matches nginx upstream
- Check nginx configuration and reload: `sudo nginx -t && sudo systemctl reload nginx`

### Issue: Environment Variables Not Working

**Symptoms:** App behaves as if environment variables are not set

**Debug steps:**
```bash
# Check environment inside container
docker exec sona-provisioning-frontend env | grep NEXT

# Verify .env.production exists
ls -la .env.production

# Check docker-compose configuration
docker-compose config
```

**Solutions:**
- Ensure `.env.production` is in same directory as `docker-compose.yml`
- Verify no typos in variable names
- Rebuild container after changing env vars: `docker-compose up -d --build`
- Remember: `NEXT_PUBLIC_*` variables are baked into build, so rebuild is required

## Performance Optimization

### Enable Docker BuildKit

For faster builds:

```bash
# Enable BuildKit (modern Docker build engine)
export DOCKER_BUILDKIT=1

# Or set in daemon.json permanently
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "features": {
    "buildkit": true
  }
}
```

Then restart Docker: `sudo systemctl restart docker`

### Use Build Cache

When rebuilding frequently during development:

```bash
# Build with cache
docker-compose build

# Force rebuild without cache (slower but ensures fresh build)
docker-compose build --no-cache
```

## Monitoring

### Check Resource Usage

```bash
# Real-time stats
docker stats sona-provisioning-frontend

# One-time stats
docker stats --no-stream sona-provisioning-frontend
```

### Monitor Health

Set up automated health monitoring:

```bash
# Check health every 5 minutes
*/5 * * * * docker inspect --format='{{.State.Health.Status}}' sona-provisioning-frontend | grep -q 'healthy' || echo "Frontend unhealthy!" | mail -s "Frontend Health Alert" admin@example.com
```

## Backup and Recovery

### Backup Configuration

```bash
# Backup environment and compose files
tar -czf frontend-config-backup-$(date +%Y%m%d).tar.gz \
  .env.production \
  docker-compose.yml \
  Dockerfile
```

### Disaster Recovery

```bash
# Stop container
docker-compose down

# Remove container and images
docker rm sona-provisioning-frontend
docker rmi provisioning_frontend_provisioning-frontend

# Restore from backup
tar -xzf frontend-config-backup-YYYYMMDD.tar.gz

# Rebuild and start
docker-compose up -d --build
```

## Security Best Practices

1. **Keep Secrets Secure**
   - Never commit `.env.production` to git
   - Use proper file permissions: `chmod 600 .env.production`

2. **Regular Updates**
   - Update base images regularly
   - Keep dependencies up to date: `pnpm update`

3. **Network Isolation**
   - Only expose necessary ports
   - Use Docker networks for internal communication

4. **Logging**
   - Monitor logs regularly
   - Set up log rotation for container logs

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Networking](https://docs.docker.com/network/)

## Support

If you encounter issues not covered in this guide:

1. Check container logs: `docker-compose logs -f`
2. Verify network connectivity: `docker network inspect sona-network`
3. Test backend connectivity from frontend container
4. Check VPS nginx logs: `sudo tail -f /var/log/nginx/error.log`
