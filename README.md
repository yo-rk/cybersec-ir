# 🛡️ CyberSec Incident Response Dashboard

🚨 A **real-time cybersecurity monitoring dashboard** that simulates, detects, and resolves cyber attacks — built to mimic a Security Operations Center (SOC) workflow.

---

## 🌐 Live Demo

👉 https://cybersec-ir.vercel.app

---

## 🧠 Problem

Modern systems face constant cyber threats — but most academic projects fail to simulate **real-time monitoring and response workflows**.

Security teams need:

* Immediate visibility into threats
* Risk prioritization
* Fast resolution mechanisms

---

## 💡 Solution

This project recreates a **SOC-style dashboard** where:

* Attacks are simulated dynamically (DDoS, SQL Injection, Phishing, Malware)
* Alerts are categorized by severity (Critical, High, etc.)
* Analysts can monitor, prioritize, and resolve threats in real-time
* Data is visualized through interactive charts and metrics

---

## ⚡ Key Features

* 🔴 Real-time alert monitoring
* ⚡ Attack simulation engine
* 📊 Interactive analytics (type distribution & status breakdown)
* 🛡 Risk classification system
* ✅ Alert resolution workflow
* 🔄 Auto-refreshing dashboard

---

## 🧱 Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Flask (Python) + Flask-CORS
* **Database:** Supabase (PostgreSQL)
* **Deployment:** Vercel (Frontend) + Render (Backend)

---

## 📁 Project Structure

```
cybersec-ir/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

* Python 3.10+
* Supabase project with `incidents` table

---

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `.env` file:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

Run:

```bash
python app.py
```

---

### Frontend

```bash
cd frontend
open index.html
```

---

## 📡 API Endpoints

| Method | Endpoint           | Description               |
| ------ | ------------------ | ------------------------- |
| POST   | `/simulate-attack` | Generate simulated attack |
| GET    | `/get-active`      | Fetch active alerts       |
| GET    | `/get-resolved`    | Fetch resolved alerts     |
| PUT    | `/resolve/<id>`    | Resolve alert             |
| GET    | `/health`          | Health check              |

---

## 🔮 Future Improvements

* 🔌 WebSocket-based real-time updates
* 🤖 AI-based threat detection
* 🔐 Authentication & role-based access
* 📈 Advanced analytics dashboard

---

## 💡 Why This Project Matters

This project demonstrates:

* Full-stack system design
* Real-time data handling
* API-based architecture
* Practical cybersecurity use-case simulation

---

## 📄 License

For educational purposes.
