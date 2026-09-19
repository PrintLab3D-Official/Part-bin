/* =====================================================================
   Parts Bin — Orders: editor, order cards, mark-arrived
   ===================================================================== */
/* ---------- orders ---------- */
let orderEdit=null,oImg=null;
function paintODrop(){const d=$("#oDrop");if(oImg){d.classList.add("has");d.innerHTML=`<img src="${esc(oImg)}" referrerpolicy="no-referrer"><div class="rm" id="oRm">✕ Remove</div>`;$("#oRm").onclick=e=>{e.stopPropagation();oImg=null;paintODrop();};}else{d.classList.remove("has");d.innerHTML=`<div id="oDropMsg">Click or drop an image</div>`;}}
function oHandleFile(file){if(!file||!file.type.startsWith("image/"))return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const max=700,sc=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=im.width*sc;c.height=im.height*sc;c.getContext("2d").drawImage(im,0,0,c.width,c.height);oImg=c.toDataURL("image/jpeg",0.85);paintODrop();};im.src=r.result;};r.readAsDataURL(file);}
$("#oDrop").onclick=e=>{if(e.target.id!=="oRm")$("#oFile").click();};
$("#oFile").onchange=e=>oHandleFile(e.target.files[0]);
$("#oDrop").ondragover=e=>{e.preventDefault();};
$("#oDrop").ondrop=e=>{e.preventDefault();oHandleFile(e.dataTransfer.files[0]);};
function orderLines(o){if(Array.isArray(o.items)&&o.items.length)return o.items;return [{name:o.name||"",type:o.type||"components",qty:o.qty||1,price:o.price||0,loc:o.loc||"",link:o.link||""}];}
/* The library item an order line will top up when it arrives: Original ID first, then type + name. */
function orderLineExisting(l){
  const id=String(l.lcsc||"").trim().toLowerCase();
  if(id){const hit=state.items.find(i=>String(i.lcsc||"").trim().toLowerCase()===id);if(hit)return hit;}
  const n=String(l.name||"").trim().toLowerCase();if(!n)return null;
  return state.items.find(i=>i.type===(l.type||"components")&&String(i.name||"").toLowerCase()===n)||null;
}
function orderUnits(o){return orderLines(o).reduce((s,l)=>s+Number(l.qty||0),0);}
let oLines=[];
function blankLine(){const keys=itemTypeKeys();return {name:"",type:(keys.includes(state.tab)?state.tab:(keys[0]||"components")),qty:1,price:0,loc:"",lcsc:"",link:"",img:null,comp:""};}
/* Type list = itemTypeKeys() (no hidden tabs, custom tabs included); a saved line whose type is now hidden keeps its option so it still shows. */
function oBadgeHTML(l){const ex=orderLineExisting(l);return ex?`<span class="oi-exists" title="When this order arrives the quantity is added to this item">✓ in library as ${esc(ex.partId||"")} — quantity will be added</span>`:`<span class="oi-new">New item when it arrives</span>`;}
function oUpdateBadge(i){const el=$("#oItems").querySelector('.oi-badge[data-badge="'+i+'"]');if(el&&oLines[i])el.innerHTML=oBadgeHTML(oLines[i]);}
function oRowHTML(l,i){
  const keys=itemTypeKeys();if(l.type&&TYPES[l.type]&&!keys.includes(l.type))keys.push(l.type);
  const opts=keys.map(t=>`<option value="${t}" ${l.type===t?"selected":""}>${TYPES[t].label}</option>`).join("");
  const comps='<option value="">Location — none</option>'+state.compartments.map(c=>`<option value="${c.id}" ${l.comp===c.id?"selected":""}>${esc(c.name)}</option>`).join("");
  const ex=orderLineExisting(l);
  const badge=`<span class="oi-badge" data-badge="${i}">${oBadgeHTML(l)}</span>`;
  return `<div class="oitem">`+
    `<div class="oi-row"><input class="oi-name" data-i="${i}" placeholder="Product name (e.g. PLA filament, black)" value="${esc(l.name||"")}"><select class="oi-type" data-i="${i}" title="Goes into">${opts}</select><input class="oi-qty" data-i="${i}" type="number" min="1" value="${l.qty||1}" title="Quantity" style="width:60px"><input class="oi-price" data-i="${i}" type="number" min="0" step="0.01" placeholder="${esc(cur())} ea" value="${l.price||''}" title="Price each" style="width:78px">${oLines.length>1?`<button type="button" class="oi-del" data-i="${i}" title="Remove this product">✕</button>`:""}</div>`+
    `<div class="oi-row"><div class="oi-photo ${l.img?'has':''}" data-photo="${i}" title="Photo (tap to choose)">${l.img?`<img src="${esc(l.img)}" alt="">`:"<span>+</span>"}</div><input class="oi-lcsc" data-i="${i}" placeholder="Original ID" value="${esc(l.lcsc||"")}" title="The supplier's catalogue ID" style="width:110px"><input class="oi-link" data-i="${i}" placeholder="Buy link" value="${esc(l.link||"")}" title="Product link"><button type="button" class="scanmini oi-fill" data-fill="${i}" title="Fetch the photo and price from the link">Auto-fill</button><select class="oi-comp" data-i="${i}" title="Where it goes when it arrives">${comps}</select></div>`+
    `<div class="oi-row"><input class="oi-imgurl" data-i="${i}" placeholder="Image URL (or tap the photo box)" value="${esc(l.imgUrl||"")}"></div>`+
    `<div class="oi-row oi-status">${badge}</div>`+
  `</div>`;
}
const oPhotoInput=document.createElement("input");oPhotoInput.type="file";oPhotoInput.accept="image/*";oPhotoInput.style.display="none";document.body.appendChild(oPhotoInput);
let oPhotoRow=-1;
oPhotoInput.onchange=e=>{const f=e.target.files[0];e.target.value="";if(oPhotoRow<0)return;readImageFile(f,url=>{if(oLines[oPhotoRow]){oLines[oPhotoRow].img=url;renderOLines();}});};
async function oAutoFill(i,btn){
  const l=oLines[i];if(!l)return;const url=String(l.link||"").trim();
  if(!/^https?:\/\//i.test(url))return toast("Paste a full product link on that row first");
  if(btn){btn.disabled=true;btn.textContent="…";}
  try{const m=await fetchLinkMeta(url);const got=[];if(m.img){l.img=m.img;got.push("photo");}if(m.price&&!(l.price>0)){l.price=m.price;got.push("price");}renderOLines();toast(got.length?"Got "+got.join(" + "):"Nothing found on that page");}
  catch(e){toast("Couldn't read that site (it may block this)");if(btn){btn.disabled=false;btn.textContent="Auto-fill";}}
}
function oSyncConvert(){const b=$("#oConvert");if(!b)return;b.style.display=(curSupplier()===curBase())?"none":"";b.textContent=curConvertLabel(oLines);}
function renderOLines(){
  const c=$("#oItems");c.innerHTML=oLines.map(oRowHTML).join("");
  c.querySelectorAll(".oi-name").forEach(el=>el.oninput=()=>{oLines[+el.dataset.i].name=el.value;oUpdateBadge(+el.dataset.i);});
  c.querySelectorAll(".oi-type").forEach(el=>el.onchange=()=>{oLines[+el.dataset.i].type=el.value;oUpdateBadge(+el.dataset.i);});
  c.querySelectorAll(".oi-qty").forEach(el=>el.oninput=()=>oLines[+el.dataset.i].qty=Math.max(1,Number(el.value)||1));
  c.querySelectorAll(".oi-price").forEach(el=>el.oninput=()=>{const l=oLines[+el.dataset.i];l.price=Number(el.value)||0;delete l._conv;});
  c.querySelectorAll(".oi-lcsc").forEach(el=>el.oninput=()=>{oLines[+el.dataset.i].lcsc=el.value.trim();oUpdateBadge(+el.dataset.i);});
  c.querySelectorAll(".oi-link").forEach(el=>el.oninput=()=>oLines[+el.dataset.i].link=el.value.trim());
  c.querySelectorAll(".oi-imgurl").forEach(el=>el.onchange=()=>{const l=oLines[+el.dataset.i];const v=el.value.trim();l.imgUrl=v;if(/^https?:\/\//i.test(v)){l.img=v;renderOLines();}});
  c.querySelectorAll(".oi-comp").forEach(el=>el.onchange=()=>oLines[+el.dataset.i].comp=el.value);
  c.querySelectorAll(".oi-photo").forEach(el=>el.onclick=()=>{oPhotoRow=+el.dataset.photo;oPhotoInput.click();});
  c.querySelectorAll(".oi-fill").forEach(el=>el.onclick=()=>oAutoFill(+el.dataset.fill,el));
  c.querySelectorAll(".oi-del").forEach(el=>el.onclick=()=>{oLines.splice(+el.dataset.i,1);renderOLines();});
  oSyncConvert();
}
$("#oAddItem").onclick=()=>{oLines.push(blankLine());renderOLines();};
$("#oConvert").onclick=async()=>{await curConvertRows(oLines,$("#oConvert"));renderOLines();};
/* Fill this order from a BOM file (parsed by js/23-bom.js). Items only reach
   the library when the order is marked arrived — same as any other order. */
function orderImportBom(rows,filename){
  const parsed=bomReadRows(rows);
  if(!parsed.length)return toast("No components found in that file");
  const lines=parsed.map(r=>({name:(r.name||r.lcsc||"").trim(),type:"components",qty:Math.max(1,Number(r.qty)||1),price:Number(r.price)||0,loc:"",lcsc:String(r.lcsc||"").trim(),link:String(r.link||"").trim(),img:null,comp:""})).filter(l=>l.name);
  if(oLines.length===1&&!(oLines[0].name||"").trim())oLines=lines;else oLines=oLines.concat(lines);
  renderOLines();
  if(!$("#oName").value.trim())$("#oName").value=String(filename||"BOM order").replace(/\.[^.]+$/,"");
  toast("Imported "+lines.length+" product"+(lines.length===1?"":"s")+" into this order");
}
$("#oImportBom").onclick=()=>bomPickFile(orderImportBom);
function openOrder(id){const o=id?state.orders.find(x=>x.id===id):null;orderEdit=id||null;$("#orderTitle").textContent=id?"Edit order":"New order";$("#oName").value=o?.name||"";$("#oTracking").value=o?.tracking||"";$("#oExp").value=o?.exp||"";oImg=o?.img||null;paintODrop();oLines=o?orderLines(o).map(l=>({name:l.name||"",type:l.type||"components",qty:l.qty||1,price:l.price||0,loc:l.loc||"",lcsc:l.lcsc||"",link:l.link||"",img:l.img||null,comp:l.comp||""})):[blankLine()];renderOLines();$("#oDelete").style.display=id?"block":"none";$("#orderOverlay").classList.add("show");$("#oName").focus();}
function closeOrder(){$("#orderOverlay").classList.remove("show");}
$("#orderClose").onclick=closeOrder;$("#oCancel").onclick=closeOrder;
$("#orderOverlay").onclick=e=>{if(e.target===$("#orderOverlay"))closeOrder()};
$("#oDelete").onclick=()=>{if(confirm("Delete this order?")){state.orders=state.orders.filter(x=>x.id!==orderEdit);persist();closeOrder();render();toast("Order deleted")}};
$("#oSave").onclick=()=>{const name=$("#oName").value.trim();if(!name)return toast("Give the order a name");const items=oLines.map(l=>({name:(l.name||"").trim(),type:l.type||"components",qty:Math.max(1,Number(l.qty)||1),price:Number(l.price)||0,loc:(l.loc||"").trim(),lcsc:(l.lcsc||"").trim(),link:(l.link||"").trim(),img:l.img||null,comp:l.comp||""})).filter(l=>l.name);if(!items.length)return toast("Add at least one product with a name");items.forEach(l=>{if(l.loc&&!state.locations.some(x=>x.toLowerCase()===l.loc.toLowerCase()))state.locations.push(l.loc);});const data={name,tracking:$("#oTracking").value.trim(),exp:$("#oExp").value,img:oImg||null,items};if(orderEdit){const ex=state.orders.find(x=>x.id===orderEdit);if(ex){Object.assign(ex,data);delete ex.type;delete ex.qty;delete ex.price;delete ex.loc;delete ex.link;}}else{data.id=uid();data.status="pending";data.created=Date.now();state.orders.push(data);}persist();closeOrder();render();toast("Order saved");};
function receiveOrder(o){const lines=orderLines(o);lines.forEach(l=>{let it=orderLineExisting(l);if(it){it.qty=Number(it.qty)+Number(l.qty||1);if(!it.lcsc&&l.lcsc)it.lcsc=l.lcsc;if(!it.link&&l.link)it.link=l.link;if(!it.img&&l.img)it.img=l.img;if(l.price>0&&!(it.price>0))it.price=Number(l.price);}else{it={id:uid(),type:l.type,name:l.name,qty:Number(l.qty||1),low:state.settings.defLow||0,loc:l.loc||"",price:Number(l.price||0),link:l.link||"",code:"",lcsc:l.lcsc||"",img:l.img||(lines.length===1?(o.img||null):null),imgFit:"cover",imgPos:"50% 50%",imgZoom:1,material:"",dia:"",color:"",colorName:"",weight:""};if(l.comp&&state.compartments.some(c=>c.id===l.comp)){it.comp=l.comp;it.loc="";}it.partId=nextPartId(l.type);state.items.push(it);}});o.status="arrived";o.arrivedAt=Date.now();if(state.settings.autoArchive)o.archived=true;return lines;}
function arriveOrder(id){const o=state.orders.find(x=>x.id===id);if(!o||o.status==="arrived")return;const lines=orderLines(o);const units=lines.reduce((s,l)=>s+Number(l.qty||0),0);if(!confirm('Mark "'+o.name+'" as arrived and add '+lines.length+' product'+(lines.length>1?'s':'')+' ('+units+' units) to your inventory?'))return;receiveOrder(o);persist();render();toast(o.name+" arrived \u2014 "+units+" units added \u2713");}
function dueText(exp){try{const d=new Date(exp+"T00:00:00");const n=new Date();n.setHours(0,0,0,0);const days=Math.round((d-n)/86400000);if(isNaN(days))return "due "+exp;if(days<0)return "overdue";if(days===0)return "due today";if(days===1)return "due tomorrow";return "in "+days+" days";}catch(e){return "due "+exp;}}
function renderOrders(){
  $("#toolbar").style.display="none";
  const list=state.orders.filter(o=>!o.archived).sort((a,b)=>((a.status==="arrived")-(b.status==="arrived"))||((b.created||0)-(a.created||0)));
  const pending=list.filter(o=>o.status!=="arrived");
  const inc=pending.reduce((s,o)=>s+orderUnits(o),0);
  $("#stats").innerHTML=`<div class="stat"><div class="n">${pending.length}</div><div class="l">On the way</div></div><div class="stat"><div class="n">${inc}</div><div class="l">Units incoming</div></div><div class="stat"><div class="n">${list.length-pending.length}</div><div class="l">Arrived</div></div>`;
  const grid=$("#grid");
  if(!list.length){grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="big">${ic("orders")}</div>No orders yet. Hit <b>New order</b> to track a package.</div>`;return;}
  grid.innerHTML=list.map(orderCard).join("");
  list.forEach(o=>{const e=grid.querySelector(`[data-edit="${o.id}"]`);if(e)e.onclick=()=>openOrder(o.id);const a=grid.querySelector(`[data-arr="${o.id}"]`);if(a)a.onclick=()=>arriveOrder(o.id);const ar=grid.querySelector(`[data-oarc="${o.id}"]`);if(ar)ar.onclick=()=>{o.archived=true;persist();render();toast("Order archived");};});
}
function orderCard(o){const arr=o.status==="arrived";const lines=orderLines(o);const units=lines.reduce((s,l)=>s+Number(l.qty||0),0);
  const photo=o.img?`<img src="${esc(o.img)}" referrerpolicy="no-referrer">`:`<div class="ph">${ic("orders")}</div>`;
  const meta=[`<span class="chip">${ic("orders")} ${lines.length} product${lines.length>1?'s':''}</span>`,`<span class="chip">×${units} units</span>`];
  if(o.exp&&!arr)meta.push(`<span class="chip">${ic("cal")} ${esc(dueText(o.exp))}</span>`);
  if(o.tracking)meta.push(`<span class="chip" title="Tracking hidden — tap edit to view">${ic("code")} ${esc(maskTrack(o.tracking))}</span>`);
  const prodList=lines.slice(0,4).map(l=>{const T=TYPES[l.type]||TYPES.components;return `<div class="oline"><span>${ic(T.icon)} ${esc(l.name)}</span><b>×${l.qty||1}</b></div>`;}).join("")+(lines.length>4?`<div class="oline more">+${lines.length-4} more</div>`:"");
  const track=o.tracking?`<a href="https://t.17track.net/en#nums=${encodeURIComponent(o.tracking)}" target="_blank" rel="noopener" style="flex:1;text-decoration:none"><div class="buybtn" style="background:var(--accent);color:#fff">Track</div></a>`:"";
  const arrBtn=arr?`<div class="status arrived">${ic("check")} In inventory</div>`:`<button class="btn-primary" data-arr="${o.id}" style="flex:1;justify-content:center;background:var(--green);color:#04210f">${ic("check")} Arrived</button>`;
  return `<div class="ocard ${arr?'arrived':''}"><div class="othumb">${photo}<span class="status ${arr?'arrived':'pending'}" style="position:absolute;top:10px;left:10px">${arr?'Arrived':'On the way'}</span></div><div class="obody"><div class="cname">${esc(o.name)}</div><div class="meta">${meta.join("")}</div><div class="olines">${prodList}</div><div class="ofoot">${track}${arrBtn}<button class="iconbtn" data-edit="${o.id}">${ic("edit")}</button><button class="iconbtn" data-oarc="${o.id}" title="Archive order">${ic("archive")}</button></div></div></div>`;
}

