type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global {
  interface WindowEventMap {
    'restaurant-pos:pwa-update-ready': CustomEvent<ServiceWorkerRegistration>;
    'restaurant-pos:pwa-install-ready': CustomEvent<BeforeInstallPromptEvent>;
  }
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then((registration) => {
      const notifyUpdate = () => {
        window.dispatchEvent(new CustomEvent('restaurant-pos:pwa-update-ready', { detail: registration }));
      };

      if (registration.waiting) {
        notifyUpdate();
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdate();
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('restaurant-pos:pwa-install-ready', { detail: event as BeforeInstallPromptEvent }));
  });
}
