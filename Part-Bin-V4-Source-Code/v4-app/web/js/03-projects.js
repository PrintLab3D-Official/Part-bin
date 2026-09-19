/* =====================================================================
   Parts Bin — Projects: cards + 3-step project editor
   ===================================================================== */
/* ---------- projects ---------- */
function projProgress(p){const c=p.checklist||[];if(!c.length)return 0;return Math.round(c.filter(x=>x.done).length/c.length*100);}
function renderProjects(){
  $("#toolbar").style.display="none";
  const list=state.projects.filter(p=>!p.archived);
  const tasks=list.reduce((s,p)=>s+((p.checklist||[]).length),0);
  const done=list.reduce((s,p)=>s+((p.checklist||[]).filter(x=>x.done).length),0);
  $("#stats").innerHTML=`<div class="stat"><div class="n">${list.length}</div><div class="l">Projects</div></div><div class="stat"><div class="n">${done}/${tasks}</div><div class="l">Tasks done</div></div><div class="stat"><div class="n">${tasks?Math.round(done/tasks*100):0}%</div><div class="l">Overall progress</div></div>`;
  const grid=$("#grid");
  if(!list.length){grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="big">${ic("projects")}</div>No projects yet. Hit <b>New project</b> to start one.</div>`;return;}
  grid.innerHTML=list.map(projCard).join("");
  list.forEach(p=>{grid.querySelector(`[data-proj="${p.id}"]`).onclick=()=>openProject(p.id);const xb=grid.querySelector(`[data-pexp="${p.id}"]`);if(xb)xb.onclick=e=>{e.stopPropagation();if(expandedProj.has(p.id))expandedProj.delete(p.id);else expandedProj.add(p.id);render();};const a=grid.querySelector(`[data-parc="${p.id}"]`);if(a)a.onclick=e=>{e.stopPropagation();p.archived=true;persist();render();toast("Project archived");};
  grid.querySelectorAll("[data-pck]").forEach(el=>el.onclick=e=>{
    e.stopPropagation();
    const parts=el.dataset.pck.split(":"),pid=parts[0],idx=+parts[1];
    const pr=state.projects.find(x=>x.id===pid);if(!pr||!pr.checklist)return;
    const c=pr.checklist[idx];if(!c)return;
    c.done=!c.done;
    const allDone=pr.checklist.length>0&&pr.checklist.every(x=>x.done);
    let archived=false;
    if(allDone&&!pr.archived&&state.settings.autoArchive){pr.archived=true;archived=true;}
    persist();render();
    if(allDone&&c.done){try{celebrateProject(pr.name,archived);}catch(_){}}
  });
});
}
/* Projects the user has expanded to double width (session-only). */
const expandedProj=new Set();
function projCard(p){
  const pr=projProgress(p);
  const photos=p.photos||[];
  const main=photos[0]?`<img src="${esc(photos[0])}" referrerpolicy="no-referrer">`:`<div class="ph">${ic("projects")}</div>`;
  const comps=p.components||[];
  const totalParts=comps.reduce((s,c)=>s+((c&&c.qty)||1),0);
  const partTags=(expandedProj.has(p.id)?comps:comps.slice(0,4)).map(c=>{const it=state.items.find(i=>i.id===(c.id||c));return it?`<span class="ptag">×${c.qty||1} ${esc(it.name)}</span>`:"";}).join("");
  const checks=p.checklist||[];
  const ex=expandedProj.has(p.id);
  const shownChecks=ex?checks:checks.slice(0,4);
  const checkPrev=shownChecks.map((c,ci)=>`<div class="pcheck tick ${c.done?'d':''}" data-pck="${p.id}:${ci}" title="Tick this step">${ic("check")}<span>${esc(c.text)}</span></div>`).join("");
  const meta=[];
  if(p.loc)meta.push(`<span class="chip">${ic("pin")}<b>${esc(p.loc)}</b></span>`);
  const projCostVal=comps.reduce((s,c)=>{const it=state.items.find(i=>i.id===(c.id||c));return s+(it?(Number(it.price)||0)*((c&&c.qty)||1):0);},0);
  meta.push(`<span class="chip">${ic("components")} ${totalParts} parts</span>`);
  if(projCostVal>0)meta.push(`<span class="chip" title="Total value of the parts in this project">${money(projCostVal)} total</span>`);
  meta.push(`<span class="chip">${checks.filter(x=>x.done).length}/${checks.length} steps</span>`);
  return `<div class="pcard ${ex?'pexpanded':''}" data-proj="${p.id}"><div class="pphoto">${main}${photos.length>1?`<div class="pcount">+${photos.length-1} photos</div>`:""}<button class="cornbtn" data-parc="${p.id}" title="Archive project">${ic("archive")}</button><button class="cornbtn pexp" data-pexp="${p.id}" title="${ex?'Collapse':'Expand'}">${ic("chev")}</button></div><div class="pb"><div class="cname">${esc(p.name)}</div>${p.desc?`<div class="pdesc">${esc(p.desc)}</div>`:""}<div class="meta">${meta.join("")}</div>${partTags?`<div class="psec"><div class="psectitle">Parts used</div><div class="ptags">${partTags}${(!ex&&comps.length>4)?`<span class="ptag more">+${comps.length-4} more</span>`:""}</div></div>`:""}${checkPrev?`<div class="psec"><div class="psectitle">Checklist</div><div class="pchecks">${checkPrev}${(!ex&&checks.length>4)?`<div class="pmore">+${checks.length-4} more steps</div>`:""}</div></div>`:""}<div class="progress"><i style="width:${pr}%"></i></div><div style="font-size:12px;color:var(--mut)">${pr}% complete</div></div></div>`;
}

/* project editor */
let pEdit=null,pOrig={},pPhotos=[],pComps=[],pChecks=[],pPhotoIdx=-1;
function availFor(id){const it=state.items.find(i=>i.id===id);if(!it)return 0;return Number(it.qty||0)+(pOrig[id]||0);}
/* How many units are still free to pull in, i.e. stock minus what this
   project draft has already taken. Drives the live "in stock" number. */
function allocFor(id){const c=pComps.find(x=>x.id===id);return c?Number(c.qty||0):0;}
function freeFor(id){return Math.max(0,availFor(id)-allocFor(id));}
function openProject(id){
  const p=id?state.projects.find(x=>x.id===id):null;pEdit=id||null;
  $("#projTitle").textContent=id?"Edit project":"New project";
  $("#pName").value=p?.name||"";$("#pDesc").value=p?.desc||"";$("#pLoc").value=p?.loc||"";
  pPhotos=(p&&p.photos)?p.photos.slice():[];pComps=(p&&p.components)?p.components.map(c=>typeof c==="string"?{id:c,qty:1}:{id:c.id,qty:c.qty||1}):[];pOrig={};pComps.forEach(c=>{pOrig[c.id]=(pOrig[c.id]||0)+c.qty;});pChecks=(p&&p.checklist)?p.checklist.map(c=>({text:c.text,done:!!c.done})):[];
  $("#pDelete").style.display=id?"block":"none";
  $("#pPickSearch").value="";
  renderPhotos();renderPick();renderChecks();
  $("#projOverlay").classList.add("show");showStep(0);$("#pName").focus();
}
let pStep=0;
function showStep(n){pStep=Math.max(0,Math.min(2,n));document.querySelectorAll("#projOverlay .pstep").forEach(s=>s.classList.toggle("on",+s.dataset.step===pStep));document.querySelectorAll("#projOverlay .pstepchip").forEach(c=>{const i=+c.dataset.s;c.classList.toggle("on",i===pStep);c.classList.toggle("done",i<pStep);});$("#pBack").style.display=pStep>0?"inline-flex":"none";$("#pNext").style.display=pStep<2?"inline-flex":"none";$("#pSave").style.display=pStep===2?"inline-flex":"none";}
document.querySelectorAll("#projOverlay .pstepchip").forEach(c=>c.onclick=()=>showStep(+c.dataset.s));
$("#pBack").onclick=()=>showStep(pStep-1);
$("#pNext").onclick=()=>showStep(pStep+1);
function closeProject(){$("#projOverlay").classList.remove("show");$("#acPLoc").classList.remove("show");}
function renderPhotos(){
  const el=$("#pPhotos");let h="";
  pPhotos.forEach((src,i)=>{h+=`<div class="photoslot"><img src="${esc(src)}" referrerpolicy="no-referrer"><div class="rm" data-rm="${i}">✕</div></div>`;});
  if(pPhotos.length<6)h+=`<div class="photoslot" data-add="new"><div style="text-align:center;font-size:12px">+ Photo</div></div>`;
  el.innerHTML=h;
  el.querySelectorAll("[data-add]").forEach(s=>s.onclick=()=>{pPhotoIdx=-1;$("#pPhotoInput").click();});
  el.querySelectorAll("[data-rm]").forEach(s=>s.onclick=e=>{e.stopPropagation();pPhotos.splice(+s.dataset.rm,1);renderPhotos();});
}
$("#pPhotoInput").onchange=e=>{const f=e.target.files[0];if(!f||!f.type.startsWith("image/"))return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const max=800,sc=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=im.width*sc;c.height=im.height*sc;c.getContext("2d").drawImage(im,0,0,c.width,c.height);const url=c.toDataURL("image/jpeg",0.85);if(pPhotoIdx>=0&&pPhotoIdx<pPhotos.length)pPhotos[pPhotoIdx]=url;else pPhotos.push(url);renderPhotos();};im.src=r.result;};r.readAsDataURL(f);e.target.value="";};
function renderPick(){
  const q=$("#pPickSearch").value.toLowerCase().trim();
  const items=state.items.filter(i=>!q||(i.name+" "+(i.partId||"")).toLowerCase().includes(q));
  const el=$("#pPickList");
  if(!items.length){el.innerHTML='<div style="padding:14px;color:var(--mut);font-size:13px;grid-column:1/-1">No matching parts in your inventory.</div>';return;}
  el.innerHTML=items.map(i=>{const sel=pComps.find(c=>c.id===i.id);const avail=freeFor(i.id);const out=avail<1;const T=TYPES[i.type]||TYPES.components;const im=i.img?`<img src="${esc(i.img)}" referrerpolicy="no-referrer" data-t="${i.type}" onerror="imgFail(this)">`:`<div class="ph">${ic(T.icon)}</div>`;return `<div class="pickcard ${sel?'sel':''} ${out?'out':''}" data-pick="${i.id}"><div class="pim">${im}</div><div class="pi"><div class="nm">${esc(i.name)}</div><div class="tg">${esc(i.partId||"")} · ${avail} in stock</div></div><div class="selmark">${ic("check")}</div><div class="qtyrow">${sel?`<button type="button" class="pbtn rm" data-act="rm" data-q="${i.id}">Remove</button><span class="qn">${sel.qty}</span>`:""}<button type="button" class="pbtn add" data-act="add" data-q="${i.id}" ${out?"disabled":""}>Add</button></div></div>`;}).join("");
  
  el.querySelectorAll("[data-act]").forEach(b=>b.onclick=e=>{e.stopPropagation();const id=b.dataset.q,act=b.dataset.act;const c=pComps.find(x=>x.id===id);if(act==="add"){if(freeFor(id)<1){toast("No free stock of that part");return;}if(c)c.qty++;else pComps.push({id:id,qty:1});}else{if(!c)return;c.qty--;if(c.qty<=0)pComps=pComps.filter(x=>x.id!==id);}renderPick();});
}
$("#pPickSearch").oninput=renderPick;
function renderChecks(){
  const el=$("#pChecks");
  el.innerHTML=pChecks.map((c,i)=>`<div class="check ${c.done?'done':''}" data-ck="${i}"><div class="box">${ic("check")}</div><span class="txt">${esc(c.text)}</span><button class="del" data-del="${i}">${ic("x")}</button></div>`).join("");
  el.querySelectorAll("[data-ck]").forEach(r=>r.onclick=e=>{if(e.target.closest("[data-del]"))return;const i=+r.dataset.ck;pChecks[i].done=!pChecks[i].done;r.classList.toggle("done",pChecks[i].done);updateProg();});
  el.querySelectorAll("[data-del]").forEach(b=>b.onclick=e=>{e.stopPropagation();pChecks.splice(+b.dataset.del,1);renderChecks();});
  updateProg();
}
function updateProg(){const t=pChecks.length,d=pChecks.filter(x=>x.done).length;const pct=t?Math.round(d/t*100):0;$("#pProgBar").style.width=pct+"%";$("#pProgLabel").textContent=t?`(${d}/${t} · ${pct}%)`:"";}
function addCheck(){const v=$("#pCheckInput").value.trim();if(!v)return;pChecks.push({text:v,done:false});$("#pCheckInput").value="";renderChecks();$("#pCheckInput").focus();}
$("#pCheckAdd").onclick=addCheck;
$("#pCheckInput").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addCheck();}};
$("#projClose").onclick=closeProject;$("#pCancel").onclick=closeProject;
$("#projOverlay").onclick=e=>{if(e.target===$("#projOverlay"))closeProject()};
$("#pDelete").onclick=()=>{if(!confirm("Delete this project? Its allocated parts go back to inventory."))return;Object.keys(pOrig).forEach(id=>{const it=state.items.find(i=>i.id===id);if(it)it.qty=Number(it.qty)+pOrig[id];});state.projects=state.projects.filter(x=>x.id!==pEdit);persist();closeProject();render();toast("Project deleted — parts returned to inventory")};
$("#pSave").onclick=()=>{
  const name=$("#pName").value.trim();if(!name)return toast("Project needs a name");
  const loc=$("#pLoc").value.trim();
  if(loc&&!state.locations.some(l=>l.toLowerCase()===loc.toLowerCase()))state.locations.push(loc);
  const newMap={};pComps.forEach(c=>{newMap[c.id]=(newMap[c.id]||0)+Math.max(0,c.qty||0);});
  new Set([...Object.keys(pOrig),...Object.keys(newMap)]).forEach(id=>{const it=state.items.find(i=>i.id===id);if(!it)return;const delta=(newMap[id]||0)-(pOrig[id]||0);it.qty=Math.max(0,Number(it.qty)-delta);});
  const data={name,desc:$("#pDesc").value.trim(),loc,photos:pPhotos.slice(),components:pComps.slice(),checklist:pChecks.map(c=>({text:c.text,done:c.done}))};
  const allDone=pChecks.length>0&&pChecks.every(c=>c.done);const wasArch=pEdit?((state.projects.find(x=>x.id===pEdit)||{}).archived):false;data.archived=wasArch||(!!state.settings.autoArchive&&allDone);
  if(pEdit){Object.assign(state.projects.find(x=>x.id===pEdit),data);}else{data.id=uid();state.projects.push(data);}
  if(allDone&&!wasArch)celebrateProject(name,!!data.archived);
  persist();closeProject();render();toast("Project saved — parts allocated from inventory");
};

