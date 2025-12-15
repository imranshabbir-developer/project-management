# 🐳 Docker Deployment - Quick Fix Guide

## ⚡ IMMEDIATE FIX for "Too Many Open Files" Error

### Step 1: Run on Your Hetzner Server

```bash
cd skill-match-backend

# Make script executable
chmod +x fix-ulimits.sh

# Run the fix script (requires sudo)
sudo ./fix-ulimits.sh
```

### Step 2: Rebuild and Restart Containers

```bash
# Stop existing containers
docker-compose down

# Rebuild with new configuration
docker-compose build --no-cache

# Start containers
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

### Step 3: Verify the Fix

```bash
# Check if error is gone
docker-compose logs backend | grep -i "too many open files"

# Should return nothing if fixed

# Check ulimits in container
docker exec skillmatch-backend sh -c "ulimit -n"

# Should show: 65536
```

## What Was Fixed

✅ **Dockerfile**: Added startup script that sets ulimits  
✅ **docker-compose.yml**: Enhanced ulimit configuration with security options  
✅ **fix-ulimits.sh**: Automated script to fix system limits  
✅ **QUICK_FIX.md**: Step-by-step manual fix guide  

## If Error Still Persists

1. **Check system limits:**
```bash
ulimit -n
# Should be 65536
```

2. **Verify Docker daemon config:**
```bash
cat /etc/docker/daemon.json
# Should have default-ulimits section
```

3. **Restart Docker service:**
```bash
sudo systemctl restart docker
```

4. **Force recreate containers:**
```bash
docker-compose down -v
docker-compose up -d --force-recreate
```

## Quick Manual Fix (If Script Doesn't Work)

```bash
# 1. Set limit immediately
ulimit -n 65536

# 2. Edit limits file
sudo nano /etc/security/limits.conf
# Add:
# * soft nofile 65536
# * hard nofile 65536

# 3. Edit Docker daemon
sudo nano /etc/docker/daemon.json
# Add:
# {
#   "default-ulimits": {
#     "nofile": {"Name": "nofile", "Hard": 65536, "Soft": 65536}
#   }
# }

# 4. Restart Docker
sudo systemctl restart docker

# 5. Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Files Created

- `Dockerfile` - Updated with ulimit startup script
- `docker-compose.yml` - Enhanced ulimit configuration
- `fix-ulimits.sh` - Automated fix script
- `QUICK_FIX.md` - Detailed manual instructions
- `.dockerignore` - Excludes unnecessary files

The error should be resolved after running the fix script and rebuilding containers.

