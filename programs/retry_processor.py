import sqlite3
conn = sqlite3.connect('bnb_campaign.db')
conn.execute("UPDATE properties SET procesado_wasi='No', procesado_wasi_at=NULL")
conn.commit()
conn.close()
print('Listo — todas las propiedades listas para reprocesar.')
