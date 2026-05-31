"""
processor.py — Lee la BD SQLite y ejecuta las acciones en Wasi CRM
según el estado de verificación de cada propiedad.

Uso:
    python processor.py              # procesa todo lo pendiente
    python processor.py --dry-run    # muestra qué haría sin ejecutar
    python processor.py --reintentos # mueve los Pendiente a tabla reintentos
"""

import argparse
import sys
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from db_manager import get_conn, get_summary
from wasi_tools.wasi_client import inactivar, enviar_basurero, duplicar_y_archivar, marcar_alquilada, marcar_vendida


def build_comment(estado: str, tipo_operacion: str, observaciones: str = None) -> str:
    hoy = str(date.today())
    if estado == "OptOut":
        return f"OptOut | {hoy} | Propietario solicitó no recibir mensajes"
    if estado == "Baja":
        return f"Baja | {hoy} | Automatización - Sin teléfono en CSV"
    if observaciones and estado == "Manual":
        return f"Manual | {hoy} | Automatización - {observaciones}"
    if estado == "Inactivo" and tipo_operacion == "Alquiler":
        return f"Alquilada - Automatización - {hoy}"
    if estado == "Inactivo" and tipo_operacion == "Venta":
        return f"Vendida - Automatización - {hoy}"
    if estado == "Confirmado":
        return f"Confirmado disponible - Automatización - {hoy}"
    return f"{estado} | {hoy} | Automatización"


def get_properties_to_process():
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT wasi_id, nombre_propiedad, tipo_operacion,
                      estado_verificacion, observaciones_manuales
               FROM properties
               WHERE estado_verificacion IN ('Confirmado', 'Inactivo', 'Baja', 'OptOut')
                 AND (procesado_wasi IS NULL OR procesado_wasi = 'No')"""
        ).fetchall()
    return [dict(r) for r in rows]


def get_pending_no_response():
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT p.wasi_id, p.nombre_propiedad, p.nombre_propietario,
                      p.telefono_e164, p.tipo_operacion, p.precio_fmt
               FROM properties p
               LEFT JOIN campaigns c ON c.wasi_id = p.wasi_id
               WHERE p.estado_verificacion = 'Pendiente'
                 AND c.id IS NOT NULL"""
        ).fetchall()
    return [dict(r) for r in rows]


def mark_procesado(wasi_id: str, resultado: str):
    with get_conn() as conn:
        conn.execute(
            """UPDATE properties
               SET procesado_wasi = ?, procesado_wasi_at = datetime('now')
               WHERE wasi_id = ?""",
            (resultado, wasi_id),
        )


def move_to_reintentos(props: list[dict]):
    with get_conn() as conn:
        for p in props:
            conn.execute(
                """INSERT OR IGNORE INTO reintentos
                   (wasi_id, nombre_propiedad, nombre_propietario,
                    telefono_e164, tipo_operacion, precio_fmt, motivo)
                   VALUES (?, ?, ?, ?, ?, ?, 'Sin respuesta')""",
                (p["wasi_id"], p["nombre_propiedad"], p["nombre_propietario"],
                 p["telefono_e164"], p["tipo_operacion"], p["precio_fmt"]),
            )
    print(f"[processor] {len(props)} propiedades movidas a tabla reintentos.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",    action="store_true")
    parser.add_argument("--reintentos", action="store_true",
                        help="Mueve propiedades sin respuesta a tabla reintentos")
    args = parser.parse_args()

    if args.reintentos:
        pending = get_pending_no_response()
        print(f"[processor] {len(pending)} propiedades sin respuesta encontradas.")
        if not args.dry_run:
            move_to_reintentos(pending)
        else:
            for p in pending:
                print(f"  [DRY-RUN] → Reintento: {p['wasi_id']} | {p['nombre_propiedad']}")
        return

    props = get_properties_to_process()
    print(f"[processor] {len(props)} propiedades para procesar.")

    if not props:
        print("[processor] Nada que procesar.")
        print("Resumen BD:", get_summary())
        return

    ok = 0
    errors = 0

    for prop in props:
        wasi_id   = prop["wasi_id"]
        estado    = prop["estado_verificacion"]
        tipo      = prop["tipo_operacion"]
        obs       = prop.get("observaciones_manuales")
        comentario = build_comment(estado, tipo, obs)

        # Determinar acción
        if estado == "OptOut":
            accion = "optout"
        elif estado == "Confirmado":
            accion = "duplicar"
        elif estado == "Inactivo" and tipo == "Alquiler":
            accion = "alquilada"
        elif estado == "Inactivo" and tipo == "Venta":
            accion = "basurero"
        elif estado == "Baja":
            accion = "inactivar"
        else:
            print(f"  [SKIP] {wasi_id} — estado '{estado}' sin acción definida")
            continue

        print(f"\n[{accion.upper()}] {wasi_id} | {prop['nombre_propiedad']}")
        print(f"  Comentario: {comentario}")

        if args.dry_run:
            print(f"  [DRY-RUN] No se ejecuta en Wasi.")
            continue

        try:
            if accion == "optout":
                inactivar(wasi_id, f"OptOut | {date.today()} | Propietario solicitó no recibir mensajes")
                print(f"  ✓ OptOut — inactivada en Wasi")
            elif accion == "duplicar":
                nuevo_id = duplicar_y_archivar(wasi_id, comentario)
                print(f"  Duplicada -> nuevo ID: #{nuevo_id} | Original inactivada")
            elif accion == "alquilada":
                marcar_alquilada(wasi_id, comentario)
                print(f"  Marcada como Alquilada")
            elif accion == "basurero":
                enviar_basurero(wasi_id, comentario)
                print(f"  Enviada al basurero (vendida)")
            elif accion == "inactivar":
                inactivar(wasi_id, comentario)
                print(f"  ✓ Inactivada")

            mark_procesado(wasi_id, f"OK-{accion}")

            ok += 1

        except Exception as e:
            print(f"  ✗ Error: {e}")
            mark_procesado(wasi_id, f"ERROR: {e}")
            errors += 1

    if not args.dry_run:
        print(f"\n[processor] Finalizado. OK: {ok} | Errores: {errors}")
        print("Resumen BD:", get_summary())


if __name__ == "__main__":
    main()
