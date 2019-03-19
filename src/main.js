import { app, BrowserWindow } from 'electron';
const { ipcMain, dialog } = require('electron');
//AUTO UPDATE

require('update-electron-app')({
  repo: 'danielgmontgr/qdclogistica',
  updateInterval: '1 hour',
  logger: require('electron-log')
})

var AutoLaunch = require('auto-launch');
var path = require('path')

if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const isDev = require('electron-is-dev');
let mainWindow;
let modalWindow;

function createWindow() {

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 700,
    minWidth: 1016,
    minHeight: 600,
    icon: path.join(__dirname, 'Images/iconapp.ico')
  });

  if (isDev) {
    console.log('Running in development');
  } else {
    mainWindow.setMenu(null);
    console.log('Running in production');
  }

  if (process.platform === 'linux') {
    mainWindow.icon = path.join(__dirname, 'Images/iconapp.ico')
  }
  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  ipcMain.on('open-error-conexion', (event) => {

    dialog.showErrorBox("Error de conexión", "No se ha podido establecer conexión con Quiero de Comer");
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});


var quieroDeComerAutoLauncher = new AutoLaunch({
  name: 'QuieroDeComer'
});

quieroDeComerAutoLauncher.enable();


quieroDeComerAutoLauncher.isEnabled()
.then(function(isEnabled){
  if(isEnabled){
      return;
  }
  quieroDeComerAutoLauncher.enable();
})
.catch(function(err){
  // handle error
});
// const appFolder = path.dirname(process.execPath)
// const updateExe = path.resolve(appFolder, '..', 'QuieroDeComer.exe')
// const exeName = path.basename(process.execPath)

// app.setLoginItemSettings({
//   openAtLogin: true,
//   path: updateExe,
//   args: [
//     '--processStart', `"${exeName}"`,
//     '--process-start-args', `"--hidden"`
//   ]
// })
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
