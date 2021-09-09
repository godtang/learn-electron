

//定义菜单模板
function getMenuTemplate(params) {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: '关于',
                    role: 'about'
                },
                {
                    type: 'separator'
                },
                {
                    label: '关闭',
                    accelerator: 'Command+Q',
                    click: () => {
                        win.close();
                    }
                }
            ]
        },
        {
            label: '编辑',
            submenu: [
                {
                    label: '复制',
                    click: () => {
                        console.log('复制');
                    }
                },
                {
                    label: '剪切',
                    click: () => {
                        console.log('剪切');
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: '查找',
                    accelerator: 'Ctrl+F',
                    click: () => {
                        console.log('查找');
                    }
                },
                {
                    label: '替换',
                    accelerator: 'Command+R',
                    click: () => {
                        console.log('替换');
                    }
                }

            ]
        }
    ];
    return template;
}

module.exports = getMenuTemplate;
