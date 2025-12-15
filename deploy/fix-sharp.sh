#!/bin/bash
# Quick fix for sharp module on Linux VPS
# Run this if you get "Could not load the sharp module" error

echo "🔧 Fixing sharp module for Linux..."

cd /var/www/naval-command

# Rebuild sharp for the current platform
echo "Rebuilding sharp..."
npm rebuild sharp --verbose

# Restart the bot
echo "Restarting bot..."
pm2 restart naval-bot

echo ""
echo "✅ Done! Check bot status:"
pm2 logs naval-bot --lines 20
