const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDay=s=>new Date(s+'T12:00:00');
const addDays=(s,n)=>{const d=parseDay(s);d.setDate(d.getDate()+n);return dayKey(d)};
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(parseDay(s))&&dayKey(parseDay(s))===s}
function buildSemester(tasks,hours,start,end,today){
 const first=start>today?start:today,days=[];for(let d=first;d<=end&&days.length<400;d=addDays(d,1))days.push({date:d,capacity:Math.floor(Number(hours[parseDay(d).getDay()]||0)*60*.8/15)*15,sessions:[]});
 const unmet=[];for(const task of [...tasks].filter(t=>!t.done).sort((a,b)=>a.due.localeCompare(b.due)||a.id.localeCompare(b.id))){let left=Math.round(task.hours*60);const lead=task.type==='topic'?6:task.type==='exam'?13:task.type==='project'?27:7;const opens=addDays(task.due,-lead);const eligible=days.filter(d=>d.date<=task.due&&d.date>=opens);const quota=Math.max(30,Math.ceil(left/Math.max(1,eligible.length)/15)*15);for(let pass=0;pass<2&&left>0;pass++)for(const d of eligible){const used=d.sessions.reduce((a,s)=>a+s.minutes,0),m=Math.min(left,d.capacity-used,pass===0?quota:Infinity);if(m>0){let s=d.sessions.find(s=>s.id===task.id);if(s)s.minutes+=m;else d.sessions.push({...task,minutes:m});left-=m}}if(left>0)unmet.push({...task,minutes:left,reason:task.due<today?'overdue':'capacity'});}return{days,unmet};
}
function readOutline(text,start){
 const rows=[];for(const raw of text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)){
  const iso=raw.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/),week=raw.match(/\bweek\s*(\d{1,2})\b/i);let date='',matched='';
  if(iso){date=`${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;matched=iso[0];}
  else{const named=raw.match(/\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/i);if(named){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];date=`${named[3]}-${String(months.indexOf(named[2].slice(0,3).toLowerCase())+1).padStart(2,'0')}-${named[1].padStart(2,'0')}`;matched=named[0];}else if(week&&Number(week[1])>0){date=addDays(start,Number(week[1])*7-1);matched=week[0];}}
  const hours=raw.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
  if(!matched&&!/\b(project|exam|midterm|final|assignment|quiz|chapter|topic|presentation|report|revision)\b/i.test(raw))continue;
  let title=raw.replace(matched,'').replace(hours?.[0]||'','').replace(/^[\s:|,;\-–]+|[\s:|,;\-–]+$/g,'').trim();if(!title)title=week?'Week '+week[1]+' study':'Course task';
  const type=/exam|midterm|final exam|quiz/i.test(title)?'exam':/project|presentation/i.test(title)?'project':/assignment|report|case study/i.test(title)?'assignment':'topic';rows.push({title:title.slice(0,120),due:validDate(date)?date:'',hours:hours?Number(hours[1]):2,type});
 }return rows;
}
if(typeof module!=='undefined')module.exports={dayKey,addDays,validDate,buildSemester,readOutline};
function scheduleOutline(text,start,end,today){
 let rows=readOutline(text,start);
 if(!rows.length){rows=text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s.length>=5&&s.length<=150&&!/^(course|instructor|lecturer|email|office|textbook|reference|policy|attendance|grading|learning outcome|objective|assessment weight|contact|university|college|department|syllabus|outline|https?:)/i.test(s)).slice(0,40).map(title=>({title,hours:2,type:/exam|quiz|midterm/i.test(title)?'exam':/project|presentation/i.test(title)?'project':'topic',due:'',estimatedHours:true}));}
 const futureStart=start>today?start:today;
 const span=Math.max(1,Math.round((parseDay(end)-parseDay(futureStart))/86400000));
 const unknown=rows.filter(r=>!r.due);let index=0;
 return rows.map(r=>{const line=text.split(/\r?\n/).find(l=>l.includes(r.title))||'';const estimatedHours=!/\b\d+(?:\.\d+)?\s*(?:hours?|hrs?)\b/i.test(line);let estimatedDate=false;if(!r.due){index++;r.due=addDays(futureStart,Math.min(span,Math.round(span*index/Math.max(1,unknown.length))));estimatedDate=true;}else if(/\bweek\s*\d+/i.test(line))estimatedDate=true;if(r.due>end){r.due=end;estimatedDate=true;}return {...r,estimatedHours,estimatedDate};});
}
if(typeof module!=='undefined')module.exports.scheduleOutline=scheduleOutline;
