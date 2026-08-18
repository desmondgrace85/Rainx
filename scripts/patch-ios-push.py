from pathlib import Path

path = Path('ios/App/App/AppDelegate.swift')
if not path.exists():
    raise SystemExit('AppDelegate.swift not found')
text = path.read_text()
if 'capacitorDidRegisterForRemoteNotifications' not in text:
    marker = '\n}'
    addition = '''
func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
  NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
}

func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
  NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
}
'''
    text = text.replace(marker, addition + marker, 1)
    path.write_text(text)
