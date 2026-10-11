import ical from 'node-ical';
const SOURCE='https://calendar.google.com/calendar/ical/aibuilderslab.kr%40gmail.com/public/basic.ics';
export async function loadCalendar(now=new Date()){
 const [year,month]=now.toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}).split('-').map(Number);
 const from=new Date(Date.UTC(year,month-3,1)-9*3600000),to=new Date(Date.UTC(year,month+4,1)-9*3600000);
 const response=await fetch(SOURCE+'?refresh='+Math.floor(now.getTime()/10000),{cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('calendar_upstream_failed');
 const source=await response.text();if(!source.includes('BEGIN:VCALENDAR'))throw Error('invalid_calendar');
 const parsed=await ical.async.parseICS(source),events=[];
 const text=v=>String(v?.val??v??'').trim();
 for(const event of Object.values(parsed)){
  if(event.type!=='VEVENT'||event.status==='CANCELLED')continue;
  for(const instance of ical.expandRecurringEvent(event,{from,to,expandOngoing:true})){
   if(instance.event.status==='CANCELLED')continue;
   const date=d=>instance.isFullDay?new Date(d.toLocaleDateString('sv-SE',{timeZone:d.tz||'UTC'})+'T00:00:00+09:00').toISOString():d.toISOString();
   events.push({title:text(instance.summary)||'일정',start:date(instance.start),end:date(instance.end),allDay:instance.isFullDay,location:text(instance.event.location)});
  }
 }
 events.sort((a,b)=>a.start.localeCompare(b.start));
 return {updatedAt:now.toISOString(),from:from.toISOString(),to:to.toISOString(),events};
}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url);const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
 if(request.method!=='GET'||url.pathname!=='/calendar')return new Response('{"error":"not_found"}',{status:404,headers});
 const key=new Request(url.origin+'/calendar-cache');
 const cached=await caches.default.match(key);
 if(cached)return new Response(cached.body,{headers});
 try{const data=JSON.stringify(await loadCalendar());ctx.waitUntil(caches.default.put(key,new Response(data,{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=10'}})));return new Response(data,{headers});}
 catch{return new Response('{"error":"calendar_unavailable"}',{status:502,headers});}
}};
