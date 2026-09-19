/* =====================================================================
   Parts Bin — Support hub
   ---------------------------------------------------------------------
   Opens from the sidebar. Everything below is data-driven: to add or
   change a link, edit SUPPORT_LINKS — nothing else needs touching.
   Set `url` to "" to hide an entry.
   ===================================================================== */
const SUPPORT_LINKS=[
  {key:"discord", label:"Discord",  sub:"Join the community & get help", url:"https://discord.gg/n8M3V4SaHJ",            color:"#5865F2"},
  {key:"youtube", label:"YouTube",  sub:"@PrintLab3D000",                url:"https://www.youtube.com/@PrintLab3D000",   color:"#FF0000"},
  {key:"tiktok",  label:"TikTok",   sub:"@printlab3d64",                 url:"https://www.tiktok.com/@printlab3d64",     color:"#000000"},
  {key:"github",  label:"GitHub",   sub:"PrintLab3D-offical",            url:"https://github.com/PrintLab3D-offical",     color:"#181717"},
  {key:"mail",    label:"Email",    sub:"PrintLab3D@outlook.com.au",     url:"mailto:PrintLab3D@outlook.com.au",         color:"var(--green)"}
];

const SUPPORT_ICONS={
  /* Official brand marks, drawn white on their brand-coloured tile. */
  discord:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
  youtube:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 7.4v9.2L17.2 12z"/></svg>',
  tiktok:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.6-2.6c.27 0 .53.04.78.12V9.66a5.7 5.7 0 1 0 4.91 5.64V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.35 4.35 0 0 1-3.24-1.48z"/></svg>',
  github:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7C6.7 19.7 6.1 18 6.1 18c-.4-1.1-1-1.4-1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7 0-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 6l9 6 9-6"/></svg>'
};


function renderSupport(){
  const g=$("#supportGrid"); if(!g) return;
  g.innerHTML=SUPPORT_LINKS.filter(l=>l.url).map(function(l){
    const mail=l.url.indexOf("mailto:")===0;
    return '<a class="suplink" href="'+esc(l.url)+'"'+(mail?'':' target="_blank" rel="noopener"')+'>'+
      '<span class="supic" style="background:'+l.color+'">'+(SUPPORT_ICONS[l.key]||"")+'</span>'+
      '<span class="supt"><span class="supn">'+esc(l.label)+'</span>'+
      '<span class="sups">'+esc(l.sub)+'</span></span></a>';
  }).join("");
}
function openSupport(){ renderSupport(); $("#supportOverlay").classList.add("show"); }
function closeSupport(){ $("#supportOverlay").classList.remove("show"); }
(function(){const _s=$("#supportBtn");if(_s)_s.onclick=openSupport;})();
$("#supportClose").onclick=closeSupport;
$("#supportOverlay").onclick=function(e){ if(e.target===$("#supportOverlay")) closeSupport(); };
