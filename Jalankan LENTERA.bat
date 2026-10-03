@echo off
title CANDRANATA Server
color 0B
echo.
echo  ==========================================
echo    CANDRANATA Server - Lathi to Urup
echo    Cipta Agung Nuntun Dharmaning Raga
echo  ==========================================
echo.
echo  Membuka browser...
echo  Server aktif di: http://lentera:8080
echo.
echo  JANGAN tutup jendela ini selama pakai website!
echo  Tekan Ctrl+C untuk menghentikan server.
echo.

cd /d "%~dp0"
start "" "http://lentera:8080/index.html"
python server.py

pause
