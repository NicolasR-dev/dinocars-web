import pandas as pd
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend import models
from datetime import datetime

# Bind engine
models.Base.metadata.create_all(bind=engine)

def import_data():
    file_path = "/Users/nicolasrbarra/development/pyton/DinoCars/ventas_2025-07.xlsx"
    df = pd.read_excel(file_path)
    
    # Fill NaN with 0 or appropriate defaults
    df = df.fillna(0)
    
    # Coerce numeric columns
    numeric_cols = ['Total acumulado dinosaurios', 'Vueltas', 'Vueltas administrativas', 'Vueltas efectivas', 
                    'Ingresos esperados', 'Efectivo retirado', 'Efectivo en caja', 'Pagos en tarjeta', 
                    'Total contabilizado', 'Diferencia', 'Efectivo diario generado', 'Juguetes vendidos']
    
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    db = SessionLocal()
    
    try:
        # Sort by date to ensure correct order
        df['Fecha'] = pd.to_datetime(df['Fecha'], errors='coerce')
        df = df.dropna(subset=['Fecha'])
        df = df.sort_values('Fecha')
        
        prev_accumulated = 0
        
        for index, row in df.iterrows():
            # Check if record already exists
            date_str = row['Fecha'].strftime('%Y-%m-%d')
            existing = db.query(models.DailyRecord).filter(models.DailyRecord.date == date_str).first()
            if existing:
                print(f"Skipping {date_str}, already exists.")
                prev_accumulated = existing.total_accumulated_today
                continue
            
            # Calculate prev accumulated if not available (logic: current total - current rides)
            # Or use the previous row's total if available.
            # In the excel: 'Total acumulado dinosaurios' is likely the END of day counter.
            
            total_accumulated_today = int(row.get('Total acumulado dinosaurios', 0))
            rides_today = int(row.get('Vueltas', 0))
            
            # If this is the first record imported and we don't have prev, we can infer it
            if prev_accumulated == 0:
                 prev_accumulated = total_accumulated_today - rides_today
            
            record = models.DailyRecord(
                date=date_str,
                total_accumulated_prev=prev_accumulated,
                total_accumulated_today=total_accumulated_today,
                rides_today=rides_today,
                admin_rides=int(row.get('Vueltas administrativas', 0)),
                effective_rides=int(row.get('Vueltas efectivas', 0)),
                expected_income=float(row.get('Ingresos esperados', 0)),
                cash_withdrawn=float(row.get('Efectivo retirado', 0)),
                cash_in_box=float(row.get('Efectivo en caja', 0)),
                card_payments=float(row.get('Pagos en tarjeta', 0)),
                total_counted=float(row.get('Total contabilizado', 0)),
                status=row.get('Estado caja', 'PENDIENTE'),
                difference=float(row.get('Diferencia', 0)),
                daily_cash_generated=float(row.get('Efectivo diario generado', 0)),
                toys_sold_details="Importado desde Excel",
                toys_sold_total=float(row.get('Juguetes vendidos', 0)),
                worker_name="Importado",
                submitted_by="admin",
                created_at=datetime.utcnow()
            )
            
            db.add(record)
            prev_accumulated = total_accumulated_today
            print(f"Imported {date_str}")
            
        db.commit()
        print("Import completed successfully.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import_data()
