/* =====================================================================
   Parts Bin — AI assistant: bring-your-own-key provider layer + chat panel
   ===================================================================== */

/* Tauri's HTTP plugin bypasses webview CORS (needed for Ollama, and safest
   for every provider); falls back to plain fetch if it isn't wired up yet. */
function aiFetch(url,opts){
  const t=window.__TAURI__&&window.__TAURI__.http&&window.__TAURI__.http.fetch;
  return (t||fetch)(url,opts);
}

function aiSettings(){
  const s=state.settings;
  if(!s.ai)s.ai={provider:"anthropic",apiKey:"",model:"",ollamaUrl:"http://localhost:11434"};
  if(s.ai.autoMemory===undefined)s.ai.autoMemory=true;   // proactive memory saves apply silently by default
  return s.ai;
}
/* Calendar access is on unless the user switches it off in Settings. When
   off, the calendar is not put in the prompt at all and calendar ops fail. */
function aiCalendarOn(){ return aiSettings().calendarAccess!==false; }

const AI_DEFAULT_MODEL={anthropic:"claude-sonnet-5",openai:"gpt-4o-mini",gemini:"gemini-2.0-flash",ollama:"llama3.2"};
const AI_SYSTEM_PROMPT=
"You are the AI assistant built into Parts Bin, a personal electronics/maker inventory app. "+
"You can see the user's current inventory below — use it to answer questions, suggest projects buildable from what they own, point out what's low or missing, and help them plan. "+
"Talk normally, like a knowledgeable maker friend. Keep prose short and practical.\n\n"+
"FORMATTING — write in markdown so key things stand out:\n"+
"- **bold** for names and emphasis\n"+
"- '# ', '## ' or '### ' at the start of a line for larger headings (use these for each project/part name)\n"+
"- '- ' for bullet points\n"+
"When suggesting projects or parts, give each one its own '## ' heading (with an emoji) followed by a short description and which of the user's items it uses.\n\n"+
"ACTIONS — when the user asks you to change or create things, emit an action block. Do NOT claim it's done — the user taps Apply to confirm each one. The examples below are illustrations only: never copy their names or values, and only emit ops the user actually asked for:\n"+
"```pb:action\n"+
'{"ops":[{"op":"set","name":"LED 5mm","qty":0},{"op":"additem","name":"1k resistor","type":"components","qty":50,"originalId":"C11702"},{"op":"addproject","name":"LED cube","desc":"8x8x8 charlieplexed cube"}]}\n'+
"```\n"+
'Ops:\n'+
'- "set"/"add"/"sub": change an existing item\'s qty (name must match an item).\n'+
'- "additem": create an item (fields: name, type = components|filament|pcbs|screws or a custom tab key, qty, optional loc/price/link/originalId).\n'+
'- "edititem": change an existing item\'s fields — {"op":"edititem","name":"LED 5mm","fields":{"loc":"Drawer B","price":0.1,"link":"...","name":"new name"}}.\n'+
'- "addproject": create a project (fields: name, optional desc). "editproject": change a project (fields: name to match, optional desc, newName).\n'+
'- "addcheck": add a checklist item to a project — {"op":"addcheck","project":"LED cube","text":"solder LEDs","done":false}.\n'+
'- "remember": save a fact to your memory (field: text). "instruct": add to your how-to-act instructions (field: text).\n'+
'- "addtask": schedule a daily task — {"op":"addtask","date":"YYYY-MM-DD","text":"Print the lid","repeat":"weekly"|""} (it appears in Daily tasks on that day; omit date for today).\n'+
'- "addevent": put an event in the user\'s calendar — {"op":"addevent","date":"YYYY-MM-DD","time":"HH:MM","title":"Order PCBs","note":""} (time optional, 24h). "delevent": remove one — {"op":"delevent","title":"Order PCBs","date":"YYYY-MM-DD"}. Only when the calendar is shown to you below.\n'+
'To build a project WITH steps, emit one "addproject" then an "addcheck" per step, in order — e.g. a project with checklist steps 1,2,3,4,5 is one addproject followed by five addcheck ops. Ops run top to bottom.\n'+
'Emit strictly valid JSON in the shape {"ops":[{"op":"remember","text":"…"}]} with every key quoted; you may include as many ops as needed.\n'+
'IMPORTANT: an action only happens if the JSON block is present. Never write "Remembered:", "Saved", "Added" or "Done" on its own — if you mean it, emit the block. Example, user says "remember my name is Sam":\n```pb:action\n{"ops":[{"op":"remember","text":"The user\'s name is Troy"}]}\n```\n'+
'PROACTIVE MEMORY: whenever the user reveals a lasting fact about themselves, their projects, tools, suppliers or preferences, add a "remember" op for it on your own — you do NOT need to be asked. Save it quietly and keep chatting normally; don\'t announce that you saved it and don\'t repeat facts already in your memory above. Only make inventory/project CHANGES the user actually asked for.';

function aiInventorySummary(){
  if(!state.items.length)return "The user's inventory is currently empty.";
  return "Current inventory:\n"+state.items.map(i=>{const l=(typeof locOf==="function")?locOf(i):i.loc;return "- "+i.partId+" "+i.name+" ("+(TYPES[i.type]||TYPES.components).one+", qty "+i.qty+(l?", at "+l:"")+")";}).join("\n");
}
/* Today's date plus the calendar (a week back, two months ahead) — or, when
   access is off, only the date and a line saying the calendar is not available. */
function aiCalendarSummary(){
  const d=new Date();
  const today="Today is "+(typeof calLongDate==="function"?calLongDate(calKey(d)):d.toDateString())+" "+d.getFullYear()+" ("+(typeof calKey==="function"?calKey(d):d.toISOString().slice(0,10))+").";
  if(!aiCalendarOn()||typeof calEventsForAI!=="function")return today+" The user has turned off your access to their calendar, so do not offer calendar actions.";
  const evs=calEventsForAI();
  const tks=(typeof tasksArr==="function")?tasksArr().filter(t=>!t.done).slice(0,60):[];
  let s=today;
  s+=evs.length?" The user's calendar for the next two months:\n"+evs.map(e=>"- "+e.date+(e.time?" "+e.time:"")+": "+e.title+(e.note?" ("+e.note+")":"")).join("\n"):" The user's calendar has no events in the next two months.";
  s+=tks.length?"\nOpen daily tasks:\n"+tks.map(t=>"- "+(t.date?t.date+": ":"today: ")+t.text+(t.repeat==="weekly"?" (weekly)":"")).join("\n"):"\nNo open daily tasks.";
  return s+"\nYou may schedule tasks with \"addtask\" and add or remove events with \"addevent\" / \"delevent\".";
}
/* System prompt for a request: the normal context, or an override for the
   strict action-extraction pass (see aiExtractActions). */
function aiSys(opts){ return (opts&&opts.system)||aiContext(); }
function aiContext(){
  let c=AI_SYSTEM_PROMPT+"\n\n"+aiInventorySummary()+"\n\n"+aiCalendarSummary();
  const instr=(aiSettings().instructions||"").trim();
  if(instr)c+="\n\nHow the user wants you to act (follow this):\n"+instr;
  const mem=(aiSettings().memory||"").trim();
  if(mem)c+="\n\nAlways remember these facts about the user and their setup:\n"+mem;
  return c;
}

const AI_PROVIDERS={
  anthropic:{
    label:"Anthropic",
    needsKey:true,
    async send(messages,ai,opts){
      const r=await aiFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":ai.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:ai.model||AI_DEFAULT_MODEL.anthropic,max_tokens:2048,system:aiSys(opts),messages:messages.map(m=>({role:m.role,content:m.content}))})});
      const d=await r.json();
      if(!r.ok)throw new Error((d.error&&d.error.message)||"Anthropic request failed");
      return d.content[0].text;
    }
  },
  openai:{
    label:"OpenAI",
    needsKey:true,
    async send(messages,ai,opts){
      const body={model:ai.model||AI_DEFAULT_MODEL.openai,max_tokens:2048,messages:[{role:"system",content:aiSys(opts)},...messages.map(m=>({role:m.role,content:m.content}))]};
      if(opts&&opts.json)body.response_format={type:"json_object"};
      const r=await aiFetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+ai.apiKey},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok)throw new Error((d.error&&d.error.message)||"OpenAI request failed");
      return d.choices[0].message.content;
    }
  },
  gemini:{
    label:"Google Gemini",
    needsKey:true,
    async send(messages,ai,opts){
      const model=ai.model||AI_DEFAULT_MODEL.gemini;
      const contents=messages.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
      const body={system_instruction:{parts:[{text:aiSys(opts)}]},contents};
      if(opts&&opts.json)body.generationConfig={responseMimeType:"application/json"};
      const r=await aiFetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent?key="+encodeURIComponent(ai.apiKey),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok)throw new Error((d.error&&d.error.message)||"Gemini request failed");
      return d.candidates[0].content.parts[0].text;
    }
  },
  ollama:{
    label:"Ollama",
    needsKey:false,
    async send(messages,ai,opts){
      const model=ai.model||AI_DEFAULT_MODEL.ollama;
      const base=(ai.ollamaUrl||"http://localhost:11434").replace(/\/$/,"");
      const body={model,stream:false,messages:[{role:"system",content:aiSys(opts)},...messages.map(m=>({role:m.role,content:m.content}))]};
      if(opts&&opts.json)body.format="json";   // Ollama's JSON mode: the model can only answer with valid JSON
      const r=await aiFetch(base+"/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      /* Read the raw body and parse defensively. We ask for stream:false (one
         JSON object), but some Ollama versions/proxies still send newline-
         delimited JSON — and an empty body makes r.json() throw the confusing
         "Unexpected end of JSON input". Handle all three cases. */
      const text=await r.text();
      if(!r.ok){ let msg=text; try{ msg=JSON.parse(text).error||text; }catch(_){} throw new Error(msg||("Ollama request failed ("+r.status+")")); }
      if(!text||!text.trim()) throw new Error('Ollama returned an empty response — is the model "'+model+'" installed? Try:  ollama pull '+model);
      /* 1) single JSON object (the stream:false happy path) */
      try{ const d=JSON.parse(text); if(d.message&&d.message.content) return d.message.content; if(d.response) return d.response; }catch(_){}
      /* 2) newline-delimited JSON: concatenate each chunk's content */
      let out="";
      text.split(/\r?\n/).forEach(function(line){ line=line.trim(); if(!line) return; try{ const o=JSON.parse(line); if(o.message&&o.message.content) out+=o.message.content; else if(o.response) out+=o.response; }catch(e){} });
      if(out) return out;
      throw new Error("Could not parse Ollama response: "+text.slice(0,140));
    }
  }
};

/* ---------- Commands: force a specific output format ----------
   Typed as "/name rest" (or via the chips). build(rest) returns the real
   prompt sent to the model (with a hard instruction so it ALWAYS complies)
   plus the mode that drives the thinking indicator + card fallback.        */
const AI_COMMANDS={
  projects:{label:"🛠️ /projects",hint:"Project ideas",mode:"thinking",
    build:t=>"Suggest "+(t||"a few")+" projects I could build from my current inventory."+
      "\n\n[FORMAT] Give each project its own '## ' heading with an emoji and the name, then 1–3 lines on what it does and which of my parts it uses. Keep it tidy."},
  parts:{label:"🧩 /parts",hint:"Component suggestions",mode:"thinking",
    build:t=>"Recommend components "+(t?("for "+t):"that pair well with what I own")+"."+
      "\n\n[FORMAT] Give each component its own '## ' heading with an emoji, then a short line on why it's useful."},
  explain:{label:"📖 /explain",hint:"Explain something",mode:"thinking",
    build:t=>"Explain: "+(t||"how to get started with my inventory")+
      "\n\n[FORMAT] Use markdown with **bold** key terms and '## ' headings for sections."},
  set:{label:"✏️ /set",hint:"Change stock (e.g. /set LEDs to 0)",mode:"action",
    build:t=>"Update my inventory: "+(t||"")+"."+
      "\n\n[FORMAT] Respond with a ```pb:action``` block. Do NOT claim it's done — the user confirms with Apply."},
  low:{label:"📉 /low",hint:"What's running low",mode:"thinking",
    build:t=>"Looking at my inventory, what's low or nearly out and what should I restock? Keep it short with a **bold** item name per line."}
};
/* A /command may sit anywhere — start, middle or end of the message.
   The rest of the text (minus the command word) becomes its topic. */
function aiParseCommand(text){
  const m=text.match(/(?:^|\s)\/([a-z]+)\b/i);
  if(!m)return null;
  const name=m[1].toLowerCase();
  const c=AI_COMMANDS[name];if(!c)return null;
  const rest=(text.slice(0,m.index)+" "+text.slice(m.index+m[0].length)).replace(/\s+/g," ").trim();
  return {name,mode:c.mode,prompt:c.build(rest)};
}

/* Tiny markdown → HTML for chat bubbles (headings, bold, italic, code, bullets).
   Headings become larger, bolder lines so the AI can make text stand out. */
function aiMd(t){
  let h=esc(String(t||""));
  h=h.replace(/^#{1,6}\s+(?:#{1,6}\s+)+/gm,m=>m.split(/\s+/)[0]+" ");   // "## ## Title" → "## Title" (small-model tic)
  h=h.replace(/^###\s+(.+)$/gm,'<span class="ai-h ai-h3">$1</span>');
  h=h.replace(/^##\s+(.+)$/gm,'<span class="ai-h ai-h2">$1</span>');
  h=h.replace(/^#\s+(.+)$/gm,'<span class="ai-h ai-h1">$1</span>');
  h=h.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
  h=h.replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>");
  h=h.replace(/`([^`]+)`/g,"<code>$1</code>");
  h=h.replace(/^\s*[-*]\s+/gm,"• ");
  return h;
}
/* Markdown for a reply that is still being typed out: unclosed **bold** /
   `code` markers are closed for display so half-typed markup never shows
   raw asterisks or breaks the layout; a lone trailing marker is hidden. */
function aiMdLive(t){
  let s=String(t||"");
  s=s.replace(/(\*\*|`|\*)\s*$/,"");                       // marker with nothing after it yet
  if((s.match(/\*\*/g)||[]).length%2)s+="**";
  if((s.match(/`/g)||[]).length%2)s+="`";
  return aiMd(s);
}
/* Plain version shown while the text is still typing out. */
function aiStripMd(t){
  return String(t||"").replace(/^#{1,3}\s+/gm,"").replace(/\*\*/g,"").replace(/`/g,"").replace(/^\s*[-*]\s+/gm,"• ").replace(/\*/g,"");
}
function aiWait(ms){return new Promise(r=>setTimeout(r,ms));}

/* What the thinking indicator says while it works — one per kind of job. */
const AI_THINK={
  thinking:{label:"Thinking"},
  action:{label:"Updating inventory"},
  connect:{label:"Reaching the model"}
};

const AI_PRESETS=[
  {label:"🛠️ Suggest projects",send:"/projects"},
  {label:"🧩 Recommend parts",send:"/parts"},
  {label:"📉 What am I low on?",send:"/low"}
];

/* ---------- Chat store: multiple conversations with memory ----------
   Persisted in state.settings so they survive restarts (via persist()).
   Shape: state.settings.aiChats = [{id,title,messages:[{role,content}],ts}]
          state.settings.aiCurrent = id of the open chat                     */
function aiStore(){
  const s=state.settings;
  if(!Array.isArray(s.aiChats))s.aiChats=[];
  return s;
}
function aiNewChatObj(){
  return {id:"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:"New chat",messages:[],ts:Date.now()};
}
function aiCurrentChat(){
  const s=aiStore();
  let c=s.aiChats.find(x=>x.id===s.aiCurrent);
  if(!c){ c=aiNewChatObj(); s.aiChats.unshift(c); s.aiCurrent=c.id; }
  return c;
}
function aiTouch(c){ c.ts=Date.now(); persist(); }
function aiTitleFrom(t){ t=t.replace(/\s+/g," ").trim(); return t.length>38?t.slice(0,38)+"…":t; }

function aiNewChat(){
  const s=aiStore();
  const cur=s.aiChats.find(x=>x.id===s.aiCurrent);
  if(!cur||cur.messages.length){                 // don't stack empty chats
    const c=aiNewChatObj(); s.aiChats.unshift(c); s.aiCurrent=c.id; persist();
  }
  aiRenderChat(); aiRenderChatList();
  $("#aiChatInput").focus();
}
function aiSelectChat(id){
  aiStore().aiCurrent=id; persist();
  aiRenderChat(); aiRenderChatList();
  $("#aiPanel").classList.remove("showlist");
}
function aiDeleteChat(id){
  const s=aiStore();
  s.aiChats=s.aiChats.filter(x=>x.id!==id);
  if(s.aiCurrent===id) s.aiCurrent=s.aiChats.length?s.aiChats[0].id:null;
  persist();
  aiRenderChat(); aiRenderChatList();
}

function aiRenderChatList(){
  const el=$("#aiChatList"); if(!el)return;
  const s=aiStore();
  const chats=s.aiChats.slice().sort((a,b)=>b.ts-a.ts);
  if(!chats.length){ el.innerHTML='<div class="ai-empty" style="padding:6px">No chats yet</div>'; return; }
  el.innerHTML=chats.map(c=>'<div class="ai-chatitem'+(c.id===s.aiCurrent?" active":"")+'" data-id="'+c.id+'"><span class="ai-chatitem-t">'+esc(c.title||"New chat")+'</span><button class="ai-chatdel" data-del="'+c.id+'" title="Delete chat">'+ic("trash")+'</button></div>').join("");
  el.querySelectorAll(".ai-chatitem").forEach(d=>d.onclick=e=>{ if(e.target.closest(".ai-chatdel"))return; aiSelectChat(d.dataset.id); });
  el.querySelectorAll(".ai-chatdel").forEach(b=>b.onclick=e=>{ e.stopPropagation(); aiDeleteChat(b.dataset.del); });
}

function aiRenderPresets(){
  const g=$("#aiPresets");if(!g)return;
  g.innerHTML=AI_PRESETS.map((p,i)=>'<button type="button" class="ai-chip" data-i="'+i+'">'+esc(p.label)+"</button>").join("")
    +'<div class="ai-cmdtip">Commands: '+Object.keys(AI_COMMANDS).map(k=>'<code>/'+k+'</code>').join(" ")+'</div>';
  g.querySelectorAll(".ai-chip").forEach(b=>b.onclick=()=>aiSend(AI_PRESETS[+b.dataset.i].send));
}

/* ---------- Parse the model's reply into text + actions ----------
   Only inventory-action JSON is rendered; any stray JSON object is stripped
   from the text so raw JSON never shows in the chat. */
/* Repair the small JSON mistakes models make: unquoted/half-quoted keys and
   trailing commas. Only used as a fallback when strict parsing fails. */
function aiRepairJson(s){
  return String(s)
    .replace(/([{,]\s*)"?([A-Za-z_]\w*)"?(\s*:)/g,'$1"$2"$3')  // force keys quoted
    .replace(/,(\s*[}\]])/g,'$1');                              // drop trailing commas
}
function aiIngestJson(body,actions){
  let d=null;
  try{d=JSON.parse(String(body).trim());}
  catch(e){ try{d=JSON.parse(aiRepairJson(body));}catch(e2){return false;} }
  if(d&&Array.isArray(d.ops)){d.ops.forEach(o=>{if(o&&typeof o==="object")actions.push(aiNormOp(o));});return true;}
  if(d&&d.op){actions.push(aiNormOp(d));return true;}
  if(d&&Array.isArray(d.items))return true;   // legacy card JSON — strip, don't render
  // Alternative shapes small models emit
  if(d&&typeof d==="object"&&!Array.isArray(d)){
    // {"action":"remember",...} or {"type":"remember",...}
    const named=(typeof d.action==="string"&&d.action)||(typeof d.type==="string"&&d.type)||"";
    if(AI_OP_NAMES.indexOf(named)>=0){const c=Object.assign({},d);c.op=named;delete c.action;if(c.type===named)delete c.type;actions.push(c);return true;}
    // {"remember":{…}} / {"remember":"…"} / {"memory":"…"}
    const ks=Object.keys(d);
    if(ks.length===1){
      const op=(AI_OP_NAMES.indexOf(ks[0])>=0)?ks[0]:AI_ALIAS[ks[0]];
      if(op){const v=d[ks[0]];actions.push(Object.assign({op},(v&&typeof v==="object"&&!Array.isArray(v))?v:{text:v}));return true;}
    }
  }
  return false;
}
const AI_OP_NAMES=["set","add","sub","additem","edititem","addproject","editproject","addcheck","remember","instruct","addevent","delevent","addtask"];
/* Small models drift on field names ("fact", "value", "content", "memory"…).
   Map them onto the one the handlers read, so the op still applies. */
function aiNormOp(o){
  if(!o||typeof o!=="object")return o;
  if(typeof o.op==="string")o.op=o.op.toLowerCase().replace(/[\s_-]/g,"");
  if(o.op==="remember"||o.op==="instruct"){
    if(!o.text){const k=["fact","value","content","memory","note","instruction","message","name"].find(k=>typeof o[k]==="string"&&o[k].trim());if(k)o.text=o[k];}
  }
  if(o.op==="additem"&&!o.name&&typeof o.item==="string")o.name=o.item;
  if(o.op==="addproject"&&!o.name&&typeof o.project==="string")o.name=o.project;
  return o;
}
const AI_ALIAS={memory:"remember",note:"remember",fact:"remember",instruction:"instruct",instructions:"instruct"};
/* Scan for balanced {…} objects, ignoring braces inside strings. This is
   bulletproof against unclosed ``` fences, trailing "}]}" and prose after. */
function aiExtractJsonObjects(text){
  const out=[];
  for(let i=0;i<text.length;i++){
    if(text[i]!=="{")continue;
    let depth=0,inStr=false,esc=false;
    for(let j=i;j<text.length;j++){
      const ch=text[j];
      if(inStr){if(esc)esc=false;else if(ch==="\\")esc=true;else if(ch==='"')inStr=false;}
      else{if(ch==='"')inStr=true;else if(ch==="{")depth++;else if(ch==="}"){depth--;if(depth===0){out.push([i,j+1,text.slice(i,j+1)]);i=j;break;}}}
    }
  }
  return out;
}
/* Did the reply LOOK like it attempted an action (fenced block, op keys,
   or a "Remembered:"-style claim) even if nothing parsed? Drives the
   "couldn't read that action" notice so a failure is never silent. */
function aiLooksLikeAction(text){
  return /pb:action|"ops"\s*:|"op"\s*:|\bremembered\b|\bsaved to (?:my )?memory\b|\bmemory updated\b|\bi(?:'ll| will) remember\b|\badded to (?:your )?(?:inventory|library)\b|\bcreated (?:the )?project\b/i.test(text||"");
}
function aiParse(raw,userText){
  const actions=[];
  let text=String(raw||"");
  const tried=aiLooksLikeAction(text);
  // 1) Fast path: balanced-scan any well-formed {…} objects and strip them.
  const objs=aiExtractJsonObjects(text);
  for(let k=objs.length-1;k>=0;k--){                 // last→first keeps indices valid
    const s=objs[k][0],e=objs[k][1],a2=[];
    if(aiIngestJson(objs[k][2],a2)){actions.unshift(...a2);text=text.slice(0,s)+text.slice(e);continue;}
    // `remember: {"text":"…"}` / `**additem**: {…}` — the op name sits just before the braces
    const before=text.slice(Math.max(0,s-40),s),lm=before.match(/[*_`]*([A-Za-z_]+)[*_`]*\s*:?\s*$/);
    if(lm){
      const nm=lm[1].toLowerCase(),op=(AI_OP_NAMES.indexOf(nm)>=0)?nm:AI_ALIAS[nm];
      if(op){
        let d=null;try{d=JSON.parse(objs[k][2]);}catch(_){try{d=JSON.parse(aiRepairJson(objs[k][2]));}catch(_2){}}
        if(d&&typeof d==="object"){actions.unshift(aiNormOp(Object.assign({op},d)));text=text.slice(0,s-lm[0].length)+text.slice(e);}
      }
    }
  }
  // 2) Fallback: malformed JSON (bad quotes) desyncs the scanner, so grab the
  //    whole {…"ops"/"op"…} blob greedily, repair it, and strip it either way.
  if(!actions.length){
    const m=text.match(/\{[\s\S]*"(?:ops|op|remember|instruct|additem|addproject|edititem|editproject|addcheck)"[\s\S]*\}/);
    if(m){ const a2=[]; aiIngestJson(m[0],a2); actions.push(...a2); text=text.replace(m[0],""); }
  }
  // 3) Prose fallback for memory. Small models often answer "Remembered: X"
  //    with no block at all. Only when the user actually asked to remember,
  //    and returned separately: aiSend prefers the strict-JSON pass and uses
  //    this only if that pass gives nothing.
  const fallback=[];
  if(!actions.length&&/\b(remember|memory|memorise|memorize|save|note)\b/i.test(userText||"")){
    const m=text.match(/^\s*(?:[-*•]\s*)?(?:\*\*)?(?:remembered|noted|saved(?: to memory)?|memory updated)(?:\*\*)?\s*[:\-–—]?\s*(.+?)\s*$/im)
           ||text.match(/\bi(?:'ll| will|'ve| have)\s+(?:remember|noted|saved)(?:ed)?\s+(?:that\s+)?(.+?)(?:[.!\n]|$)/i);
    if(m&&m[1]&&m[1].length>1){
      const t=m[1].replace(/^(?:that\s+)?(?:(?:to|in|into)\s+(?:my|your|the)\s+memory\s*[:\-–—]?\s*)?(?:that\s+)?/i,"").replace(/[.!]\s*$/,"").trim();
      if(t)fallback.push({op:"remember",text:t});
    }
  }
  text=text.replace(/```[a-z:]*/gi,"").replace(/\{\s*"ops"\s*:\s*\[[^\]]*\]?\s*\}?/g,"").replace(/^[\s,}\]]+$/gm,"").replace(/\n{3,}/g,"\n\n").trim();
  return {text,actions,fallback,tried:tried&&!actions.length};
}

/* ---------- Inventory changes the AI proposes ---------- */
function aiFindItem(name){
  const n=(name||"").trim().toLowerCase();if(!n)return null;
  return state.items.find(i=>(i.name||"").toLowerCase()===n||(i.partId||"").toLowerCase()===n)
      || state.items.find(i=>n.length>1&&(i.name||"").toLowerCase().includes(n));
}
function aiFindProject(name){
  const n=(name||"").trim().toLowerCase();if(!n)return null;
  return state.projects.find(p=>(p.name||"").toLowerCase()===n)||state.projects.find(p=>n.length>1&&(p.name||"").toLowerCase().includes(n));
}
function aiOpLabel(a){
  const q=(+a.qty||0);
  if(a.op==="set")return 'Set “'+a.name+'” stock to '+q;
  if(a.op==="add")return 'Add '+q+' to “'+a.name+'”';
  if(a.op==="sub")return 'Remove '+q+' from “'+a.name+'”';
  if(a.op==="additem")return 'Create item “'+a.name+'” ('+((TYPES[a.type]||TYPES.components).one)+', qty '+q+')';
  if(a.op==="edititem")return 'Edit “'+a.name+'” ('+Object.keys(a.fields||{}).join(", ")+')';
  if(a.op==="addproject")return 'Create project “'+a.name+'”';
  if(a.op==="editproject")return 'Edit project “'+a.name+'”';
  if(a.op==="addcheck")return 'Add to “'+(a.project||"")+'”: ☐ '+(a.text||"");
  if(a.op==="remember")return 'Remember: “'+(a.text||"")+'”';
  if(a.op==="instruct")return 'Update how to act: “'+(a.text||"")+'”';
  if(a.op==="addtask")return 'Schedule task'+(a.date?" for "+a.date:" for today")+': “'+(a.text||"")+'”'+(a.repeat==="weekly"?" (weekly)":"");
  if(a.op==="addevent")return 'Add to calendar: '+(a.date||"?")+(a.time?" "+a.time:"")+' — “'+(a.title||"Event")+'”';
  if(a.op==="delevent")return 'Remove from calendar: “'+(a.title||a.id||"?")+'”'+(a.date?" on "+a.date:"");
  return (a.op||"?")+" "+(a.name||"");
}
/* A failed action is never silent: the reason is stored on the action and
   drawn in red inside its row (aiActionsHtml), plus a toast. */
function aiFail(a,msg){a._error=msg;try{toast(msg);}catch(_){}return false;}
/* Apply an action. On success sets a._undo so it can be reverted. Returns
   false on failure OR when the user declined the confirm (a._error tells
   the two apart). */
function aiApplyOp(a,silent){
  if(!a||typeof a!=="object")return false;
  a._error=null;
  try{ return aiApplyOpRaw(a,silent); }
  catch(e){ return aiFail(a,"Couldn't apply this: "+(e&&e.message||e)); }
}
function aiApplyOpRaw(a,silent){
  const ok=m=>silent||confirm(m);
  if(a.op==="remember"){
    if(!String(a.text||"").trim())return aiFail(a,"Nothing to remember: the model left the text empty");
    if(!ok(aiOpLabel(a)+"?"))return false;
    a._undo={kind:"memory",prev:aiSettings().memory||""};
    aiSettings().memory=((aiSettings().memory||"").trim()+"\n"+(a.text||"")).trim();
    persist();if($("#aiMemory"))$("#aiMemory").value=aiSettings().memory;if(!silent)toast("Saved to memory");return true;
  }
  if(a.op==="instruct"){
    if(!String(a.text||"").trim())return aiFail(a,"Nothing to add: the model left the instruction empty");
    if(!ok(aiOpLabel(a)+"?"))return false;
    a._undo={kind:"instructions",prev:aiSettings().instructions||""};
    aiSettings().instructions=((aiSettings().instructions||"").trim()+"\n"+(a.text||"")).trim();
    persist();if($("#aiInstr"))$("#aiInstr").value=aiSettings().instructions;if(!silent)toast("Updated how I act");return true;
  }
  if(a.op==="addtask"){
    if(!aiCalendarOn())return aiFail(a,"Calendar access for the assistant is off (Settings → AI assistant)");
    if(typeof calAddTask!=="function")return aiFail(a,"Daily tasks aren't available");
    if(!String(a.text||a.title||"").trim())return aiFail(a,"The task has no text");
    if(a.date&&!/^\d{4}-\d{2}-\d{2}$/.test(String(a.date)))return aiFail(a,"The date must be YYYY-MM-DD");
    if(!ok(aiOpLabel(a)+"?"))return false;
    const t=calAddTask({date:a.date||"",text:a.text||a.title,repeat:a.repeat});
    a._undo={kind:"deltask",id:t.id};if(!silent)toast("Task scheduled");return true;
  }
  if(a.op==="addevent"||a.op==="delevent"){
    if(!aiCalendarOn())return aiFail(a,"Calendar access for the assistant is off (Settings → AI assistant)");
    if(typeof calAddEvent!=="function")return aiFail(a,"The calendar isn't available");
    if(a.op==="addevent"){
      if(!String(a.title||"").trim())return aiFail(a,"The event has no title");
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(a.date||"")))return aiFail(a,"The event needs a date as YYYY-MM-DD");
      if(!ok(aiOpLabel(a)+"?"))return false;
      const e=calAddEvent({date:a.date,time:a.time,title:a.title,note:a.note});
      a._undo={kind:"delevent",id:e.id};if(!silent)toast("Added to your calendar");return true;
    }
    const e=calFindEvent(a.id||a.title,a.date);if(!e)return aiFail(a,'No event matches “'+(a.title||a.id||"")+'”');
    if(!ok(aiOpLabel(a)+"?"))return false;
    calDeleteEvent(e.id);a._undo={kind:"addevent",ev:e};if(!silent)toast("Removed from your calendar");return true;
  }
  if(a.op==="additem"){
    const type=TYPES[a.type]?a.type:"components";
    if(!String(a.name||"").trim())return aiFail(a,"The item has no name");
    if(!ok(aiOpLabel(a)+"?"))return false;
    const item={type,name:String(a.name||"New item").trim(),qty:Math.max(0,+a.qty||0),
      low:Math.max(0,Number(state.settings.defLow)||0),loc:String(a.loc||"").trim(),price:+a.price||0,
      link:String(a.link||"").trim(),code:"",lcsc:String(a.originalId||a.lcsc||"").trim(),img:null,imgFit:"cover",imgPos:"50% 50%",imgZoom:1,
      perPack:0,material:"",dia:"",color:"",colorName:"",weight:"",id:uid()};
    item.partId=nextPartId(type);state.items.push(item);a._undo={kind:"delitem",id:item.id};
    { const cn=item.loc.toLowerCase(),c=cn&&state.compartments.find(x=>x.name.toLowerCase()===cn); if(c){item.comp=c.id;item.loc="";} }
    persist();render();toast("Created "+item.partId+" "+item.name);return true;
  }
  if(a.op==="edititem"){
    const it=aiFindItem(a.name);if(!it)return aiFail(a,'No item matches “'+a.name+'”');
    const f=a.fields||{},allow=["name","qty","low","loc","price","link","originalId","lcsc"],prev={};
    if(!ok(aiOpLabel(a)+"?"))return false;
    Object.keys(f).forEach(k=>{
      const key=(k==="originalId")?"lcsc":k;if(!allow.includes(k))return;
      prev[key]=it[key];
      it[key]=(key==="qty"||key==="low"||key==="price")?(+f[k]||0):String(f[k]);
    });
    a._undo={kind:"fields",id:it.id,prev};persist();render();toast("Edited "+(it.partId||it.name));return true;
  }
  if(a.op==="addproject"){
    if(!ok(aiOpLabel(a)+"?"))return false;
    const p={id:uid(),name:String(a.name||"New project").trim(),desc:String(a.desc||"").trim(),loc:"",photos:[],components:[],checklist:[],archived:false};
    state.projects.push(p);a._undo={kind:"delproject",id:p.id};
    persist();render();toast("Created project “"+p.name+"”");return true;
  }
  if(a.op==="editproject"){
    const p=aiFindProject(a.name);if(!p)return aiFail(a,'No project matches “'+a.name+'”');
    if(!ok(aiOpLabel(a)+"?"))return false;
    const prev={desc:p.desc,name:p.name};
    if(a.desc!=null)p.desc=String(a.desc);
    if(a.newName)p.name=String(a.newName);
    a._undo={kind:"projfields",id:p.id,prev};persist();render();toast("Edited project");return true;
  }
  if(a.op==="addcheck"){
    const p=aiFindProject(a.project||a.name);if(!p)return aiFail(a,'No project matches “'+(a.project||a.name)+'”');
    if(!ok(aiOpLabel(a)+"?"))return false;
    if(!Array.isArray(p.checklist))p.checklist=[];
    p.checklist.push({text:String(a.text||"To do"),done:!!a.done});
    a._undo={kind:"delcheck",id:p.id,index:p.checklist.length-1};persist();render();toast("Added a checklist item");return true;
  }
  if(a.op!=="set"&&a.op!=="add"&&a.op!=="sub")return aiFail(a,'Unknown action "'+(a.op||"?")+'"');
  const it=aiFindItem(a.name);
  if(!it)return aiFail(a,'No item matches “'+a.name+'”');
  const before=+it.qty||0;let after=before;
  if(a.op==="set")after=+a.qty||0;
  else if(a.op==="add")after=before+(+a.qty||0);
  else after=Math.max(0,before-(+a.qty||0));
  if(!ok(aiOpLabel(a)+"?\n\n"+it.name+":  "+before+"  →  "+after))return false;
  it.qty=after;a._undo={kind:"qty",id:it.id,qty:before};persist();render();toast(it.name+" → "+after);
  return true;
}
/* Undo a previously-applied action using the _undo it recorded. */
function aiRevertOp(a){
  const u=a._undo;if(!u)return false;
  if(u.kind==="qty"){const it=state.items.find(i=>i.id===u.id);if(it)it.qty=u.qty;}
  else if(u.kind==="fields"){const it=state.items.find(i=>i.id===u.id);if(it)Object.keys(u.prev).forEach(k=>it[k]=u.prev[k]);}
  else if(u.kind==="delitem"){state.items=state.items.filter(i=>i.id!==u.id);}
  else if(u.kind==="delproject"){state.projects=state.projects.filter(p=>p.id!==u.id);}
  else if(u.kind==="projfields"){const p=state.projects.find(x=>x.id===u.id);if(p)Object.keys(u.prev).forEach(k=>p[k]=u.prev[k]);}
  else if(u.kind==="delcheck"){const p=state.projects.find(x=>x.id===u.id);if(p&&Array.isArray(p.checklist))p.checklist.splice(u.index,1);}
  else if(u.kind==="memory"){aiSettings().memory=u.prev;if($("#aiMemory"))$("#aiMemory").value=u.prev;}
  else if(u.kind==="instructions"){aiSettings().instructions=u.prev;if($("#aiInstr"))$("#aiInstr").value=u.prev;}
  else if(u.kind==="delevent"){if(typeof calDeleteEvent==="function")calDeleteEvent(u.id);}
  else if(u.kind==="deltask"){state.settings.tasks=(state.settings.tasks||[]).filter(t=>t.id!==u.id);try{renderTasks();}catch(_){}}
  else if(u.kind==="addevent"){if(typeof calEvents==="function"){calEvents().push(u.ev);if($("#tasksPanel").classList.contains("show"))try{renderCalendar();}catch(_){}}}
  a._done=false;a._undo=null;persist();render();toast("Reverted");return true;
}

function aiActionsHtml(actions,mi){
  return '<div class="ai-actions-wrap">'+actions.map((a,ai_)=>
    '<div class="ai-action'+(a._done?" done":"")+(a._error?" failed":"")+'"><span>'+esc(aiOpLabel(a))
    +(a._error?'<span class="ai-err">⚠ '+esc(a._error)+'</span>':"")+"</span>"
    +(a._done
      ?'<span class="ai-done">✓ Applied</span>'+(a._undo?'<button class="ai-revert" data-mi="'+mi+'" data-ai="'+ai_+'">Revert</button>':"")
      :'<button class="ai-apply" data-mi="'+mi+'" data-ai="'+ai_+'">'+(a._error?"Try again":"Apply")+'</button>')
    +"</div>"
  ).join("")+"</div>";
}

/* Messages that have already been drawn once: re-renders skip their slide-in. */
const aiShown=new WeakSet();
function aiMsgHtml(m,i){
  const anim=aiShown.has(m)?" noanim":""; aiShown.add(m);
  if(m.role==="user")return '<div class="ai-msg user'+anim+'">'+esc(m.content)+"</div>";
  if(m.pending){
    const lbl=(AI_THINK[m.mode]||AI_THINK.thinking).label;
    return '<div class="ai-msg bot pending'+anim+'" data-mi="'+i+'"><div class="ai-think">'
    +'<span class="ai-think-logo">'+ic("sparkle")+"</span>"
    +'<span class="ai-think-label">'+esc(lbl)+"</span>"
    +'<span class="ai-think-dots"><span></span><span></span><span></span></span>'
    +'<span class="ai-think-time">0s</span></div></div>';
  }
  let inner='<div class="ai-msg-text">'+(m._hide?"":aiMd(m.content))+"</div>";
  if(!m._hide&&m.actions&&m.actions.length)inner+=aiActionsHtml(m.actions,i);
  if(!m._hide&&m.note)inner+='<div class="ai-note">⚠ '+esc(m.note)+'</div>';
  if(!m._hide&&m.content&&m.content.trim())inner+='<div class="ai-msgtools"><button class="ai-speak" data-speak="'+i+'" title="Read aloud / stop">'+ic("speak")+'</button><button class="ai-speak ai-copy" data-copy="'+i+'" title="Copy">'+ic("copy")+"</button></div>";
  return '<div class="ai-msg bot'+anim+'" data-mi="'+i+'">'+inner+"</div>";
}
/* Read text aloud with the built-in speech engine (local, no network).
   Clicking again while it's talking stops it — the button doubles as Stop. */
function aiSpeak(text){
  if(!("speechSynthesis"in window)){toast("Voice isn't available on this device");return;}
  if(speechSynthesis.speaking||speechSynthesis.pending){ speechSynthesis.cancel(); toast("Stopped reading"); return; }
  try{ const u=new SpeechSynthesisUtterance(String(text||"").slice(0,4000)); u.rate=1.02; speechSynthesis.speak(u); }
  catch(e){ toast("Couldn't read that aloud"); }
}

function aiBindMsgButtons(){
  const log=$("#aiChatLog");if(!log)return;
  const chat=aiCurrentChat();
  log.querySelectorAll(".ai-apply").forEach(b=>b.onclick=()=>{
    const m=chat.messages[+b.dataset.mi];if(!m||!m.actions)return;
    const a=m.actions[+b.dataset.ai];
    if(aiApplyOp(a))a._done=true;
    if(a._done||a._error){aiTouch(chat);aiRenderChat();}
  });
  log.querySelectorAll(".ai-revert").forEach(b=>b.onclick=()=>{
    const m=chat.messages[+b.dataset.mi];if(!m||!m.actions)return;
    if(aiRevertOp(m.actions[+b.dataset.ai])){aiTouch(chat);aiRenderChat();}
  });
  log.querySelectorAll(".ai-speak[data-speak]").forEach(b=>b.onclick=()=>{
    const m=chat.messages[+b.dataset.speak];if(m)aiSpeak(m.content);
  });
  log.querySelectorAll(".ai-copy").forEach(b=>b.onclick=()=>{
    const m=chat.messages[+b.dataset.copy];if(!m)return;
    try{ (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(m.content):Promise.reject()).then(()=>toast("Copied")).catch(()=>toast("Couldn't copy")); }catch(e){ toast("Couldn't copy"); }
  });
}

/* Rotating status words while it works — picked at random, slid in one by one. */
const AI_THINK_WORDS=["Thinking","Processing","Reasoning","Crunching the numbers","Digging through your parts",
  "Working on it","Cooking","Consulting the schematics","Rummaging the bins","Piecing it together","Analysing",
  "Brewing ideas","Checking your inventory","Untangling the wires","Warming up","Considering the options",
  "Sketching a plan","Measuring twice","Sorting the bins","Reading the datasheet","Doing the math",
  "Lining things up","Tinkering","Almost there","Connecting the dots","Sizing it up"];
let aiThinkTimer=null,aiThinkWordTimer=null;
function aiSetThinkWord(){
  const el=document.querySelector(".ai-msg.bot.pending .ai-think-label");
  if(!el)return;
  let w;do{ w=AI_THINK_WORDS[Math.floor(Math.random()*AI_THINK_WORDS.length)]; }while(w===el.textContent&&AI_THINK_WORDS.length>1);
  el.textContent=w;
  el.classList.remove("swap");void el.offsetWidth;el.classList.add("swap");
}
function aiStartThink(){
  aiStopThink();
  const t0=Date.now();
  aiThinkTimer=setInterval(()=>{
    const e=document.querySelector(".ai-msg.bot.pending .ai-think-time");
    if(!e){aiStopThink();return;}
    e.textContent=Math.round((Date.now()-t0)/1000)+"s";
  },500);
  aiThinkWordTimer=setInterval(aiSetThinkWord,3200);   // change the word every ~3s
}
function aiStopThink(){
  if(aiThinkTimer){clearInterval(aiThinkTimer);aiThinkTimer=null;}
  if(aiThinkWordTimer){clearInterval(aiThinkWordTimer);aiThinkWordTimer=null;}
}

function aiRenderChat(){
  const log=$("#aiChatLog");if(!log)return;
  const chat=aiCurrentChat();
  const title=$("#aiChatTitle"); if(title)title.textContent=chat.title||"New chat";
  if(!chat.messages.length){
    log.innerHTML='<div class="ai-empty">Ask anything, or try one of these:</div><div class="ai-presets" id="aiPresets"></div>';
    aiRenderPresets();aiStopThink();
    return;
  }
  log.innerHTML=chat.messages.map((m,i)=>aiMsgHtml(m,i)).join("");
  aiBindMsgButtons();
  log.scrollTop=log.scrollHeight;
  if(chat.messages.some(m=>m.pending))aiStartThink();else aiStopThink();
}

let aiStop=false;                 // set true to interrupt the reply mid-way
/* Type one chunk word-by-word. The raw markdown typed so far lives in
   state.raw and the bubble is re-rendered formatted on every step, so
   **bold**, headings and bullets appear styled as they arrive. */
function aiTypeChunk(el,log,txt,st){
  return new Promise(resolve=>{
    const parts=String(txt||"").split(/(\s+)/);let i=0;
    (function step(){
      if(aiStop||i>=parts.length){resolve();return;}
      st.raw+=parts[i++];
      el.innerHTML=aiMdLive(st.raw);
      log.scrollTop=log.scrollHeight;
      setTimeout(step, parts[i-1].trim()?16+Math.random()*26:8);
    })();
  });
}
/* Reveal the reply like a person: write a bit, pause to think, write more.
   Formatting is live throughout; the final render uses the complete text. */
async function aiTypeOut(full){
  const log=$("#aiChatLog");
  const bubble=log&&log.querySelector(".ai-msg.bot:last-child");
  const el=bubble&&bubble.querySelector(".ai-msg-text");
  if(!el)return;
  const segs=String(full||"").split(/\n{2,}/).map(s=>s.trim()).filter(Boolean);
  const st={raw:""};
  el.textContent="";bubble.classList.add("typing");
  for(let s=0;s<segs.length&&!aiStop;s++){
    if(s>0){
      bubble.classList.remove("typing");bubble.classList.add("thinking-pause");
      await aiWait(480+Math.random()*520);          // brief "thinking" between segments
      if(aiStop)break;
      bubble.classList.remove("thinking-pause");bubble.classList.add("typing");
      st.raw+="\n\n";
    }
    await aiTypeChunk(el,log,segs[s],st);
  }
  bubble.classList.remove("typing","thinking-pause");
  el.innerHTML=aiStop?aiMdLive(st.raw+" …"):aiMd(full);   // keep what's shown if stopped
  log.scrollTop=log.scrollHeight;
  return st.raw;
}
function aiSetSendMode(busy){
  const b=$("#aiChatSend");if(!b)return;
  b.innerHTML=ic(busy?"stop":"send");
  b.classList.toggle("stopbtn",busy);
  b.title=busy?"Stop":"Send";
}
function aiStopGen(){ aiStop=true; aiStopThink(); }

/* ---------- Second pass for small models ----------
   When the user clearly asked for a change and the reply claimed to do it
   ("Remembered: …", "Added …") but no action block came through, ask the
   model ONCE more in strict JSON mode to turn that reply into ops. Local
   models get this whenever the request looked like a command; keyed
   providers only when the reply itself claimed an action. */
const AI_EXTRACT_SYS=
"You convert an assistant reply into Parts Bin actions. Output ONLY one JSON object, no prose, no markdown: "+
'{"ops":[...]}. Allowed ops: '+
'{"op":"remember","text":"fact about the user"}, {"op":"instruct","text":"how to behave"}, '+
'{"op":"additem","name":"…","type":"components|filament|pcbs|screws","qty":1,"loc":"","price":0,"originalId":""}, '+
'{"op":"set","name":"existing item","qty":5}, {"op":"add","name":"…","qty":1}, {"op":"sub","name":"…","qty":1}, '+
'{"op":"edititem","name":"existing item","fields":{"loc":"…"}}, {"op":"addproject","name":"…","desc":"…"}, '+
'{"op":"addcheck","project":"…","text":"…"}, {"op":"addevent","date":"YYYY-MM-DD","time":"HH:MM","title":"…"}. '+
'If the user asked to remember/save/note something, ALWAYS include a "remember" op with the fact. '+
'Only include changes the user actually asked for. If nothing applies, output {"ops":[]}.';
function aiWantsAction(userText){
  return /\b(remember|memor(y|ise|ize)|save|note|add|create|new|set|update|change|put|remove|delete|rename|make|schedule|calendar|event|reminder)\b/i.test(userText||"");
}
async function aiExtractActions(userText,reply,ai,provider){
  const msg="User asked: "+userText+"\n\nAssistant replied: "+reply+"\n\nItem names in the inventory: "+
    (state.items.slice(0,200).map(i=>i.name).join("; ")||"(none)")+"\n\nNow output the JSON.";
  const out=await provider.send([{role:"user",content:msg}],ai,{system:AI_EXTRACT_SYS,json:true});
  const p=aiParse(out,userText);
  return p.actions.filter(a=>a&&a.op);
}

let aiBusy=false;
async function aiSend(text){
  if(aiBusy)return;
  text=(text||$("#aiChatInput").value||"").trim();
  if(!text)return;
  const ai=aiSettings(),provider=AI_PROVIDERS[ai.provider];
  $("#aiChatInput").value="";
  const chat=aiCurrentChat();
  if(provider.needsKey&&!ai.apiKey){
    chat.messages.push({role:"user",content:text});
    chat.messages.push({role:"bot",content:"Add an API key in Settings → AI assistant first."});
    aiTouch(chat);aiRenderChat();return;
  }
  const cmd=aiParseCommand(text);
  const mode=cmd?cmd.mode:"thinking";
  // Show what the user typed; send the forced-format prompt behind the scenes.
  chat.messages.push({role:"user",content:text,sendAs:cmd?cmd.prompt:null});
  if(chat.messages.filter(m=>m.role==="user").length===1) chat.title=aiTitleFrom(text);
  chat.messages.push({role:"bot",content:"",pending:true,mode});
  aiBusy=true; aiStop=false; aiSetSendMode(true); aiTouch(chat); aiRenderChat(); aiRenderChatList();
  const bot=chat.messages[chat.messages.length-1];
  try{
    const history=chat.messages.filter(m=>!m.pending).map(m=>({role:m.role==="bot"?"assistant":"user",content:m.sendAs||m.content}));
    const reply=await provider.send(history,ai);
    if(aiStop){ bot.pending=false; bot.content="⏹ Stopped."; }
    else{
      const parsed=aiParse(reply,text);
      // Small-model rescue: reply claims an action but carried none → strict JSON pass.
      if(!parsed.actions.length&&!aiStop&&aiWantsAction(text)&&(ai.provider==="ollama"||parsed.tried)){
        try{ const more=await aiExtractActions(text,reply,ai,provider); if(more.length){parsed.actions=more;parsed.tried=false;} }catch(e){ console.warn("extract pass",e); }
      }
      if(!parsed.actions.length&&parsed.fallback&&parsed.fallback.length){parsed.actions=parsed.fallback;parsed.tried=false;}
      bot.pending=false;
      bot.content=parsed.text||(parsed.actions.length?"":reply);
      bot.actions=parsed.actions; bot._hide=true;
      /* Never pretend: if it looked like an action but nothing usable came through, say so. */
      bot.note=(parsed.tried&&!parsed.actions.length)?"The assistant said it did something, but no usable action came through, so nothing was changed. Smaller local models often get the format wrong — try again, rephrase, or use a bigger model.":"";
      aiStopThink(); aiRenderChat();
      const typed=await aiTypeOut(bot.content);
      if(aiStop&&typeof typed==="string")bot.content=typed+" …";
      bot._hide=false;
    }
  }catch(e){
    bot.pending=false; bot._hide=false;
    bot.content="Couldn't reach "+provider.label+": "+(e.message||String(e));
  }
  aiStopThink(); aiBusy=false; aiStop=false; aiSetSendMode(false);
  // Auto-apply: everything if autoApply, or just memory/instruction edits if autoMemory.
  if(bot.actions&&bot.actions.length){
    const auto=aiSettings().autoApply, autoMem=aiSettings().autoMemory;
    bot.actions.forEach(a=>{
      if(a._done)return;
      const isMem=(a.op==="remember"||a.op==="instruct");
      if(auto||(autoMem&&isMem)){ if(aiApplyOp(a,true))a._done=true; }
    });
  }
  if(aiSettings().autoRead&&!bot.pending&&bot.content&&bot.content.trim())aiSpeak(bot.content);
  aiTouch(chat); aiRenderChat();
}

async function aiTestConnection(){
  const ai=aiSettings(),provider=AI_PROVIDERS[ai.provider];
  if(!ai.apiKey&&provider.needsKey){toast("Add an API key first");return;}
  toast("Testing "+provider.label+"…");
  try{
    await provider.send([{role:"user",content:"Reply with just the word: connected"}],ai);
    toast(provider.label+" connected");
  }catch(e){
    toast(provider.label+" failed: "+(e.message||String(e)));
  }
}

function aiUpdateFieldVisibility(){
  const p=$("#aiProvider").value;
  $("#aiKeyRow").style.display=AI_PROVIDERS[p].needsKey?"":"none";
  $("#aiOllamaRow").style.display=p==="ollama"?"":"none";
  $("#aiLocalRow").style.display=p==="ollama"?"":"none";
  aiRenderStartCmd();
}

/* Start the local AI by copying a terminal command the user pastes & runs.
   More reliable than launching Ollama ourselves — it works no matter how or
   where Ollama is installed. */
function aiStartCmdText(){
  const ai=aiSettings();
  return "ollama run "+(ai.model||AI_DEFAULT_MODEL.ollama);
}
function aiRenderStartCmd(){
  const el=$("#aiStartCmd");if(el)el.textContent=aiStartCmdText();
}
async function aiCopyStart(){
  const cmd=aiStartCmdText();
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(cmd); }
    else{ const t=document.createElement("textarea");t.value=cmd;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove(); }
    toast("Copied — paste it in a terminal and press Enter");
  }catch(e){ toast("Couldn't copy — select the command and copy it manually"); }
}

/* Assistant button position: sidebar (default) | corner | hidden */
function applyAiPos(){
  const pos=aiSettings().pos||"sidebar";
  document.body.setAttribute("data-aipos",pos);
  const seg=$("#aiPosSeg");
  if(seg)seg.querySelectorAll(".segbtn").forEach(b=>b.classList.toggle("on",b.dataset.pos===pos));
}

function aiPopulateSettings(){
  const ai=aiSettings();
  $("#aiProvider").value=ai.provider||"anthropic";
  $("#aiModel").value=ai.model||"";
  $("#aiApiKey").value=ai.apiKey||"";
  $("#aiOllamaUrl").value=ai.ollamaUrl||"http://localhost:11434";
  $("#aiMemory").value=ai.memory||"";
  $("#aiInstr").value=ai.instructions||"";
  $("#aiAutoApply").checked=!!ai.autoApply;
  $("#aiAutoMemory").checked=!!ai.autoMemory;
  $("#aiAutoRead").checked=!!ai.autoRead;
  $("#aiCalendar").checked=aiCalendarOn();
  aiUpdateFieldVisibility();applyAiPos();
}

$("#settingsBtn").addEventListener("click",aiPopulateSettings);
$("#aiProvider").onchange=()=>{aiSettings().provider=$("#aiProvider").value;persist();aiUpdateFieldVisibility();};
$("#aiModel").oninput=()=>{aiSettings().model=$("#aiModel").value.trim();persist();aiRenderStartCmd();};
$("#aiApiKey").oninput=()=>{aiSettings().apiKey=$("#aiApiKey").value.trim();persist();};
$("#aiOllamaUrl").oninput=()=>{aiSettings().ollamaUrl=$("#aiOllamaUrl").value.trim();persist();};
$("#aiMemory").oninput=()=>{aiSettings().memory=$("#aiMemory").value;persist();};
$("#aiInstr").oninput=()=>{aiSettings().instructions=$("#aiInstr").value;persist();};
$("#aiAutoApply").onchange=()=>{aiSettings().autoApply=$("#aiAutoApply").checked;persist();};
$("#aiAutoMemory").onchange=()=>{aiSettings().autoMemory=$("#aiAutoMemory").checked;persist();};
$("#aiAutoRead").onchange=()=>{aiSettings().autoRead=$("#aiAutoRead").checked;persist();};
$("#aiCalendar").onchange=()=>{aiSettings().calendarAccess=$("#aiCalendar").checked;persist();};
$("#aiPosSeg").querySelectorAll(".segbtn").forEach(b=>b.onclick=()=>{aiSettings().pos=b.dataset.pos;persist();applyAiPos();});
$("#aiTestBtn").onclick=aiTestConnection;
$("#aiLocalCopy").onclick=aiCopyStart;

$("#aiNavIcon").innerHTML=ic("sparkle");
$("#aiPanelIcon").innerHTML=ic("sparkle");
$("#aiChatSend").innerHTML=ic("send");
$("#aiPanelClose").innerHTML=ic("x");
$("#aiInfoClose").innerHTML=ic("x");
$("#aiMobBack").innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';

function aiSyncDockBtn(){
  const docked=$("#aiPanel").classList.contains("docked");
  $("#aiPanelDock").innerHTML=ic(docked?"expand":"collapse");
  $("#aiPanelDock").title=docked?"Full screen":"Dock to side";
}
function aiApplyWidth(){
  const p=$("#aiPanel");
  p.style.width=p.classList.contains("docked")?((state.settings.aiWidth||440)+"px"):"";
}
/* Single-instance panel. Opening an already-open panel just refocuses the
   input (no re-render, so the message bubbles don't replay their slide-in);
   the launcher buttons toggle it; the Daily tasks drawer closes first so two
   side panels never stack. */
function aiPanelOpen(){const p=$("#aiPanel");return p.classList.contains("show")&&!p.classList.contains("closing");}
function aiOpenPanel(){
  if(aiPanelOpen()){$("#aiChatInput").focus();return;}
  $("#aiPanel").classList.remove("closing");
  try{if(typeof closeTasks==="function")closeTasks();}catch(_){}
  $("#aiPanel").classList.add("show");
  $("#aiPanel").classList.toggle("docked",!!state.settings.aiDocked);
  aiApplyWidth();aiSyncDockBtn();aiRenderChat();aiRenderChatList();$("#aiChatInput").focus();
}
function aiTogglePanel(){ if(aiPanelOpen())aiClosePanel(); else aiOpenPanel(); }
/* Drag the left edge of the docked panel to resize it, like the sidebar. */
(function(){
  const rz=$("#aiResize"),panel=$("#aiPanel");if(!rz||!panel)return;
  let st=null;
  rz.addEventListener("pointerdown",e=>{
    if(!panel.classList.contains("docked"))return;
    st={x:e.clientX,w:panel.offsetWidth};
    try{rz.setPointerCapture(e.pointerId);}catch(_){}
    document.body.style.userSelect="none";e.preventDefault();
  });
  window.addEventListener("pointermove",e=>{
    if(!st)return;
    const w=Math.max(320,Math.min(window.innerWidth-120, st.w+(st.x-e.clientX)));
    panel.style.width=w+"px";
  });
  window.addEventListener("pointerup",()=>{
    if(!st)return;
    state.settings.aiWidth=panel.offsetWidth;persist();
    st=null;document.body.style.userSelect="";
  });
})();
/* Close with the reverse of the opening animation; the panel is hidden once it ends. */
function aiClosePanel(){
  const p=$("#aiPanel");aiStopThink();
  if(!p.classList.contains("show")||p.classList.contains("closing"))return;
  p.classList.add("closing");
  const done=()=>{p.classList.remove("show","showlist","closing");};
  let fired=false;const once=()=>{if(fired)return;fired=true;p.removeEventListener("animationend",once);done();};
  p.addEventListener("animationend",once);setTimeout(once,260);
}
$("#aiNav").onclick=aiTogglePanel;
$("#aiFab").innerHTML=ic("sparkle");
$("#aiFab").onclick=aiTogglePanel;
applyAiPos();
$("#aiPanelClose").onclick=aiClosePanel;
$("#aiPanelDock").onclick=()=>{const d=$("#aiPanel").classList.toggle("docked");state.settings.aiDocked=d;persist();aiApplyWidth();aiSyncDockBtn();};
$("#aiNewChat").onclick=aiNewChat;
$("#aiMobBack").onclick=()=>$("#aiPanel").classList.toggle("showlist");
$("#aiChatSend").onclick=()=>{ if(aiBusy)aiStopGen(); else aiSend(); };

/* ---------- Slash-command popup (like Claude Code) ---------- */
function aiCmdMenu(){
  const inp=$("#aiChatInput"),menu=$("#aiCmdMenu");
  const m=inp.value.match(/(?:^|\s)\/([a-z]*)$/i);
  if(!m){menu.classList.remove("show");return;}
  const q=m[1].toLowerCase();
  const names=Object.keys(AI_COMMANDS).filter(n=>n.startsWith(q));
  if(!names.length){menu.classList.remove("show");return;}
  menu.innerHTML='<div class="ai-cmdmenu-h">Commands</div>'+names.map((n,i)=>
    '<div class="ai-cmditem'+(i===0?" sel":"")+'" data-n="'+n+'"><span class="ai-cmdname">/'+n+'</span><span class="ai-cmdhint">'+esc(AI_COMMANDS[n].hint)+"</span></div>").join("");
  menu.classList.add("show");
  menu.querySelectorAll(".ai-cmditem").forEach(el=>el.onmousedown=e=>{e.preventDefault();aiPickCmd(el.dataset.n);});
}
function aiPickCmd(n){
  const inp=$("#aiChatInput");
  inp.value=inp.value.replace(/\/([a-z]*)$/i,"/"+n+" ");
  $("#aiCmdMenu").classList.remove("show");
  inp.focus();
}
$("#aiChatInput").addEventListener("input",aiCmdMenu);
$("#aiChatInput").addEventListener("blur",()=>setTimeout(()=>$("#aiCmdMenu").classList.remove("show"),120));
$("#aiChatInput").addEventListener("keydown",e=>{
  const menu=$("#aiCmdMenu");
  if(menu.classList.contains("show")){
    const items=[...menu.querySelectorAll(".ai-cmditem")];
    let idx=items.findIndex(x=>x.classList.contains("sel"));
    if(e.key==="ArrowDown"){e.preventDefault();idx=(idx+1)%items.length;items.forEach((x,i)=>x.classList.toggle("sel",i===idx));items[idx].scrollIntoView({block:"nearest"});return;}
    if(e.key==="ArrowUp"){e.preventDefault();idx=(idx-1+items.length)%items.length;items.forEach((x,i)=>x.classList.toggle("sel",i===idx));items[idx].scrollIntoView({block:"nearest"});return;}
    if(e.key==="Enter"||e.key==="Tab"){e.preventDefault();aiPickCmd((items[idx<0?0:idx]).dataset.n);return;}
    if(e.key==="Escape"){e.preventDefault();menu.classList.remove("show");return;}
  }
  if(e.key==="Enter"){e.preventDefault();aiSend();}
});
$("#aiInfoClose").onclick=()=>$("#aiInfoOverlay").classList.remove("show");
$("#aiInfoOverlay").addEventListener("click",e=>{if(e.target===$("#aiInfoOverlay"))$("#aiInfoOverlay").classList.remove("show");});
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  if($("#aiInfoOverlay").classList.contains("show")){$("#aiInfoOverlay").classList.remove("show");return;}
  if($("#aiPanel").classList.contains("show"))aiClosePanel();
});
