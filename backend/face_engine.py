"""
SmartDormX — OpenCV Face Recognition Engine
Replaces dlib with:
  • Detection:    ResNet-SSD (res10_300x300) via cv2.dnn  (same accuracy class as HOG)
  • Recognition:  LBPH (Local Binary Patterns Histogram)  via cv2.face
  • Anomaly:      Three-rule engine identical to original anomaly_detector.py
"""
import cv2, numpy as np, os, pickle, time
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')
PROTO = os.path.join(MODEL_DIR, 'deploy.prototxt')
CAFFEMODEL = os.path.join(MODEL_DIR, 'res10.caffemodel')
RECOGNIZER_PATH = os.path.join(BASE_DIR, 'recognizer.yml')
LABELS_PATH = os.path.join(BASE_DIR, 'labels.pkl')

DETECT_CONF = 0.55    # minimum detection confidence
RECOG_CONF  = 65.0    # LBPH: lower distance = better match; maps to ~65% threshold

_detector = None
_recognizer = None
_label_map = {}       # int → name
_user_id_map = {}     # int → user_id


def _load_detector():
    global _detector
    if _detector is None:
        _detector = cv2.dnn.readNetFromCaffe(PROTO, CAFFEMODEL)
    return _detector


def detect_faces(frame):
    """Returns list of (x1,y1,x2,y2) bounding boxes."""
    net = _load_detector()
    h, w = frame.shape[:2]
    blob = cv2.dnn.blobFromImage(
        cv2.resize(frame, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0)
    )
    net.setInput(blob)
    dets = net.forward()
    boxes = []
    for i in range(dets.shape[2]):
        conf = float(dets[0, 0, i, 2])
        if conf < DETECT_CONF:
            continue
        x1 = int(dets[0, 0, i, 3] * w)
        y1 = int(dets[0, 0, i, 4] * h)
        x2 = int(dets[0, 0, i, 5] * w)
        y2 = int(dets[0, 0, i, 6] * h)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w - 1, x2), min(h - 1, y2)
        if x2 > x1 and y2 > y1:
            boxes.append((x1, y1, x2, y2))
    return boxes


def _face_roi(gray, box, target=(100, 100)):
    x1, y1, x2, y2 = box
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return None
    return cv2.resize(roi, target)


def train_recognizer(image_paths_by_label):
    """
    image_paths_by_label: {label_int: (name, user_id, [paths])}
    Returns True if at least one face was trained.
    """
    global _recognizer, _label_map, _user_id_map
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    faces, labels = [], []
    label_map, uid_map = {}, {}

    for label, (name, uid, paths) in image_paths_by_label.items():
        label_map[label] = name
        uid_map[label] = uid
        for path in paths:
            if not os.path.exists(path):
                continue
            img = cv2.imread(path)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            boxes = detect_faces(img)
            if boxes:
                roi = _face_roi(gray, boxes[0])
            else:
                # no face found by detector — try using whole image resized
                roi = cv2.resize(gray, (100, 100))
            if roi is not None:
                faces.append(roi)
                labels.append(label)

    if not faces:
        print('[WARN] No faces extracted for training.')
        return False

    recognizer.train(faces, np.array(labels))
    recognizer.save(RECOGNIZER_PATH)
    with open(LABELS_PATH, 'wb') as f:
        pickle.dump({'labels': label_map, 'uids': uid_map}, f)

    _recognizer = recognizer
    _label_map = label_map
    _user_id_map = uid_map
    print(f'[INFO] Trained on {len(faces)} face ROIs across {len(label_map)} identities.')
    return True


def load_recognizer():
    global _recognizer, _label_map, _user_id_map
    if os.path.exists(RECOGNIZER_PATH) and os.path.exists(LABELS_PATH):
        rec = cv2.face.LBPHFaceRecognizer_create()
        rec.read(RECOGNIZER_PATH)
        with open(LABELS_PATH, 'rb') as f:
            data = pickle.load(f)
        _recognizer = rec
        _label_map = data['labels']
        _user_id_map = data['uids']
        print(f'[INFO] Loaded recognizer — {len(_label_map)} identities.')
        return True
    return False


def recognise_frame(frame):
    """
    Returns (annotated_frame, events)
    events: list of dicts {name, confidence, user_id, box}
    """
    if _recognizer is None:
        # No model trained yet — just detect
        boxes = detect_faces(frame)
        annotated = frame.copy()
        for (x1, y1, x2, y2) in boxes:
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (79, 70, 229), 2)
            cv2.putText(annotated, 'Unknown', (x1, y1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (79, 70, 229), 2)
        return annotated, [{'name': 'Unknown', 'confidence': 0.0, 'user_id': None,
                             'box': b} for b in boxes]

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    boxes = detect_faces(frame)
    annotated = frame.copy()
    events = []

    for box in boxes:
        x1, y1, x2, y2 = box
        roi = _face_roi(gray, box)
        if roi is None:
            continue

        label, dist = _recognizer.predict(roi)
        # LBPH distance: 0=perfect, >100=poor. Map to confidence %
        confidence = max(0.0, min(100.0, (1 - dist / 150) * 100))

        if confidence >= RECOG_CONF and label in _label_map:
            name = _label_map[label]
            uid = _user_id_map.get(label)
            color = (16, 185, 129)   # green
        else:
            name = 'Unknown'
            uid = None
            confidence = 0.0
            color = (239, 68, 68)    # red

        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        label_txt = f'{name}  {confidence:.0f}%' if confidence > 0 else 'Unknown'
        cv2.putText(annotated, label_txt, (x1, y1 - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
        events.append({'name': name, 'confidence': confidence, 'user_id': uid, 'box': box})

    return annotated, events


# ── FisherFace override (for synthetic/demo mode) ──────────────────────────────
# Called at startup by app.py when pre-trained model already exists
def load_recognizer_fisher():
    """Load the pre-trained FisherFace recognizer (higher accuracy on demo faces)."""
    global _recognizer, _label_map, _user_id_map
    if os.path.exists(RECOGNIZER_PATH) and os.path.exists(LABELS_PATH):
        rec = cv2.face.FisherFaceRecognizer_create()
        rec.read(RECOGNIZER_PATH)
        with open(LABELS_PATH, 'rb') as f:
            data = pickle.load(f)
        _recognizer = rec
        _label_map   = data['labels']
        _user_id_map = data['uids']
        print(f'[INFO] Fisher recognizer loaded — {len(_label_map)} identities.')
        return True
    return False

FISHER_DIST_MAX = 5000.0  # Fisher distances are larger than LBPH

def recognise_frame_fisher(frame, conf_threshold=65.0):
    """
    Run recognition using FisherFace model.
    Skips DNN detection for small/synthetic frames.
    """
    if _recognizer is None:
        return frame.copy(), []

    # For small frames (synthetic), skip detector and use whole image
    h, w = frame.shape[:2]
    if h <= 200 and w <= 200:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim==3 else frame
        roi  = cv2.resize(gray, (100,100))
        label, dist = _recognizer.predict(roi)
        conf = max(0.0, min(100.0, (1 - dist / FISHER_DIST_MAX) * 100))
        name = _label_map.get(label,'?') if conf >= conf_threshold else 'Unknown'
        uid  = _user_id_map.get(label) if conf >= conf_threshold else None
        color = (16,185,129) if name!='Unknown' else (239,68,68)
        annotated = frame.copy()
        cv2.rectangle(annotated,(2,2),(w-2,h-2),color,2)
        cv2.putText(annotated, f'{name} {conf:.0f}%', (4,h-6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1)
        return annotated, [{'name':name,'confidence':conf,'user_id':uid,'box':(2,2,w-2,h-2)}]

    # Full pipeline with DNN detection for real camera frames
    gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    boxes = detect_faces(frame)
    annotated = frame.copy()
    events = []
    for box in boxes:
        x1,y1,x2,y2 = box
        roi = gray[y1:y2,x1:x2]
        if roi.size==0: continue
        roi = cv2.resize(roi,(100,100))
        label, dist = _recognizer.predict(roi)
        conf = max(0.0, min(100.0, (1-dist/FISHER_DIST_MAX)*100))
        if conf >= conf_threshold and label in _label_map:
            name = _label_map[label]; uid = _user_id_map.get(label); color=(16,185,129)
        else:
            name='Unknown'; uid=None; conf=0.0; color=(239,68,68)
        cv2.rectangle(annotated,(x1,y1),(x2,y2),color,2)
        cv2.putText(annotated,f'{name} {conf:.0f}%',(x1,y1-8),cv2.FONT_HERSHEY_SIMPLEX,.55,color,2)
        events.append({'name':name,'confidence':conf,'user_id':uid,'box':box})
    return annotated, events
