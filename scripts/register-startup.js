const { exec } = require('child_process')
const path = require('path')

const appPath = path.join(process.env.LOCALAPPDATA, 'Programs', '你的应用名称', '你的应用.exe')
const regCommand = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "你的应用名称" /t REG_SZ /d "${appPath}" /f`

exec(regCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`添加启动项失败: ${error}`)
    return
  }
  console.log('成功添加启动项')
}) 