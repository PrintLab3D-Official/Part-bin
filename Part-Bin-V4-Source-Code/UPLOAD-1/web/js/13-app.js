/* =====================================================================
   Parts Bin — App boot: toast, sidebar resize, init sequence, service worker
   ===================================================================== */
let toastT;function toast(m){const t=$("#toast");t.classList.remove("show");void t.offsetWidth;t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2600)}

(function(){const sb=document.querySelector(".sidebar"),rz=$("#sbResize");if(!sb||!rz)return;const sw=+(localStorage.getItem("pb_sidebar")||0);if(sw>=170&&sw<=460)sb.style.width=sw+"px";let st=null;rz.addEventListener("pointerdown",e=>{st={x:e.clientX,w:sb.offsetWidth};try{rz.setPointerCapture(e.pointerId);}catch(_){}document.body.style.userSelect="none";e.preventDefault();});window.addEventListener("pointermove",e=>{if(!st)return;const w=Math.max(170,Math.min(460,st.w+(e.clientX-st.x)));sb.style.width=w+"px";});window.addEventListener("pointerup",()=>{if(st){localStorage.setItem("pb_sidebar",sb.offsetWidth);st=null;document.body.style.userSelect="";}});})();
/* Boot sequence. Each step is isolated so one failing module (a bad saved
   setting, a missing element in a cut-down build) cannot stop the inventory
   from painting. Failures are recorded for the boot guard in js/00-boot.js. */
function pbSafe(name,fn){try{fn();}catch(e){console.error("boot: "+name,e);try{(window.__pbErrors||[]).push("boot "+name+": "+(e&&e.message||e));}catch(_){}}}
pbSafe("labels",()=>{labelSize=state.settings.labelSize||"md";wireSizeSeg("lblSizeSingle");wireSizeSeg("lblSizeSheet");syncSizeSeg();});
pbSafe("style",applyStyle);pbSafe("font",applyFont);pbSafe("theme",applyTheme);pbSafe("density",applyDensity);pbSafe("listview",applyListView);pbSafe("fittabs",applyFitTabs);
pbSafe("greeting",setGreeting);pbSafe("partIds",ensurePartIds);pbSafe("migrate",migrate);
pbSafe("render",render);window.__pbRendered=true;
pbSafe("lock",showLock);
/* Live clock + auto-receive now live in js/14-live.js (single heartbeat). */


/* ---------- PWA service worker (web build only) ----------
   The desktop app runs on http://tauri.localhost, so a service worker WOULD
   register and then serve stale cached files after every update. So: only
   register it in a real browser, and in the desktop app actively tear down
   any service worker + cache that a previous version left behind. */
if(window.__TAURI__){
  if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});}
  if(window.caches&&caches.keys){caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{});}
}else if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
}
