"""
patch-android-permissions.py
------------------------------
The Android project is regenerated fresh on every CI run (`cap add android`),
so any manifest change must be re-applied here — same pattern as the
existing scripts/patch-ios-push.py for iOS.

Why this is needed: Space Talk (audio rooms) and Live Video use the plain
browser navigator.mediaDevices.getUserMedia() API, not a Capacitor plugin.
No installed plugin (only push-notifications/app/device — see
artifacts/rainx/package.json) injects CAMERA or RECORD_AUDIO into
AndroidManifest.xml via its own manifest merge. Without these declared,
Android cannot show the runtime permission dialog at all — the in-app
"permission required" message appears, but no system prompt ever fires,
and the request just fails immediately.

Idempotent: checks for each entry before inserting, safe to run on every
CI build without producing duplicates.
"""
from pathlib import Path

path = Path("android/app/src/main/AndroidManifest.xml")
if not path.exists():
    raise SystemExit(f"{path} not found")

text = path.read_text()
application_tag = "<application"
if application_tag not in text:
    raise SystemExit("Could not find <application> tag to anchor the insert")

lines_to_add = []
if 'android.permission.CAMERA"' not in text:
    lines_to_add.append('<uses-permission android:name="android.permission.CAMERA" />')
if 'android.permission.RECORD_AUDIO"' not in text:
    lines_to_add.append('<uses-permission android:name="android.permission.RECORD_AUDIO" />')

# Declared as NOT required so devices without a camera can still install the
# app — Space Talk (audio-only) should still work without one.
if 'android.hardware.camera"' not in text:
    lines_to_add.append('<uses-feature android:name="android.hardware.camera" android:required="false" />')
if 'android.hardware.microphone"' not in text:
    lines_to_add.append('<uses-feature android:name="android.hardware.microphone" android:required="false" />')

if not lines_to_add:
    print("Camera/microphone permissions already present — nothing to patch.")
else:
    insertion = "\n    " + "\n    ".join(lines_to_add) + "\n\n    "
    text = text.replace(application_tag, insertion + application_tag, 1)
    path.write_text(text)
    print(f"Patched AndroidManifest.xml with: {', '.join(lines_to_add)}")
