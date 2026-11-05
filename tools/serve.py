"""開発用サーバー(同じネットワークの別の端末・スマホからも見られる)。
使い方: python tools/serve.py [ポート(既定 8780)]
標準の http.server は、同時の接続がたまると切ってしまう(画像が読めない)ので、待ち行列を大きくしてある。"""
import http.server, socket, sys, os

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')   # 開発中は、古いファイルが残らないように
        super().end_headers()
    def do_POST(self):
        # 確かめ用:ページで作った画像を、環境変数 FLORI_UPLOAD_DIR のフォルダへ保存する(指定がなければ、受けつけない)
        d = os.environ.get('FLORI_UPLOAD_DIR')
        if not d or not self.path.startswith('/upload?name='):
            self.send_response(403); self.end_headers(); return
        name = os.path.basename(self.path.split('=', 1)[1])
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, name), 'wb').write(data)
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass

class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8780
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ip = socket.gethostbyname(socket.gethostname())
print(f'http://localhost:{port}/src/live2d/preview.html\nhttp://{ip}:{port}/src/live2d/preview.html', flush=True)
Server(('0.0.0.0', port), Handler).serve_forever()
