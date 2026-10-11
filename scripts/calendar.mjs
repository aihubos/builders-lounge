// 공개 Google Calendar의 반복·예외 일정을 펼쳐 3단 일정 패널에 제공합니다.
import { writeFile } from 'node:fs/promises';
import ical from 'node-ical';
const url = 'https://calendar.google.com/calendar/ical/aibuilderslab.kr%40gmail.com/public/basic.ics';
const now = new Date();
const [year, month] = now.toLocaleDateString('sv-SE', {timeZone:'Asia/Seoul'}).split('-').map(Number);
const from = new Date(Date.UTC(year, month - 3, 1) - 9 * 3600000);
const to = new Date(Date.UTC(year, month + 4, 1) - 9 * 3600000);
const response = await fetch(url, {signal:AbortSignal.timeout(30000)});
if (!response.ok) throw new Error('캘린더 응답 오류: ' + response.status);
const parsed = await ical.async.parseICS(await response.text());
const text = value => String(value?.val ?? value ?? '').trim();
const events = [];
for (const event of Object.values(parsed)) {
  if (event.type !== 'VEVENT' || event.status === 'CANCELLED') continue;
  for (const instance of ical.expandRecurringEvent(event, {from, to, expandOngoing:true})) {
    if (instance.event.status === 'CANCELLED') continue;
    const asDate = date => {
      if (!instance.isFullDay) return date.toISOString();
      const day = date.toLocaleDateString('sv-SE',{timeZone:date.tz || 'UTC'});
      return new Date(day + 'T00:00:00+09:00').toISOString();
    };
    events.push({title:text(instance.summary)||'일정',start:asDate(instance.start),end:asDate(instance.end),allDay:instance.isFullDay,location:text(instance.event.location)});
  }
}
events.sort((a,b)=>a.start.localeCompare(b.start));
await writeFile(new URL('../calendar.json',import.meta.url), JSON.stringify({updatedAt:now.toISOString(),from:from.toISOString(),to:to.toISOString(),events},null,2)+'\n');
console.log('calendar.json: 반복 일정을 포함한 '+events.length+'개 일정');
