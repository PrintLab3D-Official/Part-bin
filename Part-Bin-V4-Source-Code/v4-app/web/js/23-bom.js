/* =====================================================================
   Parts Bin — BOM: import a bill of materials, export the current list
   ---------------------------------------------------------------------
   Import: pick a CSV, every component in it is listed for review, you can
   add a buy link and a photo per row, then they all go into the library as
   brand-new items (same shape js/07-items.js saves).

   Export: writes CSV only — it never touches stored data.
   ===================================================================== */

/* ---------- CSV in ---------- */
/* RFC-4180: honours quoted fields containing commas, quotes and newlines. */
function bomParseCSV(text){
  text=String(text||"").replace(/^﻿/,"");
  const rows=[];let row=[],f="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}
      else f+=c;
    }else{
      if(c==='"')q=true;
      else if(c===','){row.push(f);f="";}
      else if(c==='\r'){}
      else if(c==='\n'){row.push(f);f="";rows.push(row);row=[];}
      else f+=c;
    }
  }
  if(f!==""||row.length){row.push(f);rows.push(row);}
  return rows.filter(r=>r.some(x=>String(x).trim()!==""));
}

/* Column aliases seen across common CAD-tool and supplier BOM exports.
   Designator and Footprint are deliberately ignored.
   The supplier-part aliases still include vendor-specific spellings so real
   files import cleanly — this is match-only text, never shown to the user. */
const BOM_COLS={
  lcsc :["supplier part #","supplier part number","supplier part","order code","lcsc part #","lcsc part number","lcsc part","lcsc#","lcsc","jlcpcb part #","jlcpcb part"],
  qty  :["quantity","qty","count","amount","pcs"],
  name :["comment","name","description","part","part name","component","value","mpn","title","product"],
  link :["buy link","product link","supplier link","link","url"],
  price:["unit price","price each","price","cost"]
};
function bomMatchCol(h){
  const k=String(h||"").trim().toLowerCase().replace(/\s+/g," ");
  if(!k)return null;
  for(const field of ["lcsc","qty","link","price","name"]){
    if(BOM_COLS[field].some(a=>a===k))return field;
  }
  for(const field of ["lcsc","qty","link","price","name"]){
    if(BOM_COLS[field].some(a=>k.includes(a)))return field;
  }
  return null;
}
/* Find the header row (first row where 2+ cells are recognisable), then map. */
function bomReadRows(rows){
  let hIdx=-1,map=null;
  for(let i=0;i<Math.min(rows.length,12);i++){
    const m={},hits=[];
    rows[i].forEach((h,j)=>{const f=bomMatchCol(h);if(f&&m[f]===undefined){m[f]=j;hits.push(f);}});
    if(hits.length>=2||(hits.length===1&&(m.lcsc!==undefined||m.name!==undefined))){hIdx=i;map=m;break;}
  }
  const out=[];
  if(hIdx<0){ /* no header we recognise — treat column 0 as the name */
    rows.forEach(r=>{const n=String(r[0]||"").trim();if(n)out.push({name:n,qty:1,lcsc:"",link:"",price:0});});
    return out;
  }
  for(let i=hIdx+1;i<rows.length;i++){
    const r=rows[i];
    const g=f=>(map[f]===undefined?"":String(r[map[f]]==null?"":r[map[f]]).trim());
    const name=g("name"),lcsc=g("lcsc");
    if(!name&&!lcsc)continue;
    const qn=parseFloat(g("qty").replace(/[^0-9.\-]/g,""));
    const pn=parseFloat(g("price").replace(/[^0-9.\-]/g,""));
    out.push({
      name:name||lcsc,
      qty:(isFinite(qn)&&qn>0)?Math.round(qn):1,
      lcsc:lcsc,
      link:/^https?:\/\//i.test(g("link"))?g("link"):"",
      price:(isFinite(pn)&&pn>0)?pn:0
    });
  }
  return out;
}

/* ---------- CSV out ---------- */
/* Quote when the value could otherwise break the row; "" stays empty, never
   "null"/"undefined"/"None". Doubles any embedded quote, per RFC-4180. */
function bomCell(v){
  if(v===null||v===undefined)return"";
  let s=String(v);
  if(s==="undefined"||s==="null")return"";
  if(/[",\r\n]/.test(s))s='"'+s.replace(/"/g,'""')+'"';
  return s;
}
function bomCsv(headers,rows){
  return [headers.map(bomCell).join(",")].concat(rows.map(r=>r.map(bomCell).join(","))).join("\r\n")+"\r\n";
}
/* UTF-8 BOM so Excel opens µ, Ω and ° correctly instead of mojibake. */
function bomDownload(filename,csv){
  const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
function bomToday(){return new Date().toISOString().slice(0,10);}

/* ---------- state ---------- */
let bomDraft=[];        /* parsed rows awaiting review */
let bomScope="view";    /* "view" = what's on screen, "all" = whole library */
let bomPhotoRow=-1;     /* which review row asked for a photo */

function bomExportList(){
  if(bomScope==="all")return state.items.slice();
  return (state.viewList&&state.viewList.length!==undefined)?state.viewList.slice():state.items.slice();
}

/* ---------- open / close ---------- */
function openBom(){
  bomDraft=[];bomPhotoRow=-1;
  $("#bomReview").style.display="none";
  $("#bomHome").style.display="";
  $("#bomAdd").style.display="none";
  $("#bomBack").style.display="none";
  $("#bomCount").style.display="none";
  $("#bomTitle").textContent="BOM";
  bomSyncScope();
  $("#bomOverlay").classList.add("show");
}
function closeBom(){$("#bomOverlay").classList.remove("show");$("#acBomLoc").classList.remove("show");}

function bomSyncScope(){
  $("#bomScopeView").classList.toggle("on",bomScope==="view");
  $("#bomScopeAll").classList.toggle("on",bomScope==="all");
  const list=bomExportList();
  const missing=list.filter(i=>!String(i.lcsc||"").trim()).length;
  $("#bomScopeHint").innerHTML=bomScope==="all"
    ? `All <b>${list.length}</b> items in your library.`
    : `The <b>${list.length}</b> item${list.length===1?"":"s"} showing right now — your search, filter and sort are kept.`;
  const row=$("#bomSkipRow");
  if(missing>0){
    row.style.display="";
    $("#bomSkipTxt").innerHTML=`<b>${missing}</b> of these have no Original ID. Leave them out of the order export?`;
  }else{
    row.style.display="none";$("#bomSkipNoLcsc").checked=false;
  }
}

/* ---------- export ---------- */
function bomDoExportJlc(){
  let list=bomExportList();
  const total=list.length;
  const skip=$("#bomSkipNoLcsc").checked;
  if(skip)list=list.filter(i=>String(i.lcsc||"").trim());
  if(!list.length)return toast("Nothing to export");
  const missing=list.filter(i=>!String(i.lcsc||"").trim()).length;
  const rows=list.map(i=>[
    i.name||"",
    String(i.lcsc||"").trim(),
    Number(i.qty||0),
    bomDescribe(i)
  ]);
  const file="parts-bin-bom-"+bomToday()+".csv";
  bomDownload(file,bomCsv(["Comment","Original ID","Quantity","Description"],rows));
  let msg=`Exported ${rows.length} row${rows.length===1?"":"s"} to ${file}`;
  if(skip&&total>rows.length)msg+=` — ${total-rows.length} left out (no Original ID)`;
  else if(missing)msg+=` — ${missing} have no Original ID`;
  toast(msg);
}
function bomDescribe(i){
  const T=TYPES[i.type]||TYPES.components;
  const bits=[T.one];
  if(i.material)bits.push(i.material);
  if(i.colorName)bits.push(i.colorName);
  if(i.dia)bits.push(i.dia);
  if(i.perPack>0)bits.push("pack of "+i.perPack);
  return bits.join(", ");
}
function bomDoExportFull(){
  const list=bomExportList();
  if(!list.length)return toast("Nothing to export");
  const headers=["Part ID","Type","Name","Original ID","Quantity","Units Per Pack","Low Stock Alert",
    "Location","Compartment","Price Each","Currency","Buy Link","Barcode",
    "Material","Diameter","Colour","Colour Name","Weight (g)","Has Photo"];
  const rows=list.map(i=>{
    let comp="";try{comp=compartmentOf(i.id)||"";}catch(e){}
    return [
      i.partId||"",TYPES[i.type]?TYPES[i.type].one:(i.type||""),i.name||"",
      String(i.lcsc||"").trim(),Number(i.qty||0),
      i.perPack>0?i.perPack:"",i.low>0?i.low:"",
      i.loc||"",comp,
      i.price>0?Number(i.price):"",cur(),
      i.link||"",i.code||"",
      i.material||"",i.dia||"",i.color||"",i.colorName||"",i.weight||"",
      i.img?"yes":"no"
    ];
  });
  const file="parts-bin-full-"+bomToday()+".csv";
  bomDownload(file,bomCsv(headers,rows));
  toast(`Exported all ${rows.length} row${rows.length===1?"":"s"} to ${file}`);
}

/* The next free number for a type's part IDs, e.g. 11 if C-0010 is the highest. */
function bomNextNum(type){
  const pre=(TYPES[type]||TYPES.components).pre;
  const nums=state.items.filter(i=>(i.partId||"").startsWith(pre+"-")).map(i=>parseInt((i.partId.split("-")[1])||"0")||0);
  return (nums.length?Math.max(...nums):0)+1;
}

/* An item already in the library with the same Original ID, or null. */
function bomExisting(r){
  const id=String((r&&r.lcsc)||"").trim().toLowerCase();
  if(!id)return null;
  return state.items.find(it=>String(it.lcsc||"").trim().toLowerCase()===id)||null;
}

/* ---------- import: review screen ---------- */
function bomRenderReview(){
  const t=($("#bomType")&&$("#bomType").value)||"components";
  const pre=(TYPES[t]||TYPES.components).pre;
  let newN=bomNextNum(t);
  $("#bomRows").innerHTML=bomDraft.map((r,i)=>{
    const ex=bomExisting(r);
    const badge=ex
      ? `<span class="oi-exists" title="Already in your library — its quantity will be added to the existing item">✓ in library as ${esc(ex.partId||"")} — quantity will be added</span>`
      : `<span class="oi-new">New item ${esc(pre+"-"+String(newN++).padStart(4,"0"))}</span>`;
    return `<div class="oitem bom-row${ex?' isdupe':''}" data-r="${i}">`+
      `<div class="oi-row"><input type="text" class="oi-name bom-name" data-f="name" data-i="${i}" value="${esc(r.name)}" placeholder="Component name"><input type="number" class="bom-qty" data-f="qty" data-i="${i}" value="${Number(r.qty)||1}" min="0" title="Quantity" style="width:64px"><input type="number" class="bom-price" data-f="price" data-i="${i}" value="${r.price||''}" min="0" step="0.01" placeholder="${esc(cur())} ${r.pack?'per pack':'ea'}" title="${r.pack?'Price per pack':'Price each'}" style="width:90px"><button type="button" class="oi-del" data-del="${i}" title="Leave this one out">✕</button></div>`+
      `<div class="oi-row"><div class="oi-photo bom-photo ${r.img?'has':''}" data-photo="${i}" title="Photo (tap to choose)">${r.img?`<img src="${esc(r.img)}" alt="">`:`<span>+</span>`}</div><input type="text" class="oi-lcsc bom-lcsc" data-f="lcsc" data-i="${i}" value="${esc(r.lcsc)}" placeholder="Original ID" style="width:110px"><input type="url" class="oi-link bom-link" data-f="link" data-i="${i}" value="${esc(r.link)}" placeholder="Buy link"><button type="button" class="scanmini oi-fill bom-fill" data-fill="${i}" title="Fetch the photo and price from the link">Auto-fill</button></div>`+
      `<div class="oi-row"><input type="url" class="oi-imgurl bom-imgurl" data-f="imgUrl" data-i="${i}" value="${esc(r.imgUrl||"")}" placeholder="Image URL (or tap the photo box)"><input type="number" class="bom-low" data-f="low" data-i="${i}" value="${r.low||""}" min="0" placeholder="Low-stock alert ≤" title="Low-stock alert at or below this quantity" style="width:150px"></div>`+
      `<div class="oi-row bom-priceline"><label class="bom-packtog" title="Bought as a multi-pack"><input type="checkbox" class="bom-packchk" data-i="${i}" ${r.pack?'checked':''}> Bought as a pack</label>`+
          (r.pack?`<input type="number" class="bom-perpack" data-i="${i}" value="${r.perPack||''}" min="1" step="1" placeholder="units / pack" style="width:120px">`:``)+
          `<span class="bom-perunit" data-i="${i}">${(r.pack&&r.price>0&&r.perPack>0)?esc(money(r.price/r.perPack)+" / unit"):""}</span></div>`+
      `<div class="oi-row oi-status">${badge}</div>`+
    `</div>`;
  }).join("")||`<div class="hint">Nothing left — go back and pick another file.</div>`;

  $("#bomRows").querySelectorAll("input[data-f]").forEach(inp=>{
    inp.oninput=()=>{
      const i=+inp.dataset.i,f=inp.dataset.f;
      bomDraft[i][f]=(f==="qty"||f==="price"||f==="low")?Math.max(0,Number(inp.value)||0):inp.value;
      if(f==="price")bomUpdatePerUnit(i);
      if(f==="imgUrl"){const v=inp.value.trim();if(/^https?:\/\//i.test(v)){bomDraft[i].img=v;const ph=$("#bomRows").querySelector('.bom-photo[data-photo="'+i+'"]');if(ph){ph.classList.add("has");ph.innerHTML='<img src="'+esc(v)+'" alt="">';}}}
    };
  });
  $("#bomRows").querySelectorAll(".bom-fill").forEach(b=>b.onclick=()=>bomAutoFill(+b.dataset.fill,b));
  $("#bomRows").querySelectorAll(".bom-perpack").forEach(inp=>inp.oninput=()=>{
    const i=+inp.dataset.i;bomDraft[i].perPack=Math.max(0,Number(inp.value)||0);bomUpdatePerUnit(i);
  });
  $("#bomRows").querySelectorAll(".bom-packchk").forEach(chk=>chk.onchange=()=>{
    const i=+chk.dataset.i;bomDraft[i].pack=chk.checked;if(!chk.checked)bomDraft[i].perPack=0;bomRenderReview();
  });
  $("#bomRows").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{
    bomDraft.splice(+b.dataset.del,1);bomRenderReview();bomUpdateCount();
  });
  $("#bomRows").querySelectorAll("[data-photo]").forEach(b=>b.onclick=()=>{
    bomPhotoRow=+b.dataset.photo;bomPhotoInput.click();
  });
}
/* Fetch the product photo and price from a row's buy link — the same
   page-reading the item editor's Auto-fill uses (fetchPage / findOffer). */
async function bomAutoFill(i,btn){
  const r=bomDraft[i];if(!r)return;
  const url=String(r.link||"").trim();
  if(!/^https?:\/\//i.test(url)){toast("Paste a full product link on that row first");return;}
  if(btn){btn.disabled=true;btn.textContent="…";}
  try{
    const m=await fetchLinkMeta(url);
    const got=[];
    if(m.img){r.img=m.img;r.imgUrl=m.img;got.push("photo");}
    if(m.price&&!(r.price>0)){r.price=m.price;got.push("price");}
    bomRenderReview();
    toast(got.length?("Row "+(i+1)+": got "+got.join(" + ")):"Nothing found on that page — paste an image URL instead");
  }catch(e){toast("Couldn't read that site (it may block this)");if(btn){btn.disabled=false;btn.textContent="Auto-fill";}}
}
/* Auto-fill every row that has a link, one after another. */
async function bomAutoFillAll(){
  const rows=bomDraft.map((r,i)=>i).filter(i=>/^https?:\/\//i.test(String(bomDraft[i].link||"")));
  if(!rows.length)return toast("No rows have a buy link yet");
  toast("Fetching "+rows.length+" link"+(rows.length===1?"":"s")+"…");
  for(const i of rows)await bomAutoFill(i,null);
}
function bomSyncConvert(){const b=$("#bomConvert");if(!b)return;b.style.display=(curSupplier()===curBase())?"none":"";b.textContent=curConvertLabel(bomDraft);}
function bomUpdateCount(){
  bomSyncConvert();
  const n=bomDraft.length;
  $("#bomCount").textContent=n+" component"+(n===1?"":"s");
  $("#bomCount").style.display=n?"inline-block":"none";
  $("#bomAdd").textContent="Add "+n+" to library";
  $("#bomAdd").disabled=!n;
}
/* Live "$x / unit" readout when a row is a multi-pack. */
function bomUpdatePerUnit(i){
  const el=$("#bomRows").querySelector('.bom-perunit[data-i="'+i+'"]');if(!el)return;
  const r=bomDraft[i];
  el.textContent=(r.pack&&r.price>0&&r.perPack>0)?(money(r.price/r.perPack)+" / unit"):"";
}

/* Same downscale the item editor uses, so BOM photos cost the same storage. */
const bomPhotoInput=document.createElement("input");
bomPhotoInput.type="file";bomPhotoInput.accept="image/*";bomPhotoInput.style.display="none";
document.body.appendChild(bomPhotoInput);
bomPhotoInput.onchange=e=>{
  const file=e.target.files[0];e.target.value="";
  if(!file||!file.type.startsWith("image/")||bomPhotoRow<0)return;
  const r=new FileReader();
  r.onload=()=>{const im=new Image();im.onload=()=>{
    const max=700,sc=Math.min(1,max/Math.max(im.width,im.height));
    const c=document.createElement("canvas");c.width=im.width*sc;c.height=im.height*sc;
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);
    if(bomDraft[bomPhotoRow]){bomDraft[bomPhotoRow].img=c.toDataURL("image/jpeg",0.85);bomRenderReview();}
  };im.src=r.result;};
  r.readAsDataURL(file);
};

/* ---------- import: file pick ---------- */
/* Take raw rows (array of arrays), map them, and move to the review screen. */
function bomHandleRows(rows,filename){
  const parsed=bomReadRows(rows);
  if(!parsed.length)return toast("No components found in that file");
  bomDraft=parsed;
  $("#bomHome").style.display="none";
  $("#bomReview").style.display="";
  $("#bomAdd").style.display="";
  $("#bomBack").style.display="";
  $("#bomTitle").textContent=String(filename||"BOM").replace(/\.[^.]+$/,"");
  $("#bomType").value=(state.tab==="all"||state.tab==="projects"||state.tab==="orders"||state.tab==="archive"||state.tab==="compartments")?"components":state.tab;
  $("#bomLoc").value="";
  $("#bomComp").innerHTML='<option value="">No location</option>'+state.compartments.map(c=>`<option value="${c.id}">${esc(c.name)} (${esc(compKind(c).label)})</option>`).join("");
  bomRenderReview();bomUpdateCount();
}
/* CSV/text path: parse then hand off to the shared rows handler. */
function bomHandleText(text,filename){
  let rows;
  try{rows=bomParseCSV(text);}catch(x){return toast("Couldn't read that file");}
  bomHandleRows(rows,filename);
}

/* Where picked rows go — defaults to the import review screen, but the Orders
   editor passes its own handler so a BOM can fill an order instead. */
let bomOnRows=null;
function bomRoute(rows,filename){ let fn=bomOnRows; bomOnRows=null; if(typeof fn!=="function")fn=bomHandleRows; fn(rows,filename); }

/* Browser fallback: hidden <input type=file>. */
const bomFileInput=document.createElement("input");
bomFileInput.type="file";bomFileInput.accept=".csv,.txt,text/csv,text/plain";bomFileInput.style.display="none";
document.body.appendChild(bomFileInput);
bomFileInput.onchange=e=>{
  const f=e.target.files[0];e.target.value="";
  if(!f){bomOnRows=null;return;}
  if(/\.xlsx?$/i.test(f.name)){bomOnRows=null;return toast("That's a spreadsheet — open it and Save As → CSV first");}
  const r=new FileReader();
  r.onload=()=>bomRoute(bomParseCSV(r.result),f.name);
  r.readAsText(f,"utf-8");
};

/* Desktop app: a real native file dialog that opens Downloads and shows BOM
   files — .xlsx (EasyEDA etc.) as well as .csv. Reads spreadsheets directly.
   Pass onRows(rows,filename) to send the parsed rows somewhere other than the
   import review (e.g. the Orders editor). Falls back to the browser input. */
async function bomPickFile(onRows){
  bomOnRows=(typeof onRows==="function")?onRows:null;   // ignore a stray click event
  const D=window.__TAURI__&&window.__TAURI__.dialog;
  const inv=window.__TAURI__&&window.__TAURI__.core&&window.__TAURI__.core.invoke;
  if(!(D&&D.open&&inv)){ bomFileInput.click(); return; }
  try{
    let def;try{ def=await inv("downloads_dir"); }catch(_){}
    const path=await D.open({multiple:false,directory:false,defaultPath:def||undefined,
      filters:[{name:"BOM files",extensions:["xlsx","xls","ods","csv","txt"]}]});
    if(!path){bomOnRows=null;return;}                  // user cancelled
    const name=path.split(/[\\/]/).pop();
    let rows;
    if(/\.(xlsx?|ods)$/i.test(path)) rows=(await inv("read_spreadsheet",{path})).filter(r=>r.some(c=>String(c).trim()!==""));
    else rows=bomParseCSV(await inv("read_text_file_abs",{path}));
    bomRoute(rows,name);
  }catch(e){ bomOnRows=null; toast("Couldn't open that file: "+(e.message||e)); }
}

/* ---------- import: commit ---------- */
function bomCommit(){
  if(!bomDraft.length)return;
  const t=$("#bomType").value||"components";
  const loc=$("#bomLoc").value.trim();
  const compId=$("#bomComp").value||"";
  let added=0,merged=0;
  bomDraft.forEach(r=>{
    const name=String(r.name||"").trim()||String(r.lcsc||"").trim();
    if(!name)return;
    const addQty=Math.max(0,Number(r.qty)||0);
    const ex=bomExisting(r);
    if(ex){ ex.qty=(Number(ex.qty)||0)+addQty; merged++; return; }   // already in library → just add qty
    const pp=r.pack?Math.max(0,Number(r.perPack)||0):0;            // units per pack
    const raw=Number(r.price)||0;                                  // price as typed
    const price=(pp>0)?(raw/pp):raw;                               // stored as price-each
    const item={
      type:t,name,
      qty:Math.max(0,Number(r.qty)||0),
      low:Math.max(0,Number(r.low)||Number(state.settings.defLow)||0),
      loc,price:price,
      link:String(r.link||"").trim(),
      code:"",lcsc:String(r.lcsc||"").trim(),
      img:r.img||null,imgFit:"cover",imgPos:"50% 50%",imgZoom:1,
      perPack:pp,material:"",dia:"",color:"",colorName:"",weight:"",
      id:uid()
    };
    item.partId=nextPartId(t);
    if(compId)item.comp=compId;
    state.items.push(item);
    added++;
  });
  if(loc&&!state.locations.some(l=>l.toLowerCase()===loc.toLowerCase()))state.locations.push(loc);
  persist();render();closeBom();
  let msg=added?("Added "+added+" new component"+(added===1?"":"s")):"";
  if(merged)msg+=(msg?", ":"Updated ")+merged+" already in your library";
  toast(msg||"Nothing to add");
}

/* ---------- wiring ---------- */
$("#bomBtn").innerHTML=ic("projects")+"<span>BOM</span>";
$("#bomImportIc").innerHTML=ic("projects");
$("#bomClose").innerHTML=ic("x");
$("#bomBtn").onclick=openBom;
$("#bomClose").onclick=closeBom;
$("#bomCancel").onclick=closeBom;
$("#bomOverlay").onclick=e=>{if(e.target===$("#bomOverlay"))closeBom();};
$("#bomImportPick").onclick=()=>bomPickFile();
$("#bomType").onchange=()=>{ if($("#bomReview").style.display!=="none")bomRenderReview(); };  /* refresh predicted IDs */
/* Tapping any ? badge shouldn't trigger the thing it sits inside. */
document.querySelectorAll("#bomOverlay .help").forEach(h=>h.onclick=e=>e.stopPropagation());
$("#bomScopeView").onclick=()=>{bomScope="view";bomSyncScope();};
$("#bomScopeAll").onclick=()=>{bomScope="all";bomSyncScope();};
$("#bomExpJlc").onclick=bomDoExportJlc;
$("#bomExpFull").onclick=bomDoExportFull;
$("#bomAdd").onclick=bomCommit;
$("#bomFillAll").onclick=bomAutoFillAll;
$("#bomConvert").onclick=async()=>{await curConvertRows(bomDraft,$("#bomConvert"));bomRenderReview();bomSyncConvert();};
$("#bomBack").onclick=()=>{
  bomDraft=[];
  $("#bomReview").style.display="none";$("#bomHome").style.display="";
  $("#bomAdd").style.display="none";$("#bomBack").style.display="none";
  $("#bomCount").style.display="none";$("#bomTitle").textContent="BOM";
  bomSyncScope();
};
attachAC($("#bomLoc"),$("#acBomLoc"),()=>state.locations);
