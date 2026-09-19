/* =====================================================================
   Parts Bin — In-app notification centre
   ---------------------------------------------------------------------
   Windows toasts can't work from a local file (the browser refuses
   notification permission for file:// pages), so these are drawn by the
   app itself. They stack in the corner, colour-code by importance, and
   can play a chime.

   Anything raised while the app is locked is QUEUED and shown right
   after the PIN is entered, so nothing is missed on open.

   All of it is opt-out via Settings -> Notifications.
   ===================================================================== */
const NOTIFY_EVENTS=[
  {key:"orders",   label:"An order arrives or is auto-received"},
  {key:"projects", label:"A project is completed"},
  {key:"low",      label:"An item drops to low stock"},
  {key:"out",      label:"An item goes out of stock"},
  {key:"cal",      label:"A calendar event comes up, or tasks are scheduled for today"}
];
const NOTIFY_TONE={ok:"ok",low:"warn",out:"bad"};

function notifyCfg(){ return (state.settings && state.settings.notify) || {}; }
/* Master switch defaults ON; each event defaults ON unless turned off. */
function notifyOn(){ const n=notifyCfg(); return n.on!==false; }
function autoHideOn(){ const n=notifyCfg(); return notifyOn() && n.autohide===true; }
function notifyWants(key){ const n=notifyCfg(); return notifyOn() && n[key]!==false; }
function soundOn(){ const n=notifyCfg(); return notifyOn() && n.sound!==false; }
function osNotifyOn(){ const n=notifyCfg(); return notifyOn() && n.os!==false; }
/* A real Windows notification through the shell (desktop app only). Sent for
   calendar events/tasks always, and for anything else when the window isn't
   the one you're looking at — the in-app banner covers the focused case. */
function pbOsNotify(title,msg){
  try{
    const N=window.__TAURI__&&window.__TAURI__.notification; if(!N||!osNotifyOn()) return;
    const send=()=>{ try{ N.sendNotification({title:"Parts Bin: "+title,body:msg||""}); }catch(e){} };
    N.isPermissionGranted().then(ok=>{ if(ok) return true; return N.requestPermission().then(p=>p==="granted"); }).then(ok=>{ if(ok) send(); }).catch(()=>{});
  }catch(e){}
}
function appLocked(){ const l=$("#lockScreen"); return !!(l && l.classList.contains("show")); }
/* Don't interrupt the What's New tour - queue until it closes. */
function pbTourOpen(){ const t=document.getElementById("wnOverlay"); return !!(t && t.classList.contains("show")); }
function pbBusy(){ return appLocked() || pbTourOpen(); }

/* ---------- chime (synthesised, no audio files needed) ----------
   Browsers start an AudioContext SUSPENDED until the user interacts with
   the page, and a suspended context plays nothing. So we keep ONE shared
   context, unlock it on the first click/keypress, and resume it before
   every chime. (Creating a fresh context per sound was the bug: the ones
   made before any interaction were born suspended and stayed silent.) */
let pbAC=null, pbAudioUnlocked=false, pbChimeWaiting=null;
function pbAudio(){
  try{
    if(!pbAC){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) return null;
      pbAC=new AC();
    }
    if(pbAC.state==="suspended"){ try{ pbAC.resume(); }catch(e){} }
    return pbAC;
  }catch(e){ return null; }
}
/* Unlock audio on the first real interaction anywhere in the app. */
["pointerdown","click","keydown"].forEach(function(ev){
  document.addEventListener(ev,function once(){
    pbAudioUnlocked=true; pbAudio();
    /* A chime we weren't allowed to play yet: play it now, but only if
       the alert is still on screen, so it can't ambush you out of context. */
    if(pbChimeWaiting && pbNotes.length){
      const t=pbChimeWaiting; pbChimeWaiting=null;
      setTimeout(function(){ pbSound(t); },90);
    } else { pbChimeWaiting=null; }
    document.removeEventListener(ev,once,true);
  },true);
});

function pbSound(tone){
  if(!soundOn()) return;
  /* Before the first click/keypress the browser forbids audio. Skip
     silently rather than queueing it, otherwise the chime ambushes you
     later, the moment you happen to click something. */
  if(!pbAudioUnlocked){ pbChimeWaiting=tone; return; }
  const ctx=pbAudio(); if(!ctx) return;
  const play=function(){
    try{
      const t0=ctx.currentTime;
      const pairs = tone==="bad"  ? [[494,0],[370,0.15]]
                  : tone==="warn" ? [[587,0],[494,0.14]]
                  : tone==="nav"  ? [[392,0]]                /* low, soft page-turn ding */
                  :                 [[784,0],[1046.5,0.13]];
      const peak = tone==="nav" ? 0.09 : 0.18;
      pairs.forEach(function(p){
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.type="sine"; o.frequency.value=p[0];
        const s=t0+p[1];
        g.gain.setValueAtTime(0.0001,s);
        g.gain.linearRampToValueAtTime(peak,s+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001,s+0.40);
        o.connect(g); g.connect(ctx.destination);
        o.start(s); o.stop(s+0.42);
      });
    }catch(e){}
  };
  /* If it was suspended, resume() is async - wait for it before playing. */
  if(ctx.state==="suspended" && ctx.resume){
    try{ ctx.resume().then(play).catch(play); }catch(e){ play(); }
  } else play();
}

/* ---------- the banners ----------
   They now STAY until dismissed (they used to vanish after 5s, which is
   how alerts were being missed on startup). Up to 3 show at once; any
   more collapse behind a "Show all" button. Each has an X on hover. */
let pbNotes=[], pbNoteSeq=0, pbNotesExpanded=false, pbPending=[], pbLastSound=0;
const pbSeen=new Set();
let pbTestIdx=0;
const PB_NOTE_MAX=25;

function pbNotifyStack(){
  let s=document.getElementById("pbNotifyStack");
  if(!s){ s=document.createElement("div"); s.id="pbNotifyStack"; s.className="pbnstack"; document.body.appendChild(s); }
  return s;
}
function renderNotifyStack(){
  const s=pbNotifyStack();
  if(!pbNotes.length){ s.innerHTML=""; return; }
  const shown = pbNotesExpanded ? pbNotes : pbNotes.slice(0,3);
  let h = shown.map(function(n){
    return '<div class="pbnotif tone-'+n.tone+(pbSeen.has(n.id)?' show':'')+'" data-note="'+n.id+'">'+
      '<div class="ic">'+ic(n.tone==="ok"?"check":"warn")+'</div>'+
      '<div class="tx"><div class="t">'+esc(n.title)+'</div>'+
      (n.msg?'<div class="m">'+esc(n.msg)+'</div>':'')+'</div>'+
      '<button class="pbx" data-close="'+n.id+'" title="Dismiss">'+ic("x")+'</button></div>';
  }).join("");
  if(pbNotes.length>1){
    h+='<div class="pbnbar">'+
       (pbNotes.length>3?'<button class="pbnbtn" id="pbToggleNotes">'+
          (pbNotesExpanded?"Show less":"Show all ("+pbNotes.length+")")+'</button>':'')+
       '<button class="pbnbtn ghost" id="pbClearNotes">Clear all</button></div>';
  }
  s.innerHTML=h;
  /* Slide new ones in. Reading offsetWidth forces the browser to compute
     the off-screen starting position FIRST, otherwise it batches both
     states together and the transition is skipped (they just appear). */
  shown.forEach(function(n){
    if(!pbSeen.has(n.id)){
      pbSeen.add(n.id);
      const el=s.querySelector('[data-note="'+n.id+'"]');
      if(el){ void el.offsetWidth; el.classList.add("show"); }
    }
  });
  s.querySelectorAll("[data-close]").forEach(function(b){
    b.onclick=function(e){ e.stopPropagation(); pbDismissNote(+b.dataset.close); };
  });
  const t=s.querySelector("#pbToggleNotes");
  if(t) t.onclick=function(){ pbNotesExpanded=!pbNotesExpanded; renderNotifyStack(); };
  const c=s.querySelector("#pbClearNotes");
  if(c) c.onclick=function(){ pbNotes=[]; pbNotesExpanded=false; renderNotifyStack(); };
}
/* Slide it back out to the right, then drop it. */
function pbFadeOut(id){
  const st=document.getElementById("pbNotifyStack");
  const el=st?st.querySelector('[data-note="'+id+'"]'):null;
  if(el){ el.classList.remove("show"); setTimeout(function(){ pbDismissNote(id); },380); }
  else pbDismissNote(id);
}
function pbDismissNote(id){
  pbNotes=pbNotes.filter(function(n){ return n.id!==id; });
  if(pbNotes.length<=3) pbNotesExpanded=false;
  renderNotifyStack();
}
function pbShowNotify(tone,title,msg){
  try{
    pbNotes.unshift({id:++pbNoteSeq,tone:tone||"ok",title:title,msg:msg||""});
    if(pbNotes.length>PB_NOTE_MAX) pbNotes.length=PB_NOTE_MAX;
    const id=pbNotes[0].id;
    renderNotifyStack();
    const now=Date.now();
    if(now-pbLastSound>700){ pbLastSound=now; pbSound(tone); }
    if(autoHideOn()) setTimeout(function(){ pbFadeOut(id); },3000);
  }catch(e){}
}

/* ---------- queue: hold anything raised behind the lock screen ---------- */
function pbQueueNotify(key,tone,title,msg){
  if(!notifyWants(key)) return;
  if(key==="cal"||!document.hasFocus()) pbOsNotify(title,msg);
  if(pbBusy()){ pbPending.push({tone:tone,title:title,msg:msg}); return; }
  pbShowNotify(tone,title,msg);
}
function pbFlushNotifications(){
  if(pbBusy() || !pbPending.length) return;
  const q=pbPending.slice(); pbPending=[];
  q.forEach(function(n){ pbShowNotify(n.tone,n.title,n.msg); });
}

/* ---------- stock watch: fire once per item as it crosses a line ---------- */
const pbLowSeen=new Set(), pbOutSeen=new Set();
function checkStockAlerts(){
  (state.items||[]).forEach(function(it){
    if(!it) return;
    const out=Number(it.qty)===0;
    const low=!out && typeof isLow==="function" && isLow(it);
    if(out){
      if(!pbOutSeen.has(it.id)){ pbOutSeen.add(it.id);
        pbQueueNotify("out","bad","Out of stock: "+it.name, it.partId||""); }
    }else{ pbOutSeen.delete(it.id); }
    if(low){
      if(!pbLowSeen.has(it.id)){ pbLowSeen.add(it.id);
        pbQueueNotify("low","warn","Low stock: "+it.name, "Only "+it.qty+" left"+(it.partId?" ("+it.partId+")":"")); }
    }else{ pbLowSeen.delete(it.id); }
  });
}

/* ---------- Settings UI ---------- */
function renderNotify(){
  const box=$("#notifyEvents"); if(!box) return;
  const n=notifyCfg();
  const master=$("#setNotify"); if(master) master.checked=notifyOn();
  const snd=$("#setNotifySound"); if(snd){ snd.checked=soundOn(); snd.disabled=!notifyOn(); }
  const ah=$("#setNotifyAuto"); if(ah){ ah.checked=autoHideOn(); ah.disabled=!notifyOn(); }
  const os=$("#setNotifyOs"); if(os){ os.checked=osNotifyOn(); os.disabled=!notifyOn(); os.closest("label").style.display=(window.__TAURI__&&window.__TAURI__.notification)?"":"none"; }
  box.innerHTML=NOTIFY_EVENTS.map(function(e){
    return '<label class="ckrow"><input type="checkbox" class="nev" data-nev="'+e.key+'"'+
           (n[e.key]!==false?" checked":"")+(notifyOn()?"":" disabled")+'> <span>'+esc(e.label)+'</span></label>';
  }).join("");
  box.querySelectorAll(".nev").forEach(function(c){
    c.onchange=function(){
      state.settings.notify=state.settings.notify||{};
      state.settings.notify[c.dataset.nev]=c.checked; persist();
    };
  });
}
function testNotification(){
  /* Cycle good -> low -> out, so clicking three times demos all three tones. */
  const seq=[["ok","Test notification","Success tone \u2014 orders & projects"],
             ["warn","Test: low stock","Caution tone \u2014 running low"],
             ["bad","Test: out of stock","Alert tone \u2014 nothing left"]];
  const t=seq[pbTestIdx % seq.length]; pbTestIdx++;
  pbLastSound=0; /* a deliberate click should always chime */
  pbShowNotify(t[0],t[1],t[2]);
}


$("#setNotify").onchange=function(){
  state.settings.notify=state.settings.notify||{};
  state.settings.notify.on=$("#setNotify").checked;
  persist(); renderNotify();
  if(state.settings.notify.on) pbShowNotify("ok","Notifications on","You'll be told about orders, projects and stock.");
};
const _ns=$("#setNotifySound");
if(_ns) _ns.onchange=function(){
  state.settings.notify=state.settings.notify||{};
  state.settings.notify.sound=_ns.checked; persist();
  if(_ns.checked) pbSound("ok");
};
const _nt=$("#notifyTest"); if(_nt) _nt.onclick=testNotification;

/* On open: let the app settle for ~3s, then slide the alerts in.
   If the PIN lock is up they stay queued until it's unlocked. */
setTimeout(function(){
  try{ checkStockAlerts(); }catch(e){}
  pbFlushNotifications();
},3000);
const _no=$("#setNotifyOs");
if(_no) _no.onchange=function(){
  state.settings.notify=state.settings.notify||{};
  state.settings.notify.os=_no.checked; persist();
  if(_no.checked) pbOsNotify("Windows notifications on","You'll get these even when Parts Bin is minimised.");
};
const _na=$("#setNotifyAuto");
if(_na) _na.onchange=function(){
  state.settings.notify=state.settings.notify||{};
  state.settings.notify.autohide=_na.checked; persist();
};
