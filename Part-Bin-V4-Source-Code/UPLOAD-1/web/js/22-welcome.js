/* =====================================================================
   Parts Bin — First-run welcome / onboarding
   ---------------------------------------------------------------------
   Shown once, straight after the What's New tour, but ONLY when there's
   no inventory yet (a genuinely new install). Lets a first-timer pick a
   look, or import an existing backup if they've used Parts Bin before.
   Returning users (who already have data) never see this.
   ===================================================================== */
function pbHasData(){ return !!(state.items && state.items.length); }

function renderWelcomeStyles(){
  const g=$("#welcomeStyleGrid");
  if(!g || typeof STYLES==="undefined") return;
  const cur=(state.settings.style)||"main";
  g.innerHTML=STYLES.map(function(s){
    return '<button type="button" class="styleswatch '+(s.key===cur?'on':'')+'" data-wsk="'+esc(s.key)+'">'+
      '<span class="ssw" style="background:'+esc(s.sw)+'"><span class="sdot" style="background:'+esc(s.ac)+'"></span></span>'+
      '<span class="ssn">'+esc(s.name)+'</span></button>';
  }).join("");
  g.querySelectorAll(".styleswatch").forEach(function(b){
    b.onclick=function(){
      state.settings.style=b.dataset.wsk; persist();
      try{ applyStyle(); }catch(e){}
      try{ applyTheme(); }catch(e){}
      renderWelcomeStyles();
    };
  });
}

function openWelcome(){ renderWelcomeStyles(); $("#welcomeOverlay").classList.add("show"); }
function closeWelcome(){
  $("#welcomeOverlay").classList.remove("show");
  try{ state.settings.welcomed=true; persist(); }catch(e){}
}

const _wStart=$("#welcomeStart"); if(_wStart) _wStart.onclick=closeWelcome;
const _wImport=$("#welcomeImport");
if(_wImport) _wImport.onclick=function(){
  /* restoreInput lives in 11-backup.js; its onchange restores + re-renders.
     Close the welcome so the imported inventory is visible underneath. */
  try{ restoreInput.click(); }catch(e){}
  closeWelcome();
};
