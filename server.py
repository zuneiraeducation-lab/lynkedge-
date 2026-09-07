import hmac
import html
import http.server
import json
import os
import secrets
import tempfile
import threading
from datetime import datetime
from http import cookies
from urllib.parse import parse_qs, urlparse

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.environ.get(
    "LYNKEDGE_DATA_FILE",
    os.path.join(DIRECTORY, "lynkedge_data.json")
)
USERNAME = os.environ.get("LYNKEDGE_USERNAME", "admin")
PASSWORD = os.environ.get("LYNKEDGE_PASSWORD", "admin")
MAX_BODY_BYTES = 16 * 1024

DEFAULT_STATE = {
    "area": "COMPRESSION-VII",
    "unit_number": "UNIT VII PDII",
    "equipment_codes": "TM-061, TM-021, GA-T-AC-0410",
    "status": "",
    "status_options": [],
    "product_name_options": [],
    "material_name_options": [],
    "previous_product_name_options": [],
    "previous_material_name_options": [],
    "batch_number_options": [],
    "sap_batch_number_options": [],
    "previous_product_name": "",
    "previous_material_name": "",
    "product_name": "",
    "material_name": "",
    "batch_number": "B1024",
    "sap_batch_number": "",
    "cleaning_valid_up_to": "",
    "clean_before_datetime": "",
    "updated_by": "",
    "updated_on": "",
    "custom_rows": [],
    "in_charge": "Ahmed",
    "working": 12,
    "production_kits": 450,
    "board_status": "RUNNING",
    "tablet_connected": True,
    "last_updated": datetime.now().strftime("%H:%M:%S")
}
STATE_LOCK = threading.Lock()
SESSIONS = set()


def normalize_custom_rows(value):
    if not isinstance(value, list):
        return []
    rows = []
    for item in value:
        if not isinstance(item, dict):
            continue
        label = item.get("label")
        val = item.get("value")
        value_type = item.get("type", "text")
        if value_type not in ("text", "date", "datetime-local"):
            value_type = "text"
        if isinstance(label, str) and isinstance(val, str):
            rows.append({"label": label.strip(), "value": val.strip(), "type": value_type})
        elif isinstance(label, str):
            rows.append({"label": label.strip(), "value": "", "type": value_type})
    return rows


def normalize_status_options(value):
    if not isinstance(value, list):
        return []
    return list(dict.fromkeys(
        item.strip() for item in value
        if isinstance(item, str) and item.strip()
    ))


def load_state():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as data_file:
            saved_state = json.load(data_file)
        state = DEFAULT_STATE.copy()
        state.update(saved_state)
        state["custom_rows"] = normalize_custom_rows(state.get("custom_rows", []))
        state["status_options"] = normalize_status_options(state.get("status_options", []))
        state["product_name_options"] = normalize_status_options(state.get("product_name_options", []))
        state["material_name_options"] = normalize_status_options(state.get("material_name_options", []))
        state["previous_product_name_options"] = normalize_status_options(state.get("previous_product_name_options", []))
        state["previous_material_name_options"] = normalize_status_options(state.get("previous_material_name_options", []))
        state["batch_number_options"] = normalize_status_options(state.get("batch_number_options", []))
        state["sap_batch_number_options"] = normalize_status_options(state.get("sap_batch_number_options", []))
        return state
    except (OSError, ValueError, TypeError):
        return DEFAULT_STATE.copy()


state = load_state()


def save_state(data):
    directory = os.path.dirname(os.path.abspath(DATA_FILE))
    os.makedirs(directory, exist_ok=True)
    file_descriptor, temporary_file = tempfile.mkstemp(
        prefix="lynkedge-", suffix=".tmp", dir=directory
    )
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as data_file:
            json.dump(data, data_file, indent=2)
            data_file.write("\n")
            data_file.flush()
            os.fsync(data_file.fileno())
        os.replace(temporary_file, DATA_FILE)
    except Exception:
        try:
            os.unlink(temporary_file)
        except OSError:
            pass
        raise


def json_response(handler, status_code, payload, extra_headers=None):
    response = json.dumps(payload).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(response)))
    handler.send_header("Cache-Control", "no-store")
    if extra_headers:
        for name, value in extra_headers.items():
            handler.send_header(name, value)
    handler.end_headers()
    handler.wfile.write(response)


def read_json_body(handler):
    try:
        content_length = int(handler.headers.get("Content-Length", "0"))
    except ValueError:
        raise ValueError("Invalid Content-Length")
    if content_length <= 0 or content_length > MAX_BODY_BYTES:
        raise ValueError("Request body is missing or too large")
    return json.loads(handler.rfile.read(content_length).decode("utf-8"))


def valid_session(handler):
    session_cookie = cookies.SimpleCookie(handler.headers.get("Cookie", ""))
    session = session_cookie.get("lynkedge_session")
    return session is not None and session.value in SESSIONS


def login_page(message=""):
        message_html = "" if not message else (
                "<div class=\"feedback-banner error\" role=\"alert\">{}</div>".format(
                        html.escape(message)
                )
        )
        return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LynkEdge Login</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <main class="app-container">
        <div class="login-cipla-brand" aria-label="Cipla Goa FDHH">
            <div class="login-cipla-name">CIPLA</div>
            <div class="login-cipla-meta">GOA</div>
            <div class="login-cipla-meta">FDHH</div>
        </div>
        <header class="app-header">
            <div class="brand-group">
                <div class="brand-text">
                    <h1 class="brand-title">LYNKEDGE</h1>
                    <p class="brand-subtitle">Production Linkage System</p>
                </div>
            </div>
        </header>
        <section class="card data-card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">Operator Sign In</h2>
                    <p class="card-subtitle">Authenticate to update the central Linkage Board</p>
                </div>
            </div>
            <form method="post" action="/login" class="entry-form" autocomplete="on">
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label for="username" class="form-label">
                            <span class="label-text">Username</span>
                        </label>
                        <div class="input-wrapper">
                            <input type="text" id="username" name="username" class="form-input" required autocomplete="username">
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label for="password" class="form-label">
                            <span class="label-text">Password</span>
                        </label>
                        <div class="input-wrapper">
                            <input type="password" id="password" name="password" class="form-input" required autocomplete="current-password">
                        </div>
                    </div>
                </div>
                {}
                <div class="form-actions">
                    <button type="submit" class="btn-primary">
                        <span>Sign In to LYNKEDGE</span>
                    </button>
                </div>
            </form>
        </section>
    </main>
</body>
</html>""".format(message_html).encode("utf-8")


class LynkEdgeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/status":
            with STATE_LOCK:
                current_state = state.copy()
            json_response(self, 200, current_state)
            return
        if path == "/login":
            response = login_page()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            return
        if path in ("/", "/index.html", "/display", "/display.html"):
            self.path = "/index.html"
        elif path in ("/edit", "/edit.html", "/entry", "/control"):
            self.path = "/edit.html"
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/login":
            self.handle_login_form()
            return
        if path == "/api/login":
            self.handle_login_json()
            return
        if path != "/api/update":
            json_response(self, 404, {"success": False, "message": "Not found"})
            return
        if not valid_session(self):
            json_response(self, 401, {"success": False, "message": "Login required"})
            return
        try:
            data = read_json_body(self)
            if not isinstance(data, dict):
                raise ValueError("Request JSON must be an object")

            area = data.get("area", "")
            unit_number = data.get("unit_number", "")
            equipment_codes = data.get("equipment_codes", "")
            status = data.get("status", "")
            status_options = normalize_status_options(data.get("status_options", []))
            if isinstance(status, str) and status.strip() and status.strip() not in status_options:
                status_options.append(status.strip())
            product_name_options = normalize_status_options(data.get("product_name_options", []))
            material_name_options = normalize_status_options(data.get("material_name_options", []))
            previous_product_name_options = normalize_status_options(data.get("previous_product_name_options", []))
            previous_material_name_options = normalize_status_options(data.get("previous_material_name_options", []))
            batch_number_options = normalize_status_options(data.get("batch_number_options", []))
            sap_batch_number_options = normalize_status_options(data.get("sap_batch_number_options", []))
            previous_product_name = data.get("previous_product_name", "")
            previous_material_name = data.get("previous_material_name", "")
            product_name = data.get("product_name", "")
            material_name = data.get("material_name", "")
            batch_number = data.get("batch_number", "")
            sap_batch_number = data.get("sap_batch_number", "")
            cleaning_valid_up_to = data.get("cleaning_valid_up_to", "")
            clean_before_datetime = data.get("clean_before_datetime", "")
            updated_by = data.get("updated_by", "")
            updated_on = data.get("updated_on", "")
            custom_rows = normalize_custom_rows(data.get("custom_rows", []))

            if product_name and product_name.strip() and product_name.strip() not in product_name_options:
                product_name_options.append(product_name.strip())
            if material_name and material_name.strip() and material_name.strip() not in material_name_options:
                material_name_options.append(material_name.strip())
            if previous_product_name and previous_product_name.strip() and previous_product_name.strip() not in previous_product_name_options:
                previous_product_name_options.append(previous_product_name.strip())
            if previous_material_name and previous_material_name.strip() and previous_material_name.strip() not in previous_material_name_options:
                previous_material_name_options.append(previous_material_name.strip())
            if batch_number and batch_number.strip() and batch_number.strip() not in batch_number_options:
                batch_number_options.append(batch_number.strip())
            if sap_batch_number and sap_batch_number.strip() and sap_batch_number.strip() not in sap_batch_number_options:
                sap_batch_number_options.append(sap_batch_number.strip())

            in_charge = data.get("in_charge", updated_by)
            if in_charge is None:
                in_charge = ""
            working = data.get("working")
            if working is None:
                working = 0
            production_kits = data.get("production_kits")
            if production_kits is None:
                production_kits = 0
            if not isinstance(batch_number, str) or not batch_number.strip():
                batch_number = str(sap_batch_number or "").strip()

            if not isinstance(in_charge, str):
                in_charge = str(in_charge)
            if not isinstance(working, int) or isinstance(working, bool):
                try:
                    working = int(working)
                except (TypeError, ValueError):
                    working = 0
            if not isinstance(production_kits, int) or isinstance(production_kits, bool):
                try:
                    production_kits = int(production_kits)
                except (TypeError, ValueError):
                    production_kits = 0
            if working < 0:
                working = 0
            if production_kits < 0:
                production_kits = 0

            now = datetime.now().strftime("%H:%M:%S")
            with STATE_LOCK:
                state.update({
                    "area": str(area or "").strip(),
                    "unit_number": str(unit_number or "").strip(),
                    "equipment_codes": str(equipment_codes or "").strip(),
                    "status": str(status or "").strip(),
                    "status_options": status_options,
                    "product_name_options": product_name_options,
                    "material_name_options": material_name_options,
                    "previous_product_name_options": previous_product_name_options,
                    "previous_material_name_options": previous_material_name_options,
                    "batch_number_options": batch_number_options,
                    "sap_batch_number_options": sap_batch_number_options,
                    "previous_product_name": str(previous_product_name or "").strip(),
                    "previous_material_name": str(previous_material_name or "").strip(),
                    "product_name": str(product_name or "").strip(),
                    "material_name": str(material_name or "").strip(),
                    "batch_number": str(batch_number or "").strip(),
                    "sap_batch_number": str(sap_batch_number or "").strip(),
                    "cleaning_valid_up_to": str(cleaning_valid_up_to or "").strip(),
                    "clean_before_datetime": str(clean_before_datetime or "").strip(),
                    "updated_by": str(updated_by or "").strip(),
                    "updated_on": str(updated_on or "").strip(),
                    "custom_rows": custom_rows,
                    "in_charge": in_charge.strip(),
                    "working": working,
                    "production_kits": production_kits,
                    "last_updated": now,
                    "tablet_connected": True,
                    "board_status": "RUNNING"
                })
                save_state(state)
                last_updated = state["last_updated"]
            json_response(self, 200, {
                "success": True,
                "message": "Production data successfully updated on board and display!",
                "last_updated": last_updated,
                "custom_rows": state.get("custom_rows", [])
            })
        except (ValueError, json.JSONDecodeError) as error:
            json_response(self, 400, {"success": False, "message": str(error)})
        except OSError as error:
            json_response(self, 500, {"success": False, "message": "Unable to persist production data: {}".format(error)})

    def handle_login_form(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            form_data = parse_qs(self.rfile.read(content_length).decode("utf-8"))
            username = form_data.get("username", [""])[0]
            password = form_data.get("password", [""])[0]
            if not self.authenticate(username, password):
                response = login_page("Invalid username or password")
                self.send_response(401)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(response)))
                self.end_headers()
                self.wfile.write(response)
                return
            self.redirect_with_session("/")
        except (ValueError, UnicodeDecodeError):
            json_response(self, 400, {"success": False, "message": "Invalid login request"})

    def handle_login_json(self):
        try:
            data = read_json_body(self)
            if not self.authenticate(data.get("username", ""), data.get("password", "")):
                json_response(self, 401, {"success": False, "message": "Invalid username or password"})
                return
            session = secrets.token_urlsafe(32)
            SESSIONS.add(session)
            json_response(self, 200, {"success": True}, {
                "Set-Cookie": "lynkedge_session={}; HttpOnly; SameSite=Strict; Path=/".format(session)
            })
        except (ValueError, json.JSONDecodeError) as error:
            json_response(self, 400, {"success": False, "message": str(error)})

    def authenticate(self, username, password):
        if PASSWORD is None:
            return False
        return (
            hmac_compare(username, USERNAME) and
            hmac_compare(password, PASSWORD)
        )

    def redirect_with_session(self, location):
        session = secrets.token_urlsafe(32)
        SESSIONS.add(session)
        self.send_response(303)
        self.send_header("Location", location)
        self.send_header(
            "Set-Cookie",
            "lynkedge_session={}; HttpOnly; SameSite=Strict; Path=/".format(session)
        )
        self.end_headers()

    def log_message(self, format_string, *args):
        print("{} - {}".format(self.address_string(), format_string % args))


def hmac_compare(first, second):
    first_bytes = str(first).encode("utf-8")
    second_bytes = str(second).encode("utf-8")
    return hmac.compare_digest(first_bytes, second_bytes)


class ThreadingHTTPServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    if PASSWORD is None:
        raise SystemExit("Set LYNKEDGE_PASSWORD before starting the server")
    with ThreadingHTTPServer(("0.0.0.0", PORT), LynkEdgeHandler) as httpd:
        print("==================================================")
        print("  LynkEdge Web Server is running on 0.0.0.0:8080")
        print("  - Display Board (Default): http://<MYIR-IP>:8080/")
        print("  - Data Entry / Edit:       http://<MYIR-IP>:8080/edit")
        print("  - Login:                   http://<MYIR-IP>:8080/login")
        print("  - Persistent data file:    {}".format(DATA_FILE))
        print("==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
