@echo off
chcp 65001 >nul
echo 🀄 麻将辅助工具后端启动器
echo.

REM 激活conda环境
echo 📦 激活Python环境...
call conda activate mahjong-backend
if errorlevel 1 (
    echo ❌ 未找到 mahjong-backend 环境，请先创建环境
    echo 执行: conda create -n mahjong-backend python=3.11
    pause
    exit /b 1
)

REM 安装依赖
echo 📚 检查依赖...
pip install -r requirements.txt --quiet

REM 启动服务器
echo 🚀 启动后端服务器...
python start_server.py

pause 