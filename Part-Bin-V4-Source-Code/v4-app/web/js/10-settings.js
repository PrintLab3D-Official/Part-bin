/* =====================================================================
   Parts Bin — Settings: theme, accent, font, PIN lock, materials/locations
   ===================================================================== */
/* ---------- settings ---------- */
let setBuf=null,setDirty=false;
function openSettings(){setBuf={currency:state.settings.currency||"$",defLow:state.settings.defLow||0,materials:state.materials.slice(),locations:state.locations.slice()};setDirty=false;$("#setCurrency").value=setBuf.currency;$("#setLow").value=setBuf.defLow;$("#setName").value=state.settings.name||"";$("#setGreet").value=state.settings.greetCustom||"";$("#setAuto").checked=!!state.settings.autoArchive;$("#setAutoReceive").checked=!!state.settings.autoReceive;$("#setConfetti").checked=state.settings.confetti!==false;$("#setPin").value=state.settings.pin||"";$("#setLockOn").checked=!!state.settings.lockOn;$("#setFitTabs").checked=!!state.settings.autoFitTabs;$("#setAccent").value=state.settings.accent||themeAc();if($("#setCurCode")){$("#setCurCode").value=state.settings.curCode||"USD";$("#setBomCur").value=state.settings.bomCur||"USD";}renderStyles();renderFonts();renderDensity();renderListView();renderManage();try{renderNotify();}catch(e){}updateBanner();applyTheme();setShowPane("general");$("#settingsOverlay").classList.add("show");}
/* Discord-style settings: show one pane, highlight its nav item. */
function setShowPane(key){
  document.querySelectorAll("#settingsOverlay .set-pane").forEach(p=>p.hidden=(p.dataset.pane!==key));
  document.querySelectorAll("#settingsOverlay .set-navitem").forEach(b=>b.classList.toggle("on",b.dataset.pane===key));
  const sp=$("#setPanes");if(sp)sp.scrollTop=0;
}
document.querySelectorAll("#settingsOverlay .set-navitem").forEach(b=>b.onclick=()=>setShowPane(b.dataset.pane));
function updateBanner(){$("#setBanner").classList.toggle("show",setDirty);}
function markDirty(){setDirty=true;updateBanner();}
function renderManage(){
  $("#matList").innerHTML=setBuf.materials.map((m,i)=>`<div class="listrow">${esc(m)}<button data-m="${i}">✕</button></div>`).join("")||'<div class="sub">None yet</div>';
  $("#locList").innerHTML=setBuf.locations.map((l,i)=>`<div class="listrow">${esc(l)}<button data-l="${i}">✕</button></div>`).join("")||'<div class="sub">None yet</div>';
  $("#matList").querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{setBuf.materials.splice(+b.dataset.m,1);markDirty();renderManage();});
  $("#locList").querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{setBuf.locations.splice(+b.dataset.l,1);markDirty();renderManage();});
}
function saveSettings(){state.settings.currency=setBuf.currency||"$";state.settings.defLow=Math.max(0,Number(setBuf.defLow)||0);state.materials=setBuf.materials;state.locations=setBuf.locations;persist();render();setDirty=false;updateBanner();$("#settingsOverlay").classList.remove("show");toast("Settings saved");}
function closeSettings(){if(setDirty&&!confirm("Discard unsaved changes?"))return;setDirty=false;updateBanner();$("#settingsOverlay").classList.remove("show");}
$("#settingsBtn").onclick=openSettings;
$("#settingsClose").onclick=closeSettings;
$("#settingsOverlay").onclick=e=>{if(e.target===$("#settingsOverlay"))closeSettings()};
$("#setCurrency").oninput=()=>{setBuf.currency=$("#setCurrency").value||"$";markDirty();};
(function(){
  const a=$("#setCurCode"),b=$("#setBomCur");if(!a||!b)return;
  a.onchange=()=>{state.settings.curCode=a.value;persist();};
  b.onchange=()=>{state.settings.bomCur=b.value;persist();};
  /* The option lists are filled by js/25-calc.js (CUR_CODES lives there); values are set in openSettings(). */
})();
$("#setName").oninput=()=>{state.settings.name=$("#setName").value.trim();persist();setGreeting();};
$("#setGreet").oninput=()=>{state.settings.greetCustom=$("#setGreet").value.trim();persist();setGreeting();};
$("#setAuto").onchange=()=>{state.settings.autoArchive=$("#setAuto").checked;persist();};
$("#setAutoReceive").onchange=()=>{state.settings.autoReceive=$("#setAutoReceive").checked;persist();};
$("#setConfetti").onchange=()=>{state.settings.confetti=$("#setConfetti").checked;persist();if(state.settings.confetti)pbConfetti(40);};
$("#setAccent").oninput=()=>{state.settings.accent=$("#setAccent").value;persist();applyTheme();};
$("#accentReset").onclick=()=>{delete state.settings.accent;persist();applyTheme();$("#setAccent").value=themeAc();};
$("#setPin").oninput=()=>{state.settings.pin=$("#setPin").value.replace(/\D/g,"").slice(0,4);persist();};
$("#setLockOn").onchange=()=>{if($("#setLockOn").checked&&(!state.settings.pin||state.settings.pin.length!==4)){toast("Set a 4-digit PIN first");$("#setLockOn").checked=false;return;}state.settings.lockOn=$("#setLockOn").checked;persist();};
/* ---------- app lock ---------- */
let pinBuf="";
function renderPinDots(){document.querySelectorAll("#lockDots span").forEach((d,i)=>d.classList.toggle("on",i<pinBuf.length));}
function showLock(){const s=state.settings;if(!(s.lockOn&&s.pin&&s.pin.length===4)){$("#lockScreen").classList.remove("show");return;}pinBuf="";renderPinDots();$("#lockScreen").classList.add("show");}
function pinPress(k){if(k==="del"){pinBuf=pinBuf.slice(0,-1);}else if(k==="clear"){pinBuf="";}else if(pinBuf.length<4){pinBuf+=k;}renderPinDots();if(pinBuf.length===4){const ok=pinBuf===state.settings.pin;setTimeout(()=>{if(ok){$("#lockScreen").classList.remove("show");pinBuf="";try{wnMaybeAutoOpen();}catch(e){}try{pbFlushNotifications();}catch(e){}}else{const b=document.querySelector(".lockbox");b.classList.add("shake");setTimeout(()=>{b.classList.remove("shake");pinBuf="";renderPinDots();},420);}},120);}}
document.querySelectorAll("#keypad button").forEach(b=>b.onclick=()=>pinPress(b.dataset.k));
document.addEventListener("keydown",e=>{if(!$("#lockScreen").classList.contains("show"))return;if(/^[0-9]$/.test(e.key))pinPress(e.key);else if(e.key==="Backspace")pinPress("del");});

/* ---------- Forgot PIN: Windows verifies the user, then the lock is switched off ----------
   Only offered inside the desktop app. Windows Hello does the checking (PIN / face /
   fingerprint dialog); the app never sees a password. If the person cancels, or Hello
   isn't set up on this PC, they get a Back button and a Get support button. */
(function(){
  const inv=window.__TAURI__&&window.__TAURI__.core&&window.__TAURI__.core.invoke; if(!inv)return;
  const btn=$("#lockResetBtn"),box=$("#lockResetBox"),hint=$("#lockResetHint"),help=$("#lockResetHelp"),contact=$("#lockResetContact");
  if(!btn)return; btn.style.display="";
  const SUPPORT_URL="https://printlab3d-official.github.io/support.html#pin", CONTACT_URL="https://discord.gg/n8M3V4SaHJ";
  const say=(t,err)=>{hint.textContent=t;hint.classList.toggle("err",!!err);};
  function reset(){box.style.display="none";help.style.display="none";contact.style.display="none";$("#keypad").style.display="";$("#lockDots").style.display="";btn.style.display="";}
  function done(){
    state.settings.lockOn=false;state.settings.pin="";persist();
    reset();$("#lockScreen").classList.remove("show");pinBuf="";
    toast("PIN removed. Set a new one in Settings whenever you like.");
    try{wnMaybeAutoOpen();}catch(e){}try{pbFlushNotifications();}catch(e){}
  }
  function stuck(msg){say(msg,true);help.style.display="";contact.style.display="";}
  async function start(){
    $("#keypad").style.display="none";$("#lockDots").style.display="none";btn.style.display="none";box.style.display="";help.style.display="none";contact.style.display="none";
    say("Checking with Windows…");
    let avail=false;try{avail=await inv("pin_hello_available");}catch(e){}
    if(!avail)return stuck("Windows Hello isn't set up on this PC, so the PIN can't be reset here. Contact us and we'll sort it out.");
    say("Look for the Windows \"Verify it's you\" window.");
    let r="failed";try{r=await inv("pin_verify_hello");}catch(e){r="failed";}
    if(r==="verified")return done();
    if(r==="cancelled")return stuck("Cancelled. Try again, or contact us if you can't get past this.");
    stuck("Windows couldn't verify you just now. Try again, or contact us.");
  }
  btn.onclick=start;
  $("#lockResetCancel").onclick=reset;
  const openLink=u=>{try{const o=window.__TAURI__.opener;if(o&&o.openUrl)return o.openUrl(u);}catch(e){}window.open(u,"_blank");};
  help.onclick=()=>openLink(SUPPORT_URL);
  contact.onclick=()=>openLink(CONTACT_URL);
})();
$("#setLow").oninput=()=>{setBuf.defLow=Math.max(0,Number($("#setLow").value)||0);markDirty();};
$("#settingsSave").onclick=saveSettings;
$("#setBannerSave").onclick=saveSettings;
$("#setBackup").onclick=()=>doBackup();
$("#setRestore").onclick=()=>restoreInput.click();
const THEMES=[
  {k:"dark",n:"Dark",bg:"#0d1117",ac:"#3b82f6"},
  {k:"light",n:"Light",bg:"#ffffff",ac:"#f97316"},
  {k:"paper",n:"Paper",bg:"#faf6ee",ac:"#b45309"},
  {k:"snow",n:"Snow",bg:"#f7fafc",ac:"#2563eb"},
  {k:"mint",n:"Mint",bg:"#f2faf5",ac:"#0d9488"},
  {k:"sakura",n:"Sakura",bg:"#fdf3f7",ac:"#db2777"},
  {k:"midnight",n:"Midnight",bg:"#0b1020",ac:"#8b7cf6"},
  {k:"ocean",n:"Ocean",bg:"#06141c",ac:"#22b8cf"},
  {k:"forest",n:"Forest",bg:"#0a140e",ac:"#3fb96b"},
  {k:"rose",n:"Rose",bg:"#160a10",ac:"#ec4899"},
  {k:"amber",n:"Amber",bg:"#15110a",ac:"#f59e0b"},
  {k:"grape",n:"Grape",bg:"#120a1f",ac:"#a855f7"},
  {k:"dracula",n:"Dracula",bg:"#282a36",ac:"#bd93f9"},
  {k:"nord",n:"Nord",bg:"#2e3440",ac:"#88c0d0"},
  {k:"sunset",n:"Sunset",bg:"linear-gradient(160deg,#2a1020,#3a1a14)",ac:"#fb7185"},
  {k:"cyber",n:"Cyber",bg:"linear-gradient(160deg,#1a0a2e,#06121f)",ac:"#e928a8"}
];
function renderThemes(){const g=$("#themeGrid");if(!g)return;const cur=state.settings.theme||"dark";g.innerHTML=THEMES.map(t=>`<button type="button" class="themeswatch ${t.k===cur?'on':''}" data-theme="${t.k}"><span class="sw" style="background:${t.bg}"><span class="dot" style="background:${t.ac}"></span></span><span class="swn">${t.n}</span></button>`).join("");g.querySelectorAll(".themeswatch").forEach(b=>b.onclick=()=>{state.settings.theme=b.dataset.theme;persist();applyTheme();});}
const LIGHT_THEMES=["light","paper","snow","mint","sakura"];
const BRIGHT_ACCENT=["light","paper","snow","mint","sakura","ocean","forest","amber","nord"];
const FONTS=[
  {n:"System",f:""},
  {n:"Segoe UI",f:'"Segoe UI",Tahoma,sans-serif'},
  {n:"Verdana",f:'Verdana,Geneva,sans-serif'},
  {n:"Trebuchet",f:'"Trebuchet MS",Helvetica,sans-serif'},
  {n:"Calibri",f:'Calibri,"Segoe UI",sans-serif'},
  {n:"Georgia",f:'Georgia,"Times New Roman",serif'},
  {n:"Times",f:'"Times New Roman",Times,serif'},
  {n:"Garamond",f:'Garamond,Georgia,serif'},
  {n:"Consolas",f:'Consolas,"Courier New",monospace'},
  {n:"Courier",f:'"Courier New",Courier,monospace'},
  {n:"Comic Sans",f:'"Comic Sans MS","Comic Sans",cursive'}
];
function hx2(c,i){return parseInt(c.replace('#','').slice(i,i+2),16)}
function lum(hex){try{const r=hx2(hex,0)/255,g=hx2(hex,2)/255,b=hx2(hex,4)/255;return 0.2126*r+0.7152*g+0.0722*b;}catch(e){return 0;}}
function lighten(hex,amt){try{const f=(i)=>{const v=hx2(hex,i);return Math.round(v+(255-v)*amt).toString(16).padStart(2,'0');};return '#'+f(0)+f(2)+f(4);}catch(e){return hex;}}
function themeAc(){const o=THEMES.find(x=>x.k===(state.settings.theme||"dark"));return (o&&o.ac&&o.ac[0]==="#")?o.ac:"#3b82f6";}
function applyTheme(){
  const t=state.settings.theme||"dark";document.body.setAttribute("data-theme",t);
  let bright=BRIGHT_ACCENT.includes(t);const ac=state.settings.accent;
  if(ac&&/^#[0-9a-fA-F]{6}$/.test(ac)){document.body.style.setProperty("--accent",ac);document.body.style.setProperty("--accent2",lighten(ac,0.22));bright=lum(ac)>0.6;}
  else{document.body.style.removeProperty("--accent");document.body.style.removeProperty("--accent2");}
  document.body.classList.toggle("lighttheme",LIGHT_THEMES.includes(t));
  document.body.classList.toggle("brightaccent",bright);
  renderThemes();renderAccentPresets();
}
function applyFont(){const f=state.settings.font;if(f)document.body.style.setProperty("--font",f);else document.body.style.removeProperty("--font");}
function applyDensity(){document.body.setAttribute("data-density",(state.settings.density==="compact")?"compact":"comfortable");}
/* ---------- inventory view mode ----------
   Separate axis from Density above: Density scales padding/text everywhere,
   this swaps the inventory list between photo cards and a one-line-per-item
   table. Default "cards" keeps the original look for anyone who never opens
   this. Only affects the list — the item editor still shows the photo. */
function applyListView(){document.body.setAttribute("data-view",(state.settings.listView==="compact")?"compact":"cards");}
function applyFitTabs(){document.body.setAttribute("data-fittabs",state.settings.autoFitTabs?"1":"0");}
$("#setFitTabs").onchange=()=>{state.settings.autoFitTabs=$("#setFitTabs").checked;persist();applyFitTabs();};
const VIEW_OPTS=[
  {k:"cards",  label:"Cards",        hint:"Photo cards — the original look."},
  {k:"compact",label:"Compact list", hint:"One line per item, no photos — fits far more on screen."}
];
function renderListView(){
  const g=$("#viewPicks");if(!g)return;
  const cur=(state.settings.listView==="compact")?"compact":"cards";
  g.innerHTML=VIEW_OPTS.map(v=>
    `<button type="button" class="densitypick ${v.k===cur?'on':''}" data-view-k="${v.k}">`+
    `<span class="dp-radio"></span><span class="dp-label">${esc(v.label)}</span>`+
    `<span class="dp-preview vp-preview">`+
    `<span class="vp-bars vp-${v.k}"><i></i><i></i><i></i><i></i></span>`+
    `<span class="vp-hint">${esc(v.hint)}</span>`+
    `</span></button>`
  ).join("");
  g.querySelectorAll(".densitypick").forEach(b=>b.onclick=()=>{
    state.settings.listView=b.dataset.viewK;persist();applyListView();renderListView();render();
  });
}
const DENSITY_OPTS=[
  {k:"comfortable",label:"Comfortable",btnPad:"9px 14px",btnFont:"14px",statPad:"11px 14px",statFont:"20px"},
  {k:"compact",label:"Compact",btnPad:"7px 11px",btnFont:"13px",statPad:"8px 11px",statFont:"16px"}
];
function renderDensity(){
  const g=$("#densityPicks");if(!g)return;
  const cur=(state.settings.density==="compact")?"compact":"comfortable";
  g.innerHTML=DENSITY_OPTS.map(d=>
    `<button type="button" class="densitypick ${d.k===cur?'on':''}" data-density-k="${d.k}">`+
    `<span class="dp-radio"></span><span class="dp-label">${esc(d.label)}</span>`+
    `<span class="dp-preview">`+
    `<span class="dp-btn" style="padding:${d.btnPad};font-size:${d.btnFont}">Sample</span>`+
    `<span class="dp-stat" style="padding:${d.statPad}"><b style="font-size:${d.statFont}">42</b><i>Items</i></span>`+
    `</span></button>`
  ).join("");
  g.querySelectorAll(".densitypick").forEach(b=>b.onclick=()=>{state.settings.density=b.dataset.densityK;persist();applyDensity();renderDensity();});
}
function renderFonts(){const g=$("#fontGrid");if(!g)return;const cur=state.settings.font||"";g.innerHTML=FONTS.map(ft=>`<button type="button" class="fontbtn ${ft.f===cur?'on':''}" data-font="${esc(ft.f)}" style="font-family:${ft.f||'var(--font)'}">${ft.n}${ft.f===""?'<span class="deftag">Default</span>':''}</button>`).join("");g.querySelectorAll(".fontbtn").forEach(b=>b.onclick=()=>{state.settings.font=b.dataset.font;persist();applyFont();renderFonts();});}
const ACCENT_PRESETS=["#3b82f6","#22c55e","#f59e0b","#ef4444","#ec4899","#a855f7","#06b6d4","#10b981","#f97316","#8b5cf6","#eab308","#e928a8"];
function renderAccentPresets(){const g=$("#accentPresets");if(!g)return;const def=themeAc();const cur=(state.settings.accent||"").toLowerCase();
  let h=`<div class="accwrap"><button type="button" class="accdot defaccent ${!cur?'on':''}" data-acc="" style="background:${def}" title="The theme's original accent">${!cur?'✓':''}</button><span class="lbl">Default</span></div>`;
  h+=ACCENT_PRESETS.map(c=>`<div class="accwrap"><button type="button" class="accdot ${cur===c?'on':''}" data-acc="${c}" style="background:${c}">${cur===c?'✓':''}</button></div>`).join("");
  g.innerHTML=h;
  g.querySelectorAll(".accdot").forEach(b=>b.onclick=()=>{const v=b.dataset.acc;if(v)state.settings.accent=v;else delete state.settings.accent;persist();applyTheme();const s=$("#setAccent");if(s)s.value=state.settings.accent||themeAc();});}

