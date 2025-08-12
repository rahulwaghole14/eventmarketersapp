@echo off
echo Building EventMarketers APK...

echo Step 1: Installing dependencies...
call npm install

echo Step 2: Creating assets directory...
if not exist "android\app\src\main\assets" mkdir "android\app\src\main\assets"

echo Step 3: Bundling JavaScript...
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

echo Step 4: Building debug APK...
cd android
call gradlew assembleDebug

echo Step 5: Checking for APK...
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo SUCCESS! APK created at: app\build\outputs\apk\debug\app-debug.apk
    echo Copying to project root...
    copy "app\build\outputs\apk\debug\app-debug.apk" "..\EventMarketers-debug.apk"
    echo APK copied to: EventMarketers-debug.apk
) else (
    echo ERROR: APK not found!
)

cd ..
echo Build process completed!
pause

