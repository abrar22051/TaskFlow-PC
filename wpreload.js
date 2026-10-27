const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('wapi', {
  onData: (cb) => ipcRenderer.on('w:data', (e, d) => cb(d)),
  action: (a) => ipcRenderer.send('w:action', a),
  open: () => ipcRenderer.send('w:open'),
  hide: () => ipcRenderer.send('w:hide')
});
