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


def patch_webview_media_permissions():
    """Bridge WebView getUserMedia requests to Android runtime permissions."""
    java_files = list(Path("android/app/src/main").rglob("MainActivity.java"))
    if not java_files:
        raise SystemExit("MainActivity.java not found")
    path = java_files[0]
    text = path.read_text()
    if "onPermissionRequest" in text:
        print("WebView camera/microphone permission bridge already present — nothing to patch.")
        return

    imports = """import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import androidx.core.content.ContextCompat;
"""
    marker = "import com.getcapacitor.BridgeActivity;"
    if marker not in text:
        raise SystemExit("Could not find BridgeActivity import in MainActivity.java")
    text = text.replace(marker, marker + "\n" + imports.rstrip(), 1)

    class_body = """public class MainActivity extends BridgeActivity {
    private static final int MEDIA_PERMISSION_REQUEST = 8401;
    private PermissionRequest pendingPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    pendingPermissionRequest = request;
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                        request.grant(request.getResources());
                        return;
                    }
                    boolean needsCamera = false;
                    boolean needsMicrophone = false;
                    for (String resource : request.getResources()) {
                        needsCamera |= PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource);
                        needsMicrophone |= PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource);
                    }
                    boolean cameraGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                    boolean microphoneGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
                    if ((!needsCamera || cameraGranted) && (!needsMicrophone || microphoneGranted)) {
                        request.grant(request.getResources());
                        pendingPermissionRequest = null;
                        return;
                    }
                    java.util.ArrayList<String> missing = new java.util.ArrayList<>();
                    if (needsCamera && !cameraGranted) missing.add(Manifest.permission.CAMERA);
                    if (needsMicrophone && !microphoneGranted) missing.add(Manifest.permission.RECORD_AUDIO);
                    requestPermissions(missing.toArray(new String[0]), MEDIA_PERMISSION_REQUEST);
                });
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != MEDIA_PERMISSION_REQUEST) return;
        PermissionRequest request = pendingPermissionRequest;
        pendingPermissionRequest = null;
        if (request == null) return;
        boolean needsCamera = false;
        boolean needsMicrophone = false;
        for (String resource : request.getResources()) {
            needsCamera |= PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource);
            needsMicrophone |= PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource);
        }
        boolean cameraGranted = !needsCamera || ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        boolean microphoneGranted = !needsMicrophone || ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        if (cameraGranted && microphoneGranted) request.grant(request.getResources());
        else request.deny();
    }
}"""
    import re
    replaced = re.sub(r"public class MainActivity extends BridgeActivity \{\s*\}", class_body, text, count=1)
    if replaced == text:
        raise SystemExit("Expected empty MainActivity class was not found")
    path.write_text(replaced)
    print(f"Patched {path} with WebView media permission handling")


patch_webview_media_permissions()
