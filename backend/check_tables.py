import sqlite3

db_path = "dinocars.db"

def check_tables():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check users columns
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [info[1] for info in cursor.fetchall()]
        print(f"Users columns: {user_columns}")
        
        # Check if schedules table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='schedules'")
        if cursor.fetchone():
            print("Schedules table exists.")
        else:
            print("Schedules table MISSING.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_tables()
