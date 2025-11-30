import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("./Dados AIS frota TP/THIAGO FERNANDES.csv")

df["DATAHORA"] = pd.to_datetime(df["DATAHORA"])
df = df.sort_values("DATAHORA")

plt.figure(figsize=(10,6))
plt.plot(df["LONGITUDE"], df["LATITUDE"], marker='o')
plt.xlabel("Longitude")
plt.ylabel("Latitude")
plt.title(f"Rota do Navio - {df['NOME'].iloc[0]}")
plt.grid(True)
plt.show()
