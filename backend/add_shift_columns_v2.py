from sqlalchemy import create_engine, text
from backend.database import SQLALCHEMY_DATABASE_URL

def add_columns():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN opening_start_time VARCHAR"))
            conn.execute(text("ALTER TABLE users ADD COLUMN opening_end_time VARCHAR"))
            conn.execute(text("ALTER TABLE users ADD COLUMN closing_start_time VARCHAR"))
            conn.execute(text("ALTER TABLE users ADD COLUMN closing_end_time VARCHAR"))
            conn.commit()
            print("Columns added successfully.")
        except Exception as e:
            print(f"Error adding columns (they might already exist): {e}")

if __name__ == "__main__":
    add_columns()
