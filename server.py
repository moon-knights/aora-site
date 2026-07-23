#!/usr/bin/env python3
"""
آئورا — سرور توسعه محلی (Python/Flask)
جایگزین PHP + MySQL برای تست محلی
"""
import os, sys, json, sqlite3, hashlib, hmac, base64, time, re
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, g

# ═══════════════════════════════════════════════════════════
# تنظیمات
# ═══════════════════════════════════════════════════════════
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'aora.db')
JWT_SECRET = 'AoraSuperSecretKey_1405_MustBe32Chars!'
JWT_EXPIRY = 604800  # 7 روز

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')

# ═══════════════════════════════════════════════════════════
# دیتابیس SQLite
# ═══════════════════════════════════════════════════════════
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db: db.close()

def init_db():
    """ساخت جداول دیتابیس"""
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','professor','admin')),
        phone TEXT DEFAULT '',
        gender TEXT DEFAULT '',
        father_name TEXT DEFAULT '',
        national_code TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        university TEXT DEFAULT '',
        specialty TEXT DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT DEFAULT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        instructor_id INTEGER NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        original_price INTEGER NOT NULL DEFAULT 0,
        level TEXT DEFAULT 'مبتدی',
        duration TEXT DEFAULT '',
        category TEXT DEFAULT '',
        icon TEXT DEFAULT '📚',
        image TEXT DEFAULT '',
        rating REAL DEFAULT 0,
        students_count INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 1,
        tags TEXT DEFAULT '[]',
        chapters TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (instructor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
        progress INTEGER DEFAULT 0,
        completed_lessons TEXT DEFAULT NULL,
        payment_ref_id INTEGER DEFAULT NULL,
        amount_paid INTEGER DEFAULT 0,
        UNIQUE(user_id, course_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS forum_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'عمومی',
        author_id INTEGER NOT NULL,
        likes INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS forum_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        host TEXT DEFAULT '',
        code TEXT NOT NULL UNIQUE,
        creator_id INTEGER NOT NULL,
        status TEXT DEFAULT 'scheduled',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        creator_id INTEGER NOT NULL,
        questions TEXT DEFAULT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survey_id INTEGER NOT NULL,
        answers TEXT DEFAULT NULL,
        respondent_email TEXT DEFAULT NULL,
        submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        authority TEXT NOT NULL UNIQUE,
        ref_id INTEGER DEFAULT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        html_content TEXT DEFAULT NULL,
        css_content TEXT DEFAULT NULL,
        grapesjs_state TEXT DEFAULT NULL,
        is_published INTEGER DEFAULT 1,
        is_home_page INTEGER DEFAULT 0,
        meta_description TEXT DEFAULT NULL,
        og_image TEXT DEFAULT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT NULL,
        created_by TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        logo_url TEXT DEFAULT NULL,
        logo_path TEXT DEFAULT NULL,
        site_name TEXT DEFAULT 'آئورا',
        global_header_html TEXT DEFAULT NULL,
        global_header_css TEXT DEFAULT NULL,
        global_header_state TEXT DEFAULT NULL,
        global_footer_html TEXT DEFAULT NULL,
        global_footer_css TEXT DEFAULT NULL,
        global_footer_state TEXT DEFAULT NULL,
        favicon_url TEXT DEFAULT NULL,
        custom_css TEXT DEFAULT NULL,
        custom_head_scripts TEXT DEFAULT NULL,
        support_email TEXT DEFAULT NULL,
        maintenance_mode INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)

    # داده‌های اولیه
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users WHERE role='admin'")
    if cur.fetchone()[0] == 0:
        pw_hash = bcrypt_hash('admin123')
        cur.execute("INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
                    ('مدیر آئورا', 'aora@admin.ir', pw_hash, 'admin'))
    cur.execute("SELECT COUNT(*) FROM site_settings")
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO site_settings (id, site_name) VALUES (1, 'آئورا')")
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════
# احراز هویت (JWT ساده)
# ═══════════════════════════════════════════════════════════
def bcrypt_hash(password):
    """شبیه‌ساز bcrypt با hashlib"""
    salt = os.urandom(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return f"$pbkdf2${base64.b64encode(salt).decode()}${base64.b64encode(h).decode()}"

def bcrypt_verify(password, stored):
    """بررسی رمز عبور"""
    if stored.startswith('$pbkdf2$'):
        parts = stored.split('$')
        salt = base64.b64decode(parts[2])
        expected = base64.b64decode(parts[3])
        h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return hmac.compare_digest(h, expected)
    # fallback: plain hash (for dev)
    return password == stored

def generate_token(user):
    header = base64.urlsafe_b64encode(json.dumps({"alg":"HS256","typ":"JWT"}).encode()).decode().rstrip('=')
    payload_data = {
        "sub": user['id'], "email": user['email'],
        "role": user['role'], "name": user.get('full_name',''),
        "iss": "Aora", "iat": int(time.time()), "exp": int(time.time()) + JWT_EXPIRY
    }
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip('=')
    sig = base64.urlsafe_b64encode(
        hmac.new(JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    ).decode().rstrip('=')
    return f"{header}.{payload}.{sig}"

def verify_token(token):
    try:
        parts = token.split('.')
        if len(parts) != 3: return None
        header, payload, sig = parts
        expected = base64.urlsafe_b64encode(
            hmac.new(JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
        ).decode().rstrip('=')
        if not hmac.compare_digest(sig, expected): return None
        # pad base64
        payload += '=' * (4 - len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload))
        if data.get('exp', 0) < time.time(): return None
        return data
    except:
        return None

def get_current_user():
    auth = request.headers.get('Authorization', '')
    m = re.match(r'^Bearer\s+(.+)$', auth, re.I)
    if not m: return None
    return verify_token(m.group(1))

def require_auth():
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "message": "وارد نشده‌اید."}), 401
    return user

def require_role(*roles):
    user = require_auth()
    if isinstance(user, tuple): return user  # error response
    if user['role'] not in roles:
        return jsonify({"success": False, "message": "شما اجازه دسترسی به این بخش را ندارید."}), 403
    return user


# ═══════════════════════════════════════════════════════════
# API: احراز هویت
# ═══════════════════════════════════════════════════════════
@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.get_json() or {}
    full_name = (data.get('fullName') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    role = data.get('role', 'student')

    if not full_name: return jsonify({"success": False, "message": "نام الزامی است."}), 400
    if not email or '@' not in email: return jsonify({"success": False, "message": "ایمیل معتبر وارد کنید."}), 400
    if not password or len(password) < 6: return jsonify({"success": False, "message": "رمز عبور حداقل ۶ کاراکتر."}), 400

    safe_role = role if role in ('student',) else 'student'
    db = get_db()
    if db.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
        return jsonify({"success": False, "message": "این ایمیل قبلاً ثبت شده است."}), 400

    pw_hash = bcrypt_hash(password)
    cur = db.execute("INSERT INTO users (full_name, email, password_hash, role) VALUES (?,?,?,?)",
                     (full_name, email, pw_hash, safe_role))
    db.commit()
    user = {"id": cur.lastrowid, "full_name": full_name, "email": email, "role": safe_role}
    token = generate_token(user)
    return jsonify({"success": True, "user": {"id": user["id"], "fullName": full_name, "email": email, "role": safe_role}, "token": token})

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({"success": False, "message": "ایمیل و رمز را وارد کنید."}), 400

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not user or not bcrypt_verify(password, user['password_hash']):
        return jsonify({"success": False, "message": "ایمیل یا رمز عبور اشتباه است."}), 401
    if not user['is_active']:
        return jsonify({"success": False, "message": "حساب کاربری غیرفعال شده است."}), 403

    db.execute("UPDATE users SET last_login_at=datetime('now') WHERE id=?", (user['id'],))
    db.commit()
    token = generate_token({"id": user['id'], "full_name": user['full_name'], "email": user['email'], "role": user['role']})
    return jsonify({"success": True, "user": {"id": user['id'], "fullName": user['full_name'], "email": user['email'], "role": user['role']}, "token": token})

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    auth = require_auth()
    if isinstance(auth, tuple): return auth
    db = get_db()
    user = db.execute("SELECT id, full_name, email, role, bio, phone, university, gender, father_name, national_code, avatar FROM users WHERE id=?", (auth['sub'],)).fetchone()
    if not user: return jsonify({"success": False, "message": "کاربر یافت نشد."}), 404
    return jsonify({
        "id": user['id'], "fullName": user['full_name'], "email": user['email'],
        "role": user['role'], "bio": user['bio'], "phone": user['phone'],
        "university": user['university'], "gender": user['gender'],
        "fatherName": user['father_name'], "nationalCode": user['national_code'], "avatar": user['avatar']
    })

@app.route('/api/auth/profile', methods=['PUT'])
def auth_profile():
    auth = require_auth()
    if isinstance(auth, tuple): return auth
    data = request.get_json() or {}
    db = get_db()
    fields, params = [], []
    for key, col in [('fullName','full_name'),('bio','bio'),('phone','phone'),('university','university'),('specialty','specialty')]:
        if key in data:
            fields.append(f"{col} = ?")
            params.append(data[key])
    if not fields:
        return jsonify({"success": False, "message": "هیچ فیلدی برای بروزرسانی ارسال نشد."}), 400
    params.append(auth['sub'])
    db.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", params)
    db.commit()
    return jsonify({"success": True})


# ═══════════════════════════════════════════════════════════
# API: دوره‌ها
# ═══════════════════════════════════════════════════════════
def course_to_dict(c):
    d = dict(c)
    return {
        "id": d['id'], "title": d['title'], "description": d['description'],
        "price": d['price'], "originalPrice": d['original_price'],
        "level": d['level'], "duration": d['duration'], "category": d['category'],
        "icon": d['icon'], "image": d['image'], "rating": d['rating'],
        "students": d['students_count'], "featured": bool(d['is_featured']),
        "tags": json.loads(d.get('tags') or '[]'),
        "instructor": d.get('instructor_name', ''),
        "instructorId": d['instructor_id']
    }

@app.route('/api/courses', methods=['GET'])
def courses_list():
    db = get_db()
    where = ["c.is_published = 1"]
    params = []
    q = request.args.get('q', '')
    category = request.args.get('category', '')
    level = request.args.get('level', '')

    if category and category != 'all':
        where.append("c.category = ?"); params.append(category)
    if level and level != 'all':
        where.append("c.level = ?"); params.append(level)
    if q:
        where.append("(c.title LIKE ? OR c.description LIKE ? OR u.full_name LIKE ?)")
        qp = f"%{q}%"
        params.extend([qp, qp, qp])

    sql = f"SELECT c.*, u.full_name AS instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id = u.id WHERE {' AND '.join(where)} ORDER BY c.students_count DESC"
    courses = db.execute(sql, params).fetchall()
    return jsonify({"success": True, "data": [course_to_dict(c) for c in courses]})

@app.route('/api/courses/<int:cid>', methods=['GET'])
def course_detail(cid):
    db = get_db()
    c = db.execute("SELECT c.*, u.full_name AS instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id = u.id WHERE c.id=?", (cid,)).fetchone()
    if not c: return jsonify({"success": False, "message": "دوره یافت نشد."}), 404
    d = course_to_dict(c)
    d['chapters'] = json.loads(c['chapters'] or '[]')
    return jsonify({"success": True, "data": d})

@app.route('/api/courses', methods=['POST'])
def course_create():
    auth = require_role('admin', 'professor')
    if isinstance(auth, tuple): return auth
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title: return jsonify({"success": False, "message": "عنوان دوره الزامی است."}), 400
    db = get_db()
    cur = db.execute("""INSERT INTO courses (title, description, instructor_id, price, original_price, level, duration, category, icon, image, tags, chapters)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (title, data.get('description',''), data.get('instructorId', auth['sub']),
         int(data.get('price',0)), int(data.get('originalPrice', data.get('price',0))),
         data.get('level','مبتدی'), data.get('duration',''), data.get('category',''),
         data.get('icon','📚'), data.get('image',''),
         json.dumps(data.get('tags',[]), ensure_ascii=False),
         json.dumps(data.get('chapters',[]), ensure_ascii=False)))
    db.commit()
    return jsonify({"success": True, "data": {"id": cur.lastrowid}, "message": "دوره ایجاد شد."})

@app.route('/api/courses/<int:cid>', methods=['PUT'])
def course_update(cid):
    auth = require_role('admin', 'professor')
    if isinstance(auth, tuple): return auth
    data = request.get_json() or {}
    db = get_db()
    c = db.execute("SELECT * FROM courses WHERE id=?", (cid,)).fetchone()
    if not c: return jsonify({"success": False, "message": "دوره یافت نشد."}), 404
    if auth['role'] != 'admin' and c['instructor_id'] != auth['sub']:
        return jsonify({"success": False, "message": "شما اجازه ویرایش این دوره را ندارید."}), 403

    fields, params = [], []
    mapping = {'title':'title','description':'description','price':'price','originalPrice':'original_price',
               'level':'level','duration':'duration','category':'category','icon':'icon','image':'image',
               'rating':'rating'}
    for k, col in mapping.items():
        if k in data:
            fields.append(f"{col} = ?"); params.append(data[k])
    if 'tags' in data:
        fields.append("tags = ?"); params.append(json.dumps(data['tags'], ensure_ascii=False))
    if 'chapters' in data:
        fields.append("chapters = ?"); params.append(json.dumps(data['chapters'], ensure_ascii=False))
    if 'isPublished' in data:
        fields.append("is_published = ?"); params.append(1 if data['isPublished'] else 0)
    if 'featured' in data:
        fields.append("is_featured = ?"); params.append(1 if data['featured'] else 0)
    if not fields:
        return jsonify({"success": False, "message": "هیچ فیلدی برای بروزرسانی ارسال نشد."}), 400
    params.append(cid)
    db.execute(f"UPDATE courses SET {', '.join(fields)} WHERE id = ?", params)
    db.commit()
    return jsonify({"success": True, "message": "دوره بروزرسانی شد."})

@app.route('/api/courses/<int:cid>', methods=['DELETE'])
def course_delete(cid):
    auth = require_role('admin', 'professor')
    if isinstance(auth, tuple): return auth
    db = get_db()
    c = db.execute("SELECT instructor_id FROM courses WHERE id=?", (cid,)).fetchone()
    if not c: return jsonify({"success": False, "message": "دوره یافت نشد."}), 404
    if auth['role'] != 'admin' and c['instructor_id'] != auth['sub']:
        return jsonify({"success": False, "message": "شما اجازه حذف این دوره را ندارید."}), 403
    db.execute("DELETE FROM courses WHERE id=?", (cid,))
    db.commit()
    return jsonify({"success": True, "message": "دوره حذف شد."})


# ═══════════════════════════════════════════════════════════
# API: ثبت‌نام
# ═══════════════════════════════════════════════════════════
@app.route('/api/enrollment', methods=['GET'])
def enrollment_list():
    auth = require_auth()
    if isinstance(auth, tuple): return auth
    db = get_db()
    rows = db.execute("""SELECT e.*, c.title, c.icon, c.image, c.instructor_id, u.full_name AS instructor_name
        FROM enrollments e JOIN courses c ON e.course_id = c.id LEFT JOIN users u ON c.instructor_id = u.id
        WHERE e.user_id = ? ORDER BY e.enrolled_at DESC""", (auth['sub'],)).fetchall()
    data = [{"id": r['id'], "courseId": r['course_id'], "title": r['title'], "icon": r['icon'],
             "image": r['image'], "progress": r['progress'], "enrolledAt": r['enrolled_at'],
             "instructor": r['instructor_name'] or ''} for r in rows]
    return jsonify({"success": True, "data": data})

@app.route('/api/enrollment', methods=['POST'])
def enrollment_create():
    auth = require_auth()
    if isinstance(auth, tuple): return auth
    data = request.get_json() or {}
    course_id = data.get('courseId')
    if not course_id: return jsonify({"success": False, "message": "شناسه دوره الزامی است."}), 400
    db = get_db()
    c = db.execute("SELECT id FROM courses WHERE id=? AND is_published=1", (course_id,)).fetchone()
    if not c: return jsonify({"success": False, "message": "دوره یافت نشد."}), 404
    existing = db.execute("SELECT id FROM enrollments WHERE user_id=? AND course_id=?", (auth['sub'], course_id)).fetchone()
    if existing: return jsonify({"success": False, "message": "قبلاً ثبت‌نام کرده‌اید."}), 400
    db.execute("INSERT INTO enrollments (user_id, course_id) VALUES (?,?)", (auth['sub'], course_id))
    db.execute("UPDATE courses SET students_count = students_count + 1 WHERE id = ?", (course_id,))
    db.commit()
    return jsonify({"success": True, "message": "ثبت‌نام انجام شد."})


# ═══════════════════════════════════════════════════════════
# API: تالار گفتگو
# ═══════════════════════════════════════════════════════════
@app.route('/api/forum', methods=['GET'])
def forum_list():
    db = get_db()
    posts = db.execute("""SELECT p.*, u.full_name AS author_name FROM forum_posts p
        LEFT JOIN users u ON p.author_id = u.id ORDER BY p.created_at DESC""").fetchall()
    data = [{"id": p['id'], "title": p['title'], "content": p['content'], "category": p['category'],
             "author": p['author_name'] or '', "authorId": p['author_id'],
             "likes": p['likes'], "views": p['views'], "createdAt": p['created_at']} for p in posts]
    return jsonify({"success": True, "data": data})

@app.route('/api/forum', methods=['POST'])
def forum_create():
    auth = require_auth()
    if isinstance(auth, tuple): return auth
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    if not title or not content:
        return jsonify({"success": False, "message": "عنوان و محتوا الزامی است."}), 400
    db = get_db()
    cur = db.execute("INSERT INTO forum_posts (title, content, category, author_id) VALUES (?,?,?,?)",
                     (title, content, data.get('category','عمومی'), auth['sub']))
    db.commit()
    return jsonify({"success": True, "data": {"id": cur.lastrowid}})

@app.route('/api/forum/<int:pid>', methods=['GET'])
def forum_detail(pid):
    db = get_db()
    p = db.execute("SELECT p.*, u.full_name AS author_name FROM forum_posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.id=?", (pid,)).fetchone()
    if not p: return jsonify({"success": False, "message": "پست یافت نشد."}), 404
    db.execute("UPDATE forum_posts SET views = views + 1 WHERE id = ?", (pid,))
    db.commit()
    replies = db.execute("SELECT r.*, u.full_name AS author_name FROM forum_replies r LEFT JOIN users u ON r.author_id = u.id WHERE r.post_id=? ORDER BY r.created_at", (pid,)).fetchall()
    return jsonify({"success": True, "data": {
        "id": p['id'], "title": p['title'], "content": p['content'], "category": p['category'],
        "author": p['author_name'] or '', "likes": p['likes'], "views": p['views']+1, "createdAt": p['created_at'],
        "replies": [{"id": r['id'], "content": r['content'], "author": r['author_name'] or '', "createdAt": r['created_at']} for r in replies]
    }})

@app.route('/api/forum/<int:pid>/reply', methods=['POST'])
def forum_reply(pid):
    auth = require_auth()
    if isinstance(auth, tuple): return auth
    data = request.get_json() or {}
    content = (data.get('content') or '').strip()
    if not content: return jsonify({"success": False, "message": "محتوا الزامی است."}), 400
    db = get_db()
    db.execute("INSERT INTO forum_replies (post_id, content, author_id) VALUES (?,?,?)", (pid, content, auth['sub']))
    db.commit()
    return jsonify({"success": True, "message": "پاسخ ارسال شد."})


# ═══════════════════════════════════════════════════════════
# API: جلسات
# ═══════════════════════════════════════════════════════════
@app.route('/api/meetings', methods=['GET'])
def meetings_list():
    auth = require_auth()
    if isinstance(auth, tuple): return auth
    db = get_db()
    rows = db.execute("SELECT m.*, u.full_name AS creator_name FROM meetings m LEFT JOIN users u ON m.creator_id = u.id ORDER BY m.created_at DESC").fetchall()
    return jsonify({"success": True, "data": [{"id": r['id'], "title": r['title'], "host": r['host'],
        "code": r['code'], "status": r['status'], "creator": r['creator_name'] or '', "createdAt": r['created_at']} for r in rows]})

@app.route('/api/meetings', methods=['POST'])
def meeting_create():
    auth = require_role('admin', 'professor')
    if isinstance(auth, tuple): return auth
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title: return jsonify({"success": False, "message": "عنوان جلسه الزامی است."}), 400
    import random, string
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    db = get_db()
    cur = db.execute("INSERT INTO meetings (title, host, code, creator_id) VALUES (?,?,?,?)",
                     (title, data.get('host',''), code, auth['sub']))
    db.commit()
    return jsonify({"success": True, "data": {"id": cur.lastrowid, "code": code}})


# ═══════════════════════════════════════════════════════════
# API: نظرسنجی‌ها
# ═══════════════════════════════════════════════════════════
@app.route('/api/surveys', methods=['GET'])
def surveys_list():
    db = get_db()
    rows = db.execute("SELECT s.*, u.full_name AS creator_name FROM surveys s LEFT JOIN users u ON s.creator_id = u.id ORDER BY s.created_at DESC").fetchall()
    return jsonify({"success": True, "data": [{"id": r['id'], "title": r['title'], "description": r['description'],
        "creator": r['creator_name'] or '', "status": r['status'], "createdAt": r['created_at']} for r in rows]})

@app.route('/api/surveys', methods=['POST'])
def survey_create():
    auth = require_role('admin', 'professor')
    if isinstance(auth, tuple): return auth
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title: return jsonify({"success": False, "message": "عنوان نظرسنجی الزامی است."}), 400
    db = get_db()
    cur = db.execute("INSERT INTO surveys (title, description, creator_id, questions) VALUES (?,?,?,?)",
                     (title, data.get('description',''), auth['sub'], json.dumps(data.get('questions',[]), ensure_ascii=False)))
    db.commit()
    return jsonify({"success": True, "data": {"id": cur.lastrowid}})


# ═══════════════════════════════════════════════════════════
# API: تنظیمات
# ═══════════════════════════════════════════════════════════
@app.route('/api/settings', methods=['GET'])
def settings_get():
    db = get_db()
    s = db.execute("SELECT * FROM site_settings WHERE id=1").fetchone()
    if not s: return jsonify({"success": True, "data": {}})
    return jsonify({"success": True, "data": dict(s)})

@app.route('/api/settings', methods=['PUT'])
def settings_update():
    auth = require_role('admin')
    if isinstance(auth, tuple): return auth
    data = request.get_json() or {}
    db = get_db()
    fields, params = [], []
    for key in ['site_name','logo_url','logo_path','favicon_url','custom_css','custom_head_scripts','support_email','maintenance_mode',
                'global_header_html','global_header_css','global_footer_html','global_footer_css']:
        if key in data:
            fields.append(f"{key} = ?"); params.append(data[key])
    if fields:
        fields.append("updated_at = datetime('now')")
        db.execute(f"UPDATE site_settings SET {', '.join(fields)} WHERE id = 1", params)
        db.commit()
    return jsonify({"success": True, "message": "تنظیمات بروزرسانی شد."})


# ═══════════════════════════════════════════════════════════
# API: ادمین
# ═══════════════════════════════════════════════════════════
@app.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    auth = require_role('admin')
    if isinstance(auth, tuple): return auth
    db = get_db()
    users_count = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    courses_count = db.execute("SELECT COUNT(*) FROM courses").fetchone()[0]
    enrollments_count = db.execute("SELECT COUNT(*) FROM enrollments").fetchone()[0]
    return jsonify({"success": True, "data": {
        "users": users_count, "courses": courses_count, "enrollments": enrollments_count
    }})

@app.route('/api/admin/users', methods=['GET'])
def admin_users():
    auth = require_role('admin')
    if isinstance(auth, tuple): return auth
    db = get_db()
    rows = db.execute("SELECT id, full_name, email, role, is_active, created_at, last_login_at FROM users ORDER BY created_at DESC").fetchall()
    return jsonify({"success": True, "data": [dict(r) for r in rows]})


# ═══════════════════════════════════════════════════════════
# API: صفحات
# ═══════════════════════════════════════════════════════════
@app.route('/api/pages', methods=['GET'])
def pages_list():
    db = get_db()
    rows = db.execute("SELECT * FROM pages ORDER BY sort_order").fetchall()
    return jsonify({"success": True, "data": [dict(r) for r in rows]})

@app.route('/api/pages/<slug>', methods=['GET'])
def page_get(slug):
    db = get_db()
    p = db.execute("SELECT * FROM pages WHERE slug=?", (slug,)).fetchone()
    if not p: return jsonify({"success": False, "message": "صفحه یافت نشد."}), 404
    return jsonify({"success": True, "data": dict(p)})


# ═══════════════════════════════════════════════════════════
# API: اساتید و دانشجویان
# ═══════════════════════════════════════════════════════════
@app.route('/api/professors', methods=['GET'])
def professors_list():
    db = get_db()
    rows = db.execute("SELECT id, full_name, email, bio, avatar, university, specialty FROM users WHERE role='professor' AND is_active=1").fetchall()
    return jsonify({"success": True, "data": [dict(r) for r in rows]})

@app.route('/api/students', methods=['GET'])
def students_list():
    auth = require_role('admin', 'professor')
    if isinstance(auth, tuple): return auth
    db = get_db()
    rows = db.execute("SELECT id, full_name, email, university, created_at FROM users WHERE role='student' AND is_active=1").fetchall()
    return jsonify({"success": True, "data": [dict(r) for r in rows]})


# ═══════════════════════════════════════════════════════════
# سرو فایل‌های استاتیک (HTML, CSS, JS)
# ═══════════════════════════════════════════════════════════
@app.route('/')
def serve_index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    # اگر فایل واقعی وجود داره، همون رو بده
    full = os.path.join(BASE_DIR, filename)
    if os.path.isfile(full):
        return send_from_directory(BASE_DIR, filename)
    # تلاش برای اضافه کردن .html
    html_path = os.path.join(BASE_DIR, filename + '.html')
    if os.path.isfile(html_path):
        return send_from_directory(BASE_DIR, filename + '.html')
    return jsonify({"success": False, "message": "یافت نشد."}), 404


# ═══════════════════════════════════════════════════════════
# اجرا
# ═══════════════════════════════════════════════════════════
if __name__ == '__main__':
    init_db()
    print("=" * 50)
    print("  🌟 آئورا — سرور توسعه محلی")
    print("  📂 پایگاه داده: aora.db (SQLite)")
    print("  🌐 آدرس: http://localhost:5000")
    print("  👤 ادمین: aora@admin.ir / admin123")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=False)
