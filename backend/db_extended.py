"""
Extended SQLite schema for all Supabase tables used by SmartDormX frontend.
Tables mirror the Supabase schema documented in supabase-helpers.js.
"""
import sqlite3, json, uuid
from datetime import datetime

DB_PATH = '/home/claude/SmartDormX/backend/database.db'

SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_no TEXT UNIQUE,
    first_name TEXT, last_name TEXT,
    email TEXT, phone TEXT, gender TEXT, blood_group TEXT,
    hostel TEXT, room TEXT, program TEXT,
    guardian_name TEXT, guardian_phone TEXT,
    address TEXT, city TEXT, disability TEXT DEFAULT 'none',
    photo_url TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT, message TEXT,
    target_audience TEXT DEFAULT 'all',
    priority TEXT DEFAULT 'medium',
    sender_name TEXT DEFAULT 'Admin',
    published_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_reg_no TEXT, type TEXT, subject TEXT,
    description TEXT, priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT, resolved_by TEXT, resolution_notes TEXT
);

CREATE TABLE IF NOT EXISTS payments_hostel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_reg_no TEXT, student_name TEXT,
    semester TEXT, amount REAL, due_date TEXT,
    status TEXT DEFAULT 'unpaid',
    paid_at TEXT, receipt_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments_mess (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_reg_no TEXT, student_name TEXT,
    month TEXT, amount REAL, due_date TEXT,
    status TEXT DEFAULT 'unpaid',
    paid_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mess_menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week TEXT, meal_type TEXT,
    dish_name TEXT, price REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mess_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_reg_no TEXT, date TEXT,
    meal_type TEXT, present INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mess_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT, student_reg_no TEXT, hostel TEXT,
    rating INTEGER, feedback_text TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboard_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stat_key TEXT UNIQUE, stat_value TEXT
);

CREATE TABLE IF NOT EXISTS dashboard_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, message TEXT, location TEXT,
    alert_type TEXT, severity TEXT DEFAULT 'medium',
    is_read INTEGER DEFAULT 0,
    alert_time TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

SEED_STUDENTS = [
    ('B22F1154CS030','Ahmed','Khan','ahmed@paf-iast.edu.pk','0312-3456789','Male','O+','Block A','A-101','BS-CS','Khalid Khan','0300-1111111','House 5 Lahore','Lahore','none',None),
    ('B22F0403CS046','Sara','Malik','sara@paf-iast.edu.pk','0333-9876543','Female','A+','Block B','B-205','BS-SE','Asma Malik','0300-2222222','Street 7 Karachi','Karachi','none',None),
    ('B22F0076CS092','Usman','Ali','usman@paf-iast.edu.pk','0345-1122334','Male','B+','Block C','C-301','BS-IT','Zafar Ali','0300-3333333','Main Rd Peshawar','Peshawar','none',None),
    ('B22F0211CS017','Fahad','Iqbal','fahad@paf-iast.edu.pk','0301-7654321','Male','AB+','Block A','A-110','BS-CS','Iqbal Sb','0300-4444444','G-10 Islamabad','Islamabad','none',None),
    ('B22F0589CS071','Ayesha','Noor','ayesha@paf-iast.edu.pk','0316-4455667','Female','O-','Block D','D-102','BS-AI','Noor Bibi','0300-5555555','Saddar Rawalpindi','Rawalpindi','none',None),
    ('B22F0300CS055','Hassan','Raza','hassan@paf-iast.edu.pk','0321-9988776','Male','A-','Block B','B-303','BS-CS','Raza Sahib','0300-6666666','Multan Cantt','Multan','none',None),
    ('B22F0720CS083','Zara','Ahmed','zara@paf-iast.edu.pk','0303-5566778','Female','B-','Block E','E-201','BS-SE','Nadia Ahmed','0300-7777777','Model Town Lahore','Lahore','none',None),
    ('B22F0144CS039','Omar','Farooq','omar@paf-iast.edu.pk','0312-0011223','Male','AB-','Block C','C-205','BS-IT','Farooq Sb','0300-8888888','Hayatabad Peshawar','Peshawar','none',None),
]

SEED_ANNOUNCEMENTS = [
    ('Hostel Gate Timings Updated','From 1st July, hostel gates will close at 11:00 PM. All residents must return before closing time.','all','high','Warden Ijaz Khan','2026-06-28 09:00:00'),
    ('Mess Menu Changed for Eid Week','Special menu will be served from June 30 – July 6 for Eid celebrations. Biryani and BBQ on Saturday!','all','medium','Mess Committee','2026-06-27 10:30:00'),
    ('Block C Water Supply Interruption','Water supply in Block C will be interrupted on June 30 from 8 AM to 12 PM for pipe maintenance.','boys','medium','Maintenance Dept','2026-06-26 14:00:00'),
    ('Fee Submission Deadline','Last date for hostel fee submission for Fall 2026 semester is July 15. Late fines apply.','all','high','Accounts Office','2026-06-25 08:00:00'),
    ('Library Books Deadline','Return all issued books before July 10 to avoid fine deductions.','all','low','Librarian','2026-06-24 11:00:00'),
]

SEED_REQUESTS = [
    ('B22F1154CS030','maintenance','Ceiling Fan Not Working','The ceiling fan in my room A-101 has not been working for 3 days. Very hot weather.','high','pending'),
    ('B22F0403CS046','complaint','Noisy Neighbors','Loud music and noise after 11 PM from adjacent room. Disrupting study.','medium','under_review'),
    ('B22F0211CS017','room_change','Room Change Request','Requesting room change due to poor ventilation in A-110.','low','resolved'),
    ('B22F0589CS071','maintenance','Bathroom Tap Leaking','Bathroom tap in D-102 is continuously leaking. Wasting water.','high','pending'),
    ('B22F0300CS055','complaint','Mess Food Quality','Mess food quality has significantly degraded this week. Very oily food.','medium','under_review'),
    ('B22F0076CS092','maintenance','Window Broken','Window glass in C-301 is cracked. Risk of injury.','high','pending'),
]

SEED_HOSTEL_FEES = [
    ('B22F1154CS030','Ahmed Khan','Fall 2026',25000,'2026-07-15','unpaid'),
    ('B22F1154CS030','Ahmed Khan','Spring 2026',25000,'2026-01-15','paid'),
    ('B22F0403CS046','Sara Malik','Fall 2026',25000,'2026-07-15','paid'),
    ('B22F0403CS046','Sara Malik','Spring 2026',25000,'2026-01-15','paid'),
    ('B22F0211CS017','Fahad Iqbal','Fall 2026',25000,'2026-07-15','overdue'),
    ('B22F0589CS071','Ayesha Noor','Fall 2026',25000,'2026-07-15','paid'),
    ('B22F0076CS092','Usman Ali','Fall 2026',25000,'2026-07-15','paid'),
    ('B22F0300CS055','Hassan Raza','Fall 2026',25000,'2026-07-15','unpaid'),
]

SEED_MESS_FEES = [
    ('B22F1154CS030','Ahmed Khan','June 2026',4500,'2026-06-30','paid'),
    ('B22F1154CS030','Ahmed Khan','May 2026',4500,'2026-05-31','paid'),
    ('B22F0403CS046','Sara Malik','June 2026',4500,'2026-06-30','paid'),
    ('B22F0211CS017','Fahad Iqbal','June 2026',4500,'2026-06-30','unpaid'),
    ('B22F0589CS071','Ayesha Noor','June 2026',4500,'2026-06-30','paid'),
]

MENU_ITEMS = [
    ('Monday','breakfast','Paratha',0),('Monday','breakfast','Omelette',0),('Monday','breakfast','Chai',0),
    ('Monday','lunch','Daal Chawal',0),('Monday','lunch','Salad',0),
    ('Monday','dinner','Chapati',0),('Monday','dinner','Chicken Karahi',0),
    ('Tuesday','breakfast','Bread',0),('Tuesday','breakfast','Butter & Jam',0),('Tuesday','breakfast','Chai',0),
    ('Tuesday','lunch','Beef Biryani',0),('Tuesday','lunch','Raita',0),
    ('Tuesday','dinner','Chapati',0),('Tuesday','dinner','Keema',0),
    ('Wednesday','breakfast','Paratha',0),('Wednesday','breakfast','Halwa',0),('Wednesday','breakfast','Chai',0),
    ('Wednesday','lunch','Fish Curry',0),('Wednesday','lunch','Rice',0),
    ('Wednesday','dinner','Chapati',0),('Wednesday','dinner','Beef Qorma',0),
    ('Thursday','breakfast','Bread',0),('Thursday','breakfast','Egg',0),('Thursday','breakfast','Chai',0),
    ('Thursday','lunch','Daal',0),('Thursday','lunch','Rice',0),
    ('Thursday','dinner','Chapati',0),('Thursday','dinner','Chicken Palak',0),
    ('Friday','breakfast','Paratha',0),('Friday','breakfast','Omelette',0),('Friday','breakfast','Juice',0),
    ('Friday','lunch','Chicken Pulao',0),('Friday','lunch','Raita',0),
    ('Friday','dinner','Chapati',0),('Friday','dinner','Mutton Karahi',0),('Friday','dinner','Dessert',0),
    ('Saturday','breakfast','Halwa Puri',0),('Saturday','breakfast','Chai',0),
    ('Saturday','lunch','Chana',0),('Saturday','lunch','Rice',0),
    ('Saturday','dinner','Chapati',0),('Saturday','dinner','BBQ Chicken',0),
    ('Sunday','breakfast','Paratha',0),('Sunday','breakfast','Dahi',0),('Sunday','breakfast','Chai',0),
    ('Sunday','lunch','Special Biryani',0),('Sunday','lunch','Salad',0),
    ('Sunday','dinner','Chapati',0),('Sunday','dinner','Seekh Kabab',0),
]

SEED_ALERTS = [
    ('Unknown Person Detected','Unrecognized individual attempted entry at Main Gate','Main Gate','security','high',0,'2026-06-29 02:14:00'),
    ('Unknown Person Detected','Unrecognized individual at Block A entrance','Block A Entrance','security','high',0,'2026-06-29 03:22:00'),
    ('Low Confidence Match — Fahad Iqbal','Match confidence 55% (below 65% threshold)','Main Gate','security','medium',1,'2026-06-29 10:15:00'),
    ('Ahmed Khan Entry Authorized','Confidence: 91.5%','Main Gate','security','low',1,'2026-06-29 08:05:00'),
    ('Sara Malik Entry Authorized','Confidence: 88.2%','Main Gate','security','low',1,'2026-06-29 08:12:00'),
]


def init_extended(DB_PATH=DB_PATH, db_path=None):
    if db_path: DB_PATH = db_path
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    for stmt in SCHEMA.strip().split(';'):
        stmt = stmt.strip()
        if stmt:
            c.execute(stmt)
    
    # Seed students
    c.execute('SELECT COUNT(*) FROM students')
    if c.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        for s in SEED_STUDENTS:
            c.execute('''INSERT OR IGNORE INTO students
                (reg_no,first_name,last_name,email,phone,gender,blood_group,
                 hostel,room,program,guardian_name,guardian_phone,address,city,disability,photo_url,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', (*s, now))

    # Seed announcements
    c.execute('SELECT COUNT(*) FROM announcements')
    if c.fetchone()[0] == 0:
        for a in SEED_ANNOUNCEMENTS:
            c.execute('''INSERT INTO announcements (subject,message,target_audience,priority,sender_name,published_at)
                         VALUES (?,?,?,?,?,?)''', a)

    # Seed requests
    c.execute('SELECT COUNT(*) FROM requests')
    if c.fetchone()[0] == 0:
        for r in SEED_REQUESTS:
            c.execute('''INSERT INTO requests (student_reg_no,type,subject,description,priority,status)
                         VALUES (?,?,?,?,?,?)''', r)

    # Seed payments
    c.execute('SELECT COUNT(*) FROM payments_hostel')
    if c.fetchone()[0] == 0:
        for p in SEED_HOSTEL_FEES:
            c.execute('''INSERT INTO payments_hostel (student_reg_no,student_name,semester,amount,due_date,status)
                         VALUES (?,?,?,?,?,?)''', p)
        for p in SEED_MESS_FEES:
            c.execute('''INSERT INTO payments_mess (student_reg_no,student_name,month,amount,due_date,status)
                         VALUES (?,?,?,?,?,?)''', p)

    # Seed mess menu
    c.execute('SELECT COUNT(*) FROM mess_menu')
    if c.fetchone()[0] == 0:
        for m in MENU_ITEMS:
            c.execute('INSERT INTO mess_menu (day_of_week,meal_type,dish_name,price) VALUES (?,?,?,?)', m)

    # Seed dashboard alerts
    c.execute('SELECT COUNT(*) FROM dashboard_alerts')
    if c.fetchone()[0] == 0:
        for a in SEED_ALERTS:
            c.execute('''INSERT INTO dashboard_alerts (title,message,location,alert_type,severity,is_read,alert_time)
                         VALUES (?,?,?,?,?,?,?)''', a)

    # Dashboard stats
    c.execute('SELECT COUNT(*) FROM dashboard_stats')
    if c.fetchone()[0] == 0:
        stats = [
            ('hostels',    json.dumps({'hostels': 5})),
            ('rooms',      json.dumps({'rooms': 14})),
        ]
        c.executemany('INSERT OR IGNORE INTO dashboard_stats (stat_key,stat_value) VALUES (?,?)', stats)

    conn.commit()
    conn.close()
    print('[INFO] Extended DB tables initialized and seeded.')

if __name__ == '__main__':
    init_extended()
