# Phase 4: Frontend Dashboard

This is the lightweight Vanilla JS and HTML frontend for the Smart Disaster & Emergency Management Platform. 

## Features
- **No Build Step**: Runs directly in the browser.
- **Tailwind CSS**: Uses the Tailwind CDN for modern, clean styling.
- **Live Connection Status**: Automatically checks if the FastAPI backend is running.
- **Incident Feed**: Displays emergency incidents with pastel severity badges, duplicate indicators, and AI classification reasoning.
- **Auto-polling**: Automatically fetches new incidents every 15 seconds (without reloading the page).

## How to Run

1. **Start the Backend**
   Open a terminal, navigate to the `backend` folder, and start the FastAPI server:
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload
   ```
   *(Ensure `CORS_ORIGINS=*` is in your `.env` file).*

2. **Serve the Frontend**
   Open a *new* terminal, navigate to the `frontend` folder, and run a simple HTTP server:
   ```powershell
   cd frontend
   python -m http.server 3000
   ```

3. **Open in Browser**
   Navigate to [http://localhost:3000](http://localhost:3000) in your web browser.

## File Structure
- `index.html`: The markup, dashboard layout, and Tailwind CSS imports.
- `app.js`: The Vanilla JavaScript logic (fetching data, submitting forms, DOM manipulation).
