/* =====================================================================
   Parts Bin — Daily tasks + calendar, in a slide-in side panel.
   ---------------------------------------------------------------------
   Tasks:  state.settings.tasks     = [{id,text,done,ts, date?:"YYYY-MM-DD", repeat?:"weekly"}]
           A task with a date is SCHEDULED: it stays in the calendar until that
           day, then appears in the Daily tasks list (and stays there until
           ticked). "weekly" makes a routine: ticking it schedules next week's.
   Events: state.settings.calEvents = [{id,date:"YYYY-MM-DD",time:"HH:MM"|"",title,note,notified?}]
           Events are separate from tasks; they raise an in-app notification
           when their time comes (calTick, driven by the live heartbeat).
   Both persist with everything else via persist(). The assistant can read
   and edit the calendar through calEventsForAI() / calAddEvent() /
   calDeleteEvent() — unless Settings → AI assistant turns that off, in
   which case the assistant is not given the calendar at all.
   ===================================================================== */
function tasksArr(){ if(!Array.isArray(state.settings.tasks))state.settings.tasks=[]; return state.settings.tasks; }
function calEvents(){ if(!Array.isArray(state.settings.calEvents))state.settings.calEvents=[]; return state.settings.calEvents; }

/* ---------- dates (local time, no libraries) ---------- */
function calPad(n){return String(n).padStart(2,"0");}
function calKey(d){return d.getFullYear()+"-"+calPad(d.getMonth()+1)+"-"+calPad(d.getDate());}
function calParse(k){const m=String(k||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function calToday(){return calKey(new Date());}
const CAL_MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
function calLongDate(k){const d=calParse(k);if(!d)return k;return CAL_DAYS[(d.getDay()+6)%7]+" "+d.getDate()+" "+CAL_MONTHS[d.getMonth()];}
function calTime12(t){const m=String(t||"").match(/^(\d{1,2}):(\d{2})$/);if(!m)return "";let h=+m[1];const ap=h>=12?"pm":"am";h=h%12||12;return h+":"+m[2]+" "+ap;}
function calEventsOn(k){return calEvents().filter(e=>e.date===k).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));}
function calTasksOn(k){return tasksArr().filter(t=>t.date===k);}
/* Tasks that belong in today's list: undated ones, plus scheduled ones whose day has come (or passed, unticked). */
function tasksDueToday(){const today=calToday();return tasksArr().filter(t=>!t.date||t.date<=today);}
function calAddTask(t){
  const x={id:uid(),text:String(t.text||"Task").trim(),done:false,ts:Date.now(),date:String(t.date||"")};
  if(!calParse(x.date))delete x.date;
  if(t.repeat==="weekly")x.repeat="weekly";
  tasksArr().push(x);persist();
  if($("#tasksPanel").classList.contains("show")){renderTasks();renderCalendar();}
  return x;
}
/* Notifications for the day: each event once its time arrives (all-day ones
   on first sight of the day), and one summary when scheduled tasks land in
   today's list. Called from the live heartbeat and at boot. */
function calTick(){
  try{
    const today=calToday(),now=new Date(),hm=calPad(now.getHours())+":"+calPad(now.getMinutes());
    let ch=false;
    calEvents().forEach(e=>{
      if(e.notified||e.date!==today)return;
      if(e.time&&e.time>hm)return;
      e.notified=true;ch=true;
      pbQueueNotify("cal","ok",(e.time?calTime12(e.time)+" · ":"Today · ")+e.title,e.note||"From your calendar");
    });
    /* past events that were never seen (app closed): mark them so they don't fire days late */
    calEvents().forEach(e=>{if(!e.notified&&e.date<today){e.notified=true;ch=true;}});
    /* Day rollover: with "Delete after day ends" on, yesterday's list is cleared
       (undated tasks and any ticked-off ones); tasks scheduled for later stay. */
    if(state.settings.tasksDay!==today){
      if(state.settings.tasksDay&&state.settings.tasksAutoClear){
        const before=tasksArr().length;
        state.settings.tasks=tasksArr().filter(t=>t.date&&t.date>today?true:(t.date&&!t.done&&t.date<=today?true:false));
        if(tasksArr().length!==before&&$("#tasksPanel").classList.contains("show"))renderTasks();
      }
      state.settings.tasksDay=today;ch=true;
    }
    /* Scheduled tasks: each one is announced once, the first time its day is seen. */
    const due=tasksArr().filter(t=>t.date&&t.date<=today&&!t.done&&!t.notified);
    if(due.length){
      due.forEach(t=>{t.notified=true;});ch=true;
      if(due.length===1)pbQueueNotify("cal","ok","Task for today: "+due[0].text,due[0].date<today?"Scheduled for "+calLongDate(due[0].date):"From your calendar");
      else pbQueueNotify("cal","ok",due.length+" tasks for today",due.slice(0,3).map(t=>t.text).join(", ")+(due.length>3?"…":""));
    }
    if(ch)persist();
  }catch(e){}
}
function calAddEvent(ev){
  const e={id:uid(),date:String(ev.date||calToday()),time:String(ev.time||"").slice(0,5),title:String(ev.title||"Event").trim(),note:String(ev.note||"").trim()};
  if(!calParse(e.date))e.date=calToday();
  calEvents().push(e);persist();
  if($("#tasksPanel").classList.contains("show"))renderCalendar();
  return e;
}
function calDeleteEvent(id){
  const list=calEvents(),i=list.findIndex(e=>e.id===id);if(i<0)return null;
  const [e]=list.splice(i,1);persist();
  if($("#tasksPanel").classList.contains("show"))renderCalendar();
  return e;
}
/* Find an event by id, or by title (and date if given) — for the assistant. */
function calFindEvent(q,date){
  const n=String(q||"").trim().toLowerCase();if(!n)return null;
  const list=calEvents();
  return list.find(e=>e.id===q)||list.find(e=>e.title.toLowerCase()===n&&(!date||e.date===date))||list.find(e=>e.title.toLowerCase().includes(n)&&(!date||e.date===date))||null;
}
/* What the assistant is shown: a week back, two months ahead. */
function calEventsForAI(){
  const now=new Date();const from=new Date(now);from.setDate(from.getDate()-7);const to=new Date(now);to.setDate(to.getDate()+62);
  const fk=calKey(from),tk=calKey(to);
  return calEvents().filter(e=>e.date>=fk&&e.date<=tk).sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||""))).slice(0,80);
}

/* ---------- panel state ---------- */
let tasksView="tasks", calCursor=new Date(), calSelected=calToday();

function taskBadge(x){
  if(!x.date)return "";
  const today=calToday();
  const when=x.date===today?"Today":(x.date<today?"From "+calLongDate(x.date):calLongDate(x.date));
  return `<span class="task-when${x.date<today&&!x.done?" late":""}">${esc(when)}${x.repeat==="weekly"?" · weekly":""}</span>`;
}
function renderTasks(){
  const el=$("#tasksList");if(!el)return;
  const t=tasksDueToday();
  const later=tasksArr().length-t.length;
  el.innerHTML=t.length
    ? t.map(x=>`<div class="task-row${x.done?" done":""}" data-id="${x.id}" tabindex="0"><button class="task-check" data-tg="${x.id}" title="${x.done?"Mark as not done":"Mark as done"}" aria-pressed="${x.done?"true":"false"}">${x.done?ic("check"):""}</button><span class="task-txt">${esc(x.text)}${taskBadge(x)}</span><button class="task-del" data-del="${x.id}" title="Delete task">${ic("x")}</button></div>`).join("")
    : `<div class="tasks-empty"><div class="tasks-empty-ic">${ic("tasks")}</div><b>Nothing planned for today</b><span>Type a task above and press Enter, or schedule tasks for later days in the Calendar tab. Finish the lot for a little celebration.</span></div>`;
  if(later>0)el.innerHTML+=`<button type="button" class="tasks-later" id="tasksLater">${later} task${later===1?"":"s"} scheduled for later — open the calendar</button>`;
  const lb=$("#tasksLater");if(lb)lb.onclick=()=>setTasksView("cal");
  el.querySelectorAll("[data-tg]").forEach(b=>b.onclick=()=>toggleTask(b.dataset.tg));
  el.querySelectorAll("[data-del]").forEach(b=>b.onclick=e=>{e.stopPropagation();deleteTask(b.dataset.del);});
  el.querySelectorAll(".task-row").forEach(r=>r.onkeydown=e=>{
    if(e.target!==r)return;
    if(e.key===" "||e.key==="Enter"){e.preventDefault();toggleTask(r.dataset.id);}
    else if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();deleteTask(r.dataset.id);}
    else if(e.key==="ArrowDown"&&r.nextElementSibling){e.preventDefault();r.nextElementSibling.focus();}
    else if(e.key==="ArrowUp"&&r.previousElementSibling){e.preventDefault();r.previousElementSibling.focus();}
  });
  const done=t.filter(x=>x.done).length;
  $("#tasksCount").textContent=t.length?(done===t.length?"All "+t.length+" done ✓":done+" of "+t.length+" done"):"";
  const bar=$("#tasksProg");if(bar){bar.style.display=t.length?"":"none";bar.firstElementChild.style.width=(t.length?Math.round(done/t.length*100):0)+"%";}
  $("#tasksClearDone").style.display=done?"":"none";
}
function toggleTask(id){
  const x=tasksArr().find(y=>y.id===id);if(!x)return;
  x.done=!x.done;
  /* A weekly routine: ticking it books the same task for next week (once). */
  if(x.done&&x.repeat==="weekly"&&x.date){
    const d=calParse(x.date)||new Date();d.setDate(d.getDate()+7);const nk=calKey(d);
    if(!tasksArr().some(t=>t.text===x.text&&t.date===nk))tasksArr().push({id:uid(),text:x.text,done:false,ts:Date.now(),date:nk,repeat:"weekly"});
  }
  const due=tasksDueToday();
  if(x.done&&due.length&&due.every(t=>t.done)){try{pbConfetti(90);}catch(_){}}
  persist();renderTasks();
  if($("#tasksViewCal").style.display!=="none")renderCalendar();
  const row=$('#tasksList [data-id="'+id+'"]');if(row)row.focus();
}
function deleteTask(id){state.settings.tasks=tasksArr().filter(y=>y.id!==id);persist();renderTasks();$("#taskInput").focus();}
function addTask(){
  const v=$("#taskInput").value.trim();if(!v)return;
  tasksArr().push({id:uid(),text:v,done:false,ts:Date.now()});
  persist();$("#taskInput").value="";renderTasks();
}

/* ---------- calendar (month grid, Monday first) ---------- */
function renderCalendar(){
  const g=$("#calGrid");if(!g)return;
  const y=calCursor.getFullYear(),m=calCursor.getMonth();
  $("#calTitle").innerHTML='<b>'+CAL_MONTHS[m]+'</b> '+y;
  const first=new Date(y,m,1),lead=(first.getDay()+6)%7;      // days from Monday before the 1st
  const start=new Date(y,m,1-lead);
  const today=calToday();
  let h="";
  for(let i=0;i<42;i++){
    const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
    const k=calKey(d),other=d.getMonth()!==m,evs=calEventsOn(k),tks=calTasksOn(k);
    const dots=evs.slice(0,2).map(()=>"<i></i>").join("")+tks.slice(0,2).map(t=>'<i class="tk'+(t.done?" dn":"")+'"></i>').join("");
    h+=`<button type="button" class="cal-day${other?" other":""}${k===today?" today":""}${k===calSelected?" sel":""}" data-day="${k}" title="${esc(calLongDate(k))}${evs.length?" · "+evs.length+" event"+(evs.length===1?"":"s"):""}${tks.length?" · "+tks.length+" task"+(tks.length===1?"":"s"):""}"><span class="cal-n">${d.getDate()}</span><span class="cal-dots">${dots}</span></button>`;
  }
  g.innerHTML=h;
  g.querySelectorAll(".cal-day").forEach(b=>b.onclick=()=>{calSelected=b.dataset.day;const d=calParse(calSelected);if(d&&d.getMonth()!==m){calCursor=new Date(d.getFullYear(),d.getMonth(),1);}renderCalendar();});
  renderDayEvents();
}
let calAddKind="task";
function renderDayEvents(){
  const el=$("#calDay");if(!el)return;
  const evs=calEventsOn(calSelected),tks=calTasksOn(calSelected);
  $("#calDayTitle").textContent=(calSelected===calToday()?"Today · ":"")+calLongDate(calSelected);
  let h="";
  if(tks.length)h+=`<div class="cal-sec">Tasks for this day</div>`+tks.map(t=>`<div class="cal-task${t.done?" done":""}"><button class="task-check" data-ctg="${t.id}" title="${t.done?"Mark as not done":"Mark as done"}">${t.done?ic("check"):""}</button><span class="cal-ev-body"><span class="cal-ev-t">${esc(t.text)}</span>${t.repeat==="weekly"?`<span class="cal-ev-n">Repeats every week</span>`:""}</span><button class="task-del" data-tkdel="${t.id}" title="Delete task">${ic("x")}</button></div>`).join("");
  if(evs.length)h+=`<div class="cal-sec">Events</div>`+evs.map(e=>`<div class="cal-ev" data-ev="${e.id}"><span class="cal-ev-time">${e.time?esc(calTime12(e.time)):"All day"}</span><span class="cal-ev-body"><span class="cal-ev-t">${esc(e.title)}</span>${e.note?`<span class="cal-ev-n">${esc(e.note)}</span>`:""}</span><button class="task-del" data-evdel="${e.id}" title="Delete event">${ic("x")}</button></div>`).join("");
  el.innerHTML=h||`<div class="cal-empty">Nothing on this day. Schedule a task or add an event below.</div>`;
  el.querySelectorAll("[data-evdel]").forEach(b=>b.onclick=()=>{calDeleteEvent(b.dataset.evdel);});
  el.querySelectorAll("[data-tkdel]").forEach(b=>b.onclick=()=>{state.settings.tasks=tasksArr().filter(y=>y.id!==b.dataset.tkdel);persist();renderCalendar();});
  el.querySelectorAll("[data-ctg]").forEach(b=>b.onclick=()=>{toggleTask(b.dataset.ctg);renderCalendar();});
}
function calSyncAddKind(){
  $("#calAddKind").querySelectorAll(".segbtn").forEach(b=>b.classList.toggle("on",b.dataset.kind===calAddKind));
  const task=calAddKind==="task";
  $("#calEvTitle").placeholder=task?"Task for this day…":"New event…";
  $("#calEvTime").style.display=task?"none":"";$("#calEvNote").style.display=task?"none":"";
  $("#calTaskRepeat").style.display=task?"":"none";
}
function calAddFromForm(){
  const t=$("#calEvTitle").value.trim();if(!t){$("#calEvTitle").focus();return;}
  if(calAddKind==="task"){
    calAddTask({date:calSelected,text:t,repeat:$("#calTaskRepeatChk").checked?"weekly":""});
    toast(calSelected===calToday()?"Task added to today":"Task scheduled for "+calLongDate(calSelected));
  }else{
    calAddEvent({date:calSelected,time:$("#calEvTime").value,title:t,note:$("#calEvNote").value});
    toast("Event added");
  }
  $("#calEvTitle").value="";$("#calEvTime").value="";$("#calEvNote").value="";$("#calEvTitle").focus();
  renderCalendar();
}
function calGoToday(){calCursor=new Date();calSelected=calToday();renderCalendar();}

/* ---------- panel ---------- */
function setTasksView(v){
  tasksView=v;
  $("#tasksTabs").querySelectorAll(".segbtn").forEach(b=>b.classList.toggle("on",b.dataset.view===v));
  $("#tasksViewTasks").style.display=v==="tasks"?"":"none";
  $("#tasksViewCal").style.display=v==="cal"?"":"none";
  if(v==="cal"){renderCalendar();}else{renderTasks();$("#taskInput").focus();}
}
function openTasks(view){
  try{if(typeof aiClosePanel==="function"&&$("#aiPanel").classList.contains("show"))aiClosePanel();}catch(_){}
  $("#tasksPanel").classList.add("show");$("#tasksScrim").classList.add("show");
  setTasksView(view||tasksView||"tasks");
}
function closeTasks(){ $("#tasksPanel").classList.remove("show");$("#tasksScrim").classList.remove("show"); }

/* ---------- wiring ---------- */
$("#tasksBtn").innerHTML=ic("tasks");
$("#tasksIcon").innerHTML=ic("tasks");
$("#tasksClose").innerHTML=ic("x");
$("#tasksBtn").onclick=()=>openTasks();
$("#tasksClose").onclick=closeTasks;
$("#tasksScrim").onclick=closeTasks;
$("#taskAdd").onclick=addTask;
$("#taskInput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addTask();}});
$("#tasksClearDone").onclick=()=>{state.settings.tasks=tasksArr().filter(x=>!x.done);persist();renderTasks();};
$("#tasksAutoClear").checked=!!state.settings.tasksAutoClear;
$("#tasksAutoClear").onchange=()=>{state.settings.tasksAutoClear=$("#tasksAutoClear").checked;if(!state.settings.tasksDay)state.settings.tasksDay=calToday();persist();toast(state.settings.tasksAutoClear?"Today's tasks will be cleared after midnight":"Tasks are kept until you clear them");};
$("#tasksTabs").querySelectorAll(".segbtn").forEach(b=>b.onclick=()=>setTasksView(b.dataset.view));
$("#calPrev").innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
$("#calNext").innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
$("#calPrev").onclick=()=>{calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()-1,1);renderCalendar();};
$("#calNext").onclick=()=>{calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()+1,1);renderCalendar();};
$("#calToday").onclick=calGoToday;
$("#calEvAdd").onclick=calAddFromForm;
$("#calAddKind").querySelectorAll(".segbtn").forEach(b=>b.onclick=()=>{calAddKind=b.dataset.kind;calSyncAddKind();$("#calEvTitle").focus();});
calSyncAddKind();
/* Boot: let the notification centre settle, then raise today's events/tasks. */
setTimeout(calTick,3500);
setInterval(calTick,20000);   /* events fire within 20 s of their time (the heartbeat also calls it) */
["calEvTitle","calEvTime","calEvNote"].forEach(id=>$("#"+id).addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();calAddFromForm();}}));
document.addEventListener("keydown",e=>{
  if(!$("#tasksPanel").classList.contains("show"))return;
  if(e.key==="Escape"){closeTasks();return;}
  if(tasksView==="cal"&&!e.target.matches("input,textarea,select")){
    if(e.key==="ArrowLeft"||e.key==="ArrowRight"||e.key==="ArrowUp"||e.key==="ArrowDown"){
      e.preventDefault();const d=calParse(calSelected)||new Date();
      d.setDate(d.getDate()+(e.key==="ArrowLeft"?-1:e.key==="ArrowRight"?1:e.key==="ArrowUp"?-7:7));
      calSelected=calKey(d);calCursor=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar();
    }else if(e.key==="t"||e.key==="T"){calGoToday();}
  }
});
