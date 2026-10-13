@echo off
rem Локальная копия сайта синагоги: встроенный PostgreSQL + API + сайт. Остановить — Ctrl+C.
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Нужен Node.js 20.19+ — скачайте LTS с https://nodejs.org & pause & exit /b 1)
node scripts\dev-start.mjs %*
