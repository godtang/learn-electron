// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


const { ipcRenderer } = require('electron')
const fs = require('fs');
const Lazy = require("lazy");

var openingFileName = '';
var filesize = 0;
var opening = true;

ipcRenderer.on('menuTrigger', (event, arg1, arg2) => {
    if (arg1 === "open") {
        if (document.querySelector("body > div")) {
            document.querySelector("body > div").remove();
        }
        openFile(arg2);
    }
    else {
        console.log("unknow " + arg);
    }
})

async function openFile(fileName) {
    if ("" != openingFileName) {
        fs.unwatchFile(openingFileName);
    }
    await loadFile(fileName);
    watchFile(fileName);
    openingFileName = fileName;
}

// 加载文件
async function loadFile(fileName) {
    opening = true;
    var body = document.getElementsByTagName('body')[0];
    var table = document.createElement('div');
    body.appendChild(table);
    fs.readFile(fileName,(err,data)=>{
        generateTxt(data.toString());
    });
}

function watchFile(filename) {
    console.log('watchFile');
    opening = false;
    fs.open(filename, 'r', function (error, fd) {
        var buffer;
        var remainder = null;
        fs.watchFile(filename, {
            persistent: true,
            interval: 1000
        }, function (curr, prev) {
            console.log(curr);
            if (curr.mtime > prev.mtime) {
                if (curr.size - prev.size > 0) {
                    // 显示最新添加的文件内容
                    //文件内容有变化，那么通知相应的进程可以执行相关操作。例如读物文件写入数据库等
                    buffer = new Buffer.alloc(curr.size - prev.size);
                    fs.read(fd, buffer, 0, (curr.size - prev.size), prev.size, function (err, bytesRead, buffer) {
                        generateTxt(buffer.toString())
                    });
                } else if (curr.size - prev.size < 0) {
                    // 文件删除了部分数据，需要重新加载
                    openFile(filename);
                } else {
                    //没有变化
                    openFile(filename);
                }
            } else {
                console.log('文件读取错误');
            }
        });

    });
}

function generateTxt(str) { // 处理新增内容的地方
    var temp = str.split('\r\n');
    var table = document.querySelector("body > div");
    for (var s in temp) {
        insertLine(temp[s]);
    }
}

function insertLine(text) {
    if ('' === text) return;
    var table = document.querySelector("body > div");
    let temp = JSON.parse(text.toString());
    var tr = document.createElement('div');
    var td1 = document.createElement('span');
    var td2 = document.createElement('span');
    tr.className = "tr";
    td1.innerText = temp["timestamp"];
    td1.className = "logTime";
    var msg = temp["message"];
    td2.innerText = msg;
    if (typeof msg === "string") {
        try {
            msg = JSON.parse(msg);
            td2.innerText = JSON.stringify(msg, null, '\t');
        } catch (error) {
        }
    } else {
        td2.innerText = JSON.stringify(msg, null, '\t');
    }

    td2.className = "logMsg";
    tr.appendChild(td1);
    tr.appendChild(td2);
    table.appendChild(tr);
    if (opening) {
        window.scrollTo({ top: document.body.clientHeight })
    } else {
        window.scrollTo({ top: document.body.clientHeight, behavior: 'smooth' })
    }

}

