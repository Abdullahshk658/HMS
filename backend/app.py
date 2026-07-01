"""
SmartDormX — Flask API Server (OpenCV Edition)
Replaces dlib/face_recognition with:
  - Detection:   OpenCV DNN ResNet-SSD (res10_300x300)
  - Recognition: OpenCV LBPH FaceRecognizer
All original REST endpoints preserved.
"""

import os, csv, shutil, uuid, time, threading
import cv2, numpy as np
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import datetime

# Fix DB path before importing Database
import database as _db_module
_db_module.Database.DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

from database import Database
from anomaly_detector import AnomalyDetector
import face_engine
import api_routes
api_routes.DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')
api_blueprint = api_routes.api
import db_extended

# ── Flask setup ───────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '../frontend'))
STUDENT_DIR  = os.path.abspath(os.path.join(BASE_DIR, '../student-portal'))

app = Flask(__name__, template_folder=FRONTEND_DIR, static_folder=FRONTEND_DIR)
CORS(app)

UPLOAD_FOLDER      = os.path.join(BASE_DIR, 'images')
BULK_UPLOAD_FOLDER = os.path.join(BASE_DIR, 'bulk_upload')
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
CONFIDENCE_THRESHOLD = 65.0

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(BULK_UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER']      = UPLOAD_FOLDER
app.config['BULK_UPLOAD_FOLDER'] = BULK_UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024

app.register_blueprint(api_blueprint)

Database.init_db()
db_extended.init_extended(DB_PATH=os.path.join(BASE_DIR, 'database.db'))


# ── Helpers ───────────────────────────────────────────────────────────────────
def allowed_file(filename):
    return filename and '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def make_filename(name, orig):
    safe = secure_filename(name.strip().replace(' ', '_')) or 'student'
    ext  = orig.rsplit('.', 1)[1].lower()
    return f"{safe}_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}.{ext}"

def save_image(file, name):
    fn   = make_filename(name, file.filename)
    path = os.path.join(UPLOAD_FOLDER, fn)
    file.save(path)
    return path

def copy_bulk(src, name):
    fn  = make_filename(name, os.path.basename(src))
    dst = os.path.join(UPLOAD_FOLDER, fn)
    shutil.copy2(src, dst)
    return dst


# ── Camera & Recognition Thread ───────────────────────────────────────────────
class CameraRecognizer:
    def __init__(self):
        self.cap          = None
        self.running      = False
        self.current_frame = None
        self.frame_lock   = threading.Lock()
        self.last_logged  = {}     # name → epoch for 5-s cooldown
        self.anomaly_det  = AnomalyDetector()
        self._load_model()

    def _load_model(self):
        rows = Database.get_all_user_images_for_recognition()
        if not rows:
            print('[INFO] No enrolled users — recognizer not trained yet.')
            return
        by_label = {}
        for uid, name, path in rows:
            # use user_id as label (stable int)
            label = int(uid)
            if label not in by_label:
                by_label[label] = (name, uid, [])
            by_label[label][2].append(path)
        face_engine.train_recognizer(by_label)

    def load_users(self):
        """Called after add/delete — retrain recognizer."""
        self._load_model()

    def start_camera(self):
        with self.frame_lock:
            if self.running:
                return
            self.running = True
        t = threading.Thread(target=self._loop, daemon=True)
        t.start()
        print('[INFO] Camera thread started.')

    def stop_camera(self):
        self.running = False
        if self.cap:
            self.cap.release()

    def _loop(self):
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            print('[WARN] No camera found — running demo stream.')
            self._demo_loop()
            return

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        print('[INFO] Camera opened.')

        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.05)
                continue
            frame = self._process(frame)
            with self.frame_lock:
                self.current_frame = frame.copy()
            time.sleep(0.033)

        self.cap.release()

    def _demo_loop(self):
        """Fallback: generate a branded frame when no camera. Respects
        self.running so stop_camera() can actually terminate this thread
        instead of leaking a new one on every subsequent request."""
        while self.running:
            img = np.zeros((480, 640, 3), dtype=np.uint8)
            img[:] = (30, 30, 45)
            ts = datetime.now().strftime('%H:%M:%S')
            cv2.putText(img, 'SmartDormX', (170, 200),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.4, (79,70,229), 3)
            cv2.putText(img, 'No Camera Connected', (165, 255),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200,200,200), 2)
            cv2.putText(img, 'OpenCV DNN Engine Ready', (155, 295),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (100,200,100), 1)
            cv2.putText(img, ts, (270, 440),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (120,180,120), 1)
            with self.frame_lock:
                self.current_frame = img.copy()
            time.sleep(1)

    def _process(self, frame):
        annotated, events = face_engine.recognise_frame(frame)
        now = time.time()
        for ev in events:
            name       = ev['name']
            confidence = ev['confidence']
            # 5-second per-identity cooldown
            if now - self.last_logged.get(name, 0) < 5:
                continue
            self.last_logged[name] = now
            anomaly_info = self.anomaly_det.detect(name, confidence)
            Database.insert_log(
                name       = name,
                status     = 'AUTHORIZED' if name != 'Unknown' else 'UNAUTHORIZED',
                confidence = confidence,
                anomaly    = 1 if anomaly_info else 0
            )
        return annotated

    def get_jpeg(self):
        with self.frame_lock:
            frame = self.current_frame
        if frame is None:
            return None
        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return buf.tobytes()


camera = CameraRecognizer()


# ── MJPEG Stream ──────────────────────────────────────────────────────────────
def _mjpeg_gen():
    while True:
        jpg = camera.get_jpeg()
        if jpg:
            yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpg + b'\r\n'
        time.sleep(0.05)


@app.route('/video_feed')
def video_feed():
    if not camera.running:
        camera.start_camera()
    return Response(_mjpeg_gen(), mimetype='multipart/x-mixed-replace; boundary=frame')


# ── REST endpoints (identical contract to original) ───────────────────────────

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'sign-in.html')

@app.route('/frontend/<path:f>')
def frontend_static(f):
    return send_from_directory(FRONTEND_DIR, f)

@app.route('/student-portal/<path:f>')
def student_static(f):
    return send_from_directory(STUDENT_DIR, f)


@app.route('/users', methods=['GET'])
def get_users():
    try:
        rows = Database.get_all_users()
        users = [{'id':r[0],'name':r[1],'image_path':r[2],'image_count':r[3],'created_at':r[4]} for r in rows]
        return jsonify({'users': users, 'total': len(users)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/add_user', methods=['POST'])
def add_user():
    try:
        name = (request.form.get('name') or '').strip()
        if not name:
            return jsonify({'error': 'Missing name'}), 400

        files = request.files.getlist('images') or request.files.getlist('image')
        if not files or files[0].filename == '':
            return jsonify({'error': 'No images provided'}), 400

        saved = []
        for f in files:
            if f and f.filename and allowed_file(f.filename):
                saved.append(save_image(f, name))

        if not saved:
            return jsonify({'error': 'No valid images'}), 400

        result = Database.add_user_with_images(name, saved)
        camera.load_users()   # retrain recognizer

        return jsonify({
            'message': 'Student added' if result['created'] else 'Images added',
            'user_id': result['user_id'],
            'images_added': result['images_added'],
            'created': result['created']
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/delete_user/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        deleted = Database.delete_user(user_id)
        if not deleted:
            return jsonify({'error': 'User not found'}), 404
        camera.load_users()
        return jsonify({'message': 'Deleted', 'user_id': user_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/user_image/<int:user_id>')
def user_image(user_id):
    try:
        images = Database.get_user_images(user_id)
        if not images:
            return jsonify({'error': 'No image'}), 404
        path = images[0][2]
        if not os.path.exists(path):
            return jsonify({'error': 'File missing'}), 404
        return send_from_directory(os.path.dirname(path), os.path.basename(path))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/logs', methods=['GET'])
def get_logs():
    try:
        limit  = int(request.args.get('limit', 100))
        name   = request.args.get('name', '')
        ts     = request.args.get('timestamp', '')
        status = request.args.get('status', '')
        anomaly = request.args.get('anomaly')
        rows = Database.get_logs(
            limit=limit, name=name, timestamp=ts, status=status,
            anomaly=int(anomaly) if anomaly is not None else None
        )
        logs = [{'id':r[0],'name':r[1],'timestamp':r[2],'status':r[3],'confidence':r[4],'anomaly':bool(r[5])} for r in rows]
        return jsonify({'logs': logs, 'total': len(logs)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/stats', methods=['GET'])
def get_stats():
    try:
        logs  = Database.get_logs(limit=100000)
        users = Database.get_all_users()
        total_images = sum(int(u[3]) for u in users)
        return jsonify({
            'total_logs':      len(logs),
            'total_users':     len(users),
            'total_images':    total_images,
            'unknown_entries': sum(1 for l in logs if l[1] == 'Unknown'),
            'anomalies':       sum(1 for l in logs if int(l[5]) == 1)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/refresh_logs', methods=['POST'])
def refresh_logs():
    try:
        logs = Database.get_logs()
        return jsonify({'message': 'Refreshed', 'count': len(logs)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/import_csv', methods=['POST'])
def import_csv():
    try:
        f = request.files.get('csv_file')
        if not f:
            return jsonify({'error': 'No CSV file'}), 400
        decoded = f.stream.read().decode('utf-8-sig').splitlines()
        reader  = csv.DictReader(decoded)
        if not {'name','image'}.issubset(set(reader.fieldnames or [])):
            return jsonify({'error': 'CSV must have columns: name,image'}), 400

        imported, skipped, total_imgs = {}, [], 0
        for i, row in enumerate(reader, 2):
            name  = (row.get('name')  or '').strip()
            image = (row.get('image') or '').strip()
            if not name or not image:
                skipped.append({'row':i,'reason':'Missing name or image'})
                continue
            src = os.path.join(BULK_UPLOAD_FOLDER, os.path.basename(image))
            if not os.path.exists(src):
                skipped.append({'row':i,'name':name,'reason':'Image not in bulk_upload'})
                continue
            dst    = copy_bulk(src, name)
            result = Database.add_user_with_images(name, [dst])
            imported[name] = imported.get(name, 0) + 1
            total_imgs += 1

        camera.load_users()
        return jsonify({
            'message': 'Import done',
            'students_imported_or_updated': len(imported),
            'images_added': total_imgs,
            'skipped': skipped
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Test-enroll endpoint (generates a synthetic face for demo) ─────────────────
@app.route('/demo_enroll', methods=['POST'])
def demo_enroll():
    """
    Enrol a demo user with a programmatically generated synthetic face image.
    POST body: {"name": "Demo Student"}
    """
    try:
        data = request.get_json(force=True)
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': 'name required'}), 400

        # Generate a simple synthetic face: grey ellipse + eyes + mouth
        img = np.full((200, 200, 3), 220, dtype=np.uint8)
        cx, cy = 100, 110
        # skin tone ellipse
        cv2.ellipse(img, (cx, cy), (60, 75), 0, 0, 360, (200, 170, 140), -1)
        # eyes
        cv2.circle(img, (cx-22, cy-15), 8, (40,40,80), -1)
        cv2.circle(img, (cx+22, cy-15), 8, (40,40,80), -1)
        cv2.circle(img, (cx-22, cy-15), 4, (255,255,255), -1)
        cv2.circle(img, (cx+22, cy-15), 4, (255,255,255), -1)
        # mouth
        cv2.ellipse(img, (cx, cy+25), (22, 10), 0, 0, 180, (140, 80, 80), -1)
        # add per-name pixel noise so each "face" is distinguishable
        rng = np.random.default_rng(abs(hash(name)) % (2**32))
        noise = rng.integers(-15, 15, img.shape, dtype=np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        fn   = f"demo_{secure_filename(name.replace(' ','_'))}_{int(time.time())}.jpg"
        path = os.path.join(UPLOAD_FOLDER, fn)
        cv2.imwrite(path, img)

        result = Database.add_user_with_images(name, [path])
        camera.load_users()

        return jsonify({
            'message':      'Demo user enrolled',
            'user_id':      result['user_id'],
            'image_saved':  path,
            'created':      result['created']
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Camera autostart ──────────────────────────────────────────────────────────
@app.before_request
def before_request():
    if request.endpoint == 'video_feed' and not camera.running:
        camera.start_camera()


if __name__ == '__main__':
    print('\n[INFO] SmartDormX — OpenCV Edition')
    print('[INFO] Detection:    ResNet-SSD (res10_300x300) via cv2.dnn')
    print('[INFO] Recognition:  LBPH FaceRecognizer via cv2.face')
    print('[INFO] Flask API:    http://localhost:5000')
    print(f'[INFO] Images dir:   {UPLOAD_FOLDER}\n')
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)
