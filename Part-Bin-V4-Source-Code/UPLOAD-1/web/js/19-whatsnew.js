/* =====================================================================
   Parts Bin — What's New (V4 tour)
   ---------------------------------------------------------------------
   Opens instantly, once per version, and is re-openable from Settings.
   Each slide has its own animated art; the final slide asks you to drag
   a slider to finish. Notifications hold until it ends.

   TO ADD A SLIDE: append to WHATSNEW.slides and bump WHATSNEW.version.
   ===================================================================== */
const WHATSNEW={
  version:"4.1",
  slides:[
    { key:"hero", title:"Parts Bin V4",
      body:"The big one: Parts Bin is now a proper desktop app — its own window, its own icon, its own private storage. It starts faster, feels native, and everything you already had is right where you left it." },

    { key:"ai", title:"An AI that actually helps",
      body:"Open the Assistant and chat about your parts — “what can I build right now?”, “what am I low on?”. It can also DO things: create or edit items and projects, add checklist steps, and remember facts about you — each change is one tap to Apply (or auto-apply), and always undoable. It can even read replies aloud. Bring your own key (Anthropic, OpenAI, Gemini) or run it locally with Ollama — stored only on your PC." },

    { key:"polish", title:"Powerful new tools",
      body:"Import a BOM (.xlsx or .csv) straight into your library — or into an Order so parts are added only when it arrives. A built-in Calculator does maths and live currency conversion in a floating window. And a Daily tasks planner (the ☑ button up top) helps you plan your day." },

    { key:"yours", title:"Make it yours",
      body:"Add your own sidebar tabs (with images), or hide the built-in ones you don't use. Settings is now organised into tabs. There are nine full style presets and a compact list view with a green one-click reorder button. Order parts, tweak everything, your way." },

    { key:"safety", title:"Your data, safe and portable",
      body:"Everything saves automatically on this PC, in the app's own private storage — it survives restarts and updates. Every save also writes a hidden recovery snapshot that restores itself if anything ever goes wrong.",
      note:"Use Settings → Data & backup → Backup to file to move your inventory to another PC or keep a spare copy. Drag the slider to finish.",
      gate:"slider" }
  ]
};

/* Palettes kept for the legacy style-cycle preview (unused by the V4 slides,
   but harmless to leave — a future slide can set gate:"styles" to reuse it). */
const WN_PALETTES=[
  {k:"main", n:"Main",       bg:"#0d1117", bg2:"#161b22", line:"#2a3140", txt:"#e6edf3", ac:"#3b82f6"},
  {k:"claude", n:"Warm Paper", bg:"#f4efe6", bg2:"#fffdf9", line:"#e6ddcb", txt:"#2b2620", ac:"#c96442"},
  {k:"shopify", n:"Commerce",   bg:"#f1f2f4", bg2:"#ffffff", line:"#dfe3e8", txt:"#202223", ac:"#008060"},
  {k:"terminal", n:"Terminal",   bg:"#050805", bg2:"#0b110b", line:"#1e2b1e", txt:"#b9f5b9", ac:"#39ff14"},
  {k:"blueprint", n:"Blueprint",  bg:"#0a2144", bg2:"#0e2c58", line:"#2f66a8", txt:"#e6f0fb", ac:"#4cc9f0"},
  {k:"aurora", n:"Aurora",     bg:"linear-gradient(125deg,#6d28d9,#9d174d,#1e3a8a)", bg2:"rgba(255,255,255,.14)", line:"rgba(255,255,255,.3)", txt:"#f6f2ff", ac:"#f472b6"},
  {k:"neo", n:"Neo Brutal", bg:"#ffdd00", bg2:"#ffffff", line:"#111111", txt:"#111111", ac:"#ff5c00"}
];

let wnIdx=0, wnTimer=null, wnGateOpen=true, wnPrevStyle=null;

/* A small mock of the app, recoloured to preview each style. */
function wnMockHTML(){
  return '<div class="wn-mock" id="wnMock">'+
           '<div class="wm-side"><div class="wm-logo"></div>'+
             '<div class="wm-nav on"></div><div class="wm-nav"></div><div class="wm-nav"></div><div class="wm-nav"></div>'+
           '</div>'+
           '<div class="wm-main"><div class="wm-h"></div>'+
             '<div class="wm-stats"><i></i><i></i><i></i></div>'+
             '<div class="wm-cards"><i></i><i></i><i></i></div>'+
           '</div>'+
         '</div><div class="wn-mocklabel" id="wnMockLabel"></div>';
}
function wnPaintMock(p){
  const m=document.getElementById("wnMock"); if(!m) return;
  m.style.background=p.bg;
  m.style.setProperty("--wm-bg2",p.bg2);
  m.style.setProperty("--wm-line",p.line);
  m.style.setProperty("--wm-txt",p.txt);
  m.style.setProperty("--wm-ac",p.ac);
  const l=document.getElementById("wnMockLabel");
  if(l){ l.textContent=p.n; l.classList.remove("pop"); void l.offsetWidth; l.classList.add("pop"); }
}
/* Restore the user's real style after the preview. Only the DOM attribute
   is touched - state.settings.style is never written, so nothing persists. */
function wnRestoreStyle(){
  if(wnPrevStyle===null) return;
  document.body.setAttribute("data-style",wnPrevStyle);
  wnPrevStyle=null;
}
function wnApplyPreview(p){
  document.body.setAttribute("data-style",p.k);
  wnPaintMock(p);
}
function wnStartCycle(){
  let i=0;
  wnPrevStyle=(state.settings&&state.settings.style)||"main";
  wnGateOpen=false; wnSyncNext();
  wnApplyPreview(WN_PALETTES[0]);
  clearInterval(wnTimer);
  wnTimer=setInterval(function(){
    i++;
    if(i>=WN_PALETTES.length){
      clearInterval(wnTimer); wnTimer=null;
      wnRestoreStyle();                 /* back to normal */
      wnGateOpen=true; wnSyncNext();
      return;
    }
    wnApplyPreview(WN_PALETTES[i]);
  },780);
}

/* ---------- per-slide animated art (all CSS-driven, see base.css) ---------- */
function wnArt(s){
  if(s.key==="hero") return '<div class="v4-window">'+
      '<div class="v4-titlebar"><span class="v4-dot r"></span><span class="v4-dot y"></span><span class="v4-dot g"></span>'+
        '<span class="v4-tt">Parts Bin</span></div>'+
      '<div class="v4-winbody">'+
        '<div class="v4-side"><i class="on"></i><i></i><i></i><i></i></div>'+
        '<div class="v4-content"><span class="v4-bar"></span>'+
          '<div class="v4-cards"><b></b><b></b><b></b></div></div>'+
      '</div></div>';
  if(s.key==="ai") return '<div class="v4-aiorb"><span class="v4-ring"></span><span class="v4-ring r2"></span>'+
      '<span class="v4-orb">'+ic("sparkle")+'</span></div>';
  if(s.key==="update") return '<div class="v4-upd">'+
      '<div class="v4-vrow"><span class="v4-badge old">v3</span>'+
        '<span class="v4-uparrow">'+ic("chev")+'</span>'+
        '<span class="v4-badge new">v4</span></div>'+
      '<div class="v4-progress"><i></i></div>'+
      '<div class="v4-updlabel">Downloading update…</div></div>';
  if(s.key==="polish") return '<div class="v4-polish">'+
      '<div class="v4-pchip"><span class="v4-pdot"></span>Import BOMs — .xlsx &amp; .csv</div>'+
      '<div class="v4-pchip"><span class="v4-pdot"></span>Calculator + live currency</div>'+
      '<div class="v4-pchip"><span class="v4-pdot"></span>Daily tasks planner</div></div>';
  if(s.key==="yours") return '<div class="v4-polish">'+
      '<div class="v4-pchip"><span class="v4-pdot"></span>Custom &amp; hideable tabs</div>'+
      '<div class="v4-pchip"><span class="v4-pdot"></span>Nine style presets</div>'+
      '<div class="v4-pchip"><span class="v4-pdot"></span>Compact list + quick reorder</div></div>';
  if(s.key==="safety") return '<div class="wn-safe"><div class="wn-shield">'+ic("check")+'</div>'+
      '<div class="wn-sbars"><i></i><i></i><i></i></div></div>';
  return "";
}

function wnSyncNext(){
  const btn=$("#wnNext"); if(!btn) return;
  const last=wnIdx===WHATSNEW.slides.length-1;
  btn.disabled=!wnGateOpen;
  btn.style.display=(last&&WHATSNEW.slides[wnIdx].gate==="slider")?"none":"inline-flex";
  const hint=$("#wnHint");
  if(hint) hint.textContent = wnGateOpen ? "" : "Previewing every style…";
}

function wnRender(){
  const s=WHATSNEW.slides[wnIdx], last=wnIdx===WHATSNEW.slides.length-1;
  clearInterval(wnTimer); wnTimer=null;
  wnRestoreStyle();
  const body=$("#wnBody");
  body.innerHTML='<div class="wn-slide"><div class="wn-art">'+wnArt(s)+'</div>'+
    '<h3 class="wn-title">'+esc(s.title)+'</h3>'+
    '<p class="wn-text">'+esc(s.body)+'</p>'+
    (s.warn?'<p class="wn-warn">'+esc(s.warn)+'</p>':'')+
    (s.note?'<p class="wn-note-sm">'+esc(s.note)+'</p>':'')+
    (s.gate==="slider"?'<div class="wn-slider"><input type="range" id="wnSlider" min="0" max="100" value="0" aria-label="Slide to finish"><span class="wn-slabel" id="wnSlabel">Slide to finish →</span></div>':'')+
    '</div>';
  const el=body.querySelector(".wn-slide");
  if(el){ void el.offsetWidth; el.classList.add("in"); }

  $("#wnDots").innerHTML=WHATSNEW.slides.map(function(_,i){
    return '<i class="'+(i===wnIdx?"on":(i<wnIdx?"done":""))+'"></i>'; }).join("");
  $("#wnBack").style.visibility = wnIdx===0 ? "hidden" : "visible";
  $("#wnStep").textContent=(wnIdx+1)+" of "+WHATSNEW.slides.length;

  wnGateOpen = s.gate!=="styles";
  wnSyncNext();
  if(s.gate==="styles") wnStartCycle();

  const sl=$("#wnSlider");
  if(sl){
    sl.oninput=function(){
      const v=+sl.value;
      const lab=$("#wnSlabel");
      if(lab) lab.style.opacity=String(Math.max(0,1-v/60));
      if(v>=98){ sl.disabled=true; closeWhatsNew(); }
    };
    sl.onchange=function(){ if(+sl.value<98) sl.value=0; };
    sl.onpointerup=function(){ if(+sl.value<98){ sl.value=0; const lab=$("#wnSlabel"); if(lab) lab.style.opacity="1"; } };
  }
}

function openWhatsNew(){ wnIdx=0; $("#wnOverlay").classList.add("show"); wnRender(); }
function closeWhatsNew(){
  clearInterval(wnTimer); wnTimer=null;
  wnRestoreStyle();
  $("#wnOverlay").classList.remove("show");
  try{ state.settings.seenVersion=WHATSNEW.version; persist(); }catch(e){}
  /* Brand-new install (no inventory yet): show the welcome/onboarding screen
     instead of the "back up your data" nudge — there's nothing to back up. */
  var firstTime = (typeof pbHasData==="function") && !pbHasData();
  if(firstTime && typeof openWelcome==="function"){ openWelcome(); }
  else { wnMaybeBackupPrompt(); }
  /* alerts were held back during the tour - let them through now */
  try{ pbFlushNotifications(); }catch(e){}
}
function wnNext(){
  if(!wnGateOpen) return;
  try{ pbSound("nav"); }catch(e){}
  if(wnIdx>=WHATSNEW.slides.length-1){ closeWhatsNew(); return; }
  wnIdx++; wnRender();
}
function wnBack(){ if(wnIdx>0){ try{ pbSound("nav"); }catch(e){} wnIdx--; wnRender(); } }

$("#wnNext").onclick=wnNext;
$("#wnBack").onclick=wnBack;
$("#wnClose").onclick=closeWhatsNew;
const _wb=$("#setWhatsNew"); if(_wb) _wb.onclick=openWhatsNew;

/* Show the tour once per version. If the PIN lock is up we can't show it
   yet, so this is called again the moment the app is unlocked - otherwise
   anyone using the app lock would never see the update notes at all. */
let wnAutoDone=false;
function wnMaybeAutoOpen(){
  try{
    if(wnAutoDone) return;
    if(appLocked()) return;              /* try again after unlock */
    /* Brand-new install: onboarding (new here / from V3) comes first and
       calls back here when it finishes. */
    if(typeof pbNeedsOnboarding==="function"&&pbNeedsOnboarding()){
      if(!$("#onboardOverlay").classList.contains("show"))openOnboarding();
      return;
    }
    if(state.settings.seenVersion===WHATSNEW.version) return;
    wnAutoDone=true;
    openWhatsNew();
  }catch(e){}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wnMaybeAutoOpen);else wnMaybeAutoOpen();   /* after every module has loaded */

/* ---------- post-update nudge: back up your old data ---------- */
function wnMaybeBackupPrompt(){
  try{
    if(state.settings.backupPrompted===WHATSNEW.version) return;
    setTimeout(function(){ $("#wnBackupOverlay").classList.add("show"); },420);
  }catch(e){}
}
function wnCloseBackup(){
  $("#wnBackupOverlay").classList.remove("show");
  try{ state.settings.backupPrompted=WHATSNEW.version; persist(); }catch(e){}
}
const _bkNow=$("#wnBackupNow");
if(_bkNow) _bkNow.onclick=function(){
  try{ doBackup(); }catch(e){}
  wnCloseBackup();
};
const _bkLater=$("#wnBackupLater"); if(_bkLater) _bkLater.onclick=wnCloseBackup;
