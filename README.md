# electron-quick-start

## build
运行命令
```
electron-packager . 'JsonLogShower' --platform=win32 --arch=x64 --out=./out --download.mirrorOptions.mirror=https://npm.taobao.org/mirrors/electron/ --overwrite
```
```
npx electron-packager . 'JsonLogShower' --platform=win32 --arch=x64 --download.mirrorOptions.mirror=https://npm.taobao.org/mirrors/electron/ --overwrite --no-tmpdir --out=D:/soft/UiBotJsonLogShower
```
## 异常处理

* 
编译时如果出现
```
electron : 无法加载文件 nodejs\node_global\electron.ps1，因为在此系统上禁止运行脚本。解决办法
```
在管理员权限下运行并重启VSCODE
```
set-ExecutionPolicy RemoteSigned
```
* 
如果打包时出现`Fatal error: Unable to commit changes`，请关闭杀毒软件后再试
