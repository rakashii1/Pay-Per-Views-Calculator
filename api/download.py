from http.server import BaseHTTPRequestHandler
import os
import sys

API_DIR = os.path.dirname(__file__)
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from _shared import download_video, read_json_body, send_file_response, send_json


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            data = read_json_body(self)
            url = data.get("url", "").strip()
            if not url:
                send_json(self, {"error": "No URL provided"}, 400)
                return

            path, filename = download_video(
                url,
                data.get("format", "max"),
                data.get("format_id"),
                data.get("title", ""),
            )
            send_file_response(self, path, filename)
        except Exception as error:
            send_json(self, {"error": str(error)}, 400)
