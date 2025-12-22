#!/bin/bash

# Development script - starts both backend and frontend

# Kill any existing processes on our ports
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "Killing existing process on port $port (PID: $pid)"
        kill $pid 2>/dev/null
        sleep 1
    fi
}

kill_port 6001
kill_port 5001

cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting Teacher Portal..."

# Start backend
echo "Starting backend on port 6001..."
cd /Users/fredriksafsten/Projects/teacher/backend
PORT=6001 npm run dev &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Start frontend
echo "Starting frontend on port 5001..."
cd /Users/fredriksafsten/Projects/teacher/frontend
PORT=5001 npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  Teacher Portal running!"
echo "  Frontend: http://localhost:5001"
echo "  Backend:  http://localhost:6001"
echo "  Press Ctrl+C to stop"
echo "========================================="
echo ""

# Wait for both processes
wait
