@echo off
echo ========================================
echo LifePattern Services Test Script
echo ========================================
echo.

echo Testing AI Service and Backend Services
echo ========================================

:: Test 1: AI Service Health Check
echo.
echo [1/5] Testing AI Service Health Check...
echo ----------------------------------------
curl -s -w "HTTP Status: %%{http_code}\n" "https://lifepattern-ai-service.onrender.com/health"
if %errorlevel% equ 0 (
    echo ✅ AI Service Health Check: PASSED
) else (
    echo ❌ AI Service Health Check: FAILED
)

:: Test 2: Backend Health Check
echo.
echo [2/5] Testing Backend Health Check...
echo ----------------------------------------
curl -s -w "HTTP Status: %%{http_code}\n" "https://lifepattern-backend.onrender.com/health"
if %errorlevel% equ 0 (
    echo ✅ Backend Health Check: PASSED
) else (
    echo ❌ Backend Health Check: FAILED
)

:: Test 3: AI Service Enhanced Prediction
echo.
echo [3/5] Testing AI Service Enhanced Prediction...
echo ------------------------------------------------
curl -X POST "https://lifepattern-ai-service.onrender.com/predict" ^
  -H "Content-Type: application/json" ^
  -d "{\"sleep_hours\": 5.0, \"meal_times\": [\"08:30\", \"13:00\", \"19:30\"], \"screen_time\": 8.0, \"exercise_duration\": 0.3, \"wake_up_time\": \"08:30\", \"bed_time\": \"01:00\", \"water_intake\": 1.5, \"stress_level\": 7}" ^
  -s -w "HTTP Status: %%{http_code}\n"
if %errorlevel% equ 0 (
    echo ✅ AI Service Enhanced Prediction: PASSED
) else (
    echo ❌ AI Service Enhanced Prediction: FAILED
)

:: Test 4: AI Service API Documentation
echo.
echo [4/5] Testing AI Service API Documentation...
echo ---------------------------------------------
curl -s -w "HTTP Status: %%{http_code}\n" "https://lifepattern-ai-service.onrender.com/docs"
if %errorlevel% equ 0 (
    echo ✅ AI Service API Documentation: PASSED
) else (
    echo ❌ AI Service API Documentation: FAILED
)

:: Test 5: Backend API Endpoints
echo.
echo [5/5] Testing Backend API Endpoints...
echo --------------------------------------
curl -s -w "HTTP Status: %%{http_code}\n" "https://lifepattern-backend.onrender.com/api/health"
if %errorlevel% equ 0 (
    echo ✅ Backend API Endpoints: PASSED
) else (
    echo ❌ Backend API Endpoints: FAILED
)

echo.
echo ========================================
echo Test Summary
echo ========================================
echo.
echo Service URLs:
echo - AI Service: https://lifepattern-ai-service.onrender.com
echo - Backend: https://lifepattern-backend.onrender.com
echo.
echo Health Check URLs:
echo - AI Health: https://lifepattern-ai-service.onrender.com/health
echo - Backend Health: https://lifepattern-backend.onrender.com/health
echo.
echo API Documentation:
echo - AI Docs: https://lifepattern-ai-service.onrender.com/docs
echo.
echo ========================================
echo Testing Complete!
echo ========================================
pause 