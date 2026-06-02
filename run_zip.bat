@echo off
:: ---------------------------------------------------------
:: [FIX] บรรทัดนี้สำคัญมาก: สั่งให้ย้ายมาทำงานที่โฟลเดอร์ที่ไฟล์นี้อยู่
cd /d "%~dp0"
:: ---------------------------------------------------------

echo ===================================================
echo   Marnthara AI Zipper Tool
echo ===================================================
echo.
echo Working Directory: %CD%
echo.

:: ตรวจสอบว่ามีไฟล์ .ps1 อยู่จริงไหมก่อนรัน
if not exist "zip_for_ai.ps1" (
    echo [ERROR] Could not find 'zip_for_ai.ps1' in this folder!
    echo Please make sure both files are in the same folder.
    echo.
    pause
    exit
)

:: สั่งรัน PowerShell โดยใช้ -File ซึ่งเสถียรกว่า -Command
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "zip_for_ai.ps1"

echo.
echo ===================================================
echo   Finished! (Check the 'AI_ZIPS' folder)
echo ===================================================
echo.
pause