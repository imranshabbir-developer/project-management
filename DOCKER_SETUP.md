# Docker Setup Guide for SkillMatch Backend

## Fixing "Too Many Open Files" Error

The "Too many open files" error occurs when the system runs out of file descriptors. This guide helps you fix it.

## Solution 1: Docker Compose (Recommended)

The `docker-compose.yml` file already includes ulimit settings. To use it:

```bash
docker-compose up -d
```

## Solution 2: Increase System Limits on Host

If you're running Docker directly, increase the system limits on your Hetzner server:

### 1. Check current limits:
```bash
ulimit -n
```

### 2. Increase limits temporarily (until reboot):
```bash
ulimit -n 65536
```

### 3. Make it permanent:

Edit `/etc/security/limits.conf`:
```bash
sudo nano /etc/security/limits.conf
```

Add these lines:
```
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
```

### 4. For Docker daemon, edit `/etc/docker/daemon.json`:
```bash
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  }
}
```

Then restart Docker:
```bash
sudo systemctl restart docker
```

## Solution 3: Run Container with Ulimits

If running `docker run` directly:

```bash
docker run -d \
  --name skillmatch-backend \
  --ulimit nofile=65536:65536 \
  -p 5000:5000 \
  -v $(pwd)/uploads:/app/uploads \
  --env-file .env \
  skillmatch-backend
```

## Building the Image

```bash
docker build -t skillmatch-backend .
```

## Environment Variables

Make sure your `.env` file contains all required variables:
- `PORT=5000`
- `MONGODB_URI=your_mongodb_connection_string`
- `JWT_SECRET=your_jwt_secret`
- `JWT_EXPIRE=7d`
- `JWT_REFRESH_SECRET=your_refresh_secret`
- `JWT_REFRESH_EXPIRE=30d`
- `FRONTEND_URL=your_frontend_url`
- Firebase credentials

## Health Check

The container includes a health check endpoint at `/health`. Monitor it:

```bash
curl http://localhost:5000/health
```

## Logs

View logs:
```bash
docker-compose logs -f backend
# or
docker logs -f skillmatch-backend
```

## Troubleshooting

1. **Still seeing "too many open files"**: 
   - Check if the host system limits are increased
   - Restart Docker daemon after changing daemon.json
   - Verify ulimits in docker-compose.yml

2. **Container won't start**:
   - Check logs: `docker logs skillmatch-backend`
   - Verify .env file exists and has all required variables
   - Check MongoDB connection string

3. **File uploads not working**:
   - Ensure uploads directory has proper permissions
   - Check volume mount in docker-compose.yml

