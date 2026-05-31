import sqlite3
conn = sqlite3.connect('bnb_campaign.db')
conn.execute('DELETE FROM responses')
conn.execute('DELETE FROM campaigns')
conn.execute('DELETE FROM properties')
conn.commit()
conn.close()
print('Base de datos reseteada completamente.')
