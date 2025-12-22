#!/bin/sh

# ============================================================================
# Teacher Portal Startup Script
# ============================================================================
#
# Environment Variables:
#   DATABASE_PATH    - Path to SQLite database file (default: /data/teacher.db)
#   ALLOWED_ORIGINS  - Comma-separated list of allowed CORS origins
#                      Example: https://your-domain.com,https://admin.your-domain.com
#                      Required for production to restrict cross-origin requests.
#                      Set via: fly secrets set ALLOWED_ORIGINS=https://your-domain.com
#
# ============================================================================

# Start backend
# Note: ALLOWED_ORIGINS is passed through from environment (set via fly secrets)
cd /app/backend
DATABASE_PATH=/data/teacher.db node dist/index.js &

# Wait for backend to start
sleep 2

# Start frontend
cd /app/frontend
HOSTNAME=0.0.0.0 PORT=3000 node server.js &

# Wait for frontend to start
sleep 2

# Start nginx in foreground
nginx -g 'daemon off;'
