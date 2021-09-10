// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { Menu, dialog } = require('electron').remote
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

                }
            }
        ]
    }
];
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
const fs = require('fs');
const Lazy = require("lazy");

// ipcRenderer.on('load', (event, arg) => {
//     console.log(arg) // prints "ping"
//     event.returnValue = 'pong'
// })

//得到时间并写入div
function getDate() {
    //获取当前时间
    var date = new Date();

    //格式化为本地时间格式
    var Y = date.getFullYear();
    var M = date.getMonth() + 1;
    var D = date.getDate();
    var H = date.getHours();
    var m = date.getMinutes()
    var S = date.getSeconds();

    var times = Y + (M < 10 ? "-0" : "-") + M + (D < 10 ? "-0" : "-") + D;
    times = times + (H < 10 ? " 0" : " ") + H + (m < 10 ? ":0" : ":") + m + (S < 10 ? ":0" : ":") + S;

    //获取div
    var div1 = document.getElementById("currenttime");
    //将时间写入div
    div1.innerHTML = times;
}
//使用定时器每秒向div写入当前时间
//setInterval("getDate()", 1000);

// 加载文件
function loadFile() {
    const select = dialog.showOpenDialogSync({});
    if (undefined != select) {
        const selectFile = select[0];
        var body = document.getElementsByTagName('body')[0];
        var table = document.createElement('div');
        body.appendChild(table);
        new Lazy(fs.createReadStream(selectFile))
            .lines
            .forEach(
                function (line) {
                    let temp = JSON.parse(line.toString());
                    var tr = document.createElement('div');
                    var td1 = document.createElement('span');
                    var td2 = document.createElement('span');
                    tr.className = "tr";
                    td1.innerText = temp["timestamp"];
                    td1.className = "logTime";
                    td2.innerText = temp["message"];
                    td2.className = "logMsg";
                    tr.appendChild(td1);
                    tr.appendChild(td2);
                    table.appendChild(tr);
                }
            );
    }
}

module.exports = {
    getDate,
    loadFile
};
