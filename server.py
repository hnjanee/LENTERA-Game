"""
LATHI - Local Development Server
Literasi Aksi Terintegrasi Hentikan Intimidasi
Jalankan: python server.py
Akses   : http://lathi:8080
"""

import http.server
import socketserver
import os
from datetime import datetime

PORT      = 8080
HOST_NAME = "localhost"
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class LathiHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "LATHI/1.0"
    sys_version    = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        waktu  = datetime.now().strftime("%H:%M:%S")
        status = args[1] if len(args) > 1 else "-"
        path   = str(args[0]).split(" ")[1] if args else "-"
        if status.startswith("2"):
            warna = "\033[92m"
        elif status.startswith("3"):
            warna = "\033[93m"
        else:
            warna = "\033[91m"
        reset = "\033[0m"
        print(f"  🌙 [{waktu}] LATHI  {warna}{status}{reset}  {path}")

    def end_headers(self):
        self.send_header("X-Powered-By", "LATHI - Lathi to Urup")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_error(self, format, *args):
        pass


class LathiServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with LathiServer(("0.0.0.0", PORT), LathiHandler) as httpd:
        print()
        print("  \033[33m🎮 ══════════════════════════════════════════\033[0m")
        print("  \033[33m     LATHI  -  Ajining Diri Dumunung Aneng Lathi        \033[0m")
        print("  \033[33m  ══════════════════════════════════════════🎮\033[0m")
        print()
        print(f"\033[1m  Server  :\033[0m  http://{HOST_NAME}:{PORT}")
        print()
        print(f"  🌐  Landing Page  :  http://{HOST_NAME}:{PORT}/index.html")
        print(f"  🎮  Game          :  http://{HOST_NAME}:{PORT}/game.html")
        print(f"  📊  Dashboard BK  :  http://{HOST_NAME}:{PORT}/dashboard/admin.html")
        print()
        print("  Tekan Ctrl+C untuk menghentikan server.")
        print()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  \033[36m🌙 LATHI Server dihentikan. Sampai jumpa!\033[0m\n")
