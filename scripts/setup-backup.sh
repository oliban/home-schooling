#!/bin/bash
# Setup automated backups with Fly.io API token
# This ensures backups work without manual authentication

set -e

echo "Setting up automated backups for production database..."
echo ""

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "Error: fly CLI not found. Install it first:"
    echo "  brew install flyctl"
    exit 1
fi

echo "Step 1: Generate a Fly.io deploy token"
echo "----------------------------------------"
echo "Run this command and copy the token:"
echo ""
echo "  fly tokens create deploy"
echo ""
read -p "Press Enter after you've copied the token..."

echo ""
echo "Step 2: Enter your Fly.io token"
echo "--------------------------------"
read -s -p "Paste your FLY_API_TOKEN: " FLY_TOKEN
echo ""

if [ -z "$FLY_TOKEN" ]; then
    echo "Error: No token provided"
    exit 1
fi

# Update the plist file with the token
PLIST_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/com.teacher.backup.plist"
sed -i '' "s|REPLACE_WITH_YOUR_FLY_TOKEN|$FLY_TOKEN|g" "$PLIST_FILE"

echo ""
echo "Step 3: Install/reload the launchd agent"
echo "-----------------------------------------"

# Unload if already loaded
launchctl unload ~/Library/LaunchAgents/com.teacher.backup.plist 2>/dev/null || true

# Copy to LaunchAgents
cp "$PLIST_FILE" ~/Library/LaunchAgents/

# Load the agent
launchctl load ~/Library/LaunchAgents/com.teacher.backup.plist

echo ""
echo "✓ Automated backups are now configured!"
echo ""
echo "The backup will run:"
echo "  - When your Mac wakes up or you log in"
echo "  - Every 4 hours while awake (as fallback)"
echo "  - Only once per day (skips if backup exists)"
echo ""
echo "Logs:"
echo "  Success: $HOME/Projects/teacher/backups/backup.log"
echo "  Errors:  $HOME/Projects/teacher/backups/launchd-error.log"
echo ""
echo "To test the backup now, run:"
echo "  ./scripts/backup-prod.sh -f"
