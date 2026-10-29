const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, screen } = require('electron');
const fs = require('fs');
const path = require('path');

app.commandLine.appendSwitch('lang', 'en-GB'); // date pickers show dd/mm/yyyy
app.setAppUserModelId('com.taskflow.desktop');
if (!app.requestSingleInstanceLock()) { app.quit(); } else { boot(); }

function boot() {
  let win = null, wwin = null, tray = null, quitting = false, tipShown = false, run = null, wdata = null, lastBak = 0;
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  const dataFile = path.join(dir, 'taskflow-data.json');
  const prefFile = path.join(dir, 'prefs.json');
  const iconImg = nativeImage.createFromPath(path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'));
  const startedHidden = process.argv.includes('--hidden');

  // ---------- safe saving (survives power cuts) ----------
  function saveAtomic(file, str) {
    const tmp = file + '.tmp';
    const fd = fs.openSync(tmp, 'w');
    try { fs.writeSync(fd, str); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, file);
  }
  function readJson(file) {
    try { const s = fs.readFileSync(file, 'utf8'); JSON.parse(s); return s; } catch (e) { return null; }
  }
  ipcMain.on('desk:load', (e) => { e.returnValue = readJson(dataFile) || readJson(dataFile + '.bak'); });
  ipcMain.on('desk:save', (e, s) => {
    try {
      if (typeof s !== 'string') return;
      if (Date.now() - lastBak > 300000 && fs.existsSync(dataFile)) {
        if (readJson(dataFile)) fs.copyFileSync(dataFile, dataFile + '.bak');
        lastBak = Date.now();
      }
      saveAtomic(dataFile, s);
    } catch (err) { /* ignore */ }
  });

  // ---------- preferences ----------
  let prefs = Object.assign({ widget: true, auto: false, wtop: false, wmin: false, wfull: 320, bounds: null, wbounds: null }, JSON.parse(readJson(prefFile) || '{}'));
  const savePrefs = () => { try { saveAtomic(prefFile, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };

  // ---------- start with Windows ----------
  // Always register the exact path + arguments we will query with (a mismatch made the old
  // checkbox read "off"), and re-register at every launch so updates / reinstalls repair the entry.
  const exe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const LI = { path: exe, args: ['--hidden'] };
  function autoInfo() {
    try { const s = app.getLoginItemSettings(LI); return { on: !!s.openAtLogin, blocked: !!s.openAtLogin && s.executableWillLaunchAtLogin === false }; }
    catch (e) { return { on: false, blocked: false }; }
  }
  function applyAuto() {
    try { app.setLoginItemSettings({ openAtLogin: !!prefs.auto, path: exe, args: ['--hidden'] }); } catch (e) { /* ignore */ }
  }
  if (autoInfo().on) prefs.auto = true; // keep what an earlier version registered

  ipcMain.on('desk:prefs', (e) => { const a = autoInfo(); e.returnValue = Object.assign({}, prefs, { autoBlocked: a.blocked }); });
  ipcMain.on('desk:setpref', (e, k, v) => setPref(k, v));
  function setPref(k, v) {
    if (k === 'widget') { prefs.widget = !!v; if (v) createWidget(); else closeWidget(); }
    if (k === 'auto') { prefs.auto = !!v; applyAuto(); }
    if (k === 'wtop') { prefs.wtop = !!v; if (wwin && !wwin.isDestroyed()) wwin.setAlwaysOnTop(!!v, 'floating'); }
    savePrefs(); refreshMenu();
  }

  // ---------- notifications ----------
  function toast(title, body) {
    if (!Notification.isSupported()) return;
    const n = new Notification({ title: String(title), body: String(body), icon: iconImg });
    n.on('click', showMain);
    n.show();
  }
  ipcMain.on('desk:notify', (e, t, b) => toast(t, b));

  // ---------- main window ----------
  function createMain() {
    const b = prefs.bounds || {};
    win = new BrowserWindow({
      width: b.width || 480, height: b.height || 820, x: b.x, y: b.y, minWidth: 380, minHeight: 560,
      backgroundColor: '#0e1419', title: 'TaskFlow', icon: iconImg, autoHideMenuBar: true, show: false,
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
    });
    win.setMenuBarVisibility(false);
    win.loadFile('index.html');
    win.once('ready-to-show', () => { if (!startedHidden) win.show(); });
    win.on('page-title-updated', (e) => e.preventDefault());
    win.on('close', (e) => {
      try { prefs.bounds = win.getBounds(); savePrefs(); } catch (x) { /* ignore */ }
      if (!quitting) {
        e.preventDefault(); win.hide();
        if (!tipShown) { tipShown = true; toast('TaskFlow is still running', 'Timer, reminders and the widget keep working. Use the tray icon to quit.'); }
      }
    });
    win.on('closed', () => { win = null; });
  }
  function showMain() {
    if (!win) createMain();
    if (win.isMinimized()) win.restore();
    win.show(); win.focus();
  }
  function toggleMain() { if (win && win.isVisible() && win.isFocused()) win.hide(); else showMain(); }
  app.on('second-instance', showMain);

  // ---------- tray + live status (task name and time) ----------
  function refreshMenu() {
    if (!tray) return;
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open TaskFlow', click: showMain },
      { label: 'Desktop widget', type: 'checkbox', checked: !!prefs.widget, click: (m) => setPref('widget', m.checked) },
      { label: 'Bring widget to front', click: () => { if (wwin && !wwin.isDestroyed()) { wwin.showInactive(); wwin.moveTop(); } } },
      { label: 'Start with Windows', type: 'checkbox', checked: !!prefs.auto, click: (m) => setPref('auto', m.checked) },
      { type: 'separator' },
      { label: 'Quit', click: () => { quitting = true; app.quit(); } }
    ]));
  }
  const fmt = (s) => Math.floor(s / 3600) + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  ipcMain.on('desk:status', (e, r) => { run = r && typeof r === 'object' ? r : null; });
  setInterval(() => {
    if (!win || win.isDestroyed()) return;
    if (run) {
      const el = Math.max(0, Math.floor((Date.now() - run.base) / 1000));
      const txt = '\u25B6 ' + run.title + ' \u2014 ' + fmt(el);
      if (tray) tray.setToolTip(('TaskFlow\n' + txt).slice(0, 120));
      win.setTitle('TaskFlow \u2014 ' + txt);
      if (run.target > 0) { const p = el / run.target; win.setProgressBar(Math.min(1, p), { mode: p > 1 ? 'error' : 'normal' }); }
      else win.setProgressBar(1, { mode: 'indeterminate' });
    } else {
      if (tray) tray.setToolTip('TaskFlow');
      win.setTitle('TaskFlow'); win.setProgressBar(-1);
    }
  }, 1000);

  // ---------- desktop widget (sits behind other apps unless "keep above" is on) ----------
  function createWidget() {
    if (wwin && !wwin.isDestroyed()) return;
    const wa = screen.getPrimaryDisplay().workArea;
    const b = prefs.wbounds || { width: 330, height: 320, x: wa.x + wa.width - 350, y: wa.y + 60 };
    wwin = new BrowserWindow({
      width: b.width, height: prefs.wmin ? 38 : b.height, x: b.x, y: b.y, minWidth: 240, minHeight: prefs.wmin ? 38 : 170,
      frame: false, alwaysOnTop: !!prefs.wtop, focusable: false, skipTaskbar: true, resizable: !prefs.wmin,
      backgroundColor: '#141c26', show: false,
      webPreferences: { preload: path.join(__dirname, 'wpreload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
    });
    if (prefs.wtop) wwin.setAlwaysOnTop(true, 'floating');
    wwin.setOpacity(0.96);
    wwin.loadFile('widget.html');
    wwin.once('ready-to-show', () => { if (wwin && !wwin.isDestroyed()) wwin.showInactive(); });
    wwin.webContents.on('did-finish-load', () => {
      if (wdata) wwin.webContents.send('w:data', wdata);
      wwin.webContents.send('w:min', !!prefs.wmin);
    });
    const keep = () => { if (wwin && !wwin.isDestroyed()) { prefs.wbounds = wwin.getBounds(); savePrefs(); } };
    wwin.on('moved', keep); wwin.on('resized', keep);
    wwin.on('closed', () => { wwin = null; });
  }
  function closeWidget() { if (wwin && !wwin.isDestroyed()) wwin.destroy(); wwin = null; }
  function toggleCollapse() {
    if (!wwin || wwin.isDestroyed()) return;
    const b = wwin.getBounds();
    if (!prefs.wmin) { prefs.wfull = b.height; prefs.wmin = true; wwin.setMinimumSize(240, 38); wwin.setResizable(false); wwin.setSize(b.width, 38); }
    else { prefs.wmin = false; wwin.setMinimumSize(240, 170); wwin.setResizable(true); wwin.setSize(b.width, prefs.wfull || 320); }
    wwin.webContents.send('w:min', !!prefs.wmin);
    savePrefs();
  }
  ipcMain.on('desk:widget', (e, d) => { wdata = d; if (wwin && !wwin.isDestroyed()) wwin.webContents.send('w:data', d); });
  ipcMain.on('w:action', (e, a) => { if (win && !win.isDestroyed()) win.webContents.send('desk:action', a); });
  ipcMain.on('w:open', showMain);
  ipcMain.on('w:hide', () => setPref('widget', false));
  ipcMain.on('w:min', toggleCollapse);

  // ---------- lifecycle ----------
  app.on('window-all-closed', () => { /* stay in tray */ });
  app.on('before-quit', () => { quitting = true; });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    applyAuto();
    createMain();
    tray = new Tray(iconImg.resize({ width: 16, height: 16 }));
    tray.setToolTip('TaskFlow');
    tray.on('click', toggleMain);
    refreshMenu();
    if (prefs.widget) createWidget();
    if (startedHidden) toast('TaskFlow started', 'Running in the tray. Click the tray icon to open it.');
  });
}
