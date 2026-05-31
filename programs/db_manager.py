"""
SQLite manager for the B&B Real Estate WhatsApp campaign system.

Tables:
  properties  — master record imported from the Wasi CSV
  campaigns   — one row per outbound message sent
  responses   — one row per inbound webhook event
"""

import sqlite3
from contextlib import contextmanager
from datetime import date
from pathlib import Path

DB_PATH = Path(__file__).parent / "bnb_campaign.db"


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS properties (
                wasi_id             TEXT PRIMARY KEY,
                nombre_propiedad    TEXT,
                nombre_propietario  TEXT,
                telefono_raw        TEXT,
                telefono_e164       TEXT,
                tipo_operacion      TEXT,
                precio_raw          TEXT,
                precio_fmt          TEXT,
                estado_verificacion TEXT DEFAULT 'Pendiente',
                fecha_verificacion  TEXT,
                observaciones_manuales TEXT,
                created_at          TEXT DEFAULT (date('now')),
                updated_at          TEXT DEFAULT (date('now'))
            );

            CREATE TABLE IF NOT EXISTS campaigns (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                wasi_id         TEXT NOT NULL REFERENCES properties(wasi_id),
                telefono_e164   TEXT NOT NULL,
                mensaje_enviado TEXT,
                wasender_msg_id TEXT,
                estado_envio    TEXT DEFAULT 'Pendiente',
                sent_at         TEXT,
                created_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS responses (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id     INTEGER REFERENCES campaigns(id),
                wasi_id         TEXT,
                telefono        TEXT,
                tipo_respuesta  TEXT,   -- 'Confirmado' | 'Inactivo' | 'Manual'
                payload_raw     TEXT,
                mensaje_texto   TEXT,
                received_at     TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS reintentos (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                wasi_id         TEXT NOT NULL,
                nombre_propiedad    TEXT,
                nombre_propietario  TEXT,
                telefono_e164       TEXT,
                tipo_operacion      TEXT,
                precio_fmt          TEXT,
                motivo          TEXT DEFAULT 'Sin respuesta',
                created_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_properties_estado
                ON properties(estado_verificacion);
            CREATE INDEX IF NOT EXISTS idx_campaigns_wasi
                ON campaigns(wasi_id);
        """)
    with get_conn() as conn:
        for sql in [
            "ALTER TABLE properties ADD COLUMN procesado_wasi TEXT DEFAULT 'No'",
            "ALTER TABLE properties ADD COLUMN procesado_wasi_at TEXT",
        ]:
            try:
                conn.execute(sql)
            except Exception:
                pass
    print(f"[db_manager] Base de datos inicializada en: {DB_PATH}")


def upsert_property(row: dict):
    sql = """
        INSERT INTO properties
            (wasi_id, nombre_propiedad, nombre_propietario,
             telefono_raw, telefono_e164,
             tipo_operacion, precio_raw, precio_fmt)
        VALUES
            (:wasi_id, :nombre_propiedad, :nombre_propietario,
             :telefono_raw, :telefono_e164,
             :tipo_operacion, :precio_raw, :precio_fmt)
        ON CONFLICT(wasi_id) DO UPDATE SET
            nombre_propiedad    = excluded.nombre_propiedad,
            nombre_propietario  = excluded.nombre_propietario,
            telefono_raw        = excluded.telefono_raw,
            telefono_e164       = excluded.telefono_e164,
            tipo_operacion      = excluded.tipo_operacion,
            precio_raw          = excluded.precio_raw,
            precio_fmt          = excluded.precio_fmt,
            updated_at          = date('now')
    """
    with get_conn() as conn:
        conn.execute(sql, row)


def mark_sent(wasi_id: str, telefono: str, mensaje: str, wasender_msg_id: str = None) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO campaigns
               (wasi_id, telefono_e164, mensaje_enviado, wasender_msg_id,
                estado_envio, sent_at)
               VALUES (?, ?, ?, ?, 'Enviado', datetime('now'))""",
            (wasi_id, telefono, mensaje, wasender_msg_id),
        )
        return cur.lastrowid


def update_verification(wasi_id: str, estado: str, campaign_id: int,
                        mensaje_texto: str = None, payload_raw: str = None,
                        telefono: str = None):
    tipo = estado  # 'Confirmado' | 'Inactivo' | 'Manual'
    with get_conn() as conn:
        conn.execute(
            """UPDATE properties
               SET estado_verificacion = ?,
                   fecha_verificacion  = ?,
                   observaciones_manuales = CASE
                       WHEN ? = 'Manual' THEN ?
                       ELSE observaciones_manuales
                   END,
                   updated_at = date('now')
               WHERE wasi_id = ?""",
            (estado, str(date.today()), estado, mensaje_texto, wasi_id),
        )
        conn.execute(
            """INSERT INTO responses
               (campaign_id, wasi_id, telefono, tipo_respuesta,
                payload_raw, mensaje_texto)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (campaign_id, wasi_id, telefono, tipo, payload_raw, mensaje_texto),
        )


def mark_no_phone(wasi_id: str):
    with get_conn() as conn:
        conn.execute(
            """UPDATE properties
               SET estado_verificacion = 'Baja',
                   observaciones_manuales = 'Sin teléfono en CSV',
                   updated_at = date('now')
               WHERE wasi_id = ?""",
            (wasi_id,),
        )


def get_pending_properties():
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT p.*, c.id as campaign_id
               FROM properties p
               LEFT JOIN campaigns c ON c.wasi_id = p.wasi_id
               WHERE p.estado_verificacion = 'Pendiente'
                 AND p.telefono_e164 IS NOT NULL
                 AND c.id IS NULL"""
        ).fetchall()
    return [dict(r) for r in rows]


def get_summary():
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT estado_verificacion, COUNT(*) as total
               FROM properties GROUP BY estado_verificacion"""
        ).fetchall()
    return {r["estado_verificacion"]: r["total"] for r in rows}


def get_campaigns(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT c.id, c.wasi_id, c.telefono_e164, c.estado_envio,
                      c.sent_at, c.created_at,
                      p.nombre_propiedad, p.nombre_propietario,
                      p.estado_verificacion, p.tipo_operacion, p.precio_fmt
               FROM campaigns c
               LEFT JOIN properties p ON p.wasi_id = c.wasi_id
               ORDER BY c.created_at DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_responses(tipo: str | None = None, limit: int = 100) -> list[dict]:
    with get_conn() as conn:
        if tipo:
            rows = conn.execute(
                """SELECT r.id, r.wasi_id, r.telefono, r.tipo_respuesta,
                          r.mensaje_texto, r.received_at,
                          p.nombre_propiedad, p.nombre_propietario,
                          p.tipo_operacion, p.precio_fmt, p.procesado_wasi
                   FROM responses r
                   LEFT JOIN properties p ON p.wasi_id = r.wasi_id
                   WHERE r.tipo_respuesta = ?
                   ORDER BY r.received_at DESC
                   LIMIT ?""",
                (tipo, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT r.id, r.wasi_id, r.telefono, r.tipo_respuesta,
                          r.mensaje_texto, r.received_at,
                          p.nombre_propiedad, p.nombre_propietario,
                          p.tipo_operacion, p.precio_fmt, p.procesado_wasi
                   FROM responses r
                   LEFT JOIN properties p ON p.wasi_id = r.wasi_id
                   WHERE r.wasi_id IS NOT NULL
                   ORDER BY r.received_at DESC
                   LIMIT ?""",
                (limit,),
            ).fetchall()
    return [dict(r) for r in rows]


def get_queue(limit: int = 50) -> list[dict]:
    """Propiedades pendientes que ya recibieron mensaje pero no han respondido."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT p.wasi_id, p.nombre_propiedad, p.nombre_propietario,
                      p.telefono_e164, p.tipo_operacion, p.precio_fmt,
                      p.estado_verificacion, c.sent_at, c.estado_envio
               FROM properties p
               LEFT JOIN campaigns c ON c.wasi_id = p.wasi_id
               WHERE p.estado_verificacion = 'Pendiente'
               ORDER BY c.sent_at DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_stats() -> dict:
    today = str(date.today())
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM properties").fetchone()[0]
        sent_today = conn.execute(
            "SELECT COUNT(*) FROM campaigns WHERE DATE(sent_at) = ?", (today,)
        ).fetchone()[0]
        pending_wa = conn.execute(
            "SELECT COUNT(*) FROM properties WHERE estado_verificacion = 'Pendiente'"
        ).fetchone()[0]
        confirmados = conn.execute(
            "SELECT COUNT(*) FROM properties WHERE estado_verificacion = 'Confirmado'"
        ).fetchone()[0]
        inactivos = conn.execute(
            "SELECT COUNT(*) FROM properties WHERE estado_verificacion = 'Inactivo'"
        ).fetchone()[0]
        sin_procesar = conn.execute(
            "SELECT COUNT(*) FROM properties WHERE procesado_wasi = 'No' "
            "AND estado_verificacion NOT IN ('Pendiente', 'Baja')"
        ).fetchone()[0]
    return {
        "total_properties": total,
        "sent_today": sent_today,
        "pending_wa": pending_wa,
        "confirmados": confirmados,
        "inactivos": inactivos,
        "sin_procesar": sin_procesar,
    }


def get_recent_activity(limit: int = 10) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT r.id, r.wasi_id, r.tipo_respuesta, r.received_at,
                      p.nombre_propiedad, p.nombre_propietario,
                      p.tipo_operacion, p.precio_fmt, p.procesado_wasi
               FROM responses r
               LEFT JOIN properties p ON p.wasi_id = r.wasi_id
               WHERE r.wasi_id IS NOT NULL
               ORDER BY r.received_at DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


if __name__ == "__main__":
    init_db()
    print("Resumen:", get_summary())
