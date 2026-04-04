@echo off
cd /d C:\Users\Daniel\Desktop\Projects\streaming

REM Remove old git folder
if exist .git (
    rmdir /s /q .git
    echo Removed old .git folder
)

REM Initialize new git repository
git init
echo Initialized new git repository

REM Configure git user
git config user.name "Daniel"
git config user.email "jungyh870918@gmail.com"
echo Configured git user

REM Copy gitignore
if exist .gitignore.new (
    copy .gitignore.new .gitignore
    echo Created .gitignore
)

REM Show git status
echo.
echo ===== Git Status =====
git status
echo.
echo ===== Git Config =====
git config --local --list
