/**
 * supabase-proxy.js  —  SmartDormX Local Supabase Shim
 * -------------------------------------------------------
 * Mirrors the @supabase/supabase-js chainable query API but routes every
 * call to the local Flask REST layer at  http://localhost:5000/api/<table>
 * instead of the real Supabase cloud.
 *
 * Supports:
 *   .from(table).select(...)
 *   .from(table).insert({...}).select().single()
 *   .from(table).update({...}).eq(col,val).select().single()
 *   .from(table).delete().eq(col,val)
 *   .from(table).upsert({...}, { onConflict })
 *   .from(table).select(...).order(col, {ascending}).limit(n)
 *   .from(table).select(...).eq(col,val).maybeSingle()
 *   .from(table).select(...).or(filterStr)
 *
 * Auth (stub — no real auth needed in demo mode):
 *   .auth.signInWithPassword({email,password}) → always succeeds
 *   .auth.signOut()
 *   .auth.getUser()
 *   .auth.onAuthStateChange(cb)
 */

const FLASK_BASE = window.location.origin + '/api';

// ── Low-level fetch helpers ────────────────────────────────────────────────
async function apiGet(table, params = {}) {
  const url = new URL(`${FLASK_BASE}/${table}`);
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const r = await fetch(url.toString());
  return r.json();
}

async function apiPost(table, body) {
  const r = await fetch(`${FLASK_BASE}/${table}`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  return r.json();
}

async function apiPatch(table, id, body) {
  const r = await fetch(`${FLASK_BASE}/${table}/${id}`, {
    method: 'PATCH',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  return r.json();
}

async function apiDelete(table, id) {
  const r = await fetch(`${FLASK_BASE}/${table}/${id}`, { method: 'DELETE' });
  return r.json();
}

async function apiDeleteWhere(table, params) {
  const url = new URL(`${FLASK_BASE}/${table}`);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), { method: 'DELETE' });
  return r.json();
}

async function apiUpsert(table, body) {
  const r = await fetch(`${FLASK_BASE}/${table}/upsert`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  return r.json();
}

// ── Query builder ─────────────────────────────────────────────────────────
class QueryBuilder {
  constructor(table) {
    this._table    = table;
    this._op       = 'select';   // 'select' | 'insert' | 'update' | 'delete' | 'upsert'
    this._filters  = {};         // col → val  (for .eq())
    this._orFilter = null;       // raw OR string  (for .or())
    this._searchFilter = null;   // for ilike patterns
    this._order    = null;       // { col, asc }
    this._limit    = null;
    this._single   = false;
    this._maybeSingle = false;
    this._body     = null;       // INSERT / UPDATE payload
    this._selCols  = '*';
    this._returnSelect = false;
  }

  // ── Terminal clones ──────────────────────────────────────────────────────
  select(cols = '*') {
    const q = this._clone();
    if (this._op === 'insert' || this._op === 'update') {
      q._returnSelect = true;    // .insert({}).select()
    } else {
      q._op = 'select';
      q._selCols = cols;
    }
    return q;
  }

  insert(body) {
    const q = this._clone(); q._op = 'insert'; q._body = body; return q;
  }

  update(body) {
    const q = this._clone(); q._op = 'update'; q._body = body; return q;
  }

  delete() {
    const q = this._clone(); q._op = 'delete'; return q;
  }

  upsert(body, opts = {}) {
    const q = this._clone(); q._op = 'upsert'; q._body = body; return q;
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  eq(col, val) {
    const q = this._clone(); q._filters[col] = val; return q;
  }

  or(filterStr) {
    // e.g. "first_name.ilike.%term%,last_name.ilike.%term%"
    const q = this._clone(); q._orFilter = filterStr; return q;
  }

  order(col, opts = { ascending: false }) {
    const q = this._clone();
    q._order = `${col} ${opts.ascending ? 'ASC' : 'DESC'}`;
    return q;
  }

  limit(n) {
    const q = this._clone(); q._limit = n; return q;
  }

  single() {
    const q = this._clone(); q._single = true; return q;
  }

  maybeSingle() {
    const q = this._clone(); q._maybeSingle = true; return q;
  }

  // ── Execute — thenable (await queryBuilder) ───────────────────────────────
  then(resolve, reject) {
    this._execute().then(resolve).catch(reject);
  }

  async _execute() {
    try {
      const table = this._table;

      // ── INSERT ──────────────────────────────────────────────────────────
      if (this._op === 'insert') {
        const res = await apiPost(table, this._body);
        if (res.error) return { data: null, error: res.error };
        let data = res.data;
        if (this._single || this._returnSelect) {
          return { data, error: null };
        }
        return { data: [data], error: null };
      }

      // ── UPSERT ──────────────────────────────────────────────────────────
      if (this._op === 'upsert') {
        const res = await apiUpsert(table, this._body);
        return { data: res.data, error: res.error || null };
      }

      // ── UPDATE ──────────────────────────────────────────────────────────
      if (this._op === 'update') {
        // Need to find the row id first via filters
        const idFilter = this._filters['id'];
        if (idFilter) {
          const res = await apiPatch(table, idFilter, this._body);
          if (res.error) return { data: null, error: res.error };
          return { data: this._single ? res.data : [res.data], error: null };
        }
        // No id filter — find matching rows first
        const params = { ...this._filters };
        if (this._order) params._order = this._order;
        const listRes = await apiGet(table, params);
        if (!listRes.data || listRes.data.length === 0) return { data: null, error: null };
        const row = listRes.data[0];
        const res = await apiPatch(table, row.id, this._body);
        if (res.error) return { data: null, error: res.error };
        return { data: this._single ? res.data : [res.data], error: null };
      }

      // ── DELETE ──────────────────────────────────────────────────────────
      if (this._op === 'delete') {
        const idFilter = this._filters['id'];
        if (idFilter) {
          const res = await apiDelete(table, idFilter);
          return { data: res.data, error: res.error || null };
        }
        if (Object.keys(this._filters).length > 0) {
          const res = await apiDeleteWhere(table, this._filters);
          return { data: res.data, error: res.error || null };
        }
        // Bulk delete (no filter) — delete all
        const res = await apiDeleteWhere(table, {});
        return { data: res.data, error: res.error || null };
      }

      // ── SELECT ──────────────────────────────────────────────────────────
      const params = { ...this._filters };
      if (this._order)  params._order = this._order;
      if (this._limit)  params._limit = this._limit;
      if (this._selCols && this._selCols !== '*') params._select = this._selCols;

      // Handle .or() — parse ilike patterns → _search
      if (this._orFilter) {
        // "col1.ilike.%term%,col2.ilike.%term%" → extract cols + term
        const parts = this._orFilter.split(',');
        const cols  = [];
        let   term  = '';
        for (const part of parts) {
          const [col, op, val] = part.split('.');
          if (op === 'ilike' && val) {
            cols.push(col);
            term = val.replace(/%/g, '');
          }
        }
        if (cols.length && term) {
          params._search = `${cols.join(',')}::${term}`;
        }
      }

      const res = await apiGet(table, params);
      if (res.error) return { data: null, error: res.error };

      let data = res.data || [];
      if (this._single)      return { data: data[0] || null, error: null };
      if (this._maybeSingle) return { data: data[0] || null, error: null };
      return { data, error: null };

    } catch (err) {
      console.warn(`[supabase-proxy] ${this._table} ${this._op} failed:`, err.message);
      return { data: null, error: { message: err.message } };
    }
  }

  _clone() {
    const q = new QueryBuilder(this._table);
    Object.assign(q, JSON.parse(JSON.stringify({
      _op: this._op, _filters: this._filters, _orFilter: this._orFilter,
      _order: this._order, _limit: this._limit, _single: this._single,
      _maybeSingle: this._maybeSingle, _body: this._body,
      _selCols: this._selCols, _returnSelect: this._returnSelect,
      _searchFilter: this._searchFilter,
    })));
    return q;
  }
}

// ── Auth stub ─────────────────────────────────────────────────────────────
const DEMO_USERS = {
  'admin@paf-iast.edu.pk':          { id:'admin-001', email:'admin@paf-iast.edu.pk', role:'admin',
                                      user_metadata:{ name:'Admin Nabeel', role:'admin' } },
  'ahmed@paf-iast.edu.pk':          { id:'std-001',   email:'ahmed@paf-iast.edu.pk',   role:'student',
                                      user_metadata:{ name:'Ahmed Khan', reg:'B22F1154CS030' } },
  'b22f1154cs030@paf-iast.edu.pk':  { id:'std-001',   email:'ahmed@paf-iast.edu.pk',   role:'student',
                                      user_metadata:{ name:'Ahmed Khan', reg:'B22F1154CS030' } },
};

let _currentUser = null;
const _authListeners = [];

const authStub = {
  async signInWithPassword({ email, password }) {
    const lower = (email || '').toLowerCase();
    const user  = DEMO_USERS[lower] || {
      id: 'demo-' + Date.now(),
      email: lower,
      role: lower.includes('admin') ? 'admin' : 'student',
      user_metadata: { name: email.split('@')[0] }
    };
    _currentUser = user;
    _authListeners.forEach(cb => cb('SIGNED_IN', { user }));
    return { data: { user, session: { access_token:'demo-token' } }, error: null };
  },

  async signOut() {
    _currentUser = null;
    _authListeners.forEach(cb => cb('SIGNED_OUT', null));
    return { error: null };
  },

  async getUser() {
    return { data: { user: _currentUser }, error: null };
  },

  async getSession() {
    return {
      data: { session: _currentUser ? { access_token:'demo-token', user:_currentUser } : null },
      error: null
    };
  },

  onAuthStateChange(cb) {
    _authListeners.push(cb);
    // Fire immediately with current state
    setTimeout(() => cb(_currentUser ? 'SIGNED_IN' : 'INITIAL_SESSION',
                        _currentUser ? { user: _currentUser } : null), 0);
    return { data: { subscription: { unsubscribe: () => {
      const i = _authListeners.indexOf(cb);
      if (i !== -1) _authListeners.splice(i, 1);
    }}}};
  }
};

// ── Storage stub ──────────────────────────────────────────────────────────
const storageStub = {
  from: (bucket) => ({
    upload: async (path, file) => ({ data: { path }, error: null }),
    getPublicUrl: (path) => ({ data: { publicUrl: '' } }),
    remove: async (paths) => ({ data: paths, error: null }),
  })
};

// ── Main client factory ───────────────────────────────────────────────────
function createClient(url, key) {
  return {
    from:    (table) => new QueryBuilder(table),
    auth:    authStub,
    storage: storageStub,
    _isProxy: true,
    _baseUrl: FLASK_BASE,
  };
}

// ── Expose globally (matches how supabase-config.js initialises the SDK) ──
window.supabase            = { createClient };
window._supabaseProxyReady = true;

console.log('[SmartDormX] Supabase proxy active → Flask REST at', FLASK_BASE);
