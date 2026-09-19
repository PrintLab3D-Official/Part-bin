/* =====================================================================
   Parts Bin — Live layer
   ---------------------------------------------------------------------
   Keeps the app honest while it sits open:
     • greeting rolls over morning -> afternoon -> evening (DST-safe,
       because new Date() is always current local time)
     • order "due today / overdue" text stays accurate
     • orders can auto-receive into inventory on their expected date
   Nothing here ever deletes inventory; it only adds received stock.
   ===================================================================== */

/* Auto-receive any pending order whose expected date has arrived.
   Returns true if anything changed. Opt-in via Settings. */
function autoReceiveDue(){
  if(!state.settings || !state.settings.autoReceive) return false;
  const today=new Date(); today.setHours(0,0,0,0);
  let changed=false, names=[];
  (state.orders||[]).forEach(o=>{
    if(!o || o.archived || o.status==="arrived" || !o.exp) return;
    const d=new Date(o.exp+"T00:00:00");
    if(isNaN(d.getTime())) return;
    if(d<=today){
      const lines=receiveOrder(o);
      const units=lines.reduce((s,l)=>s+Number(l.qty||0),0);
      names.push(o.name+" ("+units+")");
      changed=true;
    }
  });
  if(changed){
    persist();
    try{ toast("Auto-received: "+names.join(", ")); }catch(_){}
    try{ pbQueueNotify("orders","ok","Order received",names.join(", ")+" added to your inventory"); }catch(_){}
  }
  return changed;
}

/* Safe to re-render? Never redraw underneath an open dialog. */
function pbIdle(){ return !document.querySelector(".overlay.show") && !document.querySelector("#lockScreen.show"); }

/* One heartbeat drives everything. */
function pbTick(){
  try{ setGreeting(); }catch(_){}
  let changed=false;
  try{ changed=autoReceiveDue(); }catch(_){}
  /* Refresh the orders/archive view so countdowns stay live. */
  try{ checkStockAlerts(); }catch(_){}
  try{ if(typeof calTick==="function") calTick(); }catch(_){}
  if(pbIdle() && (changed || state.tab==="orders" || state.tab==="archive")){
    try{ render(); }catch(_){}
  }
}

setInterval(pbTick,60000);
document.addEventListener("visibilitychange",function(){ if(!document.hidden) pbTick(); });
window.addEventListener("focus",pbTick);
/* Catch anything that came due while the app was closed. */
autoReceiveDue();
if(pbIdle()){ try{ render(); }catch(_){} }
