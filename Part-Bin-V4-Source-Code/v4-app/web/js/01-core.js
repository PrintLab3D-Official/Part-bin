/* =====================================================================
   Parts Bin — Core: icons, constants, state, storage (with recovery), utils, header
   ===================================================================== */

const SVG={
  scan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M4 12h16"/></svg>',
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="1"/><path d="M6 14h12v7H6z"/></svg>',
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h2l2.3 11.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  id:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>',
  code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8v8M10 8v8M13 8v4M17 8v8"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  components:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>',
  filament:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',
  pcbs:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h6M8 9v6M9 16h2"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="16" r="1"/></svg>',
  screw:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8l1 4H7z"/><path d="M12 3v4"/><path d="M9.5 7v10.5L12 21l2.5-3.5V7"/><path d="M9.5 10h5M9.5 13h5M9.5 16h5"/></svg>',
  projects:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/></svg>',
  orders:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17.5" cy="18.5" r="1.6"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>',
  archive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>',
  undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3.5 13a9 9 0 1 0 2.1-9.4L3 7"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
  sparkle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4z"/></svg>',
  send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  stop:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
  speak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>',
  tasks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 2 2 4-4"/><path d="m3 15 2 2 4-4"/><path d="M13 6h8M13 14h8"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  expand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
  collapse:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v6H3M21 15h-6v6M9 9 3 3M21 21l-6-6"/></svg>',
  filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
  shelf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18M3 12h18M3 20h18M5 4v16M19 4v16"/></svg>',
  drawer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 12h18M10 8.5h4M10 15.5h4"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'
};
function ic(n){return SVG[n]||""}
function imgFail(el){const d=document.createElement('div');d.className='ph';d.innerHTML=ic(el.getAttribute('data-t')||'components');el.replaceWith(d);}
const TYPES={components:{label:"Components",one:"component",unit:"Types",pre:"C",icon:"components"},filament:{label:"Filament",one:"filament",unit:"Spools",pre:"F",icon:"filament"},pcbs:{label:"PCBs",one:"PCB",unit:"Boards",pre:"P",icon:"pcbs"},screws:{label:"Screws",one:"screw",unit:"Screws",pre:"S",icon:"screw"}};
const DEFAULT_MATERIALS=["PLA","PLA+","PLA Matte","PLA Silk","PETG","TPU","ABS","ASA","Nylon","PC","PVA","HIPS","Wood PLA","Carbon Fiber PETG","Glow PLA"];
const SHOP_NAMES={amazon:"Amazon",ebay:"eBay",aliexpress:"AliExpress",digikey:"DigiKey",mouser:"Mouser",adafruit:"Adafruit",sparkfun:"SparkFun",banggood:"Banggood",microcenter:"Micro Center",bambulab:"Bambu Lab",matterhackers:"MatterHackers",prusa3d:"Prusa",prusa:"Prusa",pimoroni:"Pimoroni",thepihut:"The Pi Hut",reichelt:"Reichelt",rs:"RS",farnell:"Farnell",newark:"Newark",walmart:"Walmart",alibaba:"Alibaba",temu:"Temu",etsy:"Etsy",jaycar:"Jaycar",core_electronics:"Core Electronics",coreelectronics:"Core Electronics"};
const PB_KEYS=["pb_items","pb_projects","pb_orders","pb_compartments","pb_materials","pb_locations","pb_settings"];
/* Every boot-time read is guarded: missing, corrupt, or wrong-shaped values
   (a string where an array should be, an array where the settings object
   should be) fall back to the default instead of taking the whole UI down. */
function load(k,d){try{const v=localStorage.getItem(k);if(v==null)return d;const p=JSON.parse(v);if(p==null)return d;if(Array.isArray(d)&&!Array.isArray(p))return d;if(d&&typeof d==="object"&&!Array.isArray(d)&&(typeof p!=="object"||Array.isArray(p)))return d;return p;}catch(e){return d}}
/* --- Data-safety recovery: keeps a redundant snapshot so no glitch, crash, or
   style/view/file switch can ever wipe the inventory. Runs ONCE, before state. --- */
(function bootRecovery(){try{
  const itemsRaw=localStorage.getItem("pb_items");
  const itemsEmpty=(itemsRaw==null||itemsRaw==="[]"||itemsRaw==="null"||itemsRaw==="");
  let snap=null;try{snap=JSON.parse(localStorage.getItem("pb_recovery")||"null");}catch(_){}
  if(itemsEmpty&&snap&&Array.isArray(snap.items)&&snap.items.length){
    const map={items:"pb_items",projects:"pb_projects",orders:"pb_orders",compartments:"pb_compartments",materials:"pb_materials",locations:"pb_locations",settings:"pb_settings"};
    Object.keys(map).forEach(k=>{if(snap[k]!==undefined)localStorage.setItem(map[k],JSON.stringify(snap[k]));});
    try{localStorage.setItem("pb_recovery_restored",new Date().toISOString());}catch(_){}
  }
  /* Refresh the recovery snapshot from current good data on every boot. */
  try{
    const cur=localStorage.getItem("pb_items");
    if(cur&&cur!=="[]"&&cur!=="null"&&cur!==""){
      const map={items:"pb_items",projects:"pb_projects",orders:"pb_orders",compartments:"pb_compartments",materials:"pb_materials",locations:"pb_locations",settings:"pb_settings"};
      const snap2={ts:Date.now()};
      Object.keys(map).forEach(k=>{try{snap2[k]=JSON.parse(localStorage.getItem(map[k])||"null");}catch(_){snap2[k]=null;}});
      localStorage.setItem("pb_recovery",JSON.stringify(snap2));
    }
  }catch(_){}
}catch(e){}})();
let state={items:load("pb_items",[]),projects:load("pb_projects",[]),orders:load("pb_orders",[]),compartments:load("pb_compartments",[]),materials:load("pb_materials",DEFAULT_MATERIALS.slice()),locations:load("pb_locations",[]),settings:load("pb_settings",{currency:"$",defLow:0}),tab:"all",editId:null,img:null,imgFit:"cover",imgPos:"50% 50%"};
function persist(){try{
  localStorage.setItem("pb_items",JSON.stringify(state.items));
  localStorage.setItem("pb_projects",JSON.stringify(state.projects));
  localStorage.setItem("pb_orders",JSON.stringify(state.orders));
  localStorage.setItem("pb_compartments",JSON.stringify(state.compartments));
  localStorage.setItem("pb_materials",JSON.stringify(state.materials));
  localStorage.setItem("pb_locations",JSON.stringify(state.locations));
  localStorage.setItem("pb_settings",JSON.stringify(state.settings));
  /* The recovery snapshot is the same data again; writing it on every click doubled
     the cost of a save once photos are involved. It is written ~0.8 s after the last
     change and flushed when the window hides or closes, so it never lags by more. */
  clearTimeout(pbRecoveryT);pbRecoveryT=setTimeout(pbWriteRecovery,800);
  try{ if(typeof checkStockAlerts==="function") checkStockAlerts(); }catch(_){}
}catch(e){try{toast("Could not save — device storage may be full");}catch(_){}}}
let pbRecoveryT=null;
function pbWriteRecovery(){clearTimeout(pbRecoveryT);pbRecoveryT=null;try{localStorage.setItem("pb_recovery",JSON.stringify({ts:Date.now(),items:state.items,projects:state.projects,orders:state.orders,compartments:state.compartments,materials:state.materials,locations:state.locations,settings:state.settings}));}catch(_){}}
window.addEventListener("beforeunload",()=>{if(pbRecoveryT)pbWriteRecovery();});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&pbRecoveryT)pbWriteRecovery();});
/* True when running inside the installed Tauri desktop app (vs. the legacy
   browser/file:// build). Data lives in the app's own persistent storage
   here, and file/uninstall behaviour differs — several modules branch on this. */
const IS_TAURI=!!(window.__TAURI__);
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
const $=s=>document.querySelector(s);
const cur=()=>state.settings.currency||"$";
function money(n){return cur()+Number(n||0).toFixed(2)}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

/* Merge any user-defined custom tabs into TYPES early, so every type-based
   feature (nav, item editor, BOM, part IDs, render) works from the first
   render. The UI for managing them lives in js/24-tabs.js. */
(function(){const ct=state.settings&&state.settings.customTabs;if(Array.isArray(ct))ct.forEach(t=>{if(t&&t.key&&!TYPES[t.key])TYPES[t.key]={label:t.label,one:t.one||t.label,unit:t.unit||"Items",pre:t.pre||"X",icon:t.icon||"tag"};});})();
function nextPartId(type){const pre=(TYPES[type]||TYPES.components).pre;const nums=state.items.filter(i=>(i.partId||'').startsWith(pre+'-')).map(i=>parseInt(i.partId.split('-')[1])||0);const n=(nums.length?Math.max(...nums):0)+1;return pre+'-'+String(n).padStart(4,'0');}
function ensurePartIds(){let ch=false;state.items.forEach(i=>{if(!i.type)i.type='components';if(!i.partId){i.partId=nextPartId(i.type);ch=true;}});if(ch)persist();}
function migrate(){let ch=false;state.projects.forEach(p=>{if(Array.isArray(p.components)){let conv=false;const nc=p.components.map(c=>{if(typeof c==="string"){conv=true;return{id:c,qty:1};}return c;});if(conv){p.components=nc;ch=true;}}});if(ch)persist();}
function shopName(link){if(!link)return"";try{let h=new URL(link).hostname.replace(/^www\./,'');let core=h.split('.')[0];if(core==="amazon")return"Amazon";return SHOP_NAMES[core]||core.charAt(0).toUpperCase()+core.slice(1);}catch(e){return""}}
const GREET_EXTRA=["What's up","Ready to lock in","Back at the bench","Let's build something","Good to see you","On the bench","Time to tinker"];
let greetPick; // decided once per session: undefined=not yet chosen, null=stick with live time-of-day, string=fixed fun phrase
function timeGreeting(h){return h<12?"Good morning":h<18?"Good afternoon":"Good evening";}
function setGreeting(){
  const h=new Date().getHours();const s=state.settings||{};
  let base;
  if(s.greetCustom){base=s.greetCustom;}
  else{
    if(greetPick===undefined){const pool=[null,null,...GREET_EXTRA];greetPick=pool[Math.floor(Math.random()*pool.length)];}
    base=greetPick||timeGreeting(h);
  }
  const nm=s.name?(", "+s.name):"";$("#greeting").textContent=base+nm;
}
function maskTrack(t){t=String(t||"");return t.length<=4?t:("••••"+t.slice(-4));}

document.querySelectorAll(".navtab[data-tab]").forEach(t=>t.onclick=()=>{state.tab=t.dataset.tab;document.querySelectorAll(".navtab[data-tab]").forEach(x=>x.classList.toggle("active",x===t));render();});

/* Tauri's webview doesn't act on target="_blank" the way a real browser tab
   does — external links (buy links, tracking, support) would silently no-op.
   Route any http(s) link through the OS's default browser instead. */
document.addEventListener("click",function(e){
  const a=e.target.closest("a[href]");
  if(!a)return;
  const href=a.getAttribute("href")||"";
  if(!/^https?:\/\//i.test(href))return;
  const opener=window.__TAURI__&&window.__TAURI__.opener;
  if(!opener||!opener.openUrl)return;
  e.preventDefault();
  opener.openUrl(href);
});

/* header buttons (icon + label) */
$("#scanFindBtn").innerHTML=ic("scan")+"<span>Scan to find</span>";
$("#labelsBtn").innerHTML=ic("print")+"<span>Print labels</span>";
function updateAddBtn(){const lbl=state.tab==="projects"?"New project":(state.tab==="orders"?"New order":(state.tab==="compartments"?"New compartment":"Add item"));$("#addBtn").style.display=state.tab==="archive"?"none":"";$("#addBtn").innerHTML=ic("add")+"<span>"+lbl+"</span>";}

