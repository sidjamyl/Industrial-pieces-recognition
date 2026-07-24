@echo off
cd /d "%~dp0"
set "TORCH_HOME=D:\AI\torch-cache"
set "DINOV2_REPO=D:\AI\models\dinov2"
"D:\AI\venvs\industrial-image-recognition\Scripts\python.exe" app.py
pause
