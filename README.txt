TASKFLOW FOR WINDOWS - VERSION 2.2 (updated 29/10/2026)

Your existing GitHub repository "taskflow-desktop" already has build.yml - leave it as it is.

1. Open the repository > Add file > Upload files. Upload all 8 files from this folder to the ROOT
   (same names, so they replace the old ones):
   main.js, preload.js, wpreload.js, widget.html, index.html, icon.png, icon.ico, package.json
   Commit.
2. Actions tab > wait for the green tick (about 3-5 minutes) > download TaskFlow-Windows.
3. Unzip > run  TaskFlow-Setup-2.2.0.exe  (it installs over the old version; your tasks stay).
   Windows may say "Windows protected your PC": More info > Run anyway.
4. Open TaskFlow > Settings: the bottom line shows "TaskFlow v2.2 · updated 29/10/2026".
5. Settings > Desktop: switch "Start TaskFlow when Windows starts" OFF and ON once, so the
   startup entry is rewritten. Then restart the PC to test it.

Your data stays in %APPDATA%\taskflow-desktop\taskflow-data.json

LOGO ON THE DESKTOP SHORTCUT: if the old shortcut still shows a blank icon after installing, delete it
and re-run the installer (it recreates the shortcut with the logo). If Windows still shows the old
picture, it is Windows icon cache - restart the PC or run: ie4uinit.exe -show
