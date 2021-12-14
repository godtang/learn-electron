
const { dialog } = require('electron')


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
                            win.webContents.send('menuTrigger', 'open', select[0])
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
        }
    ];
    return template;
}

module.exports = getMenuTemplate;
