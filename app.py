import glob
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import uuid

import imageio_ffmpeg
from flask import Flask, jsonify, render_template, request, send_file, send_from_directory

app = Flask(__name__)

BASE_DIR = os.path.dirname(__file__)
DOWNLOAD_DIR = (
    os.path.join(tempfile.gettempdir(), "reclip-downloads")
    if os.environ.get("VERCEL")
    else os.path.join(BASE_DIR, "downloads")
)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

jobs = {}
presence_clients = {}
presence_lock = threading.Lock()
PRESENCE_TTL_SECONDS = 15
YTDLP_CMD = [sys.executable, "-m", "yt_dlp"]
FFMPEG_LOCATION = imageio_ffmpeg.get_ffmpeg_exe()


def ytdlp_base_args(out_template=None):
    args = [*YTDLP_CMD, "--no-playlist", "--ffmpeg-location", FFMPEG_LOCATION]
    if out_template:
        args += ["-o", out_template]
    return args


def extract_process_error(stderr):
    lines = [line.strip() for line in stderr.splitlines() if line.strip()]
    for line in reversed(lines):
        if line.startswith("ERROR:"):
            return line
    return lines[-1] if lines else "Process failed"


def parse_ytdlp_json(stdout):
    for line in stdout.splitlines():
        line = line.strip()
        if line:
            return json.loads(line)
    raise ValueError("yt-dlp returned no data")


def get_presence_count(client_id=None):
    now = time.time()
    with presence_lock:
        expired_clients = [
            key for key, last_seen in presence_clients.items()
            if now - last_seen > PRESENCE_TTL_SECONDS
        ]
        for key in expired_clients:
            presence_clients.pop(key, None)

        if client_id:
            presence_clients[client_id] = now

        return len(presence_clients)


def convert_to_compatible_mp4(source_path, job_id):
    fixed_path = os.path.join(DOWNLOAD_DIR, f"{job_id}-fixed.mp4")
    cmd = [
        FFMPEG_LOCATION,
        "-y",
        "-i",
        source_path,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        fixed_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(extract_process_error(result.stderr))
    return fixed_path


def video_format_selector(format_id=None):
    if format_id:
        return f"{format_id}+bestaudio[ext=m4a]/{format_id}+bestaudio/{format_id}/best"
    return "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/bv*[vcodec^=avc1]+ba/bv*[ext=mp4]+ba[ext=m4a]/bestvideo+bestaudio/best"


def run_download(job_id, url, format_choice, format_id):
    job = jobs[job_id]
    out_template = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")
    cmd = ytdlp_base_args(out_template)

    if format_choice == "audio":
        cmd += ["-x", "--audio-format", "mp3"]
    elif format_choice == "max":
        cmd += [
            "-f",
            video_format_selector(format_id),
            "--merge-output-format",
            "mkv",
        ]
    elif format_id:
        cmd += [
            "-f",
            video_format_selector(format_id),
            "--merge-output-format",
            "mp4",
        ]
    else:
        cmd += [
            "-f",
            video_format_selector(),
            "--merge-output-format",
            "mp4",
        ]

    cmd.append(url)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            job["status"] = "error"
            job["error"] = extract_process_error(result.stderr)
            return

        files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}.*"))
        if not files:
            job["status"] = "error"
            job["error"] = "Download completed but no file was found"
            return

        if format_choice == "audio":
            target = [path for path in files if path.endswith(".mp3")]
            chosen = target[0] if target else files[0]
        elif format_choice == "max":
            media_files = [
                path for path in files
                if os.path.splitext(path)[1].lower() in {".mkv", ".mp4", ".webm", ".mov"}
            ]
            chosen = max(media_files or files, key=os.path.getsize)
        else:
            target = [path for path in files if path.endswith(".mp4")]
            chosen = target[0] if target else files[0]
            try:
                chosen = convert_to_compatible_mp4(chosen, job_id)
                files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}.*"))
            except Exception as error:
                job["status"] = "error"
                job["error"] = f"Could not finalize MP4: {error}"
                return

        for path in files:
            if path != chosen:
                try:
                    os.remove(path)
                except OSError:
                    pass

        title = job.get("title", "").strip()
        ext = os.path.splitext(chosen)[1]
        if title:
            safe_title = "".join(char for char in title if char not in r'\/:*?"<>|').strip()[:100].strip()
            filename = f"{safe_title}{ext}" if safe_title else os.path.basename(chosen)
        else:
            filename = os.path.basename(chosen)

        job["status"] = "done"
        job["file"] = chosen
        job["filename"] = filename
    except subprocess.TimeoutExpired:
        job["status"] = "error"
        job["error"] = "Download timed out (5 min limit)"
    except Exception as error:
        job["status"] = "error"
        job["error"] = str(error)


@app.route("/")
def calculator():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/styles.css")
def calculator_styles():
    return send_from_directory(BASE_DIR, "styles.css")


@app.route("/script.js")
def calculator_script():
    return send_from_directory(BASE_DIR, "script.js")


@app.route("/presence.css")
def presence_styles():
    return send_from_directory(BASE_DIR, "presence.css")


@app.route("/presence.js")
def presence_script():
    return send_from_directory(BASE_DIR, "presence.js")


@app.route("/downloader")
@app.route("/downloader.html")
def downloader():
    return send_from_directory(BASE_DIR, "downloader.html")


@app.route("/api/info", methods=["GET", "POST"])
def get_info():
    if request.method == "GET":
        return jsonify({
            "ok": True,
            "message": "Downloader API is running. Send a POST request with a video URL to use this endpoint.",
        })

    data = request.json or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        result = subprocess.run([*YTDLP_CMD, "--no-playlist", "-j", url], capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            return jsonify({"error": extract_process_error(result.stderr)}), 400

        info = parse_ytdlp_json(result.stdout)
        best_by_height = {}
        for item in info.get("formats", []):
            height = item.get("height")
            if height and item.get("vcodec", "none") != "none":
                tbr = item.get("tbr") or 0
                current = best_by_height.get(height)
                if not current or tbr > (current.get("tbr") or 0):
                    best_by_height[height] = item

        formats = [
            {"id": item["format_id"], "label": f"{height}p", "height": height}
            for height, item in best_by_height.items()
        ]
        formats.sort(key=lambda item: item["height"], reverse=True)

        return jsonify({
            "title": info.get("title", ""),
            "thumbnail": info.get("thumbnail", ""),
            "duration": info.get("duration"),
            "uploader": info.get("uploader", ""),
            "formats": formats,
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timed out fetching video info"}), 400
    except Exception as error:
        return jsonify({"error": str(error)}), 400


@app.route("/api/presence", methods=["GET", "POST"])
def presence():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        client_id = str(data.get("clientId", "")).strip()[:128]
        if not client_id:
            return jsonify({"error": "No client ID provided"}), 400
        count = get_presence_count(client_id)
    else:
        count = get_presence_count()

    response = jsonify({"ok": True, "count": count})
    response.headers["Cache-Control"] = "no-store"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.route("/api/playlist", methods=["POST"])
def get_playlist_info():
    data = request.json or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        result = subprocess.run([*YTDLP_CMD, "--flat-playlist", "-J", url], capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            return jsonify({"error": extract_process_error(result.stderr)}), 400

        info = json.loads(result.stdout)
        urls = [entry.get("url") for entry in info.get("entries", []) if entry.get("url")]
        return jsonify({"urls": urls})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timed out fetching playlist info"}), 400
    except Exception as error:
        return jsonify({"error": str(error)}), 400


@app.route("/api/download", methods=["POST"])
def start_download():
    data = request.json or {}
    url = data.get("url", "").strip()
    format_choice = data.get("format", "max")
    format_id = data.get("format_id")
    title = data.get("title", "")

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    job_id = uuid.uuid4().hex[:10]
    jobs[job_id] = {"status": "downloading", "url": url, "title": title}
    thread = threading.Thread(target=run_download, args=(job_id, url, format_choice, format_id), daemon=True)
    thread.start()
    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
def check_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({
        "status": job["status"],
        "error": job.get("error"),
        "filename": job.get("filename"),
    })


@app.route("/api/file/<job_id>")
def download_file(job_id):
    job = jobs.get(job_id)
    if not job or job["status"] != "done":
        return jsonify({"error": "File not ready"}), 404
    return send_file(job["file"], as_attachment=True, download_name=job["filename"])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4173))
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port)
