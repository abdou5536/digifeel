const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('digifeelDesktop', Object.freeze({
  retryConnection: () => ipcRenderer.send('digifeel:retry')
}));

window.addEventListener('DOMContentLoaded', () => {
  const banner = document.createElement('div');
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'polite');
  banner.textContent = 'Connexion Internet indisponible. Vérifiez le réseau pour continuer à utiliser Digifeel.';
  Object.assign(banner.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    zIndex: '2147483647',
    padding: '12px 20px',
    background: '#8a3e20',
    color: '#fff',
    font: '600 14px system-ui, sans-serif',
    textAlign: 'center',
    display: 'none'
  });
  document.documentElement.append(banner);

  const updateNetworkState = () => {
    banner.style.display = navigator.onLine ? 'none' : 'block';
  };

  window.addEventListener('online', updateNetworkState);
  window.addEventListener('offline', updateNetworkState);
  updateNetworkState();
});
