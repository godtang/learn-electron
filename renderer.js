// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { dialog } = require('electron').remote
const { ipcRenderer } = require('electron')
const fs = require('fs');
const Lazy = require("lazy");

ipcRenderer.on('menuTrigger', (event, arg) => {
    if (arg === "open") {
        if (document.querySelector("body > div")) {
            document.querySelector("body > div").remove();
        }
        loadFile();
    }
    else {
        console.log("unknow " + arg);
    }
})

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
    loadFile
};
