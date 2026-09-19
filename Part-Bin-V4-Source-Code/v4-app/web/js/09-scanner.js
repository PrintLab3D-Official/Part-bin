/* =====================================================================
   Parts Bin — Scanner: ZXing camera scan + scan-to-find
   ===================================================================== */
/* ---------- scanner (ZXing + manual Scan now) ---------- */
let zxReader=null,scanCb=null;
function ensureReader(){if(!zxReader&&window.ZXing){try{let hints=null;try{if(ZXing.DecodeHintType&&ZXing.DecodeHintType.TRY_HARDER!==undefined){hints=new Map();hints.set(ZXing.DecodeHintType.TRY_HARDER,true);}}catch(_){}zxReader=hints?new ZXing.BrowserMultiFormatReader(hints):new ZXing.BrowserMultiFormatReader();}catch(e){try{zxReader=new ZXing.BrowserMultiFormatReader();}catch(e2){}}}return zxReader;}
async function primeCams(){
  try{const tmp=await navigator.mediaDevices.getUserMedia({video:true});tmp.getTracks().forEach(t=>t.stop());}catch(e){}
  try{
    const devs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="videoinput");
    if(devs.length){
      const sel=$("#camSel");sel.innerHTML=devs.map((d,i)=>`<option value="${d.deviceId}">${esc(d.label||("Camera "+(i+1)))}</option>`).join("");
      const saved=localStorage.getItem("pb_camera");
      if(saved&&devs.some(d=>d.deviceId===saved))sel.value=saved;
      else{const real=devs.find(d=>!/obs|virtual|snap|droidcam/i.test(d.label||""));sel.value=(real||devs[0]).deviceId;}
    }
  }catch(e){}
}
async function startScan(){
  const r=ensureReader();
  if(!r){$("#scanMsg").textContent="Scanner engine missing — keep zxing.min.js in the app's assets folder.";return;}
  $("#scanMsg").textContent="Starting camera…";
  await primeCams();
  const dev=$("#camSel").value;
  $("#scanMsg").textContent="Hold the barcode in the box (~20cm away, filling the frame). Tap Scan now if it doesn't auto-catch.";
  const constraints={video:{width:{ideal:1280},height:{ideal:720}}};
  if(dev)constraints.video.deviceId={ideal:dev};else constraints.video.facingMode={ideal:"environment"};
  try{
    await r.decodeFromConstraints(constraints,$("#scanVideo"),(result)=>{if(result)onScan(result.getText());});
  }catch(e){
    try{await r.decodeFromVideoDevice(dev||undefined,$("#scanVideo"),(result)=>{if(result)onScan(result.getText());});}
    catch(e2){$("#scanMsg").textContent="Couldn't open this camera ("+((e2&&e2.message)||(e&&e.message)||"error")+"). Pick another above.";}
  }
}
function stopScan(){try{zxReader&&zxReader.reset();}catch(e){}}
function onScan(text){const cb=scanCb;closeScanner();if(cb)cb(text);}
function openScanner(title,cb){scanCb=cb;$("#scanTitle").textContent=title;$("#scanManual").value="";$("#scanMsg").textContent="Starting camera…";$("#scanOverlay").classList.add("show");startScan();}
function closeScanner(){stopScan();$("#scanOverlay").classList.remove("show");}
$("#camSel").onchange=()=>{localStorage.setItem("pb_camera",$("#camSel").value);stopScan();startScan();};
$("#scanNowBtn").onclick=async()=>{
  const r=ensureReader();if(!r)return;
  const v=$("#scanVideo");
  if(!v.videoWidth){$("#scanMsg").textContent="Camera still starting — wait a second and tap again.";return;}
  try{
    const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0,c.width,c.height);
    const res=await r.decodeFromImageUrl(c.toDataURL("image/png"));
    if(res)onScan(res.getText());
  }catch(e){$("#scanMsg").textContent="No code read — fill the box with the barcode, hold steady, tap Scan now.";}
};
$("#scanClose").onclick=closeScanner;
$("#scanOverlay").onclick=e=>{if(e.target===$("#scanOverlay"))closeScanner()};
$("#scanManualGo").onclick=()=>{const v=$("#scanManual").value.trim();if(v)onScan(v)};
$("#scanManual").onkeydown=e=>{if(e.key==="Enter"){const v=$("#scanManual").value.trim();if(v)onScan(v)}};
$("#scanAddBtn").onclick=()=>openScanner("Scan to fill code",code=>{$("#fCode").value=code;toast("Code captured: "+code);});
$("#scanFindBtn").onclick=()=>openScanner("Scan to find item",code=>findByCode(code));
window.addEventListener("beforeunload",stopScan);
/* ---------- after a scan: a proper result sheet ----------
   Match   → photo, name, IDs, where it lives, live quantity with steppers,
             "add stock" box, open / show-in-list / scan-again buttons.
   No match→ the code that was read, add-new-with-this-code, search, scan again.
   The camera was already released by closeScanner() before we get here. */
let scanResultId=null;
function findByCode(code){
  const c=code.trim().toLowerCase();
  const it=state.items.find(i=>(i.code||"").trim().toLowerCase()===c||(i.partId||"").toLowerCase()===c||(i.lcsc||"").trim().toLowerCase()===c);
  if(!it){showScanMiss(code);return;}
  state.tab="all";document.querySelectorAll(".navtab[data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab==="all"));
  $("#search").value="";$("#lowSel").value="all";render();showScanResult(it,code);
}
function closeScanResult(){$("#scanResultOverlay").classList.remove("show");scanResultId=null;}
function showScanMiss(code){
  scanResultId=null;
  $("#scanResultBody").innerHTML=`<div class="sr-top miss"><div class="srcheck miss">${ic("warn")}</div><div class="sr-kicker">No match</div><div class="sr-title">Nothing in your library has this code</div><div class="sr-code">${esc(code)}</div></div>
    <div class="sr-actions">
      <button class="btn-primary" id="srAddNew">${ic("add")} Add a new item with this code</button>
      <button class="btn-ghost" id="srSearch">${ic("search")} Search for “${esc(code.length>18?code.slice(0,18)+"…":code)}”</button>
      <button class="btn-ghost" id="srAgain">${ic("scan")} Scan again</button>
      <button class="btn-ghost" id="srOk">Close</button>
    </div>`;
  $("#scanResultOverlay").classList.add("show");
  $("#srAddNew").onclick=()=>{closeScanResult();openModal(null);$("#fCode").value=code;};
  $("#srSearch").onclick=()=>{closeScanResult();state.tab="all";document.querySelectorAll(".navtab[data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab==="all"));$("#search").value=code;render();};
  $("#srAgain").onclick=()=>{closeScanResult();openScanner("Scan to find item",c=>findByCode(c));};
  $("#srOk").onclick=closeScanResult;
}
function showScanResult(it,code){
  scanResultId=it.id;
  const T=TYPES[it.type]||TYPES.components;
  const img=it.img?`<img src="${esc(it.img)}" referrerpolicy="no-referrer" class="sr-img">`:`<div class="ph sr-img">${ic(T.icon)}</div>`;
  const chips=[`<span class="chip">${ic("id")}<b>${esc(it.partId||"—")}</b></span>`,`<span class="chip">${ic(T.icon)} ${esc(T.one)}</span>`];
  if(it.lcsc)chips.push(`<span class="chip" title="Original ID">${esc(it.lcsc)}</span>`);
  if(it.price>0)chips.push(`<span class="chip">${money(it.price)} ea</span>`);
  $("#scanResultBody").innerHTML=`<div class="sr-top"><div class="srcheck">${ic("check")}</div><div class="sr-kicker">${esc(T.one)} found</div>${code&&code.trim().toLowerCase()!==(it.partId||"").toLowerCase()?`<div class="sr-code">${esc(code)}</div>`:""}</div>
    <div class="sr-item">${img}<div class="sr-info"><div class="sr-name">${esc(it.name)}</div><div class="meta">${chips.join("")}</div></div></div>
    <div class="sr-grid">
      <div class="sr-box"><div class="sr-label">Location</div><div class="srloc" id="srLoc"></div></div>
      <div class="sr-box"><div class="sr-label">In stock</div><div class="sr-qtyrow"><button class="iconbtn" id="srDec" title="Remove one">${ic("minus")}</button><div class="sr-qty" id="srQty"></div><button class="iconbtn" id="srInc" title="Add one">${ic("plus")}</button></div>${it.low>0?`<div class="sr-low" id="srLow"></div>`:""}</div>
    </div>
    <div class="sr-addstock"><label>Add stock (e.g. a pack just arrived)</label><div class="withbtn"><input type="number" id="srAddN" min="1" value="${it.perPack>0?it.perPack:1}"><button class="btn-primary" id="srAddGo">${ic("add")} Add</button></div></div>
    <div class="sr-actions">
      <button class="btn-ghost" id="srOpen">${ic("edit")} Open item</button>
      <button class="btn-ghost" id="srView">Show in list</button>
      <button class="btn-ghost" id="srAgain">${ic("scan")} Scan another</button>
      <button class="btn-primary" id="srOk">Done</button>
    </div>`;
  const paint=()=>{const cur=state.items.find(i=>i.id===it.id);if(!cur)return;const loc=locOf(cur),inDrawer=compartmentOf(cur.id);
    $("#srLoc").innerHTML=loc?`${ic(inDrawer?"grid":"pin")} <b>${esc(loc)}</b>`:`<span style="color:var(--mut)">No location set</span>`;
    $("#srQty").textContent=cur.qty;$("#srQty").classList.toggle("out",Number(cur.qty)===0);$("#srQty").classList.toggle("low",isLow(cur));
    const lw=$("#srLow");if(lw)lw.textContent=isLow(cur)?"Low stock — alert at ≤ "+cur.low:"Alert at ≤ "+cur.low;};
  paint();
  $("#scanResultOverlay").classList.add("show");
  $("#srInc").onclick=()=>{bump(it.id,1,true);paint();};
  $("#srDec").onclick=()=>{bump(it.id,-1,true);paint();};
  $("#srAddGo").onclick=()=>{const n=Math.max(0,Number($("#srAddN").value)||0);if(!n)return;const cur=state.items.find(i=>i.id===it.id);if(!cur)return;cur.qty=Number(cur.qty)+n;persist();render();paint();toast("Added "+n+" to "+cur.name);};
  $("#srAddN").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();$("#srAddGo").click();}};
  $("#srOpen").onclick=()=>{closeScanResult();openModal(it.id);};
  $("#srAgain").onclick=()=>{closeScanResult();openScanner("Scan to find item",c=>findByCode(c));};
  $("#srOk").onclick=closeScanResult;
  $("#srView").onclick=()=>{closeScanResult();const el=document.querySelector(`[data-card="${it.id}"]`);if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),1300);}};
}
$("#scanResultOverlay").onclick=e=>{if(e.target===$("#scanResultOverlay"))closeScanResult();};
