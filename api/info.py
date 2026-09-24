from http.server import BaseHTTPRequestHandler
import os
import sys

API_DIR = os.path.dirname(__file__)
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from _shared import get_video_info, read_json_body, send_json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        send_json(self, {
            "ok": True,
            "message": "Downloader API is running. Send a POST request with a video URL to use this endpoint.",
        })

    def do_POST(self):
        try:
            data = read_json_body(self)
            url = data.get("url", "").strip()
            if not url:
                send_json(self, {"error": "No URL provided"}, 400)
                return
            send_json(self, get_video_info(url))
        except Exception as error:
            send_json(self, {"error": str(error)}, 400)
