/* =====================================================================
   Parts Bin — Inventory list: stats, render, item cards, quantity steppers
   ===================================================================== */
/* ---------- render ---------- */
function scopeItems(){return state.tab==="all"?state.items.slice():state.items.filter(i=>i.type===state.tab)}
function isLow(it){return it.low>0&&Number(it.qty)<=Number(it.low)}
/* ---------- inventory filters (session-only, combine with search + sort) ---------- */
const listFilter={oid:"",stock:"all",loc:""};
function filterActive(){return !!(listFilter.oid||listFilter.stock!=="all"||listFilter.loc);}
function filterCountActive(){return (listFilter.oid?1:0)+(listFilter.stock!=="all"?1:0)+(listFilter.loc?1:0);}
function applyListFilter(list){
  const oid=listFilter.oid.toLowerCase();
  if(oid)list=list.filter(i=>(i.lcsc||"").toLowerCase().includes(oid));
  if(listFilter.stock==="in")list=list.filter(i=>Number(i.qty)>0);
  else if(listFilter.stock==="low")list=list.filter(isLow);
  else if(listFilter.stock==="out")list=list.filter(i=>Number(i.qty)===0);
  if(listFilter.loc){
    if(listFilter.loc==="__none")list=list.filter(i=>!locOf(i));
    else{const want=listFilter.loc.toLowerCase();list=list.filter(i=>{const inC=compartmentOf(i.id);return (inC&&inC.toLowerCase().startsWith(want))||((i.loc||"").toLowerCase()===want);});}
  }
  return list;
}
/* Every place a part can be: free-text locations plus compartments. */
function filterLocOptions(){
  const set=new Set();
  state.items.forEach(i=>{if(i.loc)set.add(i.loc.trim());});
  const comps=state.compartments.map(c=>c.name);
  const locs=[...set].filter(l=>!comps.includes(l)).sort((a,b)=>a.localeCompare(b));
  return {comps:comps.sort((a,b)=>a.localeCompare(b)),locs};
}
function syncFilterUI(){
  const btn=$("#filterBtn");if(!btn)return;
  const n=filterCountActive();
  btn.classList.toggle("on",n>0);
  btn.innerHTML=ic("filter")+"<span>Filter & sort</span>"+(n?'<span class="fbadge">'+n+'</span>':"");
  $("#flOid").value=listFilter.oid;
  $("#flStock").querySelectorAll(".segbtn").forEach(b=>b.classList.toggle("on",b.dataset.st===listFilter.stock));
  const o=filterLocOptions(),sel=$("#flLoc");
  sel.innerHTML='<option value="">Anywhere</option><option value="__none">No location set</option>'+
    (o.comps.length?'<optgroup label="Compartments">'+o.comps.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")+'</optgroup>':"")+
    (o.locs.length?'<optgroup label="Locations">'+o.locs.map(l=>`<option value="${esc(l)}">${esc(l)}</option>`).join("")+'</optgroup>':"");
  sel.value=listFilter.loc;if(sel.value!==listFilter.loc){listFilter.loc="";sel.value="";}
}
function openFilter(){syncFilterUI();const p=$("#filterPop");p.style.left="";p.style.right="";p.classList.add("show");const r=p.getBoundingClientRect();if(r.right>window.innerWidth-8){p.style.left="auto";p.style.right="0";}$("#flOid").focus();}
function closeFilter(){$("#filterPop").classList.remove("show");}
function clearFilter(){listFilter.oid="";listFilter.stock="all";listFilter.loc="";syncFilterUI();render();}
(function(){
  const btn=$("#filterBtn");if(!btn)return;
  btn.onclick=e=>{e.stopPropagation();if($("#filterPop").classList.contains("show"))closeFilter();else openFilter();};
  $("#flOid").oninput=()=>{listFilter.oid=$("#flOid").value.trim();render();};
  $("#flStock").querySelectorAll(".segbtn").forEach(b=>b.onclick=()=>{listFilter.stock=b.dataset.st;syncFilterUI();render();});
  $("#flLoc").onchange=()=>{listFilter.loc=$("#flLoc").value;render();};
  $("#flClear").onclick=clearFilter;
  $("#flDone").onclick=closeFilter;
  $("#filterPop").onclick=e=>e.stopPropagation();
  document.addEventListener("click",e=>{if(!e.target.closest(".filtwrap"))closeFilter();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#filterPop").classList.contains("show"))closeFilter();});
  syncFilterUI();
})();
function render(){
  updateAddBtn();
  /* #grid is shared with projects/orders/archive/compartments, so the compact
     list layout is opt-in per render and always cleared first. */
  $("#grid").classList.remove("compactlist");const cb=$("#compBar");if(cb)cb.style.display="none";
  if(state.tab==="projects"){renderProjects();return;}
  if(state.tab==="orders"){renderOrders();return;}
  if(state.tab==="archive"){renderArchive();return;}
  if(state.tab==="compartments"){renderCompartments();return;}
  $("#toolbar").style.display="flex";
  const q=$("#search").value.toLowerCase().trim();const sort=$("#sortSel").value,lowOnly=$("#lowSel").value==="low";
  let list=scopeItems();
  const total=list.length,lowCount=list.filter(isLow).length,outCount=list.filter(i=>Number(i.qty)===0).length;
  const value=list.reduce((s,i)=>s+(Number(i.price||0)*Number(i.qty||0)),0);
  const units=list.reduce((s,i)=>s+Number(i.qty||0),0);
  const unitWord=state.tab==="all"?"Items":TYPES[state.tab].unit;
  $("#stats").innerHTML=`<div class="stat"><div class="n">${total}</div><div class="l">${unitWord}</div></div><div class="stat"><div class="n">${units}</div><div class="l">Total units</div></div><div class="stat warn"><div class="n">${lowCount}</div><div class="l">Low stock</div></div><div class="stat danger"><div class="n">${outCount}</div><div class="l">Out of stock</div></div><div class="stat"><div class="n">${money(value)}</div><div class="l">Inventory value</div></div>`;
  /* Original IDs are deliberately NOT searched here (they collide with Part IDs); use Filter → Original ID. */
  if(q)list=list.filter(i=>(i.name+" "+(i.partId||"")+" "+locOf(i)+" "+(i.material||"")+" "+(i.colorName||"")+" "+(i.code||"")).toLowerCase().includes(q));
  if(lowOnly)list=list.filter(isLow);
  list=applyListFilter(list);
  /* "12 of 40" whenever anything narrows the list */
  const lc=$("#listCount");if(lc)lc.textContent=(q||lowOnly||filterActive())?(list.length+" of "+total):"";
  const fc=$("#filterCount");if(fc)fc.textContent=list.length+" match"+(list.length===1?"":"es");
  const fb=$("#filterBtn");if(fb){const n=filterCountActive();fb.classList.toggle("on",n>0);fb.innerHTML=ic("filter")+"<span>Filter & sort</span>"+(n?'<span class="fbadge">'+n+'</span>':"");}
  list.sort((a,b)=>{if(sort==="name")return a.name.localeCompare(b.name);if(sort==="id")return (a.partId||"").localeCompare(b.partId||"");if(sort==="qtyAsc")return a.qty-b.qty;if(sort==="qtyDesc")return b.qty-a.qty;if(sort==="valDesc")return (b.price*b.qty)-(a.price*a.qty);});
  /* Exactly what the user is looking at, after search + filter + sort.
     js/23-bom.js exports this when the scope is "This list". */
  state.viewList=list;
  const grid=$("#grid");
  if(!list.length){grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="big">${ic("box")}</div>${(q||lowOnly||filterActive())?`No matching items.${filterActive()?' <button class="btn-ghost" id="emptyClearFilter" style="margin-left:8px">Clear filters</button>':""}`:"Nothing here yet. Hit <b>Add item</b> to start."}</div>`;const ecf=$("#emptyClearFilter");if(ecf)ecf.onclick=clearFilter;return;}
  /* Compact list is a layout swap only — same list, same search/sort/filter
     above, same per-item wiring below (compactRow carries the identical
     data-edit / data-label / data-incu / data-decu hooks). */
  const compact=state.settings.listView==="compact";
  grid.classList.toggle("compactlist",compact);
  grid.innerHTML=(compact?compactHeader():"")+list.map(compact?compactRow:card).join("");
  list.forEach(it=>{
    grid.querySelector(`[data-edit="${it.id}"]`).onclick=()=>openModal(it.id);
    grid.querySelector(`[data-label="${it.id}"]`).onclick=()=>openLabel(it.id);
    const exp=grid.querySelector(`[data-exp="${it.id}"]`);if(exp)exp.onclick=e=>{e.stopPropagation();const c=exp.closest(".card");c.classList.toggle("expanded");if(expanded.has(it.id))expanded.delete(it.id);else expanded.add(it.id);};
    const di=grid.querySelector(`[data-inc="${it.id}"]`);if(di)di.onclick=()=>bump(it.id,1,false);
    const dd=grid.querySelector(`[data-dec="${it.id}"]`);if(dd)dd.onclick=()=>bump(it.id,-1,false);
    const ui=grid.querySelector(`[data-incu="${it.id}"]`);if(ui)ui.onclick=()=>bump(it.id,1,true);
    const ud=grid.querySelector(`[data-decu="${it.id}"]`);if(ud)ud.onclick=()=>bump(it.id,-1,true);
  });
  grid.querySelectorAll("[data-copyid]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();const v=b.dataset.copyid;
    try{ (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast("Copied "+v)).catch(()=>toast("Couldn't copy")); }catch(_){ toast("Couldn't copy"); }
  });
  /* In compact mode the whole row opens the item (buttons/links still win). */
  if(compact)grid.querySelectorAll(".crow:not(.crhead)").forEach(r=>{r.onclick=e=>{if(e.target.closest("button,a"))return;openModal(r.dataset.card);};});
}
/* One-line inventory row used when Settings → Inventory view is "Compact list".
   Deliberately carries the same data-* hooks as card() so render()'s wiring is
   shared. No photo is emitted at all here — the space is reclaimed, not hidden. */
function compactRow(it){
  const low=isLow(it),out=Number(it.qty)===0;
  const T=TYPES[it.type]||TYPES.components;
  const inDrawer=compartmentOf(it.id),ploc=inDrawer||it.loc||"";
  const isPack=it.perPack>0,packs=isPack?(+(it.qty/it.perPack).toFixed(2)):it.qty;
  const qtyTitle=isPack?`${packs} pack${packs===1?'':'s'} · ${it.qty} units`:`${it.qty} in stock`;
  const stateTitle=out?" — out of stock":(low?" — low stock":"");
  return `<div class="crow ${out?'out':low?'low':''}" data-card="${it.id}" title="${esc(it.name)}${stateTitle}">`+
    `<span class="cr-t" title="${esc(T.one)}">${ic(T.icon)}</span>`+
    `<span class="cr-id">${esc(it.partId||"—")}</span>`+
    `<span class="cr-name">${esc(it.name)}</span>`+
    `<span class="cr-lcsc">${esc(it.lcsc||"")}</span>`+
    `<span class="cr-loc">${ploc?ic(inDrawer?"grid":"pin")+esc(ploc):""}</span>`+
    `<span class="cr-price">${it.price>0?money(it.price):""}</span>`+
    `<span class="cr-qty" title="${esc(qtyTitle)}"><b>${it.qty}</b>${isPack?`<i>×${it.perPack}</i>`:""}</span>`+
    `<span class="cr-act">`+
      `<button class="iconbtn" data-decu="${it.id}" title="Remove one">−</button>`+
      `<button class="iconbtn" data-incu="${it.id}" title="Add one">+</button>`+
      (it.link?`<a class="iconbtn crbuy" href="${esc(it.link)}" target="_blank" rel="noopener" title="Buy more of this">${ic("cart")}</a>`:"")+
      `<button class="iconbtn" data-label="${it.id}" title="Barcode label">${ic("tag")}</button>`+
      `<button class="iconbtn" data-edit="${it.id}" title="Edit">${ic("edit")}</button>`+
    `</span>`+
  `</div>`;
}
/* Header row for the compact list — labels the columns so the two IDs are clear. */
function compactHeader(){
  return `<div class="crow crhead" aria-hidden="true">`+
    `<span class="cr-t"></span>`+
    `<span class="cr-id" title="Parts Bin's own ID for this item">Part ID</span>`+
    `<span class="cr-name">Name</span>`+
    `<span class="cr-lcsc" title="The supplier's / original catalogue ID">Original ID</span>`+
    `<span class="cr-loc">Location</span>`+
    `<span class="cr-price">Price</span>`+
    `<span class="cr-qty">Qty</span>`+
    `<span class="cr-act"></span>`+
  `</div>`;
}
function card(it){
  const low=isLow(it);const out=Number(it.qty)===0;const shop=shopName(it.link);const T=TYPES[it.type]||TYPES.components;
  const fit=it.imgFit||"cover",pos=it.imgPos||"50% 50%";const z=it.imgZoom||1;const tf=fit==='cover'&&z!==1?`;transform:scale(${z});transform-origin:${pos}`:'';
  const img=it.img?`<img src="${esc(it.img)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-t="${it.type}" style="object-fit:${fit};object-position:${pos}${tf}" onerror="imgFail(this)">`:`<div class="ph">${ic(T.icon)}</div>`;
  const swatch=it.type==='filament'&&it.color?`<div class="swatch" style="background:${it.color}"></div>`:"";
  const lowText=shop?`Low stock — reorder at ${esc(shop)}`:`LOW STOCK`;
  const meta=[];
  meta.push(`<span class="chip">${ic("id")}<b>${esc(it.partId||"—")}</b></span>`);
  if(state.tab==="all")meta.push(`<span class="chip">${ic(T.icon)} ${T.one}</span>`);
  if(it.type==='filament'){if(it.material)meta.push(`<span class="chip"><b>${esc(it.material)}</b></span>`);if(it.dia)meta.push(`<span class="chip">${esc(it.dia)}</span>`);if(it.colorName)meta.push(`<span class="chip">${esc(it.colorName)}</span>`);if(it.weight)meta.push(`<span class="chip">${esc(it.weight)} g left</span>`);}
  const inDrawer=compartmentOf(it.id);const ploc=inDrawer||it.loc;if(ploc)meta.push(`<span class="chip">${ic(inDrawer?"grid":"pin")}<b>${esc(ploc)}</b></span>`);
  if(it.code)meta.push(`<span class="chip">${ic("code")} ${esc(it.code)}</span>`);
  if(it.lcsc)meta.push(`<span class="chip" title="Original ID">${esc(it.lcsc)}</span>`);
  if(it.price>0)meta.push(`<span class="chip">${money(it.price)} ea</span>`);
  const isPack=it.perPack>0;const packs=isPack?(+(it.qty/it.perPack).toFixed(2)):it.qty;const qtyHtml=isPack?`<span class="num">${packs}</span><span style="color:var(--mut)">${packs===1?'pack':'packs'} · <b style="color:var(--txt)">${it.qty}</b> units</span>`:`<span class="num">${it.qty}</span><span style="color:var(--mut)">in stock</span>`;
  const unitRow=`<div class="ctlrow"><span class="ctll">${isPack?'Exact units (e.g. one broke)':'Quantity'}</span><div class="stepper"><button data-decu="${it.id}">−</button><span class="ctlv">${it.qty}</span><button data-incu="${it.id}">+</button></div></div>`;
  const packRowC=isPack?`<div class="ctlrow"><span class="ctll">Whole packs (×${it.perPack})</span><div class="stepper"><button data-dec="${it.id}">−</button><span class="ctlv">${packs}</span><button data-inc="${it.id}">+</button></div></div>`:``;
  const controls=packRowC+unitRow;
  const qtyBlock=isPack
    ? `<div class="qty">${qtyHtml}<button class="iconbtn expandbtn" data-exp="${it.id}" title="Adjust stock">${ic("chev")}</button></div><div class="controls">${controls}</div>`
    : `<div class="qty">${qtyHtml}<div class="stepper"><button data-decu="${it.id}">−</button><button data-incu="${it.id}">+</button></div></div>`;
  const buy=it.link?`<a href="${esc(it.link)}" target="_blank" rel="noopener"><div class="buybtn">${ic("cart")} ${shop?'Buy at '+esc(shop):'Buy more'}</div></a>`:`<div class="buybtn disabled" style="flex:1">No link</div>`;
  const badge=out?`<div class="outbadge">${ic("warn")}OUT OF STOCK</div>`:(low?`<div class="lowbadge">${ic("warn")}${lowText}</div>`:`<div class="pid">${esc(it.partId||'')}</div>`);
  return `<div class="card ${out?'out':low?'low':''} ${expanded.has(it.id)?'expanded':''}" data-card="${it.id}"><div class="thumb">${img}${badge}${it.lcsc?`<button class="pidcopy" data-copyid="${esc(it.lcsc)}" title="Copy Original ID (${esc(it.lcsc)})">${ic("copy")}</button>`:""}${swatch}</div><div class="cbody"><div class="cname">${esc(it.name)}</div><div class="meta">${meta.join("")}</div>${qtyBlock}</div><div class="cfoot">${buy}<button class="iconbtn" data-label="${it.id}" title="Barcode label">${ic("tag")}</button><button class="iconbtn" data-edit="${it.id}" title="Edit">${ic("edit")}</button></div></div>`;
}
const expanded=new Set();
function bump(id,d,unit){const it=state.items.find(i=>i.id===id);if(!it)return;const step=unit?1:(it.perPack>0?it.perPack:1);it.qty=Math.max(0,Number(it.qty)+d*step);persist();render()}

