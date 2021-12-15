// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


const { ipcRenderer } = require('electron')
const fs = require('fs');
const Lazy = require("lazy");

var filename = '';
var filesize = 0;

ipcRenderer.on('menuTrigger', (event, arg1, arg2) => {
    if (arg1 === "open") {
        if (document.querySelector("body > div")) {
            document.querySelector("body > div").remove();
        }
        loadFile(arg2);
    }
    else {
        console.log("unknow " + arg);
    }
})

// 加载文件
function loadFile(fileName) {
    var body = document.getElementsByTagName('body')[0];
    var table = document.createElement('div');
    body.appendChild(table);
    new Lazy(fs.createReadStream(fileName))
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
                var msg = temp["message"];
                if (typeof msg === "string") {
                    try {
                        msg = JSON.parse(msg);
                    } catch (error) {
                    }
                }
                td2.innerText = JSON.stringify(msg, null, '\t');


                // try {
                //     td2.innerText = JSON.stringify(temp["message"], null, '\t');
                // } catch (error) {

                // }
                td2.className = "logMsg";
                tr.appendChild(td1);
                tr.appendChild(td2);
                table.appendChild(tr);
            }
        );

}

