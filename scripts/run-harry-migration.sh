#!/bin/bash
# One-time migration script to add 3 shop items to Harry's unlocked inventory
# Run this ONCE on the server after next deploy

set -e

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Path to database (can be overridden with DATABASE_PATH env var)
DB_PATH="${DATABASE_PATH:-$PROJECT_ROOT/data/teacher.db}"
MIGRATION_FILE="$PROJECT_ROOT/backend/src/data/migrations/006_harry_shop_unlock.sql"

echo "Running Harry shop unlock migration..."
echo "Database: $DB_PATH"
echo "Migration: $MIGRATION_FILE"
echo ""

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    exit 1
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

# Show current state before migration
echo "Before migration:"
sqlite3 "$DB_PATH" "SELECT name, unlocked_shop_items FROM children WHERE name = 'Harry';"
echo ""

# Apply the migration
sqlite3 "$DB_PATH" < "$MIGRATION_FILE"

# Show state after migration
echo "After migration:"
sqlite3 "$DB_PATH" "SELECT name, unlocked_shop_items FROM children WHERE name = 'Harry';"
echo ""

echo "Migration completed successfully!"
