#!/bin/bash
# Downloads production database from Fly.io
# Usage: ./scripts/backup-prod.sh
#
# Runs automatically on wake/login via launchd.
# Creates timestamped backups (multiple backups per day supported).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/teacher-$TIMESTAMP.db"
LOG_FILE="$BACKUP_DIR/backup.log"

# Create backup directory if needed
mkdir -p "$BACKUP_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting backup..." >> "$LOG_FILE"

# Ensure the machine is started (idempotent - safe to run even if already started)
echo "Ensuring app is running..."
# Get machine ID - use jq if available, otherwise parse text output
if command -v jq &> /dev/null; then
    MACHINE_ID=$(fly machines list -a brainrot-skolan -j 2>/dev/null | jq -r '.[0].id' 2>/dev/null)
else
    # Parse text output: strip ANSI codes and get first machine ID
    MACHINE_ID=$(fly machines list -a brainrot-skolan 2>/dev/null | perl -pe 's/\e\[[0-9;]*m//g' | awk 'NR>2 && length($1)==14 {print $1; exit}')
fi

if [ -n "$MACHINE_ID" ] && [ "$MACHINE_ID" != "null" ]; then
    echo "Starting machine $MACHINE_ID..."
    fly machine start "$MACHINE_ID" -a brainrot-skolan 2>&1 | grep -v "already started" || true
    echo "Waiting for machine to be ready..."
    sleep 8
else
    echo "Warning: Could not find machine ID, attempting backup anyway..."
fi

echo "Downloading production database..."

# Download from Fly.io using sftp
TEMP_FILE="$BACKUP_FILE.tmp"
if fly ssh sftp get /data/teacher.db "$TEMP_FILE" -a brainrot-skolan; then
    # Verify the downloaded file is a valid SQLite database
    if file "$TEMP_FILE" | grep -q "SQLite"; then
        # Move temp file to final location
        mv "$TEMP_FILE" "$BACKUP_FILE"

        # Update symlinks
        cd "$BACKUP_DIR"
        ln -sf "teacher-$TIMESTAMP.db" "latest.db"
        ln -sf "teacher-$TIMESTAMP.db" "latest-$DATE.db"

        FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
        echo "Backup saved to $BACKUP_FILE ($FILE_SIZE)"
        echo "Symlinks updated:"
        echo "  - latest.db -> teacher-$TIMESTAMP.db"
        echo "  - latest-$DATE.db -> teacher-$TIMESTAMP.db"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup completed: $BACKUP_FILE ($FILE_SIZE)" >> "$LOG_FILE"

        # Clean up backups older than 2 weeks (14 days)
        echo "Cleaning up old backups (older than 14 days)..."
        OLD_BACKUP_COUNT=$(find "$BACKUP_DIR" -name "teacher-*.db" -type f -mtime +14 | wc -l | tr -d ' ')
        if [ "$OLD_BACKUP_COUNT" -gt 0 ]; then
            find "$BACKUP_DIR" -name "teacher-*.db" -type f -mtime +14 -delete
            echo "Removed $OLD_BACKUP_COUNT old backup(s)"
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleaned up $OLD_BACKUP_COUNT backup(s) older than 14 days" >> "$LOG_FILE"
        else
            echo "No old backups to remove"
        fi
    else
        echo "Error: Downloaded file is not a valid SQLite database" >&2
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Invalid database file downloaded" >> "$LOG_FILE"
        rm -f "$TEMP_FILE"
        exit 1
    fi
else
    echo "Error: Failed to download database from Fly.io" >&2
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Download failed" >> "$LOG_FILE"
    rm -f "$TEMP_FILE"
    exit 1
fi
