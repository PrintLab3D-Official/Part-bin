/* =====================================================================
   Parts Bin — Add/Edit item: modal, image fit/zoom, autocomplete, auto-fill
   ===================================================================== */
/* ---------- add/edit item ---------- */
function applyTypeFields(){const t=$("#fType").value;$("#filFields").style.display=t==='filament'?"flex":"none";$("#qtyLabel").textContent=t==='filament'?"Spools / Quantity *":(t==='pcbs'?"Boards / Quantity *":"Amount / Quantity *");const it=state.editId?state.items.find(i=>i.id===state.editId):null;$("#pidTag").textContent=(it&&it.partId)?("ID "+it.partId):("ID "+nextPartId(t)+" (auto)");$("#pidTag").style.display="inline-block";}
function openModal(id){
  state.editId=id;state.img=null;state.imgFit="cover";state.imgPos="50% 50%";
  const it=id?state.items.find(i=>i.id===id):null;
  /* New item: default to the current tab if it's a real item type (not orders/compartments/archive/hidden), else Components. */
  const keys=itemTypeKeys();
  const t=it?it.type:(keys.includes(state.tab)?state.tab:(keys[0]||"components"));
  $("#fType").value=t;
  $("#mTitle").textContent=id?"Edit item":"Add item";
  $("#mDelete").style.display=id?"block":"none";
  $("#fName").value=it?.name||"";$("#fQty").value=it?.qty??1;$("#fLow").value=it?(it.low??0):(state.settings.defLow||0);$("#fLoc").value=it?.loc||"";
  $("#fPrice").value=it?.price||"";$("#fLink").value=it?.link||"";$("#fCode").value=it?.code||"";$("#fLcsc").value=it?.lcsc||"";$("#fImgUrl").value=(it&&it.img&&/^https?:/.test(it.img))?it.img:"";
  $("#fMaterial").value=it?.material||"";$("#fDia").value=it?.dia||"1.75 mm";$("#fColor").value=it?.color||"#3b82f6";$("#fColorName").value=it?.colorName||"";$("#fWeight").value=it?.weight||"";
  state.img=it?.img||null;state.imgFit=it?.imgFit||"cover";state.imgPos=it?.imgPos||"50% 50%";state.imgZoom=it?.imgZoom||1;
  $("#fPackChk").checked=!!(it&&it.perPack);$("#fPerPack").value=(it&&it.perPack)||"";$("#packRow").style.display=(it&&it.perPack)?"block":"none";
  placeSel=id?findPlacement(id):null;updatePlaceLabel();
  syncFitControls();applyTypeFields();paintDrop();$("#overlay").classList.add("show");$("#fName").focus();
}
$("#fType").onchange=applyTypeFields;
function parsePos(){const p=(state.imgPos||"50% 50%").split(" ");return{x:parseInt(p[0])||50,y:parseInt(p[1])||50}}
function syncFitControls(){const fit=state.imgFit||"cover";$("#fitCover").classList.toggle("on",fit==="cover");$("#fitContain").classList.toggle("on",fit==="contain");const ph=$("#posHint");if(ph)ph.style.display=fit==="cover"?"block":"none";const zr=$("#zoomRow");if(zr)zr.style.display=fit==="cover"?"flex":"none";const z=state.imgZoom||1;if($("#fZoom"))$("#fZoom").value=Math.round(z*100);if($("#zoomVal"))$("#zoomVal").textContent=z.toFixed(1)+"×";}
function paintDrop(){const d=$("#drop");if(state.img){d.classList.add("has");d.innerHTML=`<img src="${esc(state.img)}" referrerpolicy="no-referrer" draggable="false" style="object-fit:${state.imgFit};object-position:${state.imgPos};${state.imgFit==='cover'&&(state.imgZoom||1)!==1?`transform:scale(${state.imgZoom});transform-origin:${state.imgPos};`:''}cursor:${state.imgFit==='cover'?'move':'default'}"><div class="rep" id="repImg">↺ Replace</div><div class="rm" id="rmImg">✕ Remove</div>`;$("#rmImg").onclick=e=>{e.stopPropagation();state.img=null;$("#fImgUrl").value="";paintDrop();};$("#repImg").onclick=e=>{e.stopPropagation();fileInput.click();};$("#fitRow").style.display="block";setupDrag();}else{d.classList.remove("has");d.innerHTML=`<div id="dropMsg">Click or drop an image here</div>`;$("#fitRow").style.display="none";}}
function setupDrag(){const d=$("#drop"),img=d.querySelector("img");if(!img)return;let drag=false;function setPos(e){if(state.imgFit!=="cover")return;const r=img.getBoundingClientRect();const x=Math.round(Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)));const y=Math.round(Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100)));state.imgPos=x+"% "+y+"%";img.style.objectPosition=state.imgPos;img.style.transformOrigin=state.imgPos;}d.onpointerdown=e=>{if(e.target.id==="rmImg"||e.target.id==="repImg"||state.imgFit!=="cover")return;drag=true;try{d.setPointerCapture(e.pointerId);}catch(_){}setPos(e);};d.onpointermove=e=>{if(drag)setPos(e);};d.onpointerup=d.onpointercancel=()=>{drag=false;};}
$("#fitCover").onclick=()=>{state.imgFit="cover";syncFitControls();paintDrop();};
$("#fitContain").onclick=()=>{state.imgFit="contain";syncFitControls();paintDrop();};
$("#fZoom").oninput=()=>{state.imgZoom=(+$("#fZoom").value)/100;if($("#zoomVal"))$("#zoomVal").textContent=state.imgZoom.toFixed(1)+"×";const img=$("#drop img");if(img&&state.imgFit==="cover"){img.style.transform=state.imgZoom!==1?"scale("+state.imgZoom+")":"";img.style.transformOrigin=state.imgPos;}};
$("#fPackChk").onchange=()=>{$("#packRow").style.display=$("#fPackChk").checked?"block":"none";};
$("#addPackBtn").onclick=()=>{const pp=Number($("#fPerPack").value)||0;if(pp>0){$("#fQty").value=(Number($("#fQty").value)||0)+pp;toast("Added a pack of "+pp);}};
function closeModal(){$("#overlay").classList.remove("show");$("#acMat").classList.remove("show");$("#acLoc").classList.remove("show")}
$("#addBtn").onclick=()=>{if(state.tab==="projects")openProject(null);else if(state.tab==="orders")openOrder(null);else if(state.tab==="compartments")openComp(null);else openModal(null);};
$("#mClose").onclick=closeModal;$("#mCancel").onclick=closeModal;
$("#overlay").onclick=e=>{if(e.target===$("#overlay"))closeModal()};
$("#mDelete").onclick=()=>{if(confirm("Delete this item?")){const did=state.editId;state.items=state.items.filter(i=>i.id!==did);state.compartments.forEach(c=>(c.cells||[]).forEach(cell=>{if(cell&&cell.itemId===did)cell.itemId="";}));persist();closeModal();render();toast("Deleted")}};
$("#mSave").onclick=()=>{
  const name=$("#fName").value.trim();if(!name)return toast("Name is required");
  const t=$("#fType").value,fil=t==='filament';
  /* Free-text location is legacy: kept as stored (never lost) but cleared once the part is placed in a compartment. */
  let loc=$("#fLoc").value.trim();if(placeSel)loc="";
  const data={type:t,name,qty:Math.max(0,Number($("#fQty").value)||0),low:Math.max(0,Number($("#fLow").value)||0),loc,price:Number($("#fPrice").value)||0,link:$("#fLink").value.trim(),code:$("#fCode").value.trim(),lcsc:$("#fLcsc").value.trim(),img:state.img||null,imgFit:state.imgFit,imgPos:state.imgPos,imgZoom:state.imgZoom||1,perPack:($("#fPackChk").checked?Math.max(0,Number($("#fPerPack").value)||0):0),material:fil?$("#fMaterial").value.trim():"",dia:fil?$("#fDia").value:"",color:fil?$("#fColor").value:"",colorName:fil?$("#fColorName").value.trim():"",weight:fil?($("#fWeight").value||""):""};
  if(fil&&data.material&&!state.materials.some(m=>m.toLowerCase()===data.material.toLowerCase()))state.materials.push(data.material);
  if(loc&&!state.locations.some(l=>l.toLowerCase()===loc.toLowerCase()))state.locations.push(loc);
  if(state.editId){const ex=state.items.find(i=>i.id===state.editId);const oldType=ex.type;Object.assign(ex,data);if(oldType!==t&&!ex.partId.startsWith(TYPES[t].pre+'-'))ex.partId=nextPartId(t);}
  else{data.id=uid();data.partId=nextPartId(t);state.items.push(data);}
  const theId=state.editId||data.id;
  placeItem(theId,placeSel);
  persist();closeModal();render();toast("Saved");
};

$("#fImgUrl").oninput=e=>{const v=e.target.value.trim();if(v){state.img=v;paintDrop();}};
const drop=$("#drop"),fileInput=$("#fileInput");
drop.onclick=e=>{if(!state.img)fileInput.click();};
fileInput.onchange=e=>handleFile(e.target.files[0]);
drop.ondragover=e=>{e.preventDefault();drop.style.borderColor="var(--accent)"};
drop.ondragleave=()=>drop.style.borderColor="";
drop.ondrop=e=>{e.preventDefault();drop.style.borderColor="";handleFile(e.dataTransfer.files[0])};
function handleFile(file){if(!file||!file.type.startsWith("image/"))return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const max=700,sc=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=im.width*sc;c.height=im.height*sc;c.getContext("2d").drawImage(im,0,0,c.width,c.height);state.img=c.toDataURL("image/jpeg",0.85);$("#fImgUrl").value="";paintDrop();};im.src=r.result;};r.readAsDataURL(file);}

/* autocomplete */
function attachAC(input,list,supplier){
  let sel=-1;
  function build(){const v=input.value.toLowerCase().trim();let m=supplier().filter(x=>x.toLowerCase().includes(v));m.sort((a,b)=>{const ap=a.toLowerCase().startsWith(v)?0:1,bp=b.toLowerCase().startsWith(v)?0:1;return ap-bp||a.localeCompare(b)});let html=m.slice(0,8).map(x=>`<div class="acitem">${esc(x)}</div>`).join("");const exact=supplier().some(x=>x.toLowerCase()===v);if(v&&!exact)html+=`<div class="acitem acnew" data-new="1">+ Add "${esc(input.value.trim())}"</div>`;if(!html){list.classList.remove("show");return;}list.innerHTML=html;sel=-1;[...list.querySelectorAll(".acitem")].forEach(el=>el.onmousedown=e=>{e.preventDefault();input.value=el.dataset.new?input.value.trim():el.textContent;list.classList.remove("show");});list.classList.add("show");}
  input.addEventListener("input",build);input.addEventListener("focus",build);
  input.addEventListener("keydown",e=>{const items=[...list.querySelectorAll(".acitem")];if(e.key==="ArrowDown"){e.preventDefault();sel=Math.min(items.length-1,sel+1);items.forEach((el,i)=>el.classList.toggle("sel",i===sel));}else if(e.key==="ArrowUp"){e.preventDefault();sel=Math.max(0,sel-1);items.forEach((el,i)=>el.classList.toggle("sel",i===sel));}else if(e.key==="Enter"&&sel>=0&&items[sel]){e.preventDefault();const el=items[sel];input.value=el.dataset.new?input.value.trim():el.textContent;list.classList.remove("show");}else if(e.key==="Escape")list.classList.remove("show");});
  document.addEventListener("click",e=>{if(!list.parentElement.contains(e.target))list.classList.remove("show");});
}
attachAC($("#fMaterial"),$("#acMat"),()=>state.materials);
attachAC($("#fLoc"),$("#acLoc"),()=>state.locations);
attachAC($("#pLoc"),$("#acPLoc"),()=>state.locations);

["search","sortSel","lowSel"].forEach(id=>$("#"+id).oninput=render);

/* Read a product page's photo + price (og: tags, then JSON-LD). Shared by the
   item editor, the BOM review and the order editor. Throws if unreachable. */
async function fetchLinkMeta(url){
  const html=await fetchPage(url);const doc=new DOMParser().parseFromString(html,"text/html");
  const og=p=>{const m=doc.querySelector(`meta[property="${p}"],meta[name="${p}"]`);return m?m.getAttribute("content"):null;};
  let img=og("og:image")||og("og:image:secure_url")||og("twitter:image")||og("twitter:image:src");
  let price=og("product:price:amount")||og("og:price:amount")||og("twitter:data1");
  if(!price){for(const s of doc.querySelectorAll('script[type="application/ld+json"]')){try{const off=findOffer(JSON.parse(s.textContent));if(off){price=off;break;}}catch(e){}}}
  if(img)img=new URL(img,url).href;
  if(price){price=String(price).replace(/[^0-9.]/g,"");price=price?+price:0;}
  return {img:img||"",price:price||0};
}
/* Downscale a picked image file to a data URL (same size the item editor stores). */
function readImageFile(file,cb){
  if(!file||!file.type.startsWith("image/"))return;
  const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const max=700,sc=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=im.width*sc;c.height=im.height*sc;c.getContext("2d").drawImage(im,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",0.85));};im.src=r.result;};r.readAsDataURL(file);
}
/* auto-fill from link */
$("#autofillBtn").onclick=async()=>{
  const url=$("#fLink").value.trim();
  if(!url||!/^https?:/.test(url))return toast("Paste a full product link first (https://…)");
  toast("Fetching from "+(shopName(url)||"link")+"…");
  try{
    const html=await fetchPage(url);const doc=new DOMParser().parseFromString(html,"text/html");
    const og=p=>{const m=doc.querySelector(`meta[property="${p}"],meta[name="${p}"]`);return m?m.getAttribute("content"):null;};
    let img=og("og:image")||og("og:image:secure_url")||og("twitter:image")||og("twitter:image:src");
    let price=og("product:price:amount")||og("og:price:amount")||og("twitter:data1");
    if(!price){const ld=[...doc.querySelectorAll('script[type="application/ld+json"]')];for(const s of ld){try{const j=JSON.parse(s.textContent);const off=findOffer(j);if(off){price=off;break;}}catch(e){}}}
    let got=[];
    if(img){img=new URL(img,url).href;state.img=img;state.imgFit="cover";state.imgPos="50% 50%";$("#fImgUrl").value=img;syncFitControls();paintDrop();got.push("image");}
    if(price){price=String(price).replace(/[^0-9.]/g,"");if(price){$("#fPrice").value=price;got.push("price");}}
    toast(got.length?("Got "+got.join(" + ")+" ✓"):"No image/price found — paste an image URL instead");
  }catch(e){toast("Couldn't read that site (it may block this). Paste an image URL instead.");}
};
function findOffer(j){if(!j)return null;if(Array.isArray(j)){for(const x of j){const r=findOffer(x);if(r)return r;}return null;}if(typeof j==="object"){if(j.offers){const o=Array.isArray(j.offers)?j.offers[0]:j.offers;if(o&&(o.price||o.lowPrice))return o.price||o.lowPrice;}if(j.price)return j.price;for(const k in j){if(typeof j[k]==="object"){const r=findOffer(j[k]);if(r)return r;}}}return null;}
async function fetchPage(url){try{const r=await fetch(url,{mode:"cors"});if(r.ok)return await r.text();}catch(e){}const proxies=["https://api.allorigins.win/raw?url=","https://corsproxy.io/?url="];for(const p of proxies){try{const r=await fetch(p+encodeURIComponent(url));if(r.ok){const t=await r.text();if(t&&t.length>200)return t;}}catch(e){}}throw new Error("blocked");}

