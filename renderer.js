// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


const { ipcRenderer } = require('electron');
const fs = require('fs');
const Lazy = require("lazy");
const path = require('path');

var openingFileName = '';
var filesize = 0;
var opening = true;
var tailing = false;
var lineCount = 0;
const lineMax = 1000;

// 高亮关键词数组
var highlightKeywords = [];

// 字段映射配置（默认值）
var fieldMapping = {
    timestamp: 'timestamp',
    level: 'level',
    message: 'message'
};

const logLevleEnum = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};
var currentLogLevel = logLevleEnum.debug;

ipcRenderer.on('menuTrigger', (event, arg1, arg2) => {
    if (arg1 === "open") {
        openFile(arg2);
    }
    else if (arg1 === "pause") {
        console.log("pause");
        pauseTail();
    }
    else if (arg1 === "filter") {
        console.log("filter");
        console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`process.cwd: ${process.cwd()}`);
        console.log(`__dirname: ${__dirname}`);
    }
    else if (arg1 === "log") {
        setLogLevel(arg2);
    }
    else if (arg1 === "find") {
        showFind();
        //window.open("https://github.com", "_blank", "top=500,left=200,frame=false,nodeIntegration=no");
    }
    else {
        console.log("unknow " + arg1);
    }
});

function pauseTail() {
    if (tailing) {
        openFile(openingFileName);
    } else {
        if ("" != openingFileName) {
            fs.unwatchFile(openingFileName);
        }
    }
    tailing = !tailing;
}

async function openFile(fileName) {
    refreshMenuLogLevel();
    if (document.querySelector("body > div")) {
        document.querySelector("body > div").remove();
    }
    lineCount = 0;
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
    fs.readFile(fileName, (err, data) => {
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
                        generateTxt(buffer.toString());
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
    var skipLen = 0;
    if (temp.length > lineMax) {
        skipLen = temp.length - lineMax;
    }
    var table = document.querySelector("body > div");
    for (var s in temp) {
        skipLen--;
        //if (skipLen <= 0) {
        insertLine(temp[s]);
        //}
    }
}

function insertLine(text) {
    text = text.trim();
    if ('' === text) return;
    var table = document.querySelector("body > div");
    let temp = JSON.parse(text.toString());
    if (logLevleEnum[temp[fieldMapping.level]] < currentLogLevel) return;
    limitMaxLine();
    var tr = document.createElement('div');
    var td1 = document.createElement('span');
    var td2 = document.createElement('span');
    tr.className = "tr";
    td1.innerText = temp[fieldMapping.timestamp];
    td1.className = "logTime";
    var msg = temp[fieldMapping.message];

    // 处理消息内容
    var msgText;
    if (typeof msg === "string") {
        try {
            msg = JSON.parse(msg);
            msgText = JSON.stringify(msg, null, '\t');
        } catch (error) {
            msgText = msg;
        }
    } else {
        msgText = JSON.stringify(msg, null, '\t');
    }

    // 保存原始文本并应用高亮
    td2.className = "logMsg";
    td2.dataset.originalText = msgText;
    td2.innerHTML = highlightText(msgText);

    tr.appendChild(td1);
    tr.appendChild(td2);
    table.appendChild(tr);
    if (opening) {
        window.scrollTo({ top: document.body.clientHeight });
    } else {
        window.scrollTo({ top: document.body.clientHeight, behavior: 'smooth' });
    }
    lineCount++;
}

function limitMaxLine() {
    if (lineCount > lineMax) {
        document.querySelector("body > div > div:nth-child(1)").remove();
        lineCount--;
    }
}

document.addEventListener("drop", (e) => {
    e.preventDefault(); //阻止e的默认行为
    const files = e.dataTransfer.files;
    if (files && files.length >= 1) {
        const path = files[0].path;
        openFile(path);
    }
});
//这个事件也需要屏蔽
document.addEventListener("dragover", (e) => {
    e.preventDefault();
});

function setLogLevel(level) {
    console.log(`set log level ${level}`);
    if (!(level in logLevleEnum)) {
        console.log(`${level} is invalid`);
        return;
    }
    currentLogLevel = level;
    const configFile = "true" == `${process.env.DEBUG}` ? path.join(process.cwd(), 'config.json') : path.join(process.cwd(), 'resources/app/config.json');
    fs.exists(configFile, function (exists) {
        console.log(exists ? "文件存在" : "文件不存在");
        if (!exists) {
            dialog.showErrorBox("错误", "查找失败，配置文件文件不存在!");
            return;
        } else {
            //读取本地的json文件
            let result = JSON.parse(fs.readFileSync(configFile));
            result['log']['level'] = currentLogLevel;
            var text = JSON.stringify(result, "\n", 4);
            fs.writeFileSync(configFile, text);
        }
    });

}

function refreshMenuLogLevel() {
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
                currentLogLevel = logLevleEnum.debug;
            }
            else if (result['log']['level'] == 'info') {
                currentLogLevel = logLevleEnum.info;
            }
            else if (result['log']['level'] == 'warn') {
                currentLogLevel = logLevleEnum.warn;
            }
            else if (result['log']['level'] == 'error') {
                currentLogLevel = logLevleEnum.error;
            }
            // 加载字段映射配置
            if (result['fields']) {
                fieldMapping = result['fields'];
            }
        }
    });

}

function showFind() {
    var searchEl = document.getElementById('search');
    var isHidden = searchEl.hasAttribute('hidden');
    if (isHidden) {
        searchEl.removeAttribute('hidden');
    } else {
        searchEl.setAttribute('hidden', true);
    }
}

function findString() {
    var str = document.getElementById('searchInput').value;
    var strFound;
    if (window.find) {
        strFound = self.find(str);
        if (!strFound) {
            strFound = self.find(str, 0, 1);
            while (self.find(str, 0, 1)) continue;
        }
    }
}

function applyHighlight() {
    var input = document.getElementById('highlightInput').value;
    highlightKeywords = input.split(',').map(k => k.trim()).filter(k => k.length > 0);
    console.log('应用高亮关键词:', highlightKeywords);

    // 重新渲染所有日志行
    var table = document.querySelector("body > div");
    if (table) {
        var rows = table.querySelectorAll('.tr');
        rows.forEach(row => {
            var msgSpan = row.querySelector('.logMsg');
            if (msgSpan && msgSpan.dataset.originalText) {
                msgSpan.innerHTML = highlightText(msgSpan.dataset.originalText);
            } else if (msgSpan) {
                msgSpan.dataset.originalText = msgSpan.innerHTML;
            }
        });
    }
}

function clearHighlight() {
    highlightKeywords = [];
    document.getElementById('highlightInput').value = '';
    console.log('清除高亮');

    // 恢复所有日志行
    var table = document.querySelector("body > div");
    if (table) {
        var rows = table.querySelectorAll('.tr');
        rows.forEach(row => {
            var msgSpan = row.querySelector('.logMsg');
            if (msgSpan && msgSpan.dataset.originalText) {
                msgSpan.innerHTML = msgSpan.dataset.originalText;
                delete msgSpan.dataset.originalText;
            }
        });
    }
}

function highlightText(text) {
    if (!highlightKeywords || highlightKeywords.length === 0) {
        return text;
    }

    var result = text;
    highlightKeywords.forEach(keyword => {
        var regex = new RegExp(escapeRegExp(keyword), 'gi');
        result = result.replace(regex, '<mark class="highlight">$&</mark>');
    });
    return result;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
