"""
Generic REST layer that exposes all Supabase tables over HTTP.
Mounted at /api/<table> — consumed by supabase-proxy.js on the frontend.
"""
import sqlite3, json
from flask import Blueprint, request, jsonify
from datetime import datetime

DB_PATH = '/home/claude/SmartDormX/backend/database.db'

api = Blueprint('api', __name__, url_prefix='/api')

# ── helpers ────────────────────────────────────────────────────────────────────
ALLOWED_TABLES = {
    'students', 'announcements', 'requests',
    'payments_hostel', 'payments_mess',
    'mess_menu', 'mess_attendance', 'mess_feedback',
    'dashboard_stats', 'dashboard_alerts',
}

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def row_to_dict(r):
    return dict(r)

def bad(msg, code=400):
    return jsonify({'error': msg}), code

def now_iso():
    return datetime.now().isoformat()

# ── GET /api/<table>  — SELECT with optional filters ──────────────────────────
@api.route('/<table>', methods=['GET'])
def select(table):
    if table not in ALLOWED_TABLES:
        return bad('Unknown table', 404)
    conn = db(); c = conn.cursor()

    # Build WHERE clause from query params  (e.g. ?status=pending&priority=high)
    SKIP = {'_order', '_limit', '_offset', '_select', '_or', '_search'}
    where, params = [], []
    for k, v in request.args.items():
        if k in SKIP: continue
        where.append(f"{k} = ?")
        params.append(v)

    # Full-text OR search  (?_search=col1,col2::term)
    search_param = request.args.get('_search')
    if search_param and '::' in search_param:
        cols_part, term = search_param.split('::', 1)
        cols = [c.strip() for c in cols_part.split(',')]
        or_parts = [f"LOWER({col}) LIKE ?" for col in cols]
        where.append('(' + ' OR '.join(or_parts) + ')')
        params.extend([f'%{term.lower()}%'] * len(cols))

    q = f"SELECT * FROM {table}"
    if where:
        q += ' WHERE ' + ' AND '.join(where)

    order = request.args.get('_order', 'id DESC')
    q += f' ORDER BY {order}'

    limit = request.args.get('_limit')
    if limit:
        q += f' LIMIT {int(limit)}'

    c.execute(q, params)
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify({'data': rows, 'error': None})


# ── POST /api/<table>  — INSERT ───────────────────────────────────────────────
@api.route('/<table>', methods=['POST'])
def insert(table):
    if table not in ALLOWED_TABLES:
        return bad('Unknown table', 404)
    body = request.get_json(force=True) or {}
    if not body:
        return bad('Empty body')

    # Inject timestamps
    if 'created_at' not in body:
        body['created_at'] = now_iso()
    if table == 'announcements' and 'published_at' not in body:
        body['published_at'] = now_iso()
    if table == 'mess_feedback' and 'submitted_at' not in body:
        body['submitted_at'] = now_iso()

    cols = ', '.join(body.keys())
    placeholders = ', '.join(['?'] * len(body))
    q = f"INSERT OR IGNORE INTO {table} ({cols}) VALUES ({placeholders})"

    conn = db(); c = conn.cursor()
    try:
        c.execute(q, list(body.values()))
        row_id = c.lastrowid
        conn.commit()
        c.execute(f"SELECT * FROM {table} WHERE id=?", (row_id,))
        row = c.fetchone()
        conn.close()
        return jsonify({'data': row_to_dict(row) if row else {'id': row_id}, 'error': None}), 201
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({'data': None, 'error': {'code':'23505','message': str(e)}}), 409
    except Exception as e:
        conn.close()
        return bad(str(e))


# ── PATCH /api/<table>/<id>  — UPDATE ────────────────────────────────────────
@api.route('/<table>/<int:row_id>', methods=['PATCH'])
def update(table, row_id):
    if table not in ALLOWED_TABLES:
        return bad('Unknown table', 404)
    body = request.get_json(force=True) or {}
    if not body:
        return bad('Empty body')

    sets = ', '.join([f"{k}=?" for k in body.keys()])
    q = f"UPDATE {table} SET {sets} WHERE id=?"
    conn = db(); c = conn.cursor()
    c.execute(q, list(body.values()) + [row_id])
    conn.commit()
    c.execute(f"SELECT * FROM {table} WHERE id=?", (row_id,))
    row = c.fetchone()
    conn.close()
    return jsonify({'data': row_to_dict(row) if row else {}, 'error': None})


# ── DELETE /api/<table>/<id>  — DELETE ───────────────────────────────────────
@api.route('/<table>/<int:row_id>', methods=['DELETE'])
def delete(table, row_id):
    if table not in ALLOWED_TABLES:
        return bad('Unknown table', 404)
    conn = db(); c = conn.cursor()
    c.execute(f"SELECT * FROM {table} WHERE id=?", (row_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return bad('Not found', 404)
    c.execute(f"DELETE FROM {table} WHERE id=?", (row_id,))
    conn.commit()
    conn.close()
    return jsonify({'data': row_to_dict(row), 'error': None})


# ── DELETE /api/<table>?col=val  — bulk DELETE ───────────────────────────────
@api.route('/<table>', methods=['DELETE'])
def delete_where(table):
    if table not in ALLOWED_TABLES:
        return bad('Unknown table', 404)
    where, params = [], []
    for k, v in request.args.items():
        where.append(f"{k}=?")
        params.append(v)
    if not where:
        return bad('No filter — refusing bulk delete without conditions')
    conn = db(); c = conn.cursor()
    q = f"DELETE FROM {table} WHERE " + ' AND '.join(where)
    c.execute(q, params)
    deleted = c.rowcount
    conn.commit()
    conn.close()
    return jsonify({'data': {'deleted': deleted}, 'error': None})


# ── UPSERT /api/<table>/upsert  — INSERT OR REPLACE ──────────────────────────
@api.route('/<table>/upsert', methods=['POST'])
def upsert(table):
    if table not in ALLOWED_TABLES:
        return bad('Unknown table', 404)
    body = request.get_json(force=True) or {}
    cols = ', '.join(body.keys())
    placeholders = ', '.join(['?'] * len(body))
    q = f"INSERT OR REPLACE INTO {table} ({cols}) VALUES ({placeholders})"
    conn = db(); c = conn.cursor()
    c.execute(q, list(body.values()))
    row_id = c.lastrowid
    conn.commit()
    c.execute(f"SELECT * FROM {table} WHERE id=?", (row_id,))
    row = c.fetchone()
    conn.close()
    return jsonify({'data': row_to_dict(row) if row else {'id': row_id}, 'error': None})


# ── Aggregated stats endpoint ─────────────────────────────────────────────────
@api.route('/dashboard/summary', methods=['GET'])
def dashboard_summary():
    conn = db(); c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM students'); students = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM requests WHERE status='pending'"); pending_req = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM dashboard_alerts WHERE is_read=0"); unread_alerts = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM payments_hostel WHERE status='unpaid' OR status='overdue'"); fee_issues = c.fetchone()[0]
    conn.close()
    return jsonify({
        'data': {
            'hostels': 5, 'students': students,
            'rooms': 14, 'alerts': unread_alerts,
            'requests': pending_req, 'urgent': fee_issues
        }, 'error': None
    })
