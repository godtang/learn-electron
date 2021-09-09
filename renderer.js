// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


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
setInterval("getDate()", 1000);

