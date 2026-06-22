# PropSync Mobile (Capacitor)

Shell nativo iOS + Android que envuelve la web de PropSync (`https://www.propsyncia.com`)
y agrega capacidades nativas (cámara, push). El código web vive en el repo principal;
aquí solo está el contenedor nativo.

App ID: **`com.propsyncia.app`**

## Requisitos

- Node 18+
- **Android:** Android Studio (SDK + emulador)
- **iOS:** macOS + Xcode (o un servicio de build en la nube como Codemagic / Ionic Appflow)

## Setup (primera vez)

```bash
cd mobile
npm install
npx cap add android        # genera la carpeta android/ (ignorada en git)
npx cap add ios            # genera ios/ — requiere macOS
npx cap sync
```

## Abrir y correr

```bash
npx cap open android       # abre en Android Studio → Run
npx cap open ios           # abre en Xcode → Run (macOS)
```

La app carga la web en vivo; los cambios de la web se reflejan sin recompilar el
contenedor. Solo recompilas el contenedor si cambias plugins o config nativa.

## Build para tiendas

- **Android:** Android Studio → Build → Generate Signed Bundle (AAB) → subir a Play Console.
- **iOS:** Xcode → Product → Archive → distribuir a App Store Connect / TestFlight.

## iOS sin Mac — Codemagic

No hay Mac disponible, así que el build de iOS corre en la nube vía **Codemagic**
(`codemagic.yaml` en la raíz del repo, workflow `ios-capacitor-release`). El script
regenera `ios/` desde cero en cada build (está en `.gitignore`), instala CocoaPods,
firma con el perfil de App Store y sube directo a **TestFlight**.

### Setup en codemagic.io (una sola vez, fuera del código)

1. Crear cuenta en [codemagic.io](https://codemagic.io) y conectar este repositorio (GitHub).
2. **Apple Developer Program** ($99/año) — necesario para firmar y publicar.
3. En Codemagic → *Team settings* → *Integrations* → **App Store Connect**: generar y subir
   una API Key de App Store Connect, nombrarla `propsync_app_store_connect` (coincide con el
   `integrations.app_store_connect` del yaml).
4. En *Code signing* → *iOS certificates*: dejar que Codemagic genere/gestione el certificado
   de distribución y el perfil de aprovisionamiento automáticamente (vía la misma API key).
5. Crear el app `com.propsyncia.app` en App Store Connect (nombre, categoría, etc.) antes del
   primer submit a TestFlight.
6. Disparar un build: el workflow corre con tags que empiecen con `ios-` (ej. `git tag ios-1 && git push origin ios-1`).

### Build de Android

Sigue siendo local (Android Studio, ver arriba) — no requiere Mac ni Codemagic.

## Pasos pendientes (fuera del código)

1. Cuentas: Google Play ($25 único) + Apple Developer ($99/año).
2. Setup de Codemagic (ver sección arriba) — API key de App Store Connect + integración.
3. Android App Links: tras habilitar Play App Signing, copiar el **SHA-256** de Play
   Console a `public/.well-known/assetlinks.json` (en el repo web) y redeploy.
4. Push: configurar **FCM** (Android) y **APNs** (iOS) + endpoint de tokens nativos (Fase 3).
5. Fichas de tienda: íconos, capturas, descripciones, URL de privacidad (`/privacidad`).
