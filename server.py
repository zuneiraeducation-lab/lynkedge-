import http.server
import socketserver
import json
import os
from datetime import datetime

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# In-memory mock state for the production linkage system
state = {
    "in_charge": "Ahmed",
    "working": 12,
    "production_kits": 450,
    "batch_number": "B1024",
    "board_status": "RUNNING",
    "tablet_connected": True,
    "last_updated": datetime.now().strftime("%H:%M:%S")
}

class LynkEdgeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(state).encode('utf-8'))
            return
        elif self.path == '/display' or self.path == '/display.html':
            self.path = '/display.html'
        elif self.path == '/':
            self.path = '/index.html'

        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/update':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                state["in_charge"] = data.get("in_charge", state["in_charge"])
                state["working"] = data.get("working", state["working"])
                state["production_kits"] = data.get("production_kits", state["production_kits"])
                state["batch_number"] = data.get("batch_number", state["batch_number"])
                state["last_updated"] = datetime.now().strftime("%H:%M:%S")
                state["tablet_connected"] = True

                response = {
                    "success": True,
                    "message": "Production data successfully updated on board and display!",
                    "last_updated": state["last_updated"]
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), LynkEdgeHandler) as httpd:
        print("==================================================")
        print(f"  LynkEdge Web Server is running on port {PORT}")
        print(f"  - Operator Console:   http://localhost:{PORT}/")
        print(f"  - Display Dashboard:  http://localhost:{PORT}/display")
        print("==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
