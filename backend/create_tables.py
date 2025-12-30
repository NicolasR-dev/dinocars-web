from backend import database, models

def create_tables():
    print("Creating tables...")
    models.Base.metadata.create_all(bind=database.engine)
    print("Tables created.")

if __name__ == "__main__":
    create_tables()
