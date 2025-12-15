#!/bin/bash
# Cleanup disk space on VPS
# Run this if you get "No space left on device" errors

echo "🧹 Cleaning up disk space..."
echo "=============================="

# Show current disk usage
echo "Current disk usage:"
df -h /
echo ""

# Clean APT cache
echo "📦 Cleaning APT cache..."
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y

# Clean old journal logs
echo "📝 Cleaning old system logs..."
sudo journalctl --vacuum-time=3d

# Clean npm cache
echo "📦 Cleaning npm cache..."
npm cache clean --force

# Clean PM2 logs (keep last 100 lines)
echo "📝 Cleaning PM2 logs..."
pm2 flush

# Remove old kernels (keep current)
echo "🗑️  Removing old kernels..."
sudo apt-get autoremove --purge -y

# Clean temporary files
echo "🗑️  Cleaning temporary files..."
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Clean old log files
echo "📝 Cleaning old log files..."
sudo find /var/log -type f -name "*.log" -mtime +7 -delete
sudo find /var/log -type f -name "*.gz" -delete

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Disk usage after cleanup:"
df -h /
echo ""
echo "If still low on space, consider:"
echo "  - Deleting old Docker images: docker system prune -a"
echo "  - Checking large files: sudo du -h / | sort -rh | head -n 20"
