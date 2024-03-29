// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require("fs");
const getMenuTemplate = require('./menu.js');

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        //frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });
    // and load the index.html of the app.
    mainWindow.loadFile('index.html');
    //定义菜单模板
    const menu = Menu.buildFromTemplate(getMenuTemplate(mainWindow));
    refreshMenuLogLevel(menu);
    Menu.setApplicationMenu(menu);
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    try {
        createWindow();
        app.on('activate', function () {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    } catch (error) {
        console.log(error);
    }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});;

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function refreshMenuLogLevel(menu) {
    const configFile = "true" == `${process.env.DEBUG}` ? path.join(process.cwd(), 'config.json') : path.join(process.cwd(), 'resources/app/config.json');
    fs.exists(configFile, function (exists) {
        console.log(exists ? "文件存在" : "文件不存在");
        if (!exists) {
            dialog.showErrorBox("错误", "查找失败，配置文件文件不存在!");
            return;
        } else {
            //读取本地的json文件
            let result = JSON.parse(fs.readFileSync(configFile));
            if (result['log']['level'] == 'debug') {
                menu.getMenuItemById('log.debug').checked = true;
            }
            else if (result['log']['level'] == 'info') {
                menu.getMenuItemById('log.info').checked = true;
            }
            else if (result['log']['level'] == 'error') {
                menu.getMenuItemById('log.error').checked = true;
            }
        }
    });

}
