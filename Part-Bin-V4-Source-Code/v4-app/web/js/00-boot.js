/* =====================================================================
   Parts Bin — Boot guard (loaded before everything else)
   ---------------------------------------------------------------------
   Why this exists: the desktop window is created hidden and only shown
   once the page has painted (see src-tauri/src/lib.rs `app_ready`). If a
   script throws before the first render, or the page never gets that far,
   the user must never be left with a blank window and no way out. So:

     • every uncaught error / rejected promise is recorded here
     • the boot line in js/13-app.js sets window.__pbRendered after render()
     • on window load (or after 5 s, whichever first): rendered → tell the
       shell to show the window; not rendered → paint a plain-HTML recovery
       screen with the error text, Reload and Open data folder buttons, and
       show the window anyway.

   Deliberately dependency-free: no $(), no ic(), no state — those may be
   the very things that failed.
   ===================================================================== */
(function(){
  var errs=[], done=false, timer=null;
  window.__pbErrors=errs;
  window.__pbRendered=false;

  function record(kind,msg,src,line){
    try{ errs.push(kind+": "+String(msg||"unknown error")+(src?"  ("+String(src).split("/").pop()+(line?":"+line:"")+")":"")); }catch(_){}
    /* After a successful boot a late failure is still worth seeing. */
    if(done&&window.__pbRendered){ try{ if(typeof toast==="function")toast("Something went wrong: "+String(msg||"").slice(0,120)); }catch(_){} }
  }
  window.addEventListener("error",function(e){
    record("Error",(e&&e.message)||(e&&e.error&&e.error.message)||e,e&&e.filename,e&&e.lineno);
  });
  window.addEventListener("unhandledrejection",function(e){
    var r=e&&e.reason; record("Unhandled promise",(r&&r.message)||r);
  });

  function inv(){ try{ return window.__TAURI__&&window.__TAURI__.core&&window.__TAURI__.core.invoke; }catch(_){ return null; } }

  function showWindow(){ var i=inv(); if(i){ try{ i("app_ready"); }catch(_){} } }

  function recovery(){
    var html='<div id="pbRecover" style="position:fixed;inset:0;z-index:2147483647;background:#0d1117;color:#e6edf3;font:15px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px">'+
      '<div style="max-width:560px;width:100%;background:#161b22;border:1px solid #2a3140;border-radius:16px;padding:26px 28px">'+
      '<div style="font-size:22px;font-weight:800;margin-bottom:6px">Parts Bin could not start</div>'+
      '<div style="color:#8b97a7;margin-bottom:14px">Your data is untouched. Reloading usually fixes this. If it keeps happening, copy the details below and send them to us from the support page.</div>'+
      '<pre id="pbRecoverErr" style="white-space:pre-wrap;word-break:break-word;background:#0d1117;border:1px solid #2a3140;border-radius:10px;padding:12px;font:12.5px/1.5 Consolas,monospace;color:#f0a0a0;max-height:220px;overflow:auto;margin:0 0 16px"></pre>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
      '<button id="pbRecoverReload" style="background:#3b82f6;color:#fff;border:0;border-radius:10px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer">Reload</button>'+
      '<button id="pbRecoverData" style="background:#1c2230;color:#e6edf3;border:1px solid #2a3140;border-radius:10px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer">Open data folder</button>'+
      '<button id="pbRecoverCopy" style="background:#1c2230;color:#e6edf3;border:1px solid #2a3140;border-radius:10px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer">Copy details</button>'+
      '</div></div></div>';
    try{
      var box=document.createElement("div"); box.innerHTML=html;
      (document.body||document.documentElement).appendChild(box.firstChild);
      var txt=errs.length?errs.join("\n"):"The page loaded but nothing was drawn within 5 seconds (no error was reported).";
      document.getElementById("pbRecoverErr").textContent=txt;
      document.getElementById("pbRecoverReload").onclick=function(){ location.reload(); };
      document.getElementById("pbRecoverData").onclick=function(){
        var i=inv();
        if(i){ i("open_data_dir").then(function(p){ alert("Data folder:\n"+p); }).catch(function(){ alert("Data folder: %LOCALAPPDATA%\\com.printlab3d.partsbin"); }); }
        else alert("In the desktop app the data lives in %LOCALAPPDATA%\\com.printlab3d.partsbin. In a browser it is this site's local storage.");
      };
      document.getElementById("pbRecoverCopy").onclick=function(){
        try{ navigator.clipboard.writeText(txt); }catch(_){}
      };
    }catch(_){}
  }

  function finish(){
    if(done)return; done=true; clearTimeout(timer);
    if(!window.__pbRendered)recovery();
    showWindow();
  }
  /* Give the boot line a frame to paint after load, then decide. */
  window.addEventListener("load",function(){ setTimeout(finish,60); });
  timer=setTimeout(finish,5000);
  window.__pbBootFinish=finish;
})();
