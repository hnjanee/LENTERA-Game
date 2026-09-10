"""
LENTERA — Local Development Server
Jalankan: python server.py
Akses   : http://localhost:8080
"""

import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class LenteraHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "LENTERA/1.0"
    sys_version    = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        print(f"  🏮 LENTERA | {self.address_string()} | {format % args}")

    def end_headers(self):
        self.send_header("X-Powered-By", "LENTERA - Lathi to Urup")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


class LenteraServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with LenteraServer(("0.0.0.0", PORT), LenteraHandler) as httpd:
        print()
        print("  🔦 ══════════════════════════════════════════")
        print("       LENTERA Server — Lathi to Urup")
        print("  ══════════════════════════════════════════🔦")
        print()
        print(f"  🌐  Landing Page  : http://localhost:{PORT}/index.html")
        print(f"  🎮  Game          : http://localhost:{PORT}/game.html")
        print(f"  📊  Dashboard BK  : http://localhost:{PORT}/dashboard/admin.html")
        print()
        print("  Tekan Ctrl+C untuk menghentikan server.")
        print()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  🏮 LENTERA Server dihentikan. Sampai jumpa!\n")
