const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desk', {
  load: () => ipcRenderer.sendSync('desk:load'),
  save: (s) => ipcRenderer.send('desk:save', s),
  notify: (t, b) => ipcRenderer.send('desk:notify', t, b),
  status: (o) => ipcRenderer.send('desk:status', o),
  widget: (d) => ipcRenderer.send('desk:widget', d),
  prefs: () => ipcRenderer.sendSync('desk:prefs'),
  setPref: (k, v) => ipcRenderer.send('desk:setpref', k, v),
  onAction: (cb) => ipcRenderer.on('desk:action', (e, a) => cb(a))
});
