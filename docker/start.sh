#!/bin/sh

# Start backend
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
