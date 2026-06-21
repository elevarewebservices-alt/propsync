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

## Pasos pendientes (fuera del código)

1. Cuentas: Google Play ($25 único) + Apple Developer ($99/año).
2. Android App Links: tras habilitar Play App Signing, copiar el **SHA-256** de Play
   Console a `public/.well-known/assetlinks.json` (en el repo web) y redeploy.
3. Push: configurar **FCM** (Android) y **APNs** (iOS) + endpoint de tokens nativos (Fase 3).
4. Fichas de tienda: íconos, capturas, descripciones, URL de privacidad (`/privacidad`).
