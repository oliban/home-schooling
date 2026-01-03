#!/bin/bash
# Restores backup to local database
# Usage: ./scripts/restore-local.sh [backup-file]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

BACKUP_FILE="${1:-$BACKUP_DIR/latest.db}"
LOCAL_DB="$PROJECT_DIR/data/teacher.db"

# Resolve symlink if latest.db
ORIGINAL_BACKUP_FILE="$BACKUP_FILE"
if [ -L "$BACKUP_FILE" ]; then
    ACTUAL_FILE=$(readlink "$BACKUP_FILE")
    BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$ACTUAL_FILE"
    echo "Using most recent backup: $ACTUAL_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    echo ""
    echo "Available backups:"
    ls -lht "$BACKUP_DIR"/teacher-*.db 2>/dev/null | head -10 || echo "  No backups found in $BACKUP_DIR"
    echo ""
    echo "Symlinks:"
    ls -lh "$BACKUP_DIR"/latest*.db 2>/dev/null || true
    exit 1
fi

# Create data directory if needed
mkdir -p "$(dirname "$LOCAL_DB")"

# Backup current local db first
if [ -f "$LOCAL_DB" ]; then
    echo "Backing up current local database to $LOCAL_DB.bak"
    cp "$LOCAL_DB" "$LOCAL_DB.bak"
fi

# Replace local db with backup
cp "$BACKUP_FILE" "$LOCAL_DB"

# Write sync metadata file for verification
SYNC_INFO_FILE="$PROJECT_DIR/data/.last-sync"
cat > "$SYNC_INFO_FILE" << EOF
{
  "syncedAt": $(date +%s)000,
  "sourceFile": "$(basename "$BACKUP_FILE")",
  "syncedAtHuman": "$(date '+%Y-%m-%d %H:%M:%S')"
}
EOF

echo "Local database restored from $BACKUP_FILE"
echo "Location: $LOCAL_DB"
echo "Sync info written to $SYNC_INFO_FILE"
