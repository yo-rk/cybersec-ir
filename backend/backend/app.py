import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify
import psycopg2

load_dotenv(
    Path(__file__).resolve().parent / ".env",
    override=True,
    encoding="utf-8",
)

app = Flask(__name__)


def get_db_connection():
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)

    required = ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME")
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        raise RuntimeError(
            "Missing database config. Set DATABASE_URL or all of: "
            + ", ".join(required)
        )

    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        database=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        port=os.environ.get("DB_PORT", "5432"),
        sslmode=os.environ.get("DB_SSLMODE", "require"),
    )


@app.after_request
def add_cors(response):
    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
    response.headers["Access-Control-Allow-Origin"] = allowed_origins
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/add_event", methods=["POST", "OPTIONS"])
def add_event():
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    required_fields = ["source_ip", "destination_ip", "event_type", "severity", "description"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO Events (source_ip, destination_ip, event_type, severity, description)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                data["source_ip"],
                data["destination_ip"],
                data["event_type"],
                data["severity"],
                data["description"],
            ),
        )
        conn.commit()

        cursor.execute(
            """
            INSERT INTO Alerts (event_id, alert_type, risk_score, status)
            SELECT
                MIN(e.event_id),
                'Brute Force Attack',
                85,
                'OPEN'
            FROM Events e
            WHERE e.source_ip = %s
            GROUP BY e.source_ip
            HAVING COUNT(*) > 5
            AND NOT EXISTS (
                SELECT 1 FROM Alerts al
                JOIN Events ev ON al.event_id = ev.event_id
                WHERE al.alert_type = 'Brute Force Attack'
                AND ev.source_ip = e.source_ip
            );
            """,
            (data["source_ip"],),
        )
        conn.commit()

        return jsonify({"message": "Event processed"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@app.route("/alerts", methods=["GET"])
def get_alerts():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT DISTINCT
                A.alert_id,
                A.alert_type,
                T.name AS threat,
                V.name AS vulnerability,
                M.action_name,
                A.risk_score,
                A.status,
                E.source_ip
            FROM Alerts A
            JOIN Events E ON A.event_id = E.event_id
            JOIN Alert_Threat AT ON A.alert_id = AT.alert_id
            JOIN Threats T ON AT.threat_id = T.threat_id
            JOIN Threat_Vulnerability TV ON T.threat_id = TV.threat_id
            JOIN Vulnerabilities V ON TV.vuln_id = V.vuln_id
            JOIN Alert_Action AA ON A.alert_id = AA.alert_id
            JOIN Mitigation_Actions M ON AA.action_id = M.action_id
            ORDER BY A.alert_id DESC;
            """
        )

        rows = cursor.fetchall()
        return jsonify(rows), 200

    except Exception as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@app.route("/resolve_alert/<int:alert_id>", methods=["POST", "OPTIONS"])
def resolve_alert(alert_id):
    """Mark an alert as RESOLVED by its ID."""
    if request.method == "OPTIONS":
        return "", 204

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Check the alert exists
        cursor.execute("SELECT status FROM Alerts WHERE alert_id = %s", (alert_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": f"Alert {alert_id} not found"}), 404

        if row[0] == "RESOLVED":
            return jsonify({"message": f"Alert {alert_id} is already resolved"}), 200

        cursor.execute(
            "UPDATE Alerts SET status = 'RESOLVED' WHERE alert_id = %s",
            (alert_id,),
        )
        conn.commit()

        return jsonify({"message": f"Alert {alert_id} resolved"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@app.route("/health", methods=["GET"])
def health():
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500


if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode)