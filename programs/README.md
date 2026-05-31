# B&B Real Estate — WhatsApp Campaign System

Sistema de automatización para verificar masivamente el inventario inmobiliario de Wasi CRM via WhatsApp. Contacta propietarios con un poll Sí/No y ejecuta acciones automáticas según la respuesta: duplica propiedades disponibles (fresh listing en portales), envía vendidas al basurero, e inactiva las no disponibles.

---

## Arquitectura

```
[sender.py]  →  WASender API  →  WhatsApp propietario
                                        ↓ responde poll
              DigitalOcean Droplet  ←  WASender webhook
              [app.py FastAPI]
                     ↓
              SQLite bnb_campaign.db
                     ↓
              [processor.py]  →  Wasi CRM API
```

- **Local**: `sender.py` envía los mensajes desde tu máquina
- **Droplet 24/7**: `app.py` recibe las respuestas aunque tu máquina esté apagada
- **Wasi CRM**: se actualiza automáticamente vía API

---

## Requisitos previos

| Servicio | Para qué | Dónde obtenerlo |
|---|---|---|
| **WASender** | Enviar/recibir WhatsApp | wasender.app |
| **Wasi CRM** | Inventario inmobiliario | wasi.co |
| **DigitalOcean Droplet** | Webhook 24/7 | digitalocean.com (~$4/mes, Ubuntu 22.04) |
| **Dominio con SSL** | URL pública para webhook | Necesario para WASender |

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/claudiojupiter55-boop/Wasender.git
cd Wasender
```

### 2. Crear entorno virtual e instalar dependencias

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configurar credenciales

```bash
cp .env.example .env
```

Editar `.env` con tus datos:

```env
# WASender — obtenlo en wasender.app > Settings > API
WASENDER_API_KEY=tu_api_key_aqui
WASENDER_BASE_URL=https://api.wasender.app/api

# Wasi CRM — obtenlos en wasi.co > Configuración > API
WASI_ID_COMPANY=tu_id_empresa
WASI_TOKEN=tu_token_wasi
WASI_BASE_URL=https://api.wasi.co/v1

# Delay entre envíos en segundos (4-6 minutos recomendado para anti-ban)
DELAY_MIN=240
DELAY_MAX=360
```

---

## Setup del Droplet (webhook 24/7)

El webhook debe estar siempre activo para recibir respuestas aunque tu computadora esté apagada.

### 1. Crear Droplet en DigitalOcean

- Ubuntu 22.04, plan básico $4/mes
- Guardar la IP del droplet

### 2. Conectarse y configurar

```bash
ssh root@TU_IP_DROPLET
```

```bash
# Instalar Python y dependencias del sistema
apt update && apt install -y python3-pip python3-venv

# Crear directorio del proyecto
mkdir -p /opt/wasender
cd /opt/wasender

# Subir los archivos (desde tu máquina local)
# scp -r ./* root@TU_IP:/opt/wasender/
```

### 3. Instalar dependencias en el droplet

```bash
cd /opt/wasender
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Crear el archivo .env en el droplet

```bash
nano /opt/wasender/.env
# Pegar el mismo contenido que tu .env local
```

### 5. Configurar el servicio systemd (para que corra siempre)

```bash
nano /etc/systemd/system/wasender.service
```

Contenido:
```ini
[Unit]
Description=WASender Webhook
After=network.target

[Service]
WorkingDirectory=/opt/wasender
ExecStart=/opt/wasender/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable wasender
systemctl start wasender
systemctl status wasender  # debe decir "active (running)"
```

### 6. Configurar dominio/SSL y apuntar webhook en WASender

- Apunta tu dominio al IP del droplet (ej. `api.tuempresa.com`)
- Configura SSL (Let's Encrypt / Nginx recomendado)
- En WASender > Settings > Webhook URL: `https://api.tuempresa.com/webhook`

---

## Flujo de uso

### Paso 1 — Preparar lista de propietarios

```bash
# Opción A: desde auditoría de portales
python auditar_e24.py                          # genera auditoria_e24.json
python preparar_campana_propietarios.py --limite 75   # genera propietarios_campana.csv

# Opción B: exportar CSV desde Wasi manualmente
# Wasi CRM > Propiedades > Exportar CSV
```

### Paso 2 — Probar sin enviar

```bash
python sender.py --csv propietarios_campana.csv --dry-run
```

### Paso 3 — Enviar campaña

```bash
# Primera vez (importa CSV + envía)
python sender.py --csv propietarios_campana.csv --limit 50

# Días siguientes (usa BD existente, no reimporta)
python sender.py --skip-import --limit 50
```

### Paso 4 — Procesar respuestas manualmente (si lo necesitas)

```bash
# Ver qué hay pendiente de procesar
python processor.py --dry-run

# Ejecutar acciones en Wasi
python processor.py
```

---

## Acciones automáticas según respuesta

| Respuesta del propietario | Acción en Wasi |
|---|---|
| **"Sí, disponible"** | Duplica la propiedad (fresh listing), publica en E24 + Compreoalquile, deja original inactiva |
| **"No, ya no"** + Venta | Envía al basurero con observación "Vendido el [fecha]" |
| **"No, ya no"** + Alquiler | Inactiva con disponibilidad = alquilada |
| Sin teléfono | Inactiva (Baja) |

Al duplicar, la nueva propiedad:
- Copia fotos, características, propietario, comisión interna y externa
- Publica siempre en **E24 (Encuentra24)** y **Compreoalquile**
- Aplica title case en español al nombre (ej. `CASA EN VENTA` → `Casa en Venta`)
- Agrega observación con código nuevo y código anterior

---

## Estructura de archivos

```
Wasender/
├── .env.example              # Plantilla de credenciales
├── requirements.txt          # Dependencias Python
│
├── sender.py                 # Envío masivo WhatsApp
├── app.py                    # Webhook FastAPI (corre en droplet)
├── processor.py              # Ejecuta acciones en Wasi según respuestas
├── db_manager.py             # Gestión de SQLite
│
├── preparar_campana_propietarios.py   # Genera CSV desde auditoría Wasi
├── auditar_e24.py            # Audita qué propiedades están en E24
├── clasificar_propiedades.py # Clasifica propiedades del inventario
│
├── reset_db.py               # Limpia la BD (usar con cuidado)
├── retry_processor.py        # Reprocesa errores
│
└── wasi_tools/
    ├── wasi_client.py        # Cliente Wasi API (duplicar, inactivar, etc.)
    ├── duplicar.py           # Script para duplicar desde Excel
    ├── basurero.py           # Script para enviar al basurero desde Excel
    └── inactivar_excel.py    # Script para inactivar desde Excel
```

---

## Columnas requeridas en el CSV

| Columna | Descripción |
|---|---|
| `id_property` | ID de Wasi |
| `title` | Nombre de la propiedad |
| `owner_name` | Nombre del propietario |
| `owner_phone` | Teléfono (se normaliza automáticamente a E.164) |
| `precio` | Precio (determina Venta vs Alquiler: >$20,000 = Venta) |

---

## Normalización de teléfonos

El sistema limpia automáticamente:
- Números panameños de 8 dígitos → `+507XXXXXXXX`
- Números duplicados (`62431766,62431766`) → toma el primero
- Números con prefijo 507+0 erróneo (`507066...`) → corrige a `50766...`
- Números internacionales → respeta el código de país

---

## Endpoints del webhook

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servidor |
| `POST` | `/webhook` | Recibe eventos de WASender |
| `GET` | `/summary` | Conteo de propiedades por estado |
