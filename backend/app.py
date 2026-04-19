import os
import random
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

# ================================
# LOAD ENV
# ================================
load_dotenv(Path(__file__).resolve().parent / ".env")

app = Flask(__name__)
CORS(app)
# ================================
# SUPABASE CONFIG (REST)
# ================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# ================================
# SAMPLE DATA
# ================================
attack_types = ["DDoS", "Phishing", "Malware", "SQL Injection"]
severity_levels = ["Low", "Medium", "High", "Critical"]

def generate_ip():
    return ".".join(str(random.randint(0, 255)) for _ in range(4))


# ================================
# SIMULATE ATTACK
# ================================
@app.route("/simulate-attack", methods=["POST"])
def simulate_attack():
    data = {
        "title": "Cyber Attack Detected",
        "type": random.choice(attack_types),
        "severity": random.choice(severity_levels),
        "ip_address": generate_ip(),
        "status": "Active",
        "created_at": datetime.utcnow().isoformat()
    }

    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/incidents",
        json=data,
        headers=HEADERS
    )

    return jsonify(res.json()), 201


# ================================
#  GET ACTIVE ALERTS
# ================================
@app.route("/get-active", methods=["GET"])
def get_active():
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/incidents"
        f"?status=eq.Active&order=created_at.desc&limit=5",
        headers=HEADERS
    )

    return jsonify(res.json()), 200


# ================================
# ✅ RESOLVE INCIDENT
# ================================
@app.route("/resolve/<int:incident_id>", methods=["PUT"])
def resolve_incident(incident_id):
    res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/incidents?id=eq.{incident_id}",
        json={
            "status": "Resolved",
            "resolved_at": datetime.utcnow().isoformat()
        },
        headers=HEADERS
    )

    return jsonify({"message": "Resolved"}), 200


# ===============pyth=================
#  GET RESOLVED ALERTS
# ================================
@app.route("/get-resolved", methods=["GET"])
def get_resolved():
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/incidents"
        f"?status=eq.Resolved&order=created_at.desc",
        headers=HEADERS
    )

    return jsonify(res.json()), 200


# ================================
#  HEALTH CHECK
# ================================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

@app.route("/test")
def test():
    return "WORKING"
# ================================
#  RUN APP
# ================================
if __name__ == "__main__":
    app.run(debug=True, port=5050)