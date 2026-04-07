
const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');


// 获取配置文件路径
function getConfigPath() {
    return "true" == `${process.env.DEBUG}`
        ? path.join(process.cwd(), 'config.json')
        : path.join(process.cwd(), 'resources/app/config.json');
}

// 读取配置
function getConfig() {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath));
    }
    return {};
}

// 保存配置
function saveConfig(config) {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}

// 更新最近打开的文件列表
function updateOpenedFiles(fileName, config) {
    if (!config.openedFiles) {
        config.openedFiles = [];
    }
    // 移除已存在的相同文件
    config.openedFiles = config.openedFiles.filter(f => f !== fileName);
    // 添加到开头
    config.openedFiles.unshift(fileName);
    // 最多保留 5 个
    if (config.openedFiles.length > 5) {
        config.openedFiles.pop();
    }
    saveConfig(config);
}

// 生成最近打开的文件菜单项
function getRecentlyOpenedMenuItems(win, config) {
    if (!config.openedFiles || config.openedFiles.length === 0) {
        return [];
    }

    const items = config.openedFiles.map(filePath => ({
        label: `${path.basename(filePath)} - ${filePath}`,
        click: () => {
            win.webContents.send('menuTrigger', 'open', filePath);
        }
    }));

    // 在前面添加分隔符
    items.unshift({ type: 'separator' });

    return items;
}


//定义菜单模板
function getMenuTemplate(win) {
    const config = getConfig();
    const recentItems = getRecentlyOpenedMenuItems(win, config);

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
                            // 更新最近打开的文件列表
                            updateOpenedFiles(select[0], config);
                            win.webContents.send('menuTrigger', 'open', select[0]);
                        }
                    }
                },
                ...recentItems,
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
                            "id": "log.debug",
                            click: () => {
                                win.webContents.send('menuTrigger', 'log', 'debug');
                            },
                            type: "radio"
                        },
                        {
                            label: 'info',
                            "id": "log.info",
                            click: () => {
                                win.webContents.send('menuTrigger', 'log', 'info');
                            },
                            type: "radio"
                        },
                        {
                            label: 'warn',
                            "id": "log.warn",
                            click: () => {
                                win.webContents.send('menuTrigger', 'log', 'warn');
                            },
                            type: "radio"
                        },
                        {
                            label: 'error',
                            "id": "log.error",
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
                },
                {
                    label: '查找',
                    accelerator: 'Ctrl+F',
                    click: () => {
                        win.webContents.send('menuTrigger', 'find');
                    }
                }
            ]
        }
    ];
    return template;
}

module.exports = getMenuTemplate;
