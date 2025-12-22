#!/bin/bash
# Downloads production database from Fly.io
# Usage: ./scripts/backup-prod.sh [-f|--force]
#
# Runs automatically on wake/login via launchd.
# Skips if today's backup already exists (use -f to force).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/teacher-$DATE.db"
LOG_FILE="$BACKUP_DIR/backup.log"

# Create backup directory if needed
mkdir -p "$BACKUP_DIR"

# Check if today's backup already exists (skip unless forced)
if [ -f "$BACKUP_FILE" ] && [ "$1" != "-f" ] && [ "$1" != "--force" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup already exists for today, skipping: $BACKUP_FILE" >> "$LOG_FILE"
    exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting backup..." >> "$LOG_FILE"
echo "Downloading production database..."

# Download from Fly.io using sftp
fly ssh sftp get /data/teacher.db "$BACKUP_FILE" -a home-schooling

# Update latest symlink
cd "$BACKUP_DIR"
ln -sf "teacher-$DATE.db" "latest.db"

echo "Backup saved to $BACKUP_FILE"
echo "Latest symlink updated: $BACKUP_DIR/latest.db"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup completed: $BACKUP_FILE" >> "$LOG_FILE"
