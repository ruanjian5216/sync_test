"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const { networkInterfaces } = require("os");
console.log("Preload script is running");
function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const net = nets[name];
    if (net) {
      for (const alias of net) {
        if (alias.family === "IPv4" && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return "localhost";
}
contextBridge.exposeInMainWorld("electronAPI", {
  getDesktopSources: async (options) => {
    return await ipcRenderer.invoke("GET_DESKTOP_SOURCES", options);
  },
  getLocalIP: () => {
    return getLocalIP();
  }
});
