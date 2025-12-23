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
#   REDIS_HOST       - Redis server hostname (default: localhost)
#                      Set via: fly secrets set REDIS_HOST=<redis-host>
#   REDIS_PORT       - Redis server port (default: 6379)
#                      Set via: fly secrets set REDIS_PORT=6379
#   REDIS_PASSWORD   - Redis authentication password (optional for local dev)
#                      Set via: fly secrets set REDIS_PASSWORD=<password>
#
# ============================================================================

# Start backend
# Note: ALLOWED_ORIGINS, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD are passed through from environment (set via fly secrets)
cd /app/backend
DATABASE_PATH=/data/teacher.db \
  REDIS_HOST="${REDIS_HOST:-localhost}" \
  REDIS_PORT="${REDIS_PORT:-6379}" \
  REDIS_PASSWORD="${REDIS_PASSWORD}" \
  node dist/index.js &

# Wait for backend to start
sleep 2

# Start frontend
cd /app/frontend
HOSTNAME=0.0.0.0 PORT=3000 node server.js &

# Wait for frontend to start
sleep 2

# Start nginx in foreground
nginx -g 'daemon off;'
