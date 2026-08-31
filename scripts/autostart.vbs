' 复变函数计算器 - 开机自启脚本（隐藏窗口运行常驻服务 5174）
' 使用方法：把这个文件复制到启动文件夹即可开机自启。
' 打开启动文件夹：Win+R 输入 shell:startup 回车。
Set ws = CreateObject("WScript.Shell")
ws.Run """C:\Program Files\nodejs\node.exe"" ""D:\游戏\复变函数计算器\server\static-server.mjs""", 0, False
