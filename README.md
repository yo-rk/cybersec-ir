# 🛡️ CyberSec Incident Response Dashboard

A real-time cybersecurity incident response dashboard that simulates, monitors, and resolves cyber attacks. Built with a Flask backend and a vanilla HTML/CSS/JS frontend, powered by Supabase for data persistence.

## 📁 Project Structure

```
cybersec-ir/
│
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│
├── frontend/
│   ├── index.html          # Dashboard UI
│   ├── style.css           # Styling
│   ├── app.js              # Frontend logic & API calls
│
├── README.md
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- A [Supabase](https://supabase.com/) project with an `incidents` table

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

Run the server:

```bash
python app.py
```

The API will start on `http://127.0.0.1:5050`.

### Frontend

Open `frontend/index.html` in a browser, or serve it with a local server like Live Server.

## 📡 API Endpoints

| Method | Endpoint               | Description                  |
|--------|------------------------|------------------------------|
| POST   | `/simulate-attack`     | Simulate a random attack     |
| GET    | `/get-active`          | Get active (unresolved) alerts |
| PUT    | `/resolve/<id>`        | Resolve an incident by ID    |
| GET    | `/get-resolved`        | Get resolved incidents       |
| GET    | `/health`              | Health check                 |

## 🛠️ Tech Stack

- **Backend:** Python, Flask, Flask-CORS
- **Frontend:** HTML, CSS, JavaScript
- **Database:** Supabase (PostgreSQL)

## 📄 License

This project is for educational purposes.
