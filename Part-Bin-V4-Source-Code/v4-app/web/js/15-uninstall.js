/* =====================================================================
   Parts Bin — Reset / Uninstall  (device version)
   ---------------------------------------------------------------------
   Two separate actions:

     RESET DATA        wipes every item/project/order/setting from this
                       PC but leaves the app installed and usable.

     UNINSTALL FULLY   wipes the data AND removes every Parts Bin file.
                       A web page can't delete files itself, so we build
                       an uninstaller .bat with this install's real path
                       baked in and hand it to you to run.

   Both offer a backup first. Nothing is deleted without confirmation.
   ===================================================================== */
const PB_ALL_KEYS=["pb_items","pb_projects","pb_orders","pb_compartments","pb_materials",
  "pb_locations","pb_settings","pb_recovery","pb_recovery_restored","pb_camera","pb_sidebar"];

function uninstCounts(){
  return {items:(state.items||[]).length,projects:(state.projects||[]).length,
          orders:(state.orders||[]).length,comps:(state.compartments||[]).length};
}

/* Where is this app actually installed? Derived from the page URL, so it
   works no matter where the user put the folder. */
function pbInstallDir(){
  try{
    if(location.protocol!=="file:") return "";
    let p=decodeURIComponent(location.pathname).replace(/^\//,"");
    p=p.substring(0,p.lastIndexOf("/"));
    return p.replace(/\//g,"\\");
  }catch(e){ return ""; }
}

function pbWipeData(){
  try{ PB_ALL_KEYS.forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
  state.items=[];state.projects=[];state.orders=[];state.compartments=[];
  state.locations=[];state.materials=[];state.settings={currency:"$",defLow:0};
  try{ document.body.removeAttribute("data-style"); applyTheme(); applyFont(); setGreeting(); render(); }catch(e){}
}

/* Build an uninstaller with the real install path written into it.
   Removes: the app folder, the desktop shortcut, any Start Menu entry,
   then deletes itself. Deliberately does NOT touch backup .json files -
   after a wipe those are the user's only copy of their inventory. */
function pbDownloadUninstaller(){
  const dir=pbInstallDir();
  if(!dir) return false;
  const L=[
    '@echo off',
    'title Uninstall Parts Bin',
    'echo.',
    'echo  ==========================================',
    'echo   Uninstall Parts Bin',
    'echo  ==========================================',
    'echo.',
    'echo  This permanently deletes:',
    'echo.',
    'echo    1. The app folder:',
    'echo       '+dir,
    'echo    2. The "Parts Bin App" desktop shortcut',
    'echo    3. Any Start Menu entry',
    'echo.',
    'echo  Your saved inventory has already been cleared',
    'echo  from the browser.',
    'echo.',
    'echo  Backup .json files in Downloads are NOT touched.',
    'echo  After this, those are your only copy.',
    'echo.',
    'set /p ok=Type YES then press Enter: ',
    'if /I not "%ok%"=="YES" (echo. & echo  Cancelled - nothing was removed. & echo. & pause & exit /b)',
    'cd /d "%TEMP%"',
    'del /q "%USERPROFILE%\\OneDrive\\Desktop\\Parts Bin App.lnk" 2>nul',
    'del /q "%USERPROFILE%\\Desktop\\Parts Bin App.lnk" 2>nul',
    'del /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Parts Bin App.lnk" 2>nul',
    'timeout /t 1 /nobreak >nul',
    'rmdir /s /q "'+dir+'" 2>nul',
    'echo.',
    'if exist "'+dir+'" (',
    '  echo  Some files were still in use.',
    '  echo  Close Parts Bin and Edge, then run this again.',
    '  echo.',
    '  pause',
    ') else (',
    '  echo  Parts Bin has been completely removed.',
    '  echo.',
    '  echo    Removed  - app folder, shortcuts, all saved data',
    '  echo    Kept     - backup files in your Downloads folder',
    '  echo.',
    '  pause',
    '  (goto) 2>nul & del "%~f0"',
    ')'
  ];
  try{
    const blob=new Blob([L.join("\r\n")+"\r\n"],{type:"application/octet-stream"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="Uninstall Parts Bin.bat";
    a.click();
    return true;
  }catch(e){ return false; }
}

function openUninstall(){
  const c=uninstCounts();
  $("#uninstTitle").textContent="Reset or uninstall";
  $("#uninstBody").innerHTML=
    '<div style="font-size:14px;line-height:1.6">Choose what you want to remove from this PC.</div>'+
    '<div class="meta" style="margin:10px 0 4px">'+
      '<span class="chip"><b>'+c.items+'</b> items</span>'+
      '<span class="chip"><b>'+c.projects+'</b> projects</span>'+
      '<span class="chip"><b>'+c.orders+'</b> orders</span>'+
      '<span class="chip"><b>'+c.comps+'</b> compartments</span>'+
    '</div>'+
    '<div class="unopt"><div class="unopt-t">Reset data</div>'+
      '<div class="unopt-d">Empties your inventory, projects, orders and settings, and leaves the app installed so you can start fresh.</div></div>'+
    '<div class="unopt danger"><div class="unopt-t">Uninstall everything</div>'+
      '<div class="unopt-d">Clears all your data'+(IS_TAURI
        ?', then shows you how to remove the app through Windows.'
        :' <b>and</b> removes every Parts Bin file and the desktop shortcut.')+'</div></div>'+
    '<div class="hint">You\'ll be offered a backup first either way.</div>';
  $("#uninstFoot").innerHTML=
    '<button class="btn-ghost" id="uninstCancel" type="button">Cancel</button>'+
    '<button class="btn-ghost" id="uninstReset" type="button">Reset data</button>'+
    '<button id="uninstAll" type="button" style="background:var(--red);color:#fff">Uninstall everything</button>';
  $("#uninstCancel").onclick=closeUninstall;
  $("#uninstReset").onclick=function(){ pbConfirmStep("reset"); };
  $("#uninstAll").onclick=function(){ pbConfirmStep("full"); };
  $("#uninstallOverlay").classList.add("show");
}
function closeUninstall(){ $("#uninstallOverlay").classList.remove("show"); }

/* Second step: back up first, or go ahead. */
function pbConfirmStep(mode){
  const full=mode==="full";
  $("#uninstTitle").textContent=full?"Uninstall everything":"Reset data";
  $("#uninstBody").innerHTML=
    '<div style="font-size:14px;line-height:1.6">'+
      (full
        ? 'This clears your data and then removes every Parts Bin file from this PC.'
        : 'This empties everything you\'ve stored. The app stays installed.')+
    '</div><div class="hint" style="margin-top:10px"><b>This cannot be undone.</b> Take a backup first if there\'s any chance you\'ll want it back.</div>';
  $("#uninstFoot").innerHTML=
    '<button class="btn-ghost" id="unBack" type="button">Back</button>'+
    '<button class="btn-ghost" id="unBackup" type="button">Back up first</button>'+
    '<button id="unGo" type="button" style="background:var(--red);color:#fff">'+(full?"Uninstall everything":"Reset data")+'</button>';
  $("#unBack").onclick=openUninstall;
  $("#unBackup").onclick=function(){ try{ doBackup(); }catch(e){} setTimeout(function(){ pbDoIt(mode,true); },700); };
  $("#unGo").onclick=function(){ pbDoIt(mode,false); };
}

function pbDoIt(mode,didBackup){
  const full=mode==="full";
  pbWipeData();

  /* The installed desktop app can't (and shouldn't) delete its own program
     files with a downloaded .bat — Windows registers a proper uninstaller
     at install time. So in the Tauri app we clear the data here and point
     the user to Add or Remove Programs. The legacy browser/file build keeps
     the old .bat-generation path, since there it really is just loose files. */
  let handed=false, dir=pbInstallDir();
  if(full && !IS_TAURI) handed=pbDownloadUninstaller();

  $("#uninstTitle").textContent=full?"Almost done":"Data cleared";
  let bodyHtml=
    '<div class="srcheck">'+ic("check")+'</div>'+
    '<div style="font-size:14px;line-height:1.6;text-align:center">'+
      (didBackup?'Your backup was downloaded and all ':'All ')+'Parts Bin data has been cleared from this PC.</div>';
  if(full && IS_TAURI){
    bodyHtml+='<div class="unopt" style="text-align:left;margin-top:16px"><div class="unopt-t">Last step &mdash; remove the app</div>'+
      '<div class="unopt-d">Your data is now gone. To remove the program itself, use Windows: '+
      '<b>Settings &rarr; Apps &rarr; Installed apps &rarr; Parts Bin &rarr; Uninstall</b>.<br>'+
      '<b>Kept:</b> any backup files you saved stay untouched.</div></div>';
  }else if(full){
    bodyHtml+='<div class="unopt" style="text-align:left;margin-top:16px"><div class="unopt-t">What gets removed</div>'+
      '<div class="unopt-d">The app folder, the desktop shortcut, any Start Menu entry, and every trace of your saved data.<br>'+
      '<b>Kept:</b> any backup files already in your Downloads folder.</div></div>'+
      '<div style="margin-top:14px"><label>Last step &mdash; remove the files</label>'+
      (handed
        ? '<div class="hint">An uninstaller called <b>Uninstall Parts Bin.bat</b> just downloaded. Close this window, then run it from your Downloads folder &mdash; it deletes the app folder and the desktop shortcut.</div>'
        : '<div class="hint">Close this window, then run <b>Uninstall Parts Bin.bat</b> inside the app folder.</div>')+
      (dir?'<div class="unpath">'+esc(dir)+'</div>':'')+'</div>';
  }else{
    bodyHtml+='<div class="hint" style="margin-top:14px">The app is still installed and ready to use.</div>';
  }
  $("#uninstBody").innerHTML=bodyHtml;
  $("#uninstFoot").innerHTML='<button class="btn-primary" id="uninstDone" type="button">Done</button>';
  $("#uninstDone").onclick=closeUninstall;
}

/* Settings has a button for each action; the chooser is still used by the
   Back link inside the confirm screens. */
function openReset(){ $("#uninstallOverlay").classList.add("show"); pbConfirmStep("reset"); }
function openFullUninstall(){ $("#uninstallOverlay").classList.add("show"); pbConfirmStep("full"); }
const _sr=$("#setReset"); if(_sr) _sr.onclick=openReset;
$("#setUninstall").onclick=openFullUninstall;
$("#uninstClose").onclick=closeUninstall;
$("#uninstallOverlay").onclick=function(e){ if(e.target===$("#uninstallOverlay")) closeUninstall(); };
