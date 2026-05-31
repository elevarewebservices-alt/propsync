"""
Restaura en Wasi las 112 propiedades rescatadas (preventas/proyectos sin teléfono).
Las saca del basurero y las deja activas.
"""
import time
from db_manager import get_conn
from wasi_tools.wasi_client import update_propiedad

with get_conn() as conn:
    rows = conn.execute("""
        SELECT wasi_id, nombre_propiedad FROM properties
        WHERE estado_verificacion = 'Pendiente'
        AND observaciones_manuales = 'Rescatada - preventa/proyecto'
    """).fetchall()

print(f"Propiedades a restaurar: {len(rows)}")

ok = 0
errores = 0
for r in rows:
    wasi_id = r["wasi_id"]
    nombre  = r["nombre_propiedad"]
    try:
        update_propiedad(wasi_id, {"id_status_on_page": "1"})
        print(f"[✓] Restaurada: {wasi_id} | {nombre}")
        ok += 1
    except Exception as e:
        print(f"[✗] Error {wasi_id}: {e}")
        errores += 1
    time.sleep(0.5)

print(f"\nFinalizado. Restauradas: {ok} | Errores: {errores}")
