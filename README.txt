TASKFLOW FOR WINDOWS (.exe) - GitHub builds it for you

Use a NEW repository (e.g. "taskflow-desktop"), separate from the phone one.

1. github.com > New repository > name: taskflow-desktop (Private is fine).
2. Add file > Upload files: upload ALL 8 files from this folder to the repository root:
   main.js, preload.js, wpreload.js, widget.html, index.html, icon.png, package.json, build.yml
   Commit.
3. Click build.yml > pencil (edit) icon > in the file-name box, put the cursor at the very start and type
   .github/workflows/
   so it reads  .github/workflows/build.yml  > Commit changes.
   (same trick as for the phone app)
4. Open the Actions tab. "Build Windows app" runs (about 4-6 minutes).
5. Open the finished run > Artifacts > download TaskFlow-Windows (zip) > unzip. You get:
   TaskFlow-Setup-2.0.0.exe     (installer, creates Start menu + desktop shortcut)
   TaskFlow-Portable-2.0.0.exe  (runs without installing)
6. Windows may say "Windows protected your PC": click More info > Run anyway
   (the app is not code-signed).

Your data is stored in:  %APPDATA%\taskflow-desktop\taskflow-data.json  (plus a .bak backup).
Move data between phone and PC for now with Settings > Export backup / Import backup.
