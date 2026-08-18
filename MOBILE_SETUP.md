# RainX native mobile build

RainX is configured for Capacitor 8 and keeps the existing web app as the single source of truth.

## Local setup

From the repository root:

```bash
pnpm install
cd artifacts/rainx
pnpm build
pnpm exec cap add android
pnpm exec cap add ios
pnpm exec cap sync
```

Then open the native project:

```bash
pnpm exec cap open android
pnpm exec cap open ios
```

Capacitor's native projects are source artifacts and should be committed to GitHub once generated. Capacitor documentation: https://capacitorjs.com/docs

## Push notifications

The JavaScript side requests native notification permission and registers Android/iOS device tokens with `/api/push/native/register`.

For real production delivery, configure these server secrets:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — Firebase service-account JSON for Android FCM.
- `APNS_TEAM_ID` — Apple Developer Team ID.
- `APNS_KEY_ID` — APNs Auth Key ID.
- `APNS_PRIVATE_KEY` — APNs `.p8` private key, with newlines preserved or escaped as `\\n`.
- `APNS_BUNDLE_ID` — defaults to `com.rainx.app`.
- `APNS_USE_SANDBOX` — `true` for APNs sandbox testing, otherwise `false`.

Do **not** put any of these secrets in the React/Vite bundle or GitHub source.

Android also needs the Firebase/FCM native configuration (`google-services.json`) in the generated Android project. iOS needs the Push Notifications capability and APNs configuration in Xcode. Capacitor's official Push Notifications plugin documents these native requirements. Capacitor Push Notifications: https://capacitorjs.com/docs/apis/push-notifications

## GitHub builds

- `Android debug build` can be manually run from GitHub Actions and produces an APK artifact.
- `iOS simulator build` can be manually run from GitHub Actions.
- A signed Play Store AAB and signed App Store IPA require your own Android keystore / Apple signing credentials; those cannot be safely embedded in source control.
