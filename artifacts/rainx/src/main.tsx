import { createRoot } from 'react-dom/client';

import App from './App';
import { initNativeNotifications } from './nativeNotifications';

import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Native push is initialized after React mounts. On the web this is a no-op.
void initNativeNotifications().catch((error) => {
  console.warn('[RainX] native notification bridge unavailable', error);
});
