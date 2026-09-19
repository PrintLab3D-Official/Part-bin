/* =====================================================================
   Parts Bin — Calculator + live currency conversion
   Rates from open.er-api.com (free, no key), cached in localStorage for 12h.
   Shared helper curConvert() is also used by the item editor's price field.
   ===================================================================== */
const CUR_CODES=["USD","AUD","EUR","GBP","CAD","NZD","JPY","CNY","INR","SGD","HKD","CHF","SEK","MXN","BRL","ZAR","KRW","TWD","PLN","NOK"];
let curRates=null;

function curCached(){ try{ return JSON.parse(localStorage.getItem("pb_rates")||"null"); }catch(e){ return null; } }
async function curFetchRates(){
  const c=curCached();
  if(c&&c.rates&&(Date.now()-c.ts<12*3600*1000)){ curRates=c.rates; return curRates; }
  try{
    const f=(window.__TAURI__&&window.__TAURI__.http&&window.__TAURI__.http.fetch)||fetch;
    const r=await f("https://open.er-api.com/v6/latest/USD");
    const d=await r.json();
    if(d&&d.rates){ curRates=d.rates; localStorage.setItem("pb_rates",JSON.stringify({ts:Date.now(),rates:d.rates})); return curRates; }
  }catch(e){}
  if(c&&c.rates){ curRates=c.rates; return curRates; }      // stale fallback if offline
  return null;
}
/* Convert between codes; rates are per-USD, so amt * (rate[to]/rate[from]). */
function curConvert(amt,from,to){
  if(from===to)return amt;
  if(!curRates)return null;
  const rf=curRates[from],rt=curRates[to];
  if(!rf||!rt)return null;
  return amt*(rt/rf);
}
function curBase(){ return state.settings.curCode||"USD"; }
/* What supplier BOMs / order sheets are usually priced in (Settings → General). */
function curSupplier(){ return state.settings.bomCur||"USD"; }
/* Convert (or undo) every price in a list of rows from the supplier currency
   to yours. Rows remember their original price so the button can toggle. */
async function curConvertRows(rows,btn){
  const from=curSupplier(),to=curBase();
  if(from===to){toast("Your currency and the supplier currency are both "+to+" — nothing to convert");return;}
  const done=rows.some(r=>r._conv);
  if(done){rows.forEach(r=>{if(r._conv){r.price=r._orig;delete r._conv;delete r._orig;}});toast("Prices back in "+from);return true;}
  if(btn){btn.disabled=true;}
  const rates=await curFetchRates();
  if(btn){btn.disabled=false;}
  const rate=rates?curConvert(1,from,to):null;
  if(!rate){toast("Couldn't get exchange rates — check your connection");return false;}
  let n=0;rows.forEach(r=>{const p=Number(r.price)||0;if(p>0){r._orig=p;r.price=+(p*rate).toFixed(4);r._conv=true;n++;}});
  toast(n?("Converted "+n+" price"+(n===1?"":"s")+" "+from+" → "+to+" at "+rate.toFixed(4)):"No prices to convert");
  return true;
}
function curConvertLabel(rows){const from=curSupplier(),to=curBase();return rows.some(r=>r._conv)?("Undo: back to "+from):("Convert prices "+from+" → "+to);}

/* ---------- calculator ---------- */
const CALC_KEYS=["C","(",")","⌫","7","8","9","÷","4","5","6","×","1","2","3","−","0",".","=","+"];
function calcRenderKeys(){
  const g=$("#calcGrid");if(!g)return;
  g.innerHTML=CALC_KEYS.map(k=>{
    const op=/[÷×=+−]/.test(k);
    const cls="calc-key"+(op?" op":"")+(k==="="?" eq":"")+(k==="C"?" clr":"");
    return `<button type="button" class="${cls}" data-k="${esc(k)}">${esc(k)}</button>`;
  }).join("");
  g.querySelectorAll(".calc-key").forEach(b=>b.onclick=()=>calcPress(b.dataset.k));
}
function calcPress(k){
  const d=$("#calcDisplay");
  if(k==="C"){d.value="";return;}
  if(k==="⌫"){d.value=d.value.slice(0,-1);return;}
  if(k==="="){calcEval();return;}
  d.value+=k;
}
function calcEval(){
  const d=$("#calcDisplay"),expr=d.value.trim().replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");if(!expr)return;
  if(!/^[\d+\-*/().\s]+$/.test(expr)){toast("Only numbers and + − × ÷ ( )");return;}
  try{ const v=Function('"use strict";return ('+expr+')')(); if(isFinite(v))d.value=String(+(+v).toFixed(6)); else toast("Can't work that out"); }
  catch(e){ toast("Can't work that out"); }
}

function calcRenderCur(){
  const from=$("#calcFrom"),to=$("#calcTo");if(!from)return;
  if(!from.options.length){
    from.innerHTML=CUR_CODES.map(c=>`<option>${c}</option>`).join("");
    to.innerHTML=CUR_CODES.map(c=>`<option>${c}</option>`).join("");
    from.value="USD"; to.value=CUR_CODES.includes(curBase())?curBase():"AUD";
  }
  calcConvertNow();
}
function calcConvertNow(){
  const amt=Number($("#calcAmt").value)||0;
  const v=curConvert(amt,$("#calcFrom").value,$("#calcTo").value);
  $("#calcResult").textContent=(v==null)?"Rates unavailable — check your connection":
    `${amt} ${$("#calcFrom").value}  =  ${v.toFixed(2)} ${$("#calcTo").value}`;
}

function calcOpen(){
  const w=$("#calcWin");
  if(w.classList.contains("show")){calcClose();return;}   // toggle
  w.classList.add("show");
  $("#calcResult").textContent="Loading rates…";
  curFetchRates().then(()=>calcRenderCur());
  calcRenderCur();
  $("#calcDisplay").focus();
}
function calcClose(){ $("#calcWin").classList.remove("show"); }

/* Drag the window by its header — stays open so you can use the app behind it. */
(function(){
  const win=$("#calcWin"),head=$("#calcHead");if(!win||!head)return;
  let st=null;
  head.addEventListener("pointerdown",e=>{
    if(e.target.closest(".x"))return;
    st={x:e.clientX,y:e.clientY,l:win.offsetLeft,t:win.offsetTop};
    try{head.setPointerCapture(e.pointerId);}catch(_){}
    e.preventDefault();
  });
  window.addEventListener("pointermove",e=>{
    if(!st)return;
    win.style.left=Math.max(0,Math.min(window.innerWidth-60, st.l+(e.clientX-st.x)))+"px";
    win.style.top =Math.max(0,Math.min(window.innerHeight-40, st.t+(e.clientY-st.y)))+"px";
  });
  window.addEventListener("pointerup",()=>{st=null;});
})();

/* ---------- wiring ---------- */
$("#calcClose").innerHTML=ic("x");
(function(){const a=$("#setCurCode"),b=$("#setBomCur");if(!a||!b)return;const opts=CUR_CODES.map(c=>`<option>${c}</option>`).join("");a.innerHTML=opts;b.innerHTML=opts;})();
$("#calcBtn").onclick=calcOpen;
$("#calcClose").onclick=calcClose;
$("#calcDisplay").addEventListener("keydown",e=>{
  if(e.key==="Enter"){e.preventDefault();calcEval();}
  else if(e.key==="Escape")calcClose();
});
["input","change"].forEach(ev=>{
  $("#calcAmt").addEventListener(ev,calcConvertNow);
  $("#calcFrom").addEventListener(ev,calcConvertNow);
  $("#calcTo").addEventListener(ev,calcConvertNow);
});
calcRenderKeys();
