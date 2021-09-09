
const { loadFile } = require('./renderer.js');

//定义菜单模板
function getMenuTemplate(params) {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: '打开',
                    accelerator: 'Ctrl+O',
                    click: () => {
                        loadFile();
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
