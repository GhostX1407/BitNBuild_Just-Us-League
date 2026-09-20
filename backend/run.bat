@echo off
REM run.bat — Start ResQGrid backend on Windows
cd /d "%~dp0"

IF NOT EXIST ".venv" (
    python -m venv .venv
)

call .venv\Scripts\activate.bat
pip install -q -r requirements.txt

IF NOT EXIST ".env" IF EXIST ".env.example" (
    copy .env.example .env
    echo Copied .env.example to .env - fill in keys for real integrations
)

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
