#!/bin/bash

# Quick fix script for "Too many open files" error on Hetzner server
# Run this script on your Hetzner server (not in Docker)

echo "🔧 Fixing 'Too many open files' error..."

# 1. Increase limits for current session
ulimit -n 65536
echo "✅ Set ulimit to 65536 for current session"

# 2. Update /etc/security/limits.conf
if ! grep -q "nofile 65536" /etc/security/limits.conf; then
    echo "" >> /etc/security/limits.conf
    echo "# SkillMatch - Increase file descriptor limits" >> /etc/security/limits.conf
    echo "* soft nofile 65536" >> /etc/security/limits.conf
    echo "* hard nofile 65536" >> /etc/security/limits.conf
    echo "root soft nofile 65536" >> /etc/security/limits.conf
    echo "root hard nofile 65536" >> /etc/security/limits.conf
    echo "✅ Updated /etc/security/limits.conf"
else
    echo "ℹ️  /etc/security/limits.conf already configured"
fi

# 3. Update Docker daemon config
DOCKER_DAEMON="/etc/docker/daemon.json"
if [ ! -f "$DOCKER_DAEMON" ]; then
    echo "{}" > "$DOCKER_DAEMON"
fi

# Check if ulimits are already set
if ! grep -q "default-ulimits" "$DOCKER_DAEMON"; then
    # Use Python to safely update JSON
    python3 << EOF
import json
import sys

try:
    with open('$DOCKER_DAEMON', 'r') as f:
        config = json.load(f)
except:
    config = {}

if 'default-ulimits' not in config:
    config['default-ulimits'] = {
        'nofile': {
            'Name': 'nofile',
            'Hard': 65536,
            'Soft': 65536
        }
    }
    with open('$DOCKER_DAEMON', 'w') as f:
        json.dump(config, f, indent=2)
    print("✅ Updated Docker daemon.json")
else:
    print("ℹ️  Docker daemon.json already configured")
EOF
else
    echo "ℹ️  Docker daemon.json already configured"
fi

# 4. Update systemd service limits (if using systemd)
SYSTEMD_OVERRIDE="/etc/systemd/system/docker.service.d/override.conf"
mkdir -p "$(dirname $SYSTEMD_OVERRIDE)"
if [ ! -f "$SYSTEMD_OVERRIDE" ]; then
    cat > "$SYSTEMD_OVERRIDE" << EOF
[Service]
LimitNOFILE=65536
EOF
    echo "✅ Created systemd override for Docker"
    systemctl daemon-reload
else
    echo "ℹ️  Systemd override already exists"
fi

# 5. Restart Docker
echo "🔄 Restarting Docker daemon..."
systemctl restart docker

echo ""
echo "✅ Fix applied! Please:"
echo "1. Log out and log back in (or reboot) for limits to take full effect"
echo "2. Restart your Docker containers: docker-compose restart"
echo "3. Verify with: ulimit -n"

