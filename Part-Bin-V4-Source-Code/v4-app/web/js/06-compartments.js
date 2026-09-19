/* =====================================================================
   Parts Bin — Compartments: storage units (cabinets, shelves, drawers,
   boxes…), simple vs advanced tracking, placement picker
   ---------------------------------------------------------------------
   Data shape (all additive — a V3 compartment keeps working untouched):
     { id, name, rows, cols, loc, cells:[{label,itemId}],   V3 fields
       kind:"cabinet"|"shelf"|"drawer"|"box"|…|<custom>,   V4: what it is
       mode:"simple"|"advanced",                            V4: how deep
       size:"small"|"medium"|"large"|"custom" }             V4: label only
   • advanced: a part is put in one exact cell (cells[i].itemId), as before.
   • simple:   a part is just "in this unit" — stored on the ITEM as
               item.comp = compartment id. Right for bags and loose bins.
   migrateCompartments() fills kind/mode on anything older, silently.
   ===================================================================== */
const COMP_KINDS=[
  {k:"cabinet",label:"Drawer cabinet",icon:"grid",  one:"drawer", sizes:{small:[3,3],medium:[6,3],large:[8,4]}},
  {k:"shelf",  label:"Shelf",         icon:"shelf", one:"slot",   sizes:{small:[2,3],medium:[3,4],large:[4,6]}},
  {k:"drawer", label:"Drawer",        icon:"drawer",one:"section",sizes:{small:[1,3],medium:[2,4],large:[3,6]}},
  {k:"box",    label:"Box",           icon:"box",   one:"slot",   sizes:{small:[1,2],medium:[2,3],large:[3,4]}},
  {k:"bin",    label:"Bin",           icon:"box",   one:"slot",   sizes:{small:[1,2],medium:[2,3],large:[3,4]}},
  {k:"bag",    label:"Bag",           icon:"tag",   one:"pocket", sizes:{small:[1,2],medium:[1,4],large:[2,4]}, fixed:"simple"},   /* a bag is portable: no positions */
  {k:"rack",   label:"Rack",          icon:"shelf", one:"slot",   sizes:{small:[2,2],medium:[4,3],large:[6,4]}}
];
/* User-added kinds live in settings so they show in the picker next time. */
function customKinds(){ if(!Array.isArray(state.settings.compKinds))state.settings.compKinds=[]; return state.settings.compKinds; }
function compKind(c){
  const k=(c&&c.kind)||"cabinet";
  return COMP_KINDS.find(x=>x.k===k)||{k,label:k.charAt(0).toUpperCase()+k.slice(1),icon:"box",one:"slot",sizes:{small:[1,2],medium:[2,3],large:[3,4]}};
}
function compMode(c){ const K=compKind(c); if(K.fixed)return K.fixed; return (c&&c.mode==="simple")?"simple":"advanced"; }
/* "v" = vertical: tall slots side by side (spools standing up); "h" = the usual wide drawers. */
function compOrient(c){ return (c&&c.orient==="v")?"v":"h"; }
function compCellName(c,i){ const cell=(c.cells||[])[i]; return (cell&&cell.label)?cell.label:("#"+(i+1)); }

/* Fill in V4 fields on older compartments. A unit that already has parts or
   labels in its grid stays advanced (nothing is hidden); an untouched grid
   becomes simple. No prompts, one persist if anything changed. */
function migrateCompartments(){
  let ch=false;
  (state.compartments||[]).forEach(c=>{
    if(!c||typeof c!=="object")return;
    if(!Array.isArray(c.cells)){c.cells=[];ch=true;}
    if(!c.kind){c.kind="cabinet";ch=true;}
    if(c.mode!=="simple"&&c.mode!=="advanced"){c.mode=c.cells.some(x=>x&&(x.label||x.itemId))?"advanced":"simple";ch=true;}
    if(!c.rows||!c.cols){c.rows=c.rows||1;c.cols=c.cols||1;ch=true;}
  });
  if(ch)persist();
}
migrateCompartments();

/* ---------- compartments tab ---------- */
function compItems(c){ return state.items.filter(i=>i.comp===c.id||(c.cells||[]).some(x=>x&&x.itemId===i.id)); }
function renderCompartments(){
  $("#toolbar").style.display="none";$("#compBar").style.display="flex";
  const pending=syncCandidates().reduce((s,r)=>s+r.items.length,0);
  $("#compSyncHint").textContent=pending?pending+" part"+(pending===1?" has":"s have")+" a plain-text location that isn't a compartment yet.":"Every located part is in a compartment.";
  const list=state.compartments;
  const positions=list.filter(c=>compMode(c)==="advanced").reduce((s,c)=>s+((c.cells||[]).length),0);
  const used=list.reduce((s,c)=>s+((c.cells||[]).filter(x=>x&&(x.label||x.itemId)).length),0);
  const parts=new Set();list.forEach(c=>compItems(c).forEach(i=>parts.add(i.id)));
  $("#stats").innerHTML=`<div class="stat"><div class="n">${list.length}</div><div class="l">Storage units</div></div><div class="stat"><div class="n">${parts.size}</div><div class="l">Parts stored</div></div><div class="stat"><div class="n">${positions}</div><div class="l">Positions</div></div><div class="stat"><div class="n">${used}</div><div class="l">Positions filled</div></div>`;
  const grid=$("#grid");
  if(!list.length){grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="big">${ic("grid")}</div>No storage yet. Hit <b>New compartment</b> to add a drawer cabinet, shelf, box or bag.</div>`;return;}
  grid.innerHTML=list.map(compCard).join("");
  list.forEach(c=>{
    const card=grid.querySelector(`[data-comp="${c.id}"]`);if(!card)return;
    const e=card.querySelector("[data-compedit]");if(e)e.onclick=()=>openComp(c.id);
    card.querySelectorAll("[data-cell]").forEach(d=>d.onclick=()=>openCell(c.id,+d.dataset.cell));
    card.querySelectorAll("[data-openitem]").forEach(d=>d.onclick=()=>openModal(d.dataset.openitem));
    card.querySelectorAll("[data-compall]").forEach(d=>d.onclick=()=>openCompList(d.dataset.compall));
  });
}
/* Everything in one unit, in a popup (with a quick filter), for big bags and drawers. */
function openCompList(id){
  const c=state.compartments.find(x=>x.id===id);if(!c)return;
  const items=compItems(c).slice().sort((a,b)=>(a.partId||"").localeCompare(b.partId||""));
  $("#compListTitle").textContent=c.name;
  $("#compListSub").textContent=items.length+" part"+(items.length===1?"":"s")+" · "+compKind(c).label;
  $("#compListQ").value="";
  const paint=()=>{
    const q=$("#compListQ").value.trim().toLowerCase();
    const rows=items.filter(i=>!q||(i.name+" "+(i.partId||"")+" "+(i.lcsc||"")).toLowerCase().includes(q));
    $("#compListBody").innerHTML=rows.length?rows.map(i=>{const T=TYPES[i.type]||TYPES.components;return `<button type="button" class="complrow" data-openitem="${i.id}"><span class="cr-t">${ic(T.icon)}</span><span class="cr-id">${esc(i.partId||"")}</span><span class="cr-name">${esc(i.name)}</span><span class="cr-lcsc">${esc(i.lcsc||"")}</span><span class="cr-qty"><b>${i.qty}</b></span></button>`;}).join(""):`<div class="hint">No match.</div>`;
    $("#compListBody").querySelectorAll("[data-openitem]").forEach(b=>b.onclick=()=>{closeCompList();openModal(b.dataset.openitem);});
  };
  $("#compListQ").oninput=paint;paint();
  $("#compListOverlay").classList.add("show");$("#compListQ").focus();
}
function closeCompList(){$("#compListOverlay").classList.remove("show");}
$("#compListClose").onclick=closeCompList;$("#compListOverlay").onclick=e=>{if(e.target===$("#compListOverlay"))closeCompList();};
function compCard(c){
  const K=compKind(c),simple=compMode(c)==="simple",cells=c.cells||[];
  const meta=[`<span class="chip">${ic(K.icon)} ${esc(K.label)}</span>`,`<span class="chip" title="${simple?"Parts are recorded as being in here, nothing more":"Each part has an exact position"}">${simple?"Simple":"Advanced"}</span>`];
  if(!simple)meta.push(`<span class="chip">${c.rows}×${c.cols} · ${cells.length} ${K.one}s${compOrient(c)==="v"?" · vertical":""}</span>`);
  if(c.loc)meta.unshift(`<span class="chip">${ic("pin")}<b>${esc(c.loc)}</b></span>`);
  let body="";
  if(simple){
    const items=compItems(c),MAX=8;
    body=items.length
      ?`<div class="complist">${items.slice(0,MAX).map(i=>`<button type="button" class="ptag compitem" data-openitem="${i.id}" title="Open ${esc(i.name)}">${esc(i.partId||"")} ${esc(i.name)}</button>`).join("")}${items.length>MAX?`<button type="button" class="ptag compitem more" data-compall="${c.id}">Show all ${items.length}…</button>`:""}</div>`
      :`<div class="compempty">Nothing stored here yet. Add a part and choose this ${esc(K.label.toLowerCase())} under Location.</div>`;
  }else{
    const drawers=cells.map((cell,i)=>{const it=(cell&&cell.itemId)?state.items.find(x=>x.id===cell.itemId):null;const txt=(cell&&cell.label)||(it?it.name:"");const filled=!!((cell&&cell.label)||it);return `<div class="drawer ${filled?'filled':''}" data-cell="${i}" title="${esc(txt||(K.one+' '+(i+1)))}"><span>${esc(txt||"")}</span></div>`;}).join("");
    body=`<div class="drawergrid${compOrient(c)==="v"?" vert":""}" style="grid-template-columns:repeat(${c.cols},${compOrient(c)==="v"?"minmax(30px,44px)":"1fr"})">${drawers}</div>`;
  }
  return `<div class="ccard" data-comp="${c.id}"><div class="cchead"><div class="cname">${esc(c.name)}</div><button class="iconbtn" data-compedit="${c.id}" title="Edit this ${esc(K.label.toLowerCase())}">${ic("edit")}</button></div><div class="meta">${meta.join("")}</div>${body}</div>`;
}
/* Where is this item? "Cabinet · resistors" / "Cabinet · #4" (advanced) or just "Bag of parts" (simple). */
function compartmentOf(itemId){
  for(const c of state.compartments){const cells=c.cells||[];for(let i=0;i<cells.length;i++){if(cells[i]&&cells[i].itemId===itemId)return c.name+" · "+compCellName(c,i);}}
  const it=state.items.find(i=>i.id===itemId);
  if(it&&it.comp){const c=state.compartments.find(x=>x.id===it.comp);if(c)return c.name;}
  return "";
}
function findPlacement(itemId){
  for(const c of state.compartments){const cells=c.cells||[];for(let i=0;i<cells.length;i++){if(cells[i]&&cells[i].itemId===itemId)return {compId:c.id,idx:i};}}
  const it=state.items.find(i=>i.id===itemId);
  if(it&&it.comp&&state.compartments.some(c=>c.id===it.comp))return {compId:it.comp,idx:-1};
  return null;
}
function locOf(it){return compartmentOf(it.id)||it.loc||"";}
/* Take an item out of every compartment (cell or simple). */
function unplaceItem(itemId){
  state.compartments.forEach(c=>(c.cells||[]).forEach(cell=>{if(cell&&cell.itemId===itemId)cell.itemId="";}));
  const it=state.items.find(i=>i.id===itemId);if(it&&it.comp)delete it.comp;
}
/* Put an item somewhere: {compId,idx>=0} exact cell, {compId,idx:-1} simple. */
function placeItem(itemId,sel){
  unplaceItem(itemId);
  if(!sel)return;
  const c=state.compartments.find(x=>x.id===sel.compId);if(!c)return;
  const it=state.items.find(i=>i.id===itemId);
  if(sel.idx>=0&&compMode(c)==="advanced"){if(!c.cells[sel.idx])c.cells[sel.idx]={label:"",itemId:""};c.cells[sel.idx].itemId=itemId;}
  else if(it)it.comp=c.id;
}

/* ---------- editor ---------- */
let compEdit=null,compDraft={kind:"cabinet",mode:"advanced",size:"medium",orient:"h"};
function compRenderKinds(){
  const sel=$("#compKind");
  const custom=customKinds().filter(k=>!COMP_KINDS.some(x=>x.k===k));
  sel.innerHTML=COMP_KINDS.map(k=>`<option value="${k.k}">${esc(k.label)}</option>`).join("")+custom.map(k=>`<option value="${esc(k)}">${esc(compKind({kind:k}).label)}</option>`).join("")+'<option value="__other">Other…</option>';
  const cur=compDraft.kind;
  if([...sel.options].some(o=>o.value===cur))sel.value=cur;else{sel.value="__other";}
  $("#compKindOther").style.display=sel.value==="__other"?"":"none";
  if(sel.value==="__other")$("#compKindOther").value=(cur&&cur!=="__other")?cur:"";
}
function compSyncMode(){
  const K=compKind({kind:compDraft.kind});
  if(K.fixed)compDraft.mode=K.fixed;
  $("#compModeSeg").style.display=K.fixed?"none":"";
  const adv=compDraft.mode==="advanced";
  $("#compModeSeg").querySelectorAll(".segbtn").forEach(b=>b.classList.toggle("on",b.dataset.mode===compDraft.mode));
  $("#compOrientSeg").querySelectorAll(".segbtn").forEach(b=>b.classList.toggle("on",b.dataset.orient===compDraft.orient));
  $("#compModeHint").textContent=K.fixed
    ?`A ${K.label.toLowerCase()} is portable, so parts are simply recorded as being in it.`
    :adv
    ?`You pick the exact ${K.one} when you store a part, and that position shows on the part.`
    :`A part is just recorded as being in this ${K.label.toLowerCase()}, nothing more. Right for bags and loose bins where a position can't be tracked.`;
  $("#compSizeBox").style.display=adv?"":"none";
}
function compSyncSize(){
  $("#compSizeSeg").querySelectorAll(".segbtn").forEach(b=>b.classList.toggle("on",b.dataset.size===compDraft.size));
  const K=compKind({kind:compDraft.kind});
  if(compDraft.size!=="custom"){const rc=K.sizes[compDraft.size]||K.sizes.medium;$("#compRows").value=rc[0];$("#compCols").value=rc[1];}
  $("#compCustom").style.display=compDraft.size==="custom"?"":"none";
  const rows=clampN($("#compRows").value,1,20),cols=clampN($("#compCols").value,1,20);
  $("#compSizeHint").textContent=`${rows} × ${cols} = ${rows*cols} ${K.one}${rows*cols===1?"":"s"}`;
  renderCompPreview();
}
function openComp(id){
  const c=id?state.compartments.find(x=>x.id===id):null;compEdit=id||null;
  $("#compTitle").textContent=id?"Edit compartment":"New compartment";
  $("#compName").value=c?c.name:"";$("#compLoc").value=c?(c.loc||""):"";
  compDraft={kind:c?(c.kind||"cabinet"):"cabinet",mode:c?compMode(c):"advanced",size:c?(c.size||"custom"):"medium",orient:c?compOrient(c):"h"};
  compRenderKinds();
  if(c){$("#compRows").value=c.rows||6;$("#compCols").value=c.cols||3;}
  compSyncMode();compSyncSize();
  $("#compDelete").style.display=id?"inline-flex":"none";
  $("#compOverlay").classList.add("show");$("#compName").focus();
}
function clampN(v,lo,hi){v=parseInt(v,10);if(isNaN(v))v=lo;return Math.max(lo,Math.min(hi,v));}
function renderCompPreview(){const r=clampN($("#compRows").value,1,20),c=clampN($("#compCols").value,1,20);const g=$("#compPreview");const v=compDraft.orient==="v";g.classList.toggle("vert",v);g.style.gridTemplateColumns=`repeat(${c},${v?"minmax(18px,28px)":"1fr"})`;g.innerHTML=Array(r*c).fill('<div class="ppcell"></div>').join("");}
$("#compRows").oninput=()=>{compDraft.size="custom";compSyncSize();};
$("#compCols").oninput=()=>{compDraft.size="custom";compSyncSize();};
$("#compKind").onchange=()=>{const v=$("#compKind").value;$("#compKindOther").style.display=v==="__other"?"":"none";if(v!=="__other"){compDraft.kind=v;compSyncMode();compSyncSize();}else{$("#compKindOther").focus();}};
$("#compKindOther").oninput=()=>{const v=$("#compKindOther").value.trim().toLowerCase();if(v){compDraft.kind=v;compSyncMode();compSyncSize();}};
$("#compModeSeg").querySelectorAll(".segbtn").forEach(b=>b.onclick=()=>{compDraft.mode=b.dataset.mode;compSyncMode();});
$("#compOrientSeg").querySelectorAll(".segbtn").forEach(b=>b.onclick=()=>{compDraft.orient=b.dataset.orient;compSyncMode();renderCompPreview();});
$("#compSizeSeg").querySelectorAll(".segbtn").forEach(b=>b.onclick=()=>{compDraft.size=b.dataset.size;compSyncSize();});
function closeComp(){$("#compOverlay").classList.remove("show");}
$("#compClose").onclick=closeComp;$("#compOverlay").onclick=e=>{if(e.target===$("#compOverlay"))closeComp();};
$("#compDelete").onclick=()=>{
  if(!confirm("Delete this compartment? Its positions and labels are lost (parts stay in your inventory)."))return;
  state.items.forEach(i=>{if(i.comp===compEdit)delete i.comp;});
  state.compartments=state.compartments.filter(x=>x.id!==compEdit);persist();closeComp();render();toast("Compartment deleted");
};
$("#compSave").onclick=()=>{
  const name=$("#compName").value.trim();if(!name)return toast("Give it a name");
  let kind=compDraft.kind;
  if($("#compKind").value==="__other"){kind=$("#compKindOther").value.trim().toLowerCase();if(!kind)return toast("Type what kind of storage this is");if(!COMP_KINDS.some(x=>x.k===kind)&&!customKinds().includes(kind))customKinds().push(kind);}
  const KK=compKind({kind});
  const mode=KK.fixed?KK.fixed:(compDraft.mode==="simple"?"simple":"advanced");
  const orient=compDraft.orient==="v"?"v":"h";
  const rows=clampN($("#compRows").value,1,20),cols=clampN($("#compCols").value,1,20);
  const loc=$("#compLoc").value.trim();if(loc&&!state.locations.some(l=>l.toLowerCase()===loc.toLowerCase()))state.locations.push(loc);
  if(compEdit){
    const c=state.compartments.find(x=>x.id===compEdit);
    const old=c.cells||[],oc=c.cols||cols,or=c.rows||rows;const nc=[];
    for(let i=0;i<rows*cols;i++){const rr=Math.floor(i/cols),cc=i%cols;const oi=rr*oc+cc;nc.push((rr<or&&cc<oc&&old[oi])?old[oi]:{label:"",itemId:""});}
    /* Positions that fall off a smaller grid: those parts stay "in" the unit (simple placement) rather than vanishing. */
    old.forEach((cell,oi)=>{if(!cell||!cell.itemId)return;const rr=Math.floor(oi/oc),cc=oi%oc;if(rr>=rows||cc>=cols){const it=state.items.find(i=>i.id===cell.itemId);if(it)it.comp=c.id;}});
    /* Switching to simple keeps the grid data but the parts become "in the unit". */
    if(mode==="simple")nc.forEach(cell=>{if(cell&&cell.itemId){const it=state.items.find(i=>i.id===cell.itemId);if(it)it.comp=c.id;cell.itemId="";}});
    Object.assign(c,{name,rows,cols,loc,cells:nc,kind,mode,size:compDraft.size,orient});
  }else{
    const cells=Array.from({length:rows*cols},()=>({label:"",itemId:""}));
    state.compartments.push({id:uid(),name,rows,cols,loc,cells,kind,mode,size:compDraft.size,orient});
  }
  persist();closeComp();render();toast("Compartment saved");
};

/* ---------- one position (advanced units) ---------- */
let cellComp=null,cellIdx=-1;
function openCell(compId,idx){
  const c=state.compartments.find(x=>x.id===compId);if(!c)return;cellComp=compId;cellIdx=idx;
  if(!c.cells[idx])c.cells[idx]={label:"",itemId:""};
  const cell=c.cells[idx],K=compKind(c);
  $("#cellTitle").textContent=c.name+" — "+K.one+" "+(idx+1);
  $("#cellLabel").value=cell.label||"";
  $("#cellItem").innerHTML='<option value="">— none —</option>'+state.items.map(i=>`<option value="${i.id}" ${cell.itemId===i.id?"selected":""}>${esc((i.partId?i.partId+" — ":"")+i.name)}</option>`).join("");
  $("#cellOverlay").classList.add("show");$("#cellLabel").focus();
}
function closeCell(){$("#cellOverlay").classList.remove("show");}
$("#cellClose").onclick=closeCell;$("#cellOverlay").onclick=e=>{if(e.target===$("#cellOverlay"))closeCell();};
$("#cellClear").onclick=()=>{const c=state.compartments.find(x=>x.id===cellComp);if(c&&c.cells[cellIdx]){c.cells[cellIdx]={label:"",itemId:""};persist();}closeCell();render();toast("Position cleared");};
$("#cellSave").onclick=()=>{const c=state.compartments.find(x=>x.id===cellComp);if(c){const ni=$("#cellItem").value||"";if(ni)unplaceItem(ni);c.cells[cellIdx]={label:$("#cellLabel").value.trim(),itemId:ni};persist();}closeCell();render();toast("Position updated");};

/* ---------- placement picker (from item form) ---------- */
let placeSel=null;
function updatePlaceLabel(){
  const el=$("#fPlaceLabel");if(!el)return;
  const it=state.editId?state.items.find(i=>i.id===state.editId):null;
  const legacy=(it&&it.loc&&!placeSel)?` <span class="placelegacy">· old location text: ${esc(it.loc)}</span>`:"";
  if(placeSel){const c=state.compartments.find(x=>x.id===placeSel.compId);el.innerHTML=c?(ic(compKind(c).icon)+" "+esc(c.name)+(placeSel.idx>=0?" · "+esc(compCellName(c,placeSel.idx)):"")):"No location";}
  else el.innerHTML="No location"+legacy;
}
function openPlace(){
  const sel=$("#placeComp");
  sel.innerHTML=state.compartments.map(c=>`<option value="${c.id}">${esc(c.name)} (${esc(compKind(c).label)}${compMode(c)==="advanced"?", "+c.rows+"×"+c.cols:""})</option>`).join("");
  $("#placePickRow").style.display=state.compartments.length?"":"none";
  $("#placeNoneYet").style.display=state.compartments.length?"none":"";
  $("#placeNewName").value="";$("#placeNewKind").innerHTML=COMP_KINDS.map(k=>`<option value="${k.k}">${esc(k.label)}</option>`).join("");$("#placeNewKind").value="drawer";
  if(state.compartments.length){sel.value=(placeSel&&placeSel.compId)||state.compartments[0].id;renderPlaceGrid();}
  else{$("#placeGrid").innerHTML="";$("#placeSimple").style.display="none";}
  $("#placeOverlay").classList.add("show");
  if(!state.compartments.length)$("#placeNewName").focus();
}
/* Quick-create from the item form: a simple-mode unit, selected straight away. */
function placeQuickCreate(){
  const name=$("#placeNewName").value.trim();if(!name)return toast("Give the compartment a name");
  if(state.compartments.some(c=>c.name.toLowerCase()===name.toLowerCase()))return toast("You already have a compartment called that");
  const kind=$("#placeNewKind").value||"drawer",K=compKind({kind});
  const rc=K.sizes.medium;
  const c={id:uid(),name,rows:rc[0],cols:rc[1],loc:"",cells:Array.from({length:rc[0]*rc[1]},()=>({label:"",itemId:""})),kind,mode:"simple",size:"medium",orient:"h"};
  state.compartments.push(c);persist();
  placeSel={compId:c.id,idx:-1};updatePlaceLabel();closePlace();toast("Compartment created: "+name);
}
function renderPlaceGrid(){
  const c=state.compartments.find(x=>x.id===$("#placeComp").value);const g=$("#placeGrid"),hint=$("#placeHint"),simpleBtn=$("#placeSimple");
  if(!c){g.innerHTML="";return;}
  g.classList.toggle("vert",compOrient(c)==="v");
  const K=compKind(c);
  if(compMode(c)==="simple"){
    g.innerHTML="";g.style.display="none";
    hint.textContent=`This ${K.label.toLowerCase()} is in simple mode: the part is recorded as being in it, with no exact position.`;
    simpleBtn.style.display="";simpleBtn.textContent="Store in "+c.name;
    simpleBtn.onclick=()=>{placeSel={compId:c.id,idx:-1};updatePlaceLabel();closePlace();};
    return;
  }
  simpleBtn.style.display="none";g.style.display="";
  hint.textContent=`Tap a ${K.one} to store this part there.`;
  g.style.gridTemplateColumns=`repeat(${c.cols},${compOrient(c)==="v"?"minmax(30px,44px)":"1fr"})`;
  g.innerHTML=(c.cells||[]).map((cell,i)=>{const it=(cell&&cell.itemId)?state.items.find(x=>x.id===cell.itemId):null;const mine=state.editId&&cell&&cell.itemId===state.editId;const txt=mine?"this part":((cell&&cell.label)||(it?it.name:""));const sel=placeSel&&placeSel.compId===c.id&&placeSel.idx===i;const filled=!!((cell&&cell.label)||it);return `<div class="drawer ${filled?'filled':''} ${sel?'psel':''}" data-pi="${i}" title="${esc(txt||(K.one+' '+(i+1)))}"><span>${esc(txt||(i+1))}</span></div>`;}).join("");
  g.querySelectorAll("[data-pi]").forEach(d=>d.onclick=()=>{placeSel={compId:c.id,idx:+d.dataset.pi};updatePlaceLabel();closePlace();});
}
function closePlace(){$("#placeOverlay").classList.remove("show");}
$("#placeComp").onchange=renderPlaceGrid;
$("#placeClose").onclick=closePlace;$("#placeOverlay").onclick=e=>{if(e.target===$("#placeOverlay"))closePlace();};
$("#placeNone").onclick=()=>{placeSel=null;updatePlaceLabel();closePlace();};
$("#placeNewGo").onclick=placeQuickCreate;
$("#placeNewName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();placeQuickCreate();}});
$("#fPlaceBtn").onclick=openPlace;

/* ---------- Sync with compartments ----------
   Every free-text location still on an item (the V3 way: "Supplier drawer",
   "Shelf 2") becomes a compartment — you choose the type per location — and
   the items move into it (simple placement). A location that already matches
   a compartment's name just moves its items in. */
function syncCandidates(){
  const map=new Map();
  state.items.forEach(i=>{
    const l=String(i.loc||"").trim();if(!l)return;
    if(findPlacement(i.id))return;                                  // already placed somewhere
    const k=l.toLowerCase();
    if(!map.has(k)){map.set(k,{name:l,items:[],existing:state.compartments.find(c=>c.name.toLowerCase()===k)||null});}
    map.get(k).items.push(i);
  });
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function openSync(){
  const rows=syncCandidates();
  const body=$("#syncBody");
  if(!rows.length){body.innerHTML=`<div class="hint">Nothing to sync: every part with a location is already in a compartment.</div>`;$("#syncGo").style.display="none";}
  else{
    const kinds=COMP_KINDS.map(k=>`<option value="${k.k}">${esc(k.label)}</option>`).join("");
    body.innerHTML=`<div class="hint" style="margin-top:0">These location names are still plain text on your parts. Tick the ones to turn into compartments, pick what each one is, and the parts move in.</div>`+
      rows.map((r,i)=>`<div class="syncrow"><label class="ckrow" style="padding:0"><input type="checkbox" class="synck" data-i="${i}" checked></label><div class="syncname"><b>${esc(r.name)}</b><span>${r.items.length} part${r.items.length===1?"":"s"}${r.existing?" · compartment already exists, parts will move in":""}</span></div>${r.existing?"":`<select class="filt synckind" data-i="${i}">${kinds}</select>`}</div>`).join("");
    body.querySelectorAll(".synckind").forEach(s=>{const r=rows[+s.dataset.i];s.value=/drawer|cabinet/i.test(r.name)?"drawer":/shelf/i.test(r.name)?"shelf":/bag/i.test(r.name)?"bag":/box/i.test(r.name)?"box":/bin/i.test(r.name)?"bin":"drawer";});
    $("#syncGo").style.display="";
    $("#syncGo").onclick=()=>{
      let made=0,moved=0;
      rows.forEach((r,i)=>{
        const ck=body.querySelector('.synck[data-i="'+i+'"]');if(!ck||!ck.checked)return;
        let c=r.existing;
        if(!c){const kind=(body.querySelector('.synckind[data-i="'+i+'"]')||{}).value||"drawer",K=compKind({kind}),rc=K.sizes.medium;
          c={id:uid(),name:r.name,rows:rc[0],cols:rc[1],loc:"",cells:Array.from({length:rc[0]*rc[1]},()=>({label:"",itemId:""})),kind,mode:"simple",size:"medium",orient:"h"};
          state.compartments.push(c);made++;}
        r.items.forEach(it=>{it.comp=c.id;it.loc="";moved++;});
      });
      persist();closeSync();render();
      toast((made?made+" compartment"+(made===1?"":"s")+" created, ":"")+moved+" part"+(moved===1?"":"s")+" moved in");
    };
  }
  $("#syncOverlay").classList.add("show");
}
function closeSync(){$("#syncOverlay").classList.remove("show");}
$("#syncClose").onclick=closeSync;$("#syncCancel").onclick=closeSync;$("#syncOverlay").onclick=e=>{if(e.target===$("#syncOverlay"))closeSync();};
$("#compSyncBtn").onclick=openSync;
