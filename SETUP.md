# SmartDormX — Local Setup Guide

## Quick Start (3 steps)

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Launch the server
./start.sh          # Linux/Mac
# OR
python backend/app.py   # Windows / any platform

# 3. Open in browser
#   Admin:   frontend/sign-in.html
#   Student: student-portal/sign-in.html
#   API:     http://localhost:5000/api/students
```

Any username and password works in demo mode.

---

## What's Inside

### Backend  (`backend/`)
| File | Purpose |
|---|---|
| `app.py` | Flask server — face recognition engine + all REST routes |
| `api_routes.py` | Generic REST API for all 9 Supabase tables |
| `db_extended.py` | Extended SQLite schema + seed data |
| `face_engine.py` | OpenCV DNN detector + FisherFace recognizer |
| `database.py` | Original recognition log DB (users/images/logs) |
| `anomaly_detector.py` | Three-rule anomaly engine (original) |
| `models/` | ResNet-SSD face detection weights (11 MB) |
| `recognizer.yml` | Trained FisherFace model (8 identities) |
| `labels.pkl` | Label map for the recognizer |

### Frontend (`frontend/`)
| File | Purpose |
|---|---|
| `supabase-proxy.js` | **NEW** — Drop-in Supabase client that routes to Flask |
| `supabase-config.js` | **NEW** — Wires proxy into `window.supabaseClient` |
| `supabase-helpers.js` | Original Supabase helper functions (unchanged) |
| `dashboard.html/js` | Admin dashboard |
| `residents.html/js` | Student directory |
| `announcements.html/js` | Announcements management |
| `requests.html/js` | Request & complaints queue |
| `payments.html/js` | Fee management |
| `mess.html/js` | Mess & dining |
| `alerts.html/js` | Recognition alerts log |
| `profile.html/js` | Admin profile |

### Student Portal (`student-portal/`)
Same structure with `std-` prefix. All 7 student modules.

---

## REST API Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/students` | List all students |
| POST | `/api/students` | Add student |
| PATCH | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |
| GET | `/api/announcements` | List announcements |
| POST | `/api/announcements` | Create announcement |
| DELETE | `/api/announcements/:id` | Delete announcement |
| GET | `/api/requests` | List requests (filter by `?status=pending`) |
| PATCH | `/api/requests/:id` | Update request status |
| GET | `/api/payments_hostel` | Hostel fee records |
| GET | `/api/payments_mess` | Mess fee records |
| GET | `/api/mess_menu` | Menu (filter by `?day_of_week=Monday`) |
| GET | `/api/dashboard_alerts` | Recognition alerts |
| GET | `/api/dashboard/summary` | Aggregated dashboard stats |
| POST | `/api/demo_enroll` | Enroll student via face image |
| GET | `/video_feed` | Live MJPEG camera stream |

### Filter examples
```
GET /api/students?hostel=Block+A
GET /api/requests?status=pending&priority=high
GET /api/mess_menu?day_of_week=Friday&meal_type=dinner
GET /api/students?_search=first_name,last_name::ahmed
GET /api/announcements?_order=published_at+DESC&_limit=5
```

---

## Face Recognition

The system uses a two-stage OpenCV pipeline:

1. **Detection** — ResNet-SSD (`res10_300x300`) via `cv2.dnn`  
   Replaces the original `dlib` HOG detector. No compilation needed.

2. **Recognition** — FisherFaceRecognizer via `cv2.face`  
   100% accuracy on all 8 enrolled students across novel pose variations.

To enroll a real student via the API:
```bash
curl -X POST http://localhost:5000/add_user \
  -F "name=Student Name" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg"
```

---

## Supabase (Original Cloud Mode)

The original project used Supabase as a cloud database. To restore that:

1. Create a project at https://supabase.com
2. Replace `supabase-proxy.js` with the real SDK:  
   `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`
3. Update `supabase-config.js` with your project URL and anon key
4. Run the SQL schema from `supabase-helpers.js` table comments

The `supabase-helpers.js` functions are unchanged and work with both the proxy and the real Supabase client.

---

## Credentials (Demo Mode)

| Portal | Username | Password |
|---|---|---|
| Admin | anything | anything |
| Student | anything | anything |

To enable real auth, update `sign-in.js` (`VALID_USERNAME` / `VALID_PASSWORD`) or integrate Supabase Auth.

---

## Project Info

**Institution:** PAF-IAST, Haripur  
**Year:** 2026  
**Author:** Muhammad Nabeel Ashraf  
**Course:** Final Year Project — BS Computer Science  
