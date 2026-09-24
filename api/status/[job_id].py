from http.server import BaseHTTPRequestHandler
import os
import sys

API_DIR = os.path.dirname(os.path.dirname(__file__))
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from _shared import send_json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        send_json(self, {
            "error": "Status polling is not used on Vercel. Downloads are returned directly.",
        }, 410)
