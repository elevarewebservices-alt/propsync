#!/usr/bin/env bash
# Applies the native iOS config Apple requires for App Store review. Run from
# the mobile/ dir AFTER `cap add ios && cap sync ios`. ios/ is gitignored and
# regenerated on every CI build, so none of this can be committed once — it has
# to be re-applied here each time.
set -euo pipefail

APP_DIR="ios/App/App"
PLIST="$APP_DIR/Info.plist"

if [ ! -f "$PLIST" ]; then
  echo "ERROR: $PLIST not found — run 'cap add ios' first." >&2
  exit 1
fi

echo "Patching $PLIST ..."

# Add a key as a string if missing, otherwise overwrite it.
set_string () {
  /usr/libexec/PlistBuddy -c "Set :$1 $2" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$PLIST"
}

# Permission prompts (camera + photo picker live in "Nueva propiedad").
set_string "NSCameraUsageDescription" "PropSync usa la camara para tomar fotos de las propiedades y subirlas a tu inventario."
set_string "NSPhotoLibraryUsageDescription" "PropSync accede a tus fotos para seleccionar imagenes de las propiedades."

# Export compliance: the app only uses standard HTTPS/TLS, which is exempt.
# Declaring this skips the manual export-compliance prompt on every upload.
/usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST"

# Apple privacy manifest (required since 2024). Copy + register in the target.
cp ios-config/PrivacyInfo.xcprivacy "$APP_DIR/PrivacyInfo.xcprivacy"
gem list -i xcodeproj >/dev/null 2>&1 || gem install xcodeproj --no-document
ruby ios-config/add-privacy-manifest.rb

echo "iOS native config patch complete."
