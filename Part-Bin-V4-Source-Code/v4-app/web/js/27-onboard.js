/* =====================================================================
   Parts Bin — First-run onboarding
   ---------------------------------------------------------------------
   Very first open only (no inventory AND no onboarded flag):
     1. "New here" or "Coming from V3"
        • V3  → big Import button (the normal backup restore), then continue
        • New → pick what you make; the sidebar shows only matching tabs
                (a starting point — Settings → Sidebar tabs changes it later)
     2. then the usual What's New tour, then the welcome popup (unchanged).
   Anyone who already has data never sees this: the flag is set silently.
   ===================================================================== */
const ONBOARD_KINDS=[
  {key:"components",label:"Electronics",sub:"Resistors, ICs, modules, sensors",icon:"components"},
  {key:"filament",  label:"3D printing", sub:"Filament spools, colours, materials",icon:"filament"},
  {key:"pcbs",      label:"PCBs",        sub:"Boards you have made or ordered",icon:"pcbs"},
  {key:"screws",    label:"Hardware",    sub:"Screws, nuts, standoffs, fasteners",icon:"screw"}
];
let onboardPick=new Set(ONBOARD_KINDS.map(k=>k.key)),onboardImportTimer=null;

function pbNeedsOnboarding(){
  try{
    if(state.settings.onboarded)return false;
    if(pbHasData()){state.settings.onboarded=true;persist();return false;}   // existing user: never ask
    return true;
  }catch(e){return false;}
}
function onboardShow(step){
  document.querySelectorAll("#onboardOverlay .ob-step").forEach(s=>s.style.display=s.dataset.step===step?"":"none");
  if(step==="new")onboardRenderKinds();
  $("#onboardOverlay").classList.add("show");
}
function onboardRenderKinds(){
  const g=$("#obKinds");
  g.innerHTML=ONBOARD_KINDS.map(k=>`<button type="button" class="ob-kind${onboardPick.has(k.key)?" on":""}" data-k="${k.key}" aria-pressed="${onboardPick.has(k.key)}"><span class="ob-kind-ic">${ic(k.icon)}</span><span class="ob-kind-t">${esc(k.label)}</span><span class="ob-kind-s">${esc(k.sub)}</span><span class="ob-kind-ck">${ic("check")}</span></button>`).join("");
  g.querySelectorAll(".ob-kind").forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(onboardPick.has(k))onboardPick.delete(k);else onboardPick.add(k);onboardRenderKinds();});
  $("#obNewGo").textContent=onboardPick.size?"Set up my sidebar":"Keep every tab";
}
function onboardApplyKinds(){
  /* Nothing picked = keep everything; otherwise hide the item tabs they don't use. */
  if(onboardPick.size&&onboardPick.size<ONBOARD_KINDS.length){
    const h=hiddenTabs();
    ONBOARD_KINDS.forEach(k=>{const i=h.indexOf(k.key);if(!onboardPick.has(k.key)){if(i<0)h.push(k.key);}else if(i>=0)h.splice(i,1);});
    persist();try{applyHiddenTabs();render();}catch(e){}
  }
}
function onboardFinish(){
  clearInterval(onboardImportTimer);onboardImportTimer=null;
  $("#onboardOverlay").classList.remove("show");
  try{state.settings.onboarded=true;persist();}catch(e){}
  /* Now the normal first-open sequence: What's New tour, then the welcome popup. */
  try{wnMaybeAutoOpen();}catch(e){}
}

/* ---------- wiring ---------- */
(function(){
  const ov=$("#onboardOverlay");if(!ov)return;
  $("#obNew").onclick=()=>onboardShow("new");
  $("#obV3").onclick=()=>onboardShow("v3");
  $("#obBackNew").onclick=()=>onboardShow("pick");
  $("#obBackV3").onclick=()=>onboardShow("pick");
  $("#obNewGo").onclick=()=>{onboardApplyKinds();onboardFinish();};
  $("#obImport").onclick=()=>{
    try{restoreInput.click();}catch(e){}
    $("#obImportHint").textContent="Pick your Parts Bin backup file (.json). As soon as it loads you'll carry straight on.";
    $("#obV3Done").style.display="";
    clearInterval(onboardImportTimer);
    let n=0;onboardImportTimer=setInterval(()=>{if(pbHasData()){onboardFinish();}else if(++n>240)clearInterval(onboardImportTimer);},500);
  };
  $("#obV3Done").onclick=onboardFinish;
  $("#obV3Later").onclick=onboardFinish;
  $("#obImportIc").innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>';
})();
function openOnboarding(){onboardPick=new Set(ONBOARD_KINDS.map(k=>k.key));onboardShow("pick");}
