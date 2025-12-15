# 🚨 QUICK FIX: "Too Many Open Files" Error

## Immediate Solution (Run on Hetzner Server)

### Option 1: Quick Fix Script (Recommended)

```bash
cd skill-match-backend
chmod +x fix-ulimits.sh
sudo ./fix-ulimits.sh
```

### Option 2: Manual Quick Fix

**1. Increase limits immediately:**
```bash
ulimit -n 65536
```

**2. Update system limits permanently:**
```bash
sudo nano /etc/security/limits.conf
```

Add these lines at the end:
```
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
```

**3. Update Docker daemon:**
```bash
sudo nano /etc/docker/daemon.json
```

Add/update with:
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

**4. Restart Docker:**
```bash
sudo systemctl restart docker
```

**5. Rebuild and restart containers:**
```bash
cd skill-match-backend
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Option 3: Temporary Fix (Until Reboot)

If you need an immediate fix without rebooting:

```bash
# Set for current session
ulimit -n 65536

# Restart containers with explicit ulimits
docker-compose down
docker-compose up -d
```

## Verify the Fix

```bash
# Check current limit
ulimit -n

# Should show: 65536

# Check Docker container limits
docker exec skillmatch-backend sh -c "ulimit -n"

# Should show: 65536
```

## If Error Persists

1. **Check if limits are applied:**
```bash
docker exec skillmatch-backend cat /proc/self/limits | grep "open files"
```

2. **Check Docker daemon logs:**
```bash
sudo journalctl -u docker.service -n 50
```

3. **Verify docker-compose.yml has ulimits:**
```bash
cat docker-compose.yml | grep -A 3 ulimits
```

4. **Force recreate containers:**
```bash
docker-compose down -v
docker-compose up -d --force-recreate
```

## Root Cause

The error occurs because:
- Linux has default file descriptor limits (usually 1024)
- Docker containers inherit these limits
- Node.js applications can open many files (sockets, file watchers, etc.)
- The `tail` command uses inotify which requires file descriptors

## Prevention

The updated `docker-compose.yml` and `Dockerfile` now include:
- ✅ Proper ulimit configuration
- ✅ Startup script that sets limits
- ✅ Docker daemon configuration
- ✅ System limits configuration

After applying the fix, the error should not recur.

