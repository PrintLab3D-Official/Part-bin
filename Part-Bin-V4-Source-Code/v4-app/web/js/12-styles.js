/* =====================================================================
   Parts Bin — STYLES engine  (higher-level look-and-feel presets)
   ---------------------------------------------------------------------
   A "Style" is a complete re-skin that layers on top of the existing
   Theme + Accent settings (which keep working underneath — see
   css/styles-presets.css for how they interact).

   Each preset is a self-contained entry in the STYLES array below, paired
   with one CSS block in css/styles-presets.css. To add a new style, add
   one object here and one CSS block there — nothing else to touch.

   Fields:
     key   unique id, also used as body[data-style="key"]
     name  label shown on the picker
     desc  one-line description
     sw    swatch background (preview only)
     ac    swatch accent dot (preview only)
   ===================================================================== */
const STYLES=[
  {key:"main",      name:"Main",       desc:"The original Parts Bin look. Uses your Theme & Accent below.",     sw:"#0d1117", ac:"#3b82f6"},
  {key:"claude",    name:"Warm Paper", desc:"Warm editorial magazine \u2014 centered serif masthead, roomy cream.", sw:"#f4efe6", ac:"#c96442"},
  {key:"shopify",   name:"Commerce",   desc:"Crisp admin dashboard \u2014 compact, structured, green tiles.",      sw:"#f1f2f4", ac:"#008060"},
  {key:"terminal",  name:"Terminal",   desc:"CRT hacker console \u2014 scanlines, monospace, blinking cursor.",     sw:"#050805", ac:"#39ff14"},
  {key:"blueprint", name:"Blueprint",  desc:"Engineering drawing \u2014 cyan grid paper, title block, mono IDs.",   sw:"#0a2144", ac:"#4cc9f0"},
  {key:"aurora",    name:"Aurora",     desc:"Living colour gradient with frosted-glass cards.",                    sw:"linear-gradient(125deg,#6d28d9,#9d174d,#1e3a8a,#0f766e)", ac:"#f472b6"},
  {key:"neo",       name:"Neo Brutal", desc:"Chunky black borders, hard offset shadows, loud yellow.",             sw:"#ffdd00", ac:"#ff5c00"},
  {key:"midnight",  name:"Midnight",   desc:"Deep indigo night, electric-violet accents, glowing cards.",          sw:"#0b0f1e", ac:"#8b5cf6"},
  {key:"sunset",    name:"Sunset",     desc:"Warm charcoal with sunset orange-pink accents.",                     sw:"#160f12", ac:"#fb7185"}
]

/* Apply the saved style by tagging <body>. CSS in styles-presets.css does
   the rest. Safe to call any time — never touches inventory data. */
function applyStyle(){
  const key=(state.settings&&state.settings.style)||"main";
  const valid=STYLES.some(s=>s.key===key)?key:"main";
  document.body.setAttribute("data-style",valid);
}

/* Draw the picker inside Settings and wire the clicks. */
function renderStyles(){
  const g=$("#styleGrid");if(!g)return;
  const cur=(state.settings.style)||"main";
  g.innerHTML=STYLES.map(s=>
    `<button type="button" class="styleswatch ${s.key===cur?'on':''}" data-style-key="${esc(s.key)}">`+
    `<span class="ssw" style="background:${esc(s.sw)}"><span class="sdot" style="background:${esc(s.ac)}"></span></span>`+
    `<span class="ssn">${esc(s.name)}</span><span class="ssd">${esc(s.desc)}</span></button>`
  ).join("");
  g.querySelectorAll(".styleswatch").forEach(b=>b.onclick=()=>{
    state.settings.style=b.dataset.styleKey;
    persist();
    applyStyle();
    applyTheme();          /* re-assert Theme + any Accent override on top */
    renderStyles();
    const s=STYLES.find(x=>x.key===state.settings.style);
    toast((s?s.name:"Main")+" style applied");
  });
}
