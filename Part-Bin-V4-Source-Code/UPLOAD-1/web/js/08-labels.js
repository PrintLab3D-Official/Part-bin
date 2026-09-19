/* =====================================================================
   Parts Bin — Labels: Code-39 barcodes, single + sheet printing
   ===================================================================== */
/* ---------- Code 39 barcode ---------- */
const C39={"0":"111221211","1":"211211112","2":"112211112","3":"212211111","4":"111221112","5":"211221111","6":"112221111","7":"111211212","8":"211211211","9":"112211211","A":"211112112","B":"112112112","C":"212112111","D":"111122112","E":"211122111","F":"112122111","G":"111112212","H":"211112211","I":"112112211","J":"111122211","K":"211111122","L":"112111122","M":"212111121","N":"111121122","O":"211121121","P":"112121121","Q":"111111222","R":"211111221","S":"112111221","T":"111121221","U":"221111112","V":"122111112","W":"222111111","X":"121121112","Y":"221121111","Z":"122121111","-":"121111212",".":"221111211"," ":"122111211","$":"121212111","/":"121211121","+":"121112121","%":"111212121","*":"121121211"};
function code39SVG(data){data=String(data).toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+%]/g,"");const seq="*"+data+"*";const N=1,W=3,h=90,M=14;let x=M;const r=[];for(let c=0;c<seq.length;c++){const pat=C39[seq[c]];if(!pat)continue;for(let i=0;i<9;i++){const w=(pat[i]==="2"?W:N);if(i%2===0)r.push(`<rect x="${x}" y="0" width="${w}" height="${h}"/>`);x+=w;}x+=N;}const total=x+M;return `<svg viewBox="0 0 ${total} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${total}" height="${h}" fill="#fff"/><g fill="#000">${r.join("")}</g></svg>`;}
let labelId=null;
function buildLabel(it){const l=locOf(it);return `<div class="plabel"><div class="ln">${esc(it.name)}</div>${code39SVG(it.partId||"PART")}<div class="lid">${esc(it.partId||"")}</div><div class="lloc">${l?"@ "+esc(l):""}</div></div>`;}
let labelSize="md";
function wireSizeSeg(id){const g=$("#"+id);if(!g)return;g.querySelectorAll(".segbtn").forEach(b=>b.onclick=()=>{labelSize=b.dataset.sz;state.settings.labelSize=labelSize;persist();document.querySelectorAll("#lblSizeSingle .segbtn,#lblSizeSheet .segbtn").forEach(x=>x.classList.toggle("on",x.dataset.sz===labelSize));});}
function syncSizeSeg(){document.querySelectorAll("#lblSizeSingle .segbtn,#lblSizeSheet .segbtn").forEach(x=>x.classList.toggle("on",x.dataset.sz===labelSize));}
/* Self-contained print stylesheet, mirrors the #printArea rules in base.css.
   Used only for the macOS browser-print path below. */
const LABEL_PRINT_CSS="*{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff;color:#000;font-family:-apple-system,Arial,sans-serif}.pa-single{padding:14mm 10mm;text-align:center}.pa-sheet{padding:8mm;display:grid;grid-template-columns:1fr 1fr;gap:6mm}.plabel{text-align:center;color:#000;break-inside:avoid;page-break-inside:avoid;padding:6px 8px}.pa-single .plabel{max-width:80mm;margin:0 auto}.pa-sheet .plabel{border:1px dashed #bbb;border-radius:6px}.plabel .ln{font-weight:700;font-size:14px;color:#000;margin-bottom:4px}.plabel .lid{font-family:'Courier New',monospace;letter-spacing:2px;font-weight:700;font-size:14px;color:#000;margin-top:2px}.plabel .lloc{font-size:11px;color:#444}.plabel svg{width:100%;height:72px}.pa-sm .plabel .ln{font-size:11px}.pa-sm .plabel .lid{font-size:11px}.pa-sm .plabel svg{height:48px}.pa-sm.pa-single .plabel{max-width:55mm}.pa-sm.pa-sheet{grid-template-columns:1fr 1fr 1fr}.pa-xs .plabel{padding:3px 4px}.pa-xs .plabel .ln{font-size:8.5px;margin-bottom:1px}.pa-xs .plabel .lid{font-size:8.5px;letter-spacing:1px;margin-top:0}.pa-xs .plabel .lloc{font-size:7.5px}.pa-xs .plabel svg{height:30px}.pa-xs.pa-single .plabel{max-width:38mm}.pa-xs.pa-sheet{grid-template-columns:repeat(4,1fr);gap:3mm}.pa-lg .plabel .ln{font-size:19px}.pa-lg .plabel .lid{font-size:19px}.pa-lg .plabel svg{height:108px}.pa-lg.pa-single .plabel{max-width:120mm}.pa-lg.pa-sheet{grid-template-columns:1fr}";
/* macOS (WKWebView) silently ignores window.print(); write the labels to a temp
   HTML file and open it in the default browser, which prints normally. */
async function printViaBrowser(cls,inner){
  const inv=window.__TAURI__&&window.__TAURI__.core&&window.__TAURI__.core.invoke;
  const html='<!doctype html><html><head><meta charset="utf-8"><title>Parts Bin labels</title><style>'+LABEL_PRINT_CSS+'</style></head><body><div class="'+cls+'">'+inner+'</div><script>window.onload=function(){setTimeout(function(){try{window.print();}catch(e){}},300);};window.onafterprint=function(){setTimeout(function(){try{window.close();}catch(e){}},150);};<\/script></body></html>';
  if(inv){try{await inv("print_html",{html:html});return;}catch(e){console.error(e);}}
  const pa=$("#printArea");pa.className=cls;pa.innerHTML=inner;document.body.classList.add("printing");window.print();
}
function printLabels(items){if(!items.length)return;const cls=(items.length>1?"pa-sheet":"pa-single")+" pa-"+(labelSize||"md");const inner=items.map(buildLabel).join("");if(/Macintosh|Mac OS X/.test(navigator.userAgent)){printViaBrowser(cls,inner);return;}const pa=$("#printArea");pa.className=cls;pa.innerHTML=inner;document.body.classList.add("printing");window.print();}
function openLabel(id){const it=state.items.find(i=>i.id===id);if(!it)return;labelId=id;$("#lpName").textContent=it.name;$("#lpId").textContent=it.partId||"";$("#lpLoc").textContent=locOf(it)?("@ "+locOf(it)):"";$("#lpBar").innerHTML=code39SVG(it.partId||"PART");syncSizeSeg();$("#lpCopies").value=1;$("#labelOverlay").classList.add("show");}
$("#labelClose").onclick=()=>$("#labelOverlay").classList.remove("show");
$("#labelOverlay").onclick=e=>{if(e.target===$("#labelOverlay"))$("#labelOverlay").classList.remove("show")};
document.querySelectorAll("#labelOverlay [data-cp]").forEach(b=>b.onclick=()=>{$("#lpCopies").value=b.dataset.cp;});
$("#labelPrintBtn").onclick=()=>{const it=state.items.find(i=>i.id===labelId);if(!it)return;const n=Math.max(1,Math.min(200,Number($("#lpCopies").value)||1));printLabels(Array.from({length:n},()=>it));};
window.addEventListener("afterprint",()=>{document.body.classList.remove("printing");$("#printArea").innerHTML="";$("#printArea").className="";});

/* multi-label sheet */
function openSheet(){
  const list=scopeItems();
  if(!list.length)return toast("Nothing here to print");
  $("#selList").innerHTML=list.map(i=>`<label class="selrow"><input type="checkbox" class="selitem" value="${i.id}" checked><span>${esc(i.partId||'')} — ${esc(i.name)}</span></label>`).join("");
  $("#selAll").checked=true;updateSelCount();
  $("#selList").querySelectorAll(".selitem").forEach(c=>c.onchange=updateSelCount);
  syncSizeSeg();$("#sheetOverlay").classList.add("show");
}
function updateSelCount(){const n=[...document.querySelectorAll(".selitem:checked")].length;$("#selCount").textContent=n+" selected";}
$("#labelsBtn").onclick=openSheet;
$("#sheetClose").onclick=()=>$("#sheetOverlay").classList.remove("show");
$("#sheetOverlay").onclick=e=>{if(e.target===$("#sheetOverlay"))$("#sheetOverlay").classList.remove("show")};
$("#selAll").onchange=()=>{document.querySelectorAll(".selitem").forEach(c=>c.checked=$("#selAll").checked);updateSelCount();};
$("#sheetPrintBtn").onclick=()=>{const ids=[...document.querySelectorAll(".selitem:checked")].map(c=>c.value);if(!ids.length)return toast("Select at least one");const items=ids.map(id=>state.items.find(x=>x.id===id)).filter(Boolean);$("#sheetOverlay").classList.remove("show");printLabels(items);};

