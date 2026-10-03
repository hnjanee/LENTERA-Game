@echo off
title LATHI Server
color 0E
echo.
echo  ==========================================
echo    LATHI - Literasi Aksi Terintegrasi
echo    Hentikan Intimidasi
echo  ==========================================
echo.
echo  Membuka browser...
echo  Server aktif di: http://lathi:8080
echo.
echo  JANGAN tutup jendela ini selama pakai website!
echo  Tekan Ctrl+C untuk menghentikan server.
echo.
cd /d "%~dp0"
start "" "http://localhost:8080/index.html"
python server.py
pause
