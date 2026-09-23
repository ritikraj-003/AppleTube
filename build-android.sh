#!/usr/bin/env bash
# AppleTube — Android Build Script
# Usage: ./build-android.sh [--open]
# This copies web assets to www/ and syncs with the Android project.

set -e

echo "=================================================="
echo "🤖 AppleTube — Android Build"
echo "=================================================="

# Step 1: Copy web assets to www/
echo "📦 Syncing web assets to www/..."
mkdir -p www

cp index.html www/
cp manifest.json www/
cp sw.js www/
cp -r css www/
cp -r js www/
cp -r assets www/

# Copy capacitor.js shim if it exists (added by npx cap sync)
if [ -f "node_modules/@capacitor/core/dist/capacitor.js" ]; then
  cp node_modules/@capacitor/core/dist/capacitor.js www/capacitor.js
fi

echo "✅ Web assets synced to www/"

# Step 2: Capacitor sync
echo "🔄 Running Capacitor sync..."
npx cap sync android

echo ""
echo "=================================================="
echo "✅ Android project synced!"
echo ""
echo "Next step — Choose one:"
echo "  1. Open in Android Studio:  npx cap open android"
echo "  2. Build APK directly:      cd android && ./gradlew assembleDebug"
echo "     APK location: android/app/build/outputs/apk/debug/app-debug.apk"
echo "=================================================="

# Open Android Studio if --open flag is passed
if [[ "$1" == "--open" ]]; then
  echo "🚀 Opening Android Studio..."
  npx cap open android
fi
