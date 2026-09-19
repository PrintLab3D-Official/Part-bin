/* =====================================================================
   Parts Bin — Archive: completed projects & put-away orders
   ===================================================================== */
/* ---------- archive ---------- */
function renderArchive(){
  $("#toolbar").style.display="none";
  const aP=state.projects.filter(p=>p.archived),aO=state.orders.filter(o=>o.archived);
  $("#stats").innerHTML=`<div class="stat"><div class="n">${aP.length}</div><div class="l">Projects</div></div><div class="stat"><div class="n">${aO.length}</div><div class="l">Orders</div></div><div class="stat"><div class="n">${aP.length+aO.length}</div><div class="l">Archived total</div></div>`;
  const grid=$("#grid");
  if(!aP.length&&!aO.length){grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="big">${ic("archive")}</div>Nothing archived yet. Completed projects and arrived orders land here${state.settings.autoArchive?"":" — or turn on auto-archive in Settings"}.</div>`;return;}
  grid.innerHTML=aP.map(p=>archiveCard("proj",p)).join("")+aO.map(o=>archiveCard("order",o)).join("");
  grid.querySelectorAll("[data-unarc]").forEach(b=>b.onclick=()=>{const[k,id]=b.dataset.unarc.split(":");const arr=k==="proj"?state.projects:state.orders;const o=arr.find(x=>x.id===id);if(o){o.archived=false;persist();render();toast("Restored");}});
  grid.querySelectorAll("[data-arcdel]").forEach(b=>b.onclick=()=>{const[k,id]=b.dataset.arcdel.split(":");if(k==="proj"){if(!confirm("Delete this project permanently? Allocated parts return to inventory."))return;const p=state.projects.find(x=>x.id===id);if(p)(p.components||[]).forEach(c=>{const it=state.items.find(i=>i.id===(c.id||c));if(it)it.qty=Number(it.qty)+((c&&c.qty)||1);});state.projects=state.projects.filter(x=>x.id!==id);}else{if(!confirm("Delete this order permanently?"))return;state.orders=state.orders.filter(x=>x.id!==id);}persist();render();toast("Deleted");});
}
function archiveCard(kind,o){
  const isP=kind==="proj";const img=isP?((o.photos||[])[0]||""):(o.img||"");
  const im=img?`<img src="${esc(img)}" referrerpolicy="no-referrer" style="object-fit:cover">`:`<div class="ph">${ic(isP?"projects":"orders")}</div>`;
  const sub=isP?`${(o.checklist||[]).filter(x=>x.done).length}/${(o.checklist||[]).length} steps done`:`×${o.qty||1}${o.arrivedAt?" · arrived":""}`;
  return `<div class="card"><div class="thumb">${im}<div class="pid">${isP?"Project":"Order"}</div></div><div class="cbody"><div class="cname">${esc(o.name)}</div><div style="font-size:12px;color:var(--mut)">${sub}</div><div class="cfoot" style="padding:10px 0 0;border:0;margin-top:auto"><button class="btn-ghost" data-unarc="${kind}:${o.id}" style="flex:1;justify-content:center">${ic("undo")} Restore</button><button class="iconbtn" data-arcdel="${kind}:${o.id}" title="Delete forever">${ic("trash")}</button></div></div></div>`;
}
