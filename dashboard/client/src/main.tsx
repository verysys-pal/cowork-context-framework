import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global patch to resolve [Violation] Added non-passive event listener warnings.
// This improves scrolling performance by marking wheel and touch events as passive by default.
(function patchPassiveEvents() {
  if (typeof window === 'undefined' || !EventTarget.prototype.addEventListener) return;
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
    let patchedOptions = options;
    if (['mousewheel', 'wheel', 'touchstart', 'touchmove'].includes(type)) {
      if (typeof options === 'undefined') {
        patchedOptions = { passive: true };
      } else if (typeof options === 'object' && options !== null && (options as AddEventListenerOptions).passive === undefined) {
        patchedOptions = { ...(options as AddEventListenerOptions), passive: true };
      }
    }
    return originalAddEventListener.call(this, type, listener, patchedOptions);
  };
})();

// Unregister any existing service workers to clear ghost/zombie workers from previous projects
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
