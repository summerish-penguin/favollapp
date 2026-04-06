import json
import psycopg2
import pandas as pd
from sqlalchemy import create_engine

# carica il json
with open("frontend/data/locations.json") as f:
    data = json.load(f)

df = pd.DataFrame(data)

# connessione al db
engine = create_engine("postgresql://favollappdb_user:jBkqn69qFa5hyd96pbRuCKiRHgnkT3TQ@dpg-d7a24rc50q8c73aeo4cg-a.frankfurt-postgres.render.com/favollappdb")

# crea la tabella e inserisce i dati
# if_exists="replace" ricrea la tabella, "append" aggiunge righe
df.to_sql("locations", engine, if_exists="replace", index=False)





