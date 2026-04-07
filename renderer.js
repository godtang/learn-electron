// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


const { ipcRenderer, dialog } = require('electron');
const fs = require('fs');
const Lazy = require("lazy");
const path = require('path');

var openingFileName = '';
var filesize = 0;
var opening = true;
var tailing = false;
var lineCount = 0;
var currentLineNumber = 0; // 当前处理行号
var isLoading = false; // 是否正在加载文件
var currentFd = null; // 当前打开的文件描述符
var loadingHideTimer = null; // 隐藏加载效果的定时器
var loadingTimer = null; // 加载计时器
var loadingStartTime = 0; // 加载开始时间
const lineMax = 1000;

// 高亮关键词数组
var highlightKeywords = [];
// 过滤开关
var filterHighlight = false;

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
    error: 3,
    // 支持大写格式
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
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
        if (openingFileName) {
            fs.unwatchFile(openingFileName);
        }
        if (currentFd) {
            fs.close(currentFd);
            currentFd = null;
        }
    }
    tailing = !tailing;
}

async function openFile(fileName) {
    // 防止重复打开
    if (isLoading) {
        return;
    }

    isLoading = true;

    // 清理旧的文件监听
    if (openingFileName) {
        fs.unwatchFile(openingFileName);
    }
    if (currentFd) {
        fs.close(currentFd);
        currentFd = null;
    }

    // 清理旧的表格 - 使用更精确的选择器
    var oldTable = document.getElementById('log-table');
    if (oldTable) {
        oldTable.remove();
    }
    // 也清理可能遗留的 body > div
    var oldDivs = document.querySelectorAll("body > div");
    oldDivs.forEach(function (div) {
        div.remove();
    });

    // 重置状态
    lineCount = 0;
    currentLineNumber = 0;
    opening = true;

    // 刷新日志级别配置
    refreshMenuLogLevel();

    // 创建新的表格元素，添加唯一 ID
    var body = document.getElementsByTagName('body')[0];
    var table = document.createElement('div');
    table.id = 'log-table';
    body.appendChild(table);

    // 更新最近打开的文件列表
    updateOpenedFiles(fileName);

    try {
        // 显示加载效果
        showLoading(true);
        // 等待文件加载完成
        await loadFile(fileName);
        // 文件加载完成后开始监听
        watchFile(fileName);
        openingFileName = fileName;
    } finally {
        isLoading = false;
    }
}

// 更新最近打开的文件列表
function updateOpenedFiles(fileName) {
    const configFile = "true" == `${process.env.DEBUG}`
        ? path.join(process.cwd(), 'config.json')
        : path.join(process.cwd(), 'resources/app/config.json');

    if (!fs.existsSync(configFile)) return;

    let config = JSON.parse(fs.readFileSync(configFile));
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
    // 保存配置
    fs.writeFileSync(configFile, JSON.stringify(config, null, 4));

    // 通知主进程刷新菜单
    ipcRenderer.send('refreshMenu');
}

// 等待流式读取完成
function readStreamAsync(readStream) {
    return new Promise((resolve, reject) => {
        let remainder = '';
        let lineBuffer = [];
        const batchSize = 100; // 每批处理 100 行

        readStream.on('data', (chunk) => {
            remainder += chunk;
            var lines = remainder.split(/\r\n|\n|\r/);

            // 最后一行可能不完整，保留到下一次处理
            remainder = lines.pop() || '';

            for (var i = 0; i < lines.length; i++) {
                lineBuffer.push(lines[i]);

                // 达到批次大小时处理一次
                if (lineBuffer.length >= batchSize) {
                    processLines(lineBuffer);
                    lineBuffer = [];
                }
            }
        });

        readStream.on('end', () => {
            console.log('loadFile: 文件读取完成');
            // 处理剩余的行
            if (remainder) {
                lineBuffer.push(remainder);
            }
            if (lineBuffer.length > 0) {
                processLines(lineBuffer);
            }
            resolve();
        });

        readStream.on('error', (err) => {
            reject(err);
        });
    });
}

// 加载文件
async function loadFile(fileName) {
    opening = true;

    // 使用流式读取大文件
    const readStream = fs.createReadStream(fileName, { encoding: 'utf8' });

    try {
        await readStreamAsync(readStream);
        // 设置 opening 为 false，表示初始加载完成
        opening = false;
        // 数据加载完成后关闭加载效果
        showLoading(false);
        console.log('loadFile: 加载完成');
    } catch (err) {
        console.error('读取文件失败:', err);
        showLoading(false);
        opening = false;
        isLoading = false;
        // 清理文件描述符
        if (currentFd) {
            fs.close(currentFd);
            currentFd = null;
        }
        throw err;
    }
}

// 处理行数据
function processLines(lines) {
    var table = document.getElementById('log-table');
    if (!table) {
        console.error('找不到 table 元素');
        return;
    }

    // 使用 DocumentFragment 批量插入
    var fragment = document.createDocumentFragment();
    var validCount = 0;

    for (var i = 0; i < lines.length; i++) {
        currentLineNumber++;
        var lineResult = createLineElement(lines[i], currentLineNumber);
        if (lineResult) {
            fragment.appendChild(lineResult);
            validCount++;
        }
    }

    if (fragment.hasChildNodes()) {
        table.appendChild(fragment);
        lineCount = table.children.length;

        // 处理超出限制的行
        while (lineCount > lineMax) {
            var firstChild = table.firstElementChild;
            if (firstChild) {
                firstChild.remove();
                lineCount = table.children.length;
            } else {
                break;
            }
        }
    }

    // 滚动到底部
    if (opening) {
        window.scrollTo({ top: document.body.clientHeight });
    }
}

// 显示/隐藏加载效果
function showLoading(show) {
    let loadingEl = document.getElementById('loading');
    if (show) {
        // 取消之前的隐藏定时器
        if (loadingHideTimer) {
            clearTimeout(loadingHideTimer);
            loadingHideTimer = null;
        }
        // 记录开始时间
        loadingStartTime = Date.now();

        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'loading';
            loadingEl.innerHTML = '<div class="loading-spinner">加载中... <span id="loading-time">0.0s</span></div>';
            document.body.appendChild(loadingEl);
        } else {
            // 更新内部 HTML 确保有计时显示
            loadingEl.innerHTML = '<div class="loading-spinner">加载中... <span id="loading-time">0.0s</span></div>';
        }
        loadingEl.style.display = 'flex';

        // 启动计时器，每秒更新一次
        if (loadingTimer) {
            clearInterval(loadingTimer);
        }
        loadingTimer = setInterval(function () {
            var elapsed = (Date.now() - loadingStartTime) / 1000;
            var timeEl = document.getElementById('loading-time');
            if (timeEl) {
                timeEl.textContent = elapsed.toFixed(1) + 's';
            }
        }, 100);
    } else {
        // 停止计时器
        if (loadingTimer) {
            clearInterval(loadingTimer);
            loadingTimer = null;
        }

        // 延迟隐藏，确保加载效果至少显示 200ms
        loadingHideTimer = setTimeout(function () {
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
            loadingHideTimer = null;
        }, 200);
    }
}

function watchFile(filename) {
    fs.open(filename, 'r', function (error, fd) {
        if (error) {
            console.error('打开文件失败:', error);
            showLoading(false);
            isLoading = false;
            return;
        }

        // 保存当前文件描述符
        currentFd = fd;

        var buffer;
        fs.watchFile(filename, {
            persistent: true,
            interval: 1000
        }, function (curr, prev) {
            if (curr.mtime > prev.mtime) {
                if (curr.size - prev.size > 0) {
                    // 显示最新添加的文件内容
                    buffer = new Buffer.alloc(curr.size - prev.size);
                    fs.read(fd, buffer, 0, (curr.size - prev.size), prev.size, function (err, bytesRead, buffer) {
                        if (err) {
                            console.error('读取文件失败:', err);
                            return;
                        }
                        var lines = buffer.toString().split(/\r\n|\n|\r/);
                        processLines(lines);
                    });
                } else if (curr.size - prev.size < 0) {
                    // 文件删除了部分数据，需要重新加载
                    openFile(filename);
                }
                // 文件大小无变化时，不做任何操作
            }
        });
    });
}

// 创建行元素，返回 null 表示跳过该行
function createLineElement(text, lineNumber) {
    text = text.trim();
    if ('' === text) return null;

    // 尝试解析 JSON
    let temp;
    try {
        temp = JSON.parse(text.toString());
    } catch (error) {
        // JSON 解析失败，显示错误提示行
        var tr = document.createElement('div');
        tr.className = "tr";
        tr.style.color = "red";
        var errorMsg = document.createElement('span');
        errorMsg.className = "logMsg";
        errorMsg.innerText = `第 ${lineNumber} 行不是合法的 JSON: ${error.message}`;
        tr.appendChild(errorMsg);
        return tr;
    }

    var levelValue = logLevleEnum[temp[fieldMapping.level]];
    if (levelValue === undefined || levelValue < currentLogLevel) {
        return null;
    }

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

    // 如果开启了过滤，检查是否需要显示
    if (filterHighlight && !shouldHighlight(msgText)) {
        tr.style.display = 'none';
    }

    tr.appendChild(td1);
    tr.appendChild(td2);
    lineCount++;
    return tr;
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
    filterHighlight = false;
    document.getElementById('highlightInput').value = '';
    console.log('清除高亮');

    // 重置按钮状态
    var filterBtn = document.querySelector('#search button:last-child');
    if (filterBtn) {
        filterBtn.classList.remove('active');
        filterBtn.textContent = '只显示高亮';
    }

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
            row.style.display = ''; // 显示所有行
        });
    }
}

function toggleFilter() {
    if (!highlightKeywords || highlightKeywords.length === 0) {
        alert('请先设置高亮关键词');
        return;
    }
    filterHighlight = !filterHighlight;
    console.log('过滤高亮:', filterHighlight);

    // 更新按钮状态
    var filterBtn = document.querySelector('#search button:last-child');
    if (filterHighlight) {
        filterBtn.classList.add('active');
        filterBtn.textContent = '已过滤';
    } else {
        filterBtn.classList.remove('active');
        filterBtn.textContent = '只显示高亮';
    }

    var table = document.querySelector("body > div");
    if (table) {
        var rows = table.querySelectorAll('.tr');
        rows.forEach(row => {
            var msgSpan = row.querySelector('.logMsg');
            if (msgSpan && msgSpan.dataset.originalText) {
                var shouldShow = !filterHighlight || shouldHighlight(msgSpan.dataset.originalText);
                row.style.display = shouldShow ? '' : 'none';
            }
        });
    }
}

function shouldHighlight(text) {
    if (!highlightKeywords || highlightKeywords.length === 0) {
        return false;
    }
    for (var i = 0; i < highlightKeywords.length; i++) {
        if (text.toLowerCase().indexOf(highlightKeywords[i].toLowerCase()) !== -1) {
            return true;
        }
    }
    return false;
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
