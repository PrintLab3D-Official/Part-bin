/* =====================================================================
   Parts Bin — Celebrate
   ---------------------------------------------------------------------
   Confetti burst + a green-bordered notification when a project is
   finished. Pure CSS/JS, no libraries, and it never touches your data.
   ===================================================================== */
const PB_CONFETTI_COLORS=["#22c55e","#3b82f6","#f59e0b","#ec4899","#a855f7","#06b6d4","#ef4444","#eab308"];

/* Settings → General → Celebrations. Default on; off means no confetti anywhere. */
function pbConfettiOn(){ try{ return !(state.settings&&state.settings.confetti===false); }catch(e){ return true; } }

/* Each piece is two layers: the outer <i> falls (ease-in, so it accelerates
   like gravity) and the inner <b> sways sideways and tumbles. Pieces start
   just above the top edge and are already in their start pose during their
   stagger delay (fill-mode: both), so nothing sits at the top and then drops.
   The whole layer is removed once the slowest piece has landed. */
function pbConfetti(count){
  if(!pbConfettiOn())return;
  count=count||90;
  try{
    const box=document.createElement("div");
    box.className="pbconf";
    let html="",maxEnd=0;
    for(let i=0;i<count;i++){
      const c=PB_CONFETTI_COLORS[i%PB_CONFETTI_COLORS.length];
      const left=Math.random()*100;
      const dur=2.1+Math.random()*1.5;          /* fall time   */
      const delay=Math.random()*0.45;           /* stagger     */
      const sway=1.1+Math.random()*1.3;         /* side-to-side period */
      const amp=(10+Math.random()*30).toFixed(0);
      const w=6+Math.random()*6, h=8+Math.random()*9;
      const round=Math.random()<0.25?"border-radius:50%;":"";
      const spin=(Math.random()<0.5?-1:1)*(360+Math.random()*540);
      maxEnd=Math.max(maxEnd,dur+delay);
      html+='<i style="left:'+left.toFixed(2)+'%;animation-duration:'+dur.toFixed(2)+'s;animation-delay:'+delay.toFixed(2)+'s">'+
            '<b style="background:'+c+';width:'+w.toFixed(1)+'px;height:'+h.toFixed(1)+'px;'+round+
            '--amp:'+amp+'px;--spin:'+spin.toFixed(0)+'deg;animation-duration:'+sway.toFixed(2)+'s;animation-delay:'+delay.toFixed(2)+'s"></b></i>';
    }
    box.innerHTML=html;
    document.body.appendChild(box);
    setTimeout(function(){ if(box.parentNode) box.parentNode.removeChild(box); },Math.ceil(maxEnd*1000)+150);
  }catch(e){}
}

/* Green-bordered notification. Auto-dismisses; click to close early. */
function pbNotify(title,msg,ms){
  try{
    const n=document.createElement("div");
    n.className="pbnotif";
    n.innerHTML='<div class="ic">'+ic("check")+'</div><div><div class="t">'+esc(title)+'</div>'+
                (msg?'<div class="m">'+esc(msg)+'</div>':'')+'</div>';
    document.body.appendChild(n);
    requestAnimationFrame(function(){ n.classList.add("show"); });
    const kill=function(){
      n.classList.remove("show");
      setTimeout(function(){ if(n.parentNode) n.parentNode.removeChild(n); },400);
    };
    n.onclick=kill;
    setTimeout(kill, ms||4600);
  }catch(e){}
}

/* Fired when a project's checklist is fully ticked off. */
function celebrateProject(name,archived){
  pbConfetti(110);
  try{ pbQueueNotify("projects","ok","Project completed",(name?name+" \u2014 ":"")+(archived?"moved into Archive":"all steps done")); }catch(e){}
}
