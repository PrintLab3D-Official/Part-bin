/* =====================================================================
   Parts Bin — Custom tabs: user-defined sidebar categories
   ---------------------------------------------------------------------
   Additive & opt-in. Stored in state.settings.customTabs and merged into
   TYPES (js/01-core.js does an early merge at load) so every type-based
   feature — nav, item editor, BOM import, part IDs, rendering — just works.
   Built-in tabs are never touched.
   ===================================================================== */

const TAB_RESERVED=["all","components","filament","pcbs","screws","projects","orders","compartments","archive"];

function customTabs(){ if(!Array.isArray(state.settings.customTabs))state.settings.customTabs=[]; return state.settings.customTabs; }
function tabSlug(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,24); }
function tabSingular(s){ s=String(s||"").trim(); return s.replace(/s$/i,"")||s; }
/* A unique 1-char part-ID prefix (falls back to T0, T1… if letters are taken). */
function tabPrefix(label){
  const used=new Set(Object.values(TYPES).map(t=>t.pre));
  for(const ch of (String(label).toUpperCase().replace(/[^A-Z0-9]/g,"")+"XYZ")){ if(ch&&!used.has(ch))return ch; }
  for(let i=0;i<300;i++){ const c="T"+i; if(!used.has(c))return c; }
  return "T"+Date.now().toString(36).slice(-3).toUpperCase();
}

function tabMergeTypes(){
  customTabs().forEach(t=>{ if(t&&t.key)TYPES[t.key]={label:t.label,one:t.one||t.label,unit:t.unit||"Items",pre:t.pre||"X",icon:t.icon||"tag"}; });
}
function tabBindNav(){
  document.querySelectorAll(".navtab[data-tab]").forEach(t=>t.onclick=()=>{
    state.tab=t.dataset.tab;
    document.querySelectorAll(".navtab[data-tab]").forEach(x=>x.classList.toggle("active",x===t));
    render();
  });
}
function tabRenderNav(){
  const nav=document.querySelector(".nav"); if(!nav)return;
  nav.querySelectorAll(".navtab.customtab").forEach(b=>b.remove());
  const anchor=nav.querySelector('[data-tab="screws"]');   // custom tabs sit with the item types
  customTabs().forEach(t=>{
    const b=document.createElement("button");
    b.className="navtab customtab"; b.dataset.tab=t.key;
    b.innerHTML=(t.img?'<img class="tabimg" src="'+esc(t.img)+'" alt="">':ic(t.icon||"tag"))+" "+esc(t.label);
    if(anchor&&anchor.parentNode===nav)nav.insertBefore(b,anchor.nextSibling); else nav.appendChild(b);
  });
  tabBindNav();
  document.querySelectorAll(".navtab[data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab===state.tab));
}
/* Every type a NEW item may be filed under: built-in types that aren't hidden, then custom tabs.
   (Existing items of a hidden type keep their type; only the pick-lists change.) */
function itemTypeKeys(){
  const h=hiddenTabs();
  return ["components","filament","pcbs","screws"].filter(k=>!h.includes(k)).concat(customTabs().map(t=>t.key));
}
function tabSyncSelects(){
  const h=hiddenTabs();
  ["#fType","#bomType"].forEach(sel=>{
    const el=$(sel); if(!el)return;
    el.querySelectorAll("option.customopt").forEach(o=>o.remove());
    customTabs().forEach(t=>{ const o=document.createElement("option"); o.className="customopt"; o.value=t.key; o.textContent=t.label; el.appendChild(o); });
    /* hidden built-in tabs drop out of the pick-list (still selectable by code, so editing an old item works) */
    el.querySelectorAll("option:not(.customopt)").forEach(o=>{ o.hidden=h.includes(o.value); });
  });
}
function applyCustomTabs(){ tabMergeTypes(); tabRenderNav(); tabSyncSelects(); }

function addCustomTab(){
  const name=($("#tabNew").value||"").trim();
  if(!name)return;
  const key=tabSlug(name);
  if(!key)return toast("Give the tab a name with letters or numbers");
  if(TAB_RESERVED.includes(key)||customTabs().some(t=>t.key===key))return toast("That tab already exists");
  customTabs().push({key,label:name,one:tabSingular(name).toLowerCase(),unit:"Items",pre:tabPrefix(name),icon:"tag"});
  persist(); applyCustomTabs(); renderCustomTabsList();
  $("#tabNew").value="";
  toast("Added tab: "+name);
}
function removeCustomTab(key){
  const items=state.items.filter(i=>i.type===key);
  if(items.length&&!confirm(items.length+" item"+(items.length===1?"":"s")+" in this tab will move to Components. Remove the tab?"))return;
  items.forEach(i=>i.type="components");
  state.settings.customTabs=customTabs().filter(t=>t.key!==key);
  delete TYPES[key];
  if(state.tab===key)state.tab="all";
  persist(); applyCustomTabs(); renderCustomTabsList(); render();
  toast("Tab removed");
}
function renderCustomTabsList(){
  const el=$("#tabList"); if(!el)return;
  const tabs=customTabs();
  el.innerHTML=tabs.length
    ? tabs.map(t=>`<div class="listrow"><span class="tabimg-thumb" data-img="${esc(t.key)}" title="Upload an image for this tab">${t.img?`<img src="${esc(t.img)}" alt="">`:"🖼"}</span><span style="flex:1">${esc(t.label)}</span><span style="color:var(--mut);font-size:12px">IDs ${esc(t.pre)}-####</span><button data-rm="${esc(t.key)}" title="Remove tab">✕</button></div>`).join("")
    : `<div class="sub">No custom tabs yet — add one below.</div>`;
  el.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>removeCustomTab(b.dataset.rm));
  el.querySelectorAll("[data-img]").forEach(b=>b.onclick=()=>{tabImgKey=b.dataset.img;tabImgInput.click();});
}

/* Optional per-tab image (downscaled to a small icon). */
const tabImgInput=document.createElement("input");
tabImgInput.type="file";tabImgInput.accept="image/*";tabImgInput.style.display="none";
document.body.appendChild(tabImgInput);
let tabImgKey=null;
tabImgInput.onchange=e=>{
  const f=e.target.files[0];e.target.value="";
  if(!f||!f.type.startsWith("image/")||!tabImgKey)return;
  const r=new FileReader();
  r.onload=()=>{const im=new Image();im.onload=()=>{
    const max=96,sc=Math.min(1,max/Math.max(im.width,im.height));
    const c=document.createElement("canvas");c.width=im.width*sc;c.height=im.height*sc;
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);
    const tab=customTabs().find(t=>t.key===tabImgKey);
    if(tab){tab.img=c.toDataURL("image/png");persist();applyCustomTabs();renderCustomTabsList();}
  };im.src=r.result;};
  r.readAsDataURL(f);
};

/* ---------- show / hide built-in tabs ---------- */
const BUILTIN_HIDEABLE=[
  {key:"components",label:"Components"},{key:"filament",label:"Filament"},{key:"pcbs",label:"PCBs"},
  {key:"screws",label:"Screws"},{key:"projects",label:"Projects"},{key:"orders",label:"Orders"},
  {key:"compartments",label:"Compartments"},{key:"archive",label:"Archive"}
];
function hiddenTabs(){ if(!Array.isArray(state.settings.hiddenTabs))state.settings.hiddenTabs=[]; return state.settings.hiddenTabs; }
function applyHiddenTabs(){
  const h=hiddenTabs();
  document.querySelectorAll('.navtab[data-tab]').forEach(b=>{
    if(b.dataset.tab==="all")return;
    b.style.display=h.includes(b.dataset.tab)?"none":"";
  });
  if(h.includes(state.tab)){ state.tab="all"; document.querySelectorAll('.navtab[data-tab]').forEach(x=>x.classList.toggle("active",x.dataset.tab==="all")); }
  tabSyncSelects();
}
function toggleBuiltinTab(key){
  const h=hiddenTabs(),i=h.indexOf(key);
  if(i>=0){ h.splice(i,1); }
  else{
    const meta=BUILTIN_HIDEABLE.find(t=>t.key===key);
    if(!confirm("Hide the "+(meta?meta.label:key)+" tab?\n\nYour items stay in your library and still show under All — this only hides the sidebar tab. You can bring it back anytime."))return;
    h.push(key);
  }
  persist();applyHiddenTabs();renderBuiltinTabs();render();
}
function renderBuiltinTabs(){
  const el=$("#builtinTabs"); if(!el)return;
  const h=hiddenTabs();
  el.innerHTML=BUILTIN_HIDEABLE.map(t=>{
    const hid=h.includes(t.key);
    return `<div class="listrow"><span style="flex:1">${esc(t.label)}</span><button class="tabtoggle${hid?" off":""}" data-tk="${t.key}">${hid?"Show":"Hide"}</button></div>`;
  }).join("");
  el.querySelectorAll(".tabtoggle").forEach(b=>b.onclick=()=>toggleBuiltinTab(b.dataset.tk));
}

/* ---------- boot + wiring ---------- */
applyCustomTabs();
applyHiddenTabs();
$("#tabAdd").onclick=addCustomTab;
$("#tabNew").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addCustomTab();}});
$("#settingsBtn").addEventListener("click",()=>{renderCustomTabsList();renderBuiltinTabs();});
