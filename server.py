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
PASSWORD = os.environ.get("LYNKEDGE_PASSWORD")
MAX_BODY_BYTES = 16 * 1024

DEFAULT_STATE = {
    "in_charge": "Ahmed",
    "working": 12,
    "production_kits": 450,
    "batch_number": "B1024",
    "board_status": "RUNNING",
    "tablet_connected": True,
    "last_updated": datetime.now().strftime("%H:%M:%S")
}
STATE_LOCK = threading.Lock()
SESSIONS = set()


def load_state():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as data_file:
            saved_state = json.load(data_file)
        state = DEFAULT_STATE.copy()
        state.update(saved_state)
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
    <div class="background-glow glow-1"></div>
    <div class="background-glow glow-2"></div>
    <main class="app-container">
        <header class="app-header">
            <div class="brand-group">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                </div>
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
                <span class="role-pill">Secure Access</span>
            </div>
            <form method="post" action="/login" class="entry-form" autocomplete="on">
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label for="username" class="form-label">
                            <span class="label-text">Username</span>
                        </label>
                        <div class="input-wrapper">
                            <span class="input-icon">&#9679;</span>
                            <input type="text" id="username" name="username" class="form-input" required autocomplete="username">
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label for="password" class="form-label">
                            <span class="label-text">Password</span>
                        </label>
                        <div class="input-wrapper">
                            <span class="input-icon">&#9679;</span>
                            <input type="password" id="password" name="password" class="form-input" required autocomplete="current-password">
                        </div>
                    </div>
                </div>
                {}
                <div class="form-actions">
                    <button type="submit" class="btn-primary">
                        <span>Sign In to LYNKEDGE</span>
                        <span class="btn-icon">&#8594;</span>
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
        if path in ("/display", "/display.html"):
            self.path = "/display.html"
        elif path == "/":
            self.path = "/index.html"
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
            in_charge = data.get("in_charge")
            working = data.get("working")
            production_kits = data.get("production_kits")
            batch_number = data.get("batch_number")
            if not isinstance(in_charge, str) or not in_charge.strip():
                raise ValueError("in_charge is required")
            if not isinstance(working, int) or isinstance(working, bool) or working < 0:
                raise ValueError("working must be a non-negative integer")
            if not isinstance(production_kits, int) or isinstance(production_kits, bool) or production_kits < 0:
                raise ValueError("production_kits must be a non-negative integer")
            if not isinstance(batch_number, str) or not batch_number.strip():
                raise ValueError("batch_number is required")
            with STATE_LOCK:
                state.update({
                    "in_charge": in_charge.strip(),
                    "working": working,
                    "production_kits": production_kits,
                    "batch_number": batch_number.strip(),
                    "last_updated": datetime.now().strftime("%H:%M:%S"),
                    "tablet_connected": True
                })
                save_state(state)
                last_updated = state["last_updated"]
            json_response(self, 200, {
                "success": True,
                "message": "Production data successfully updated on board and display!",
                "last_updated": last_updated
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
        print("  - Login:                http://<MYIR-IP>:8080/login")
        print("  - Operator Console:     http://<MYIR-IP>:8080/")
        print("  - Display Dashboard:    http://<MYIR-IP>:8080/display")
        print("  - Persistent data file: {}".format(DATA_FILE))
        print("==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
