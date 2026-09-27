@echo off
title CUESTOM - Inicio Completo del Sistema
color 0A

echo ============================================
echo    CUESTOM - Inicio Completo del Sistema
echo ============================================
echo.

:: Verificar PostgreSQL
echo [1/5] Verificando PostgreSQL...
sc query postgresql-x64-18 >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] PostgreSQL no detectado. Intentando iniciar...
    net start postgresql-x64-18 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudo iniciar PostgreSQL.
        echo Asegurese de tener instalado PostgreSQL 18.
        pause
        exit /b 1
    )
)
echo [OK] PostgreSQL funcionando.
echo.

:: Activar entorno virtual
echo [2/5] Activando entorno virtual...
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo [OK] Entorno virtual activado.
) else (
    echo [!] No se encontro venv, creando...
    python -m venv venv
    if exist venv\Scripts\activate.bat (
        call venv\Scripts\activate.bat
        echo [OK] Entorno virtual creado y activado.
    ) else (
        echo [ERROR] No se pudo crear el entorno virtual.
        pause
        exit /b 1
    )
)
echo.

:: Iniciar backend Django
echo [3/5] Iniciando servidor Django...
start "CUESTOM Backend" cmd /c "call venv\Scripts\activate.bat && python manage.py runserver"
echo [OK] Backend iniciado en http://localhost:8000
echo.

:: Iniciar frontend React
echo [4/5] Iniciando servidor React...
cd frontend
start "CUESTOM Frontend" cmd /c "npm start"
cd ..
echo [OK] Frontend iniciado en http://localhost:3000
echo.

echo [5/5] Sistema CUESTOM completamente operativo.
echo.
echo ============================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   Admin:    http://localhost:8000/admin/
echo ============================================
echo.
echo Presione cualquier tecla para cerrar este monitor...
echo (Los servidores seguiran funcionando en segundo plano)
pause >nul
