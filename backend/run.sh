#!/usr/bin/env bash
# run.sh — Start ResQGrid backend (creates venv if needed)
set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "Copied .env.example → .env (fill in keys for real integrations)"
fi

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
