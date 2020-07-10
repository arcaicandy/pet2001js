// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron');
const path = require('path');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

var spawn = require("child_process").spawn;
var os = require('os');

var mainWindow = null;

function createWindow () {

  let win = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    frame: true,
    kiosk: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('indexElectron.html');

  win.once('ready-to-show', () => {
    win.show();
  });

  return win;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {

  // Turn off numlock on Windows - We do this on windows because Windows sends extra shift events when its off. Why???
  if (os.type == "Windows_NT") {

    spawn("cmd.exe", [
      "/c",
      app.getAppPath() + '/numlock.exe',
      "1"
    ]);
    
  }

  mainWindow = createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
