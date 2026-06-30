import sqlite3
from datetime import datetime


class Database:
    DB_PATH = 'database.db'

    @staticmethod
    def get_connection():
        conn = sqlite3.connect(Database.DB_PATH, timeout=10)
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    @staticmethod
    def init_db():
        """
        Initialize fresh Version 6 database.

        New structure:
        - users: one row per student
        - user_images: multiple images per student
        - logs: activity logs
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            is_primary INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            status TEXT NOT NULL,
            confidence REAL NOT NULL,
            anomaly INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
        )
        ''')

        conn.commit()
        conn.close()

    # ─────────────────────────────────────────────────────────────────────
    # Users
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_or_create_user(name):
        """
        Return user_id.
        If user does not exist, create it.
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        name = name.strip()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute(
            "SELECT id FROM users WHERE LOWER(name) = LOWER(?)",
            (name,)
        )

        row = cursor.fetchone()

        if row:
            user_id = row[0]
            created = False
        else:
            cursor.execute(
                "INSERT INTO users (name, created_at) VALUES (?, ?)",
                (name, now)
            )
            user_id = cursor.lastrowid
            created = True

        conn.commit()
        conn.close()

        return user_id, created

    @staticmethod
    def add_user_image(user_id, image_path):
        """
        Add an image for a user.
        First image automatically becomes primary.
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute(
            "SELECT COUNT(*) FROM user_images WHERE user_id = ?",
            (user_id,)
        )

        image_count = cursor.fetchone()[0]
        is_primary = 1 if image_count == 0 else 0

        cursor.execute(
            """
            INSERT INTO user_images 
            (user_id, image_path, is_primary, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, image_path, is_primary, now)
        )

        conn.commit()
        conn.close()

        return True

    @staticmethod
    def add_user_with_images(name, image_paths):
        """
        Create user if needed and add multiple images.
        If user already exists, add new images to same user.
        """
        user_id, created = Database.get_or_create_user(name)

        added_count = 0

        for path in image_paths:
            Database.add_user_image(user_id, path)
            added_count += 1

        return {
            "user_id": user_id,
            "created": created,
            "images_added": added_count
        }

    @staticmethod
    def get_all_users():
        """
        Return all users with primary image and image count.

        Returns:
        id, name, primary_image_path, image_count, created_at
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT 
                u.id,
                u.name,
                (
                    SELECT ui.image_path
                    FROM user_images ui
                    WHERE ui.user_id = u.id
                    ORDER BY ui.is_primary DESC, ui.id ASC
                    LIMIT 1
                ) AS primary_image_path,
                COUNT(ui2.id) AS image_count,
                u.created_at
            FROM users u
            LEFT JOIN user_images ui2 ON ui2.user_id = u.id
            GROUP BY u.id, u.name, u.created_at
            ORDER BY u.id DESC
        ''')

        users = cursor.fetchall()
        conn.close()

        return users

    @staticmethod
    def get_user_by_id(user_id):
        """
        Return one user.

        Returns:
        id, name, created_at
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, name, created_at FROM users WHERE id = ?",
            (user_id,)
        )

        user = cursor.fetchone()
        conn.close()

        return user

    @staticmethod
    def get_user_images(user_id):
        """
        Return all images for one user.

        Returns:
        id, user_id, image_path, is_primary, created_at
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, user_id, image_path, is_primary, created_at
            FROM user_images
            WHERE user_id = ?
            ORDER BY is_primary DESC, id ASC
            """,
            (user_id,)
        )

        images = cursor.fetchall()
        conn.close()

        return images

    @staticmethod
    def get_all_user_images_for_recognition():
        """
        Return all user images for face recognition.

        Returns:
        user_id, name, image_path
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT u.id, u.name, ui.image_path
            FROM users u
            JOIN user_images ui ON ui.user_id = u.id
            ORDER BY u.id ASC, ui.id ASC
        ''')

        rows = cursor.fetchall()
        conn.close()

        return rows

    @staticmethod
    def delete_user(user_id):
        """
        Delete user from database only.
        Physical image files are NOT deleted.

        Logs are preserved, but user_id is set to NULL.
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:
            conn.close()
            return False

        cursor.execute(
            "UPDATE logs SET user_id = NULL WHERE user_id = ?",
            (user_id,)
        )

        cursor.execute(
            "DELETE FROM user_images WHERE user_id = ?",
            (user_id,)
        )

        cursor.execute(
            "DELETE FROM users WHERE id = ?",
            (user_id,)
        )

        conn.commit()
        conn.close()

        return True

    # ─────────────────────────────────────────────────────────────────────
    # Logs
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def insert_log(name, status, confidence, anomaly=0):
        """
        Insert event log into database.
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute(
            "SELECT id FROM users WHERE LOWER(name) = LOWER(?)",
            (name,)
        )

        user = cursor.fetchone()
        user_id = user[0] if user else None

        cursor.execute(
            """
            INSERT INTO logs 
            (user_id, name, timestamp, status, confidence, anomaly) 
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                name,
                timestamp,
                status,
                float(confidence),
                int(anomaly)
            )
        )

        conn.commit()
        conn.close()

    @staticmethod
    def get_logs(limit=100, name='', timestamp='', status='', anomaly=None):
        """
        Fetch logs from database with optional filters.
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        query = """
            SELECT id, name, timestamp, status, confidence, anomaly
            FROM logs
            WHERE 1 = 1
        """

        params = []

        if name:
            query += " AND LOWER(name) LIKE LOWER(?)"
            params.append(f"%{name}%")

        if timestamp:
            query += " AND timestamp LIKE ?"
            params.append(f"%{timestamp}%")

        if status:
            query += " AND status = ?"
            params.append(status)

        if anomaly is not None:
            query += " AND anomaly = ?"
            params.append(int(anomaly))

        query += " ORDER BY id DESC LIMIT ?"
        params.append(int(limit))

        cursor.execute(query, params)

        logs = cursor.fetchall()
        conn.close()

        return logs

    @staticmethod
    def clear_tables():
        """
        Clear all tables.
        """
        conn = Database.get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM logs")
        cursor.execute("DELETE FROM user_images")
        cursor.execute("DELETE FROM users")

        conn.commit()
        conn.close()