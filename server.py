"""
CANDRANATA — Local Development Server
Cipta Agung Nuntun Dharmaning Raga Aning Nalar Agung Tetep Asisih
Jalankan: python server.py
Akses   : http://lentera:8080
"""

import http.server
import socketserver
import os
from datetime import datetime

PORT      = 8080
HOST_NAME = "lentera"
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class LenteraHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "CANDRANATA/1.0"
    sys_version    = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        waktu  = datetime.now().strftime("%H:%M:%S")
        status = args[1] if len(args) > 1 else "—"
        path   = str(args[0]).split(" ")[1] if args else "—"
        # Warna: hijau=200, kuning=304, merah=400+
        if status.startswith("2"):
            warna = "\033[92m"   # hijau
        elif status.startswith("3"):
            warna = "\033[93m"   # kuning
        else:
            warna = "\033[91m"   # merah
        reset = "\033[0m"
        print(f"  🏮 [{waktu}] LENTERA  {warna}{status}{reset}  {path}")

    def end_headers(self):
        self.send_header("X-Powered-By", "LENTERA - Lathi to Urup")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_error(self, format, *args):
        pass  # Suppress default error messages


class LenteraServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with LenteraServer(("0.0.0.0", PORT), LenteraHandler) as httpd:
        print()
        print("  🌙 ══════════════════════════════════════════")
        print("       CANDRANATA  —  Lathi to Urup  🌙       ")
        print("  ══════════════════════════════════════════🌙 ")
        print()
        print(f"\033[1m  Server  :\033[0m  http://{HOST_NAME}:{PORT}")
        print()
        print(f"  🌐  Landing Page  :  http://{HOST_NAME}:{PORT}/index.html")
        print(f"  🎮  Game          :  http://{HOST_NAME}:{PORT}/game.html")
        print(f"  📊  Dashboard BK  :  http://{HOST_NAME}:{PORT}/dashboard/admin.html")
        print()
        print("  ──────────────────────────────────────────────")
        print("  Tekan Ctrl+C untuk menghentikan server.")
        print("  ──────────────────────────────────────────────")
        print()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\033[36m  🌙 CANDRANATA Server dihentikan. Sampai jumpa!\033[0m\n")
