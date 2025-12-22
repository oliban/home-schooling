#!/bin/bash
# Installs the launchd agent for automatic daily backups
# Usage: ./scripts/install-backup-scheduler.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_SOURCE="$SCRIPT_DIR/com.teacher.backup.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.teacher.backup.plist"
LABEL="com.teacher.backup"

# Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

# Unload existing agent if present
if launchctl list | grep -q "$LABEL"; then
    echo "Unloading existing agent..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# Copy plist to LaunchAgents
echo "Installing launchd agent..."
cp "$PLIST_SOURCE" "$PLIST_DEST"

# Load the agent
echo "Loading agent..."
launchctl load "$PLIST_DEST"

echo ""
echo "Backup scheduler installed successfully!"
echo ""
echo "The backup will run:"
echo "  - On every login/wake"
echo "  - Every 4 hours while your Mac is awake"
echo "  - Only once per day (skips if backup already exists)"
echo ""
echo "To check status:  launchctl list | grep teacher"
echo "To uninstall:     launchctl unload $PLIST_DEST && rm $PLIST_DEST"
echo "To view logs:     cat $SCRIPT_DIR/../backups/backup.log"
