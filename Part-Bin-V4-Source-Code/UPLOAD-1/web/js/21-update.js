/* =====================================================================
   Parts Bin — Updates: opens the GitHub Releases page to grab the latest.
   (Automatic in-app updating isn't published yet — see the project notes.)
   ===================================================================== */
const PB_RELEASES_URL="https://github.com/PrintLab3D-offical/Part-bin/releases";
function checkForUpdates(){
  const status=$("#updateStatus");
  const op=window.__TAURI__&&window.__TAURI__.opener;
  try{
    if(op&&op.openUrl)op.openUrl(PB_RELEASES_URL);
    else window.open(PB_RELEASES_URL,"_blank");
    if(status)status.textContent="Opened the Releases page — download the latest installer there.";
  }catch(e){
    if(status)status.textContent="Couldn't open the link. Visit "+PB_RELEASES_URL;
  }
}
(function(){const _u=$("#setCheckUpdate");if(_u)_u.onclick=()=>checkForUpdates(true);})();
/* Version shown in Settings → Updates. One source of truth: the shell reads it
   from tauri.conf.json at build time (Tauri's app.getVersion), so it can never
   drift from the installer. Outside the desktop app there is no version to show. */
(function(){
  const el=$("#appVersion");if(!el)return;
  const api=window.__TAURI__&&window.__TAURI__.app;
  const sub=$("#subhead");
  if(api&&api.getVersion){api.getVersion().then(v=>{el.textContent="Parts Bin V"+v;if(sub)sub.textContent="Parts Bin V"+v;}).catch(()=>{el.textContent="Parts Bin (version unavailable)";if(sub)sub.textContent="Parts Bin V4";});}
  else{el.textContent="Parts Bin (browser build, no version number)";if(sub)sub.textContent="Parts Bin V4";}
})();
