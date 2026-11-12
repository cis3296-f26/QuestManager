#!/usr/bin/env python3
"""Local-only static server; --dev-tools explicitly opts into test-run tooling.

The tracked buildConfig.js stays false. Normal static hosting or running this
without --dev-tools never enables tools, regardless of cookies/query/storage.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]


def handler_for(dev_tools=False):
    class Handler(SimpleHTTPRequestHandler):
        def do_GET(self):
            if urlsplit(self.path).path == "/game/dev/buildConfig.js":
                content = f"export const developmentBuild = {str(dev_tools).lower()};\n".encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/javascript; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                super().do_GET()

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

    return partial(Handler, directory=str(ROOT))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dev-tools", action="store_true", help="Enable local gameplay testing tools (no saved progress for assisted runs)")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    print(f"QuestManager: http://127.0.0.1:{args.port}/game/", flush=True)
    print(f"Developer tools: {'ENABLED — assisted runs never save' if args.dev_tools else 'OFF (production default)'}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(args.dev_tools)).serve_forever()
