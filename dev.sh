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

        # Check if still running, force kill if needed
        if lsof -ti :$port 2>/dev/null >/dev/null; then
            echo "Process still running, force killing..."
            kill -9 $(lsof -ti :$port 2>/dev/null) 2>/dev/null
            sleep 0.5
        fi
    fi
}

kill_port 6001
kill_port 5001
kill_port 3000

cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Stopping Redis..."
    cd /Users/fredriksafsten/Projects/teacher
    docker-compose stop redis >/dev/null 2>&1
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting Teacher Portal..."

# Function to check Docker with timeout
check_docker() {
    ( docker info >/dev/null 2>&1 ) &
    local pid=$!
    local count=0
    while kill -0 $pid 2>/dev/null && [ $count -lt 5 ]; do
        sleep 1
        count=$((count + 1))
    done
    if kill -0 $pid 2>/dev/null; then
        kill -9 $pid 2>/dev/null
        return 1
    fi
    wait $pid
    return $?
}

# Check if Docker is running, launch if needed
echo "Checking Docker status..."
if ! check_docker; then
    echo "Docker is not running. Starting Docker Desktop..."
    open -a Docker

    # Wait for Docker to be ready (max 60 seconds)
    echo "Waiting for Docker to start..."
    for i in {1..60}; do
        if check_docker; then
            echo "Docker is ready!"
            break
        fi
        if [ $i -eq 60 ]; then
            echo "Error: Docker failed to start within 60 seconds"
            exit 1
        fi
        sleep 1
    done
fi

# Start Redis if not already running
echo "Ensuring Redis is running..."
cd /Users/fredriksafsten/Projects/teacher
docker-compose up -d redis

# Wait for Redis to be healthy
echo "Waiting for Redis to be ready..."
for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        echo "Redis is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Warning: Redis failed to start within 30 seconds"
    fi
    sleep 1
done

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
