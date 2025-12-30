import sqlite3

db_path = "dinocars.db"

def fix_schema():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if role column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "role" not in columns:
            print("Adding role column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'worker'")
            
            # Set admin role for admin user
            cursor.execute("UPDATE users SET role = 'admin' WHERE username = 'admin'")
            conn.commit()
            print("Role column added and admin updated.")
        else:
            print("Role column already exists.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_schema()
