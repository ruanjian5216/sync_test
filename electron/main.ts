import { app, BrowserWindow, ipcMain, desktopCapturer } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "http";
import { WebSocketServer } from "ws";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const expressApp = express();
const server = new Server(expressApp);
const wss = new WebSocketServer({ server });


expressApp.use(express.static(path.join(__dirname, '../dist')));
expressApp.use(express.static(path.join(__dirname, '../public')));
expressApp.get('/viewer', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/viewer.html'));
});
wss.on('connection', (ws) => {
  console.log('新的 WebSocket 连接');
  ws.on('message', (data) => {
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(data);
      }
    });
  });
  ws.on('close', () => {
    console.log('WebSocket 连接关闭');
  });
});


function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  ipcMain.handle('GET_DESKTOP_SOURCES', async (_, options) => {
    console.log('Getting desktop sources with options:', options);
    try {
      const sources = await desktopCapturer.getSources(options);
      return sources;
    } catch (error) {
      console.error('Error getting sources:', error);
      throw error;
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}
app.whenReady().then(() => {
  createWindow();
  const localIP = getLocalIP();
  server.listen(3000, () => {
    console.log(`Server running at http://${localIP}:3000`);
  });
});
function getLocalIP() {
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) {
    const net = nets[name];
    if (net) {
      for (const alias of net) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return 'localhost';
}
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
