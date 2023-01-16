
const { dialog } = require('electron');


//定义菜单模板
function getMenuTemplate(win) {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: '打开',
                    accelerator: 'Ctrl+O',
                    click: () => {
                        const select = dialog.showOpenDialogSync({});
                        if (undefined != select) {
                            win.webContents.send('menuTrigger', 'open', select[0]);
                        }
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: '关闭',
                    accelerator: 'Ctrl+Q',
                    click: () => {
                        win.close();
                    }
                }
            ]
        },
        {
            label: '选项',
            submenu: [
                {
                    label: '过滤',
                    accelerator: 'Ctrl+L',
                    click: () => {
                        console.log("过滤先准备好");
                        win.webContents.send('menuTrigger', 'filter');
                    },
                    submenu: [
                        {
                            label: 'debug',
                            click: () => {
                                win.webContents.send('menuTrigger', 'log', 'debug');
                            },
                            type: "radio"
                        },
                        {
                            label: 'info',
                            click: () => {
                                win.webContents.send('menuTrigger', 'log', 'info');
                            },
                            type: "radio"
                        },
                        {
                            label: 'error',
                            click: () => {
                                win.webContents.send('menuTrigger', 'log', 'error');
                            },
                            type: "radio"
                        }
                    ]
                },
                {
                    label: '停止/刷新',
                    accelerator: 'Ctrl+P',
                    click: () => {
                        console.log("暂停不好做，先用停止和重新打开吧");
                        win.webContents.send('menuTrigger', 'pause');
                    }
                }
            ]
        }
    ];
    return template;
}

module.exports = getMenuTemplate;
