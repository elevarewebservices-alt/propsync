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
npx capacitor-assets generate   # ícono + splash desde assets/icon.png y assets/splash.png
```

El ícono y splash se regeneran desde `mobile/assets/icon.png` (1024×1024) y
`mobile/assets/splash.png` (2732×2732) — como `android/` e `ios/` están en
`.gitignore`, hay que correr `npx capacitor-assets generate` cada vez que se
regeneran esas carpetas (ya está automatizado en el workflow de Codemagic
para iOS; para Android hazlo manualmente después de `cap add android`).

### Config nativa de iOS requerida por Apple (`ios-config/`)

Como `ios/` se regenera en cada build, todo lo que App Store exige a nivel
nativo se reaplica con un script — **no se commitea**:

```bash
cd mobile && bash ios-config/patch-ios.sh   # correr DESPUÉS de `cap add ios`
```

Esto inyecta en `ios/App/App/Info.plist`:
- `NSCameraUsageDescription` y `NSPhotoLibraryUsageDescription` (la cámara y el
  selector de fotos viven en "Nueva propiedad" — sin estos strings Apple rechaza).
- `ITSAppUsesNonExemptEncryption = false` (solo HTTPS/TLS estándar → exento;
  evita la pregunta de export compliance en cada subida a TestFlight).
- Copia y registra `ios-config/PrivacyInfo.xcprivacy` (privacy manifest, obligatorio).

En Codemagic ya corre solo (paso "Patch iOS native config"). Localmente en Mac,
córrelo a mano tras `cap add ios`.

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

## Lanzamiento iOS — checklist de submission

Apple Developer ya está **aprobado**. El código (config nativa, permisos,
privacy manifest, icono, workflow de Codemagic) ya está listo. Lo que queda es
todo fuera del repo, en orden:

1. **App Store Connect → crear el app** con bundle id `com.propsyncia.app`
   (nombre "PropSync", categoría Business, idioma principal Español).
2. **Codemagic** (una sola vez):
   - Conectar este repo de GitHub.
   - *Team settings → Integrations → App Store Connect*: subir una API Key y
     nombrarla `propsync_app_store_connect` (debe coincidir con `codemagic.yaml`).
   - *Code signing → iOS*: dejar que Codemagic gestione cert + perfil vía esa API key.
3. **App ID → habilitar la capability "Push Notifications"** en el portal de Apple
   (aunque el envío de push nativo es Fase 3, conviene dejar el App ID listo).
4. **Disparar el primer build**: `git tag ios-1 && git push origin ios-1`.
   El workflow regenera `ios/`, aplica `ios-config/patch-ios.sh`, firma y sube a **TestFlight**.
5. **Probar en TestFlight** (instalar en un iPhone real, validar login + tomar foto
   de una propiedad con la cámara nativa).
6. **Ficha de tienda + submit a revisión** en App Store Connect:
   - Capturas (iPhone 6.7" y 6.5" mínimo), descripción, keywords, categoría.
   - **URL de privacidad**: `https://www.propsyncia.com/privacidad`.
   - **App Privacy** (cuestionario "nutrition label"): declarar los datos que
     maneja la cuenta (email, datos de contacto/CRM) — sin tracking de terceros.
   - Demo account para el revisor (usuario + contraseña de una empresa de prueba).
   - Enviar a revisión.

## Pasos pendientes — Android (cuando se retome)

1. Cuenta Google Play Developer ($25 único).
2. Build local: Android Studio → AAB firmado (ver "Build para tiendas").
3. Android App Links: tras habilitar Play App Signing, copiar el **SHA-256** de Play
   Console a `public/.well-known/assetlinks.json` (repo web) y redeploy.

## Fase 3 (post-lanzamiento)

Push nativo: configurar **APNs** (iOS) y **FCM** (Android) + endpoint de tokens
nativos. El plugin ya está instalado pero el registro no está cableado en la web.
