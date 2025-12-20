#!/bin/bash

# Install git hooks for the project

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/hooks"
GIT_HOOKS_DIR="$(git rev-parse --show-toplevel)/.git/hooks"

echo "Installing git hooks..."

for hook in "$HOOKS_DIR"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        cp "$hook" "$GIT_HOOKS_DIR/$hook_name"
        chmod +x "$GIT_HOOKS_DIR/$hook_name"
        echo "  ✓ Installed $hook_name"
    fi
done

echo "Done! Git hooks installed."
