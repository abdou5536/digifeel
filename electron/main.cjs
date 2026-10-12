const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const log = require('electron-log/main');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const appConfig = (() => {
  if (!app.isPackaged) return { appUrl: process.env.DIGIFEEL_APP_URL };
  try {
    return require('./app-config.json');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return { appUrl: process.env.DIGIFEEL_APP_URL };
  }
})();

const APP_URL = appConfig.appUrl ? new URL(appConfig.appUrl) : null;
const APP_ORIGIN = APP_URL?.origin;
const WINDOW_STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');
const SINGLE_INSTANCE = app.requestSingleInstanceLock();
let mainWindow;
let splashWindow;
let updateDialogOpen = false;

log.initialize();
autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function readWindowState() {
  try {
    const saved = JSON.parse(fs.readFileSync(WINDOW_STATE_PATH, 'utf8'));
    if (Number.isFinite(saved.width) && Number.isFinite(saved.height)) {
      return {
        width: Math.max(1000, Math.round(saved.width)),
        height: Math.max(700, Math.round(saved.height)),
        ...(Number.isFinite(saved.x) ? { x: Math.round(saved.x) } : {}),
        ...(Number.isFinite(saved.y) ? { y: Math.round(saved.y) } : {})
      };
    }
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) {
      log.warn('Impossible de lire la taille de la fenêtre.', error);
    }
  }
  return { width: 1280, height: 850 };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMaximized() || mainWindow.isFullScreen()) return;

  const state = mainWindow.getBounds();
  try {
    fs.mkdirSync(path.dirname(WINDOW_STATE_PATH), { recursive: true });
    fs.writeFileSync(WINDOW_STATE_PATH, JSON.stringify(state), 'utf8');
  } catch (error) {
    log.error('Impossible de mémoriser la taille de la fenêtre.', error);
  }
}

function isTrustedAppUrl(value) {
  try {
    return Boolean(APP_ORIGIN && new URL(value).origin === APP_ORIGIN);
  } catch {
    return false;
  }
}

function openExternalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'mailto:') return;
    if (url.username || url.password) return;
    shell.openExternal(value).catch((error) => log.warn('Impossible d’ouvrir le lien externe.', error));
  } catch (error) {
    log.warn('Lien externe invalide.', error);
  }
}

function showUpdateAvailable(version) {
  if (updateDialogOpen || !mainWindow || mainWindow.isDestroyed()) return;
  updateDialogOpen = true;
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Mise à jour Digifeel',
    message: `La version ${version} de Digifeel est disponible.`,
    detail: 'Téléchargez-la pour bénéficier des dernières améliorations.',
    buttons: ['Télécharger', 'Plus tard'],
    defaultId: 0,
    cancelId: 1
  }).then(async ({ response }) => {
    if (response !== 0) return;
    await autoUpdater.downloadUpdate();
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Mise à jour prête',
      message: 'La mise à jour sera installée au redémarrage de Digifeel.',
      buttons: ['Redémarrer maintenant', 'Plus tard'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response: restart }) => {
      if (restart === 0) autoUpdater.quitAndInstall();
    });
  }).catch((error) => {
    log.error('Échec du téléchargement de la mise à jour.', error);
    dialog.showErrorBox('Mise à jour impossible', 'La mise à jour n’a pas pu être téléchargée. Réessayez lorsque la connexion Internet sera rétablie.');
  }).finally(() => {
    updateDialogOpen = false;
  });
}

async function openApplication() {
  if (!APP_URL || !mainWindow || mainWindow.isDestroyed()) return;
  try {
    await mainWindow.loadURL(APP_URL.href);
  } catch (error) {
    log.warn('Digifeel est inaccessible.', error);
    await mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    ...readWindowState(),
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: '#101a15',
    title: 'Digifeel',
    ...(app.isPackaged
      ? { icon: path.join(process.resourcesPath, 'icon.ico') }
      : { icon: path.join(__dirname, '..', 'public', 'icons', 'icon-512.png') }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:digifeel'
    }
  });

  splashWindow = new BrowserWindow({
    width: 460,
    height: 260,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    backgroundColor: '#101a15',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();

  const revealWindow = () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    splashWindow = null;
    if (!mainWindow.isDestroyed()) mainWindow.show();
  };

  mainWindow.webContents.on('did-finish-load', revealWindow);
  mainWindow.webContents.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
    if (!isMainFrame || code === -3 || validatedURL === pathToFileURL(path.join(__dirname, 'offline.html')).href) return;
    log.warn(`Échec de chargement (${code}): ${description}`);
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isTrustedAppUrl(url)) return;
    event.preventDefault();
    openExternalUrl(url);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  ipcMain.on('digifeel:retry', (event) => {
    const offlinePage = pathToFileURL(path.join(__dirname, 'offline.html')).href;
    if (event.senderFrame?.url === offlinePage) void openApplication();
  });

  ipcMain.on('digifeel:log-error', (event, payload) => {
    if (!isTrustedAppUrl(event.senderFrame?.url ?? '')) return;
    const clean = (value, max) => String(value ?? '').slice(0, max);
    log.error(`[interface] ${clean(payload?.message, 500)} (${clean(payload?.source, 200)})`, clean(payload?.stack, 2000));
  });

  ipcMain.handle('digifeel:save-backup', (event, payload) => {
    if (!isTrustedAppUrl(event.senderFrame?.url ?? '') || typeof payload?.content !== 'string' || payload.content.length > 20_000_000) return null;
    return writeDailyBackup(payload.content);
  });

  ipcMain.handle('digifeel:print-silent', async (event, payload) => {
    if (!isTrustedAppUrl(event.senderFrame?.url ?? '') || typeof payload?.html !== 'string' || payload.html.length > 200_000) return false;
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, javascript: false }
    });
    try {
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`);
      return await new Promise((resolve) => {
        printWindow.webContents.print({ silent: true, printBackground: false }, (success) => resolve(success));
      });
    } catch (error) {
      log.error('Impression silencieuse impossible.', error);
      return false;
    } finally {
      printWindow.destroy();
    }
  });

  void openApplication();
}

const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
const BACKUP_KEEP = 14;

function writeDailyBackup(content) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const name = `digifeel-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    fs.writeFileSync(path.join(BACKUP_DIR, name), content, 'utf8');
    const old = fs.readdirSync(BACKUP_DIR).filter((file) => /^digifeel-sauvegarde-.*\.json$/.test(file)).sort().reverse().slice(BACKUP_KEEP);
    for (const file of old) fs.rmSync(path.join(BACKUP_DIR, file), { force: true });
    return name;
  } catch (error) {
    log.error('Sauvegarde automatique impossible.', error);
    return null;
  }
}

process.on('uncaughtException', (error) => log.error('Erreur non gérée.', error));
process.on('unhandledRejection', (reason) => log.error('Promesse rejetée non gérée.', reason));

function createApplicationMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Digifeel',
      submenu: [
        { label: 'Rechercher une mise à jour', click: () => autoUpdater.checkForUpdates().catch((error) => log.warn('Vérification des mises à jour impossible.', error)) },
        { label: 'Ouvrir le dossier des journaux', click: () => shell.openPath(path.dirname(log.transports.file.getFile().path)) },
        { label: 'Ouvrir le dossier des sauvegardes', click: () => { fs.mkdirSync(BACKUP_DIR, { recursive: true }); shell.openPath(BACKUP_DIR); } },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter Digifeel' }
      ]
    },
    { role: 'viewMenu', label: 'Affichage' }
  ]);
  Menu.setApplicationMenu(menu);
}

if (!APP_URL) {
  app.whenReady().then(() => {
    dialog.showErrorBox('Configuration requise', 'Aucune adresse du site Digifeel n’est configurée. Reconstruisez l’installateur avec DIGIFEEL_APP_URL.');
    app.quit();
  });
} else if (app.isPackaged && APP_URL.protocol !== 'https:') {
  app.whenReady().then(() => {
    dialog.showErrorBox('Configuration invalide', 'L’application doit être configurée avec une adresse HTTPS.');
    app.quit();
  });
} else if (!SINGLE_INSTANCE) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    createApplicationMenu();
    createWindow();
    if (app.isPackaged) {
      autoUpdater.on('update-available', (info) => showUpdateAvailable(info.version));
      autoUpdater.on('error', (error) => log.warn('Vérification de mise à jour échouée.', error));
      autoUpdater.checkForUpdates().catch((error) => log.warn('Vérification de mise à jour impossible.', error));
    }
  }).catch((error) => {
    log.error('Impossible de démarrer Digifeel.', error);
    dialog.showErrorBox('Démarrage impossible', 'Digifeel n’a pas pu démarrer. Réinstallez le logiciel ou contactez le support.');
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
