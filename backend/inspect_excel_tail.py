import pandas as pd

file_path = "/Users/nicolasrbarra/development/pyton/DinoCars/ventas_2025-07.xlsx"
df = pd.read_excel(file_path)
print(df['Fecha'].tail(5).tolist())
