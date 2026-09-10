#!/bin/sh
export PORT=${PORT:-10000}
echo "Starting on port: $PORT"
exec gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --log-level info
