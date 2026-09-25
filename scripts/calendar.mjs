// 구글 공개 캘린더를 읽어 사이트가 쓰는 calendar.json을 만듭니다.
// GitHub Actions가 30분마다 실행합니다. 직접 실행: npm run calendar
import { writeFile } from "node:fs/promises";

const ICS_URL = "https://calendar.google.com/calendar/ical/aibuilderslab.kr%40gmail.com/public/basic.ics";
const valueOf = (line = "") => line.slice(line.indexOf(":") + 1);
const unescapeText = (text) => text.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

// ponytail: UTC(Z)·날짜만·그 밖(한국 시간으로 간주) 세 형식만 처리하고, 반복 일정(RRULE)은 첫 회차만 나옵니다. 필요해지면 ICS 라이브러리로 바꾸세요.
function parseDate(line) {
  const match = valueOf(line).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!match) return null;
  const [, year, month, day, hour = "00", minute = "00", second = "00", utc] = match;
  return { iso: new Date(year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second + (utc ? "Z" : "+09:00")).toISOString(), allDay: !match[4] };
}

const response = await fetch(ICS_URL);
if (!response.ok) throw new Error("캘린더를 불러오지 못했습니다: " + response.status);
const lines = (await response.text()).replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
const raw = [];
let current = null;
for (const line of lines) {
  if (line === "BEGIN:VEVENT") current = {};
  else if (line === "END:VEVENT") { if (current) raw.push(current); current = null; }
  else if (current) current[line.split(/[;:]/, 1)[0]] = line;
}

const cutoff = Date.now() - 86400000; // 끝난 지 하루가 안 된 일정까지 남겨 둡니다.
const events = raw
  .filter((event) => valueOf(event.STATUS) !== "CANCELLED")
  .map((event) => {
    const start = parseDate(event.DTSTART);
    const end = parseDate(event.DTEND);
    return start && { title: unescapeText(valueOf(event.SUMMARY)) || "일정", start: start.iso, end: end?.iso || start.iso, allDay: start.allDay, location: unescapeText(valueOf(event.LOCATION)) };
  })
  .filter((event) => event && Date.parse(event.end) > cutoff)
  .sort((a, b) => a.start.localeCompare(b.start))
  .slice(0, 50);

await writeFile(new URL("../calendar.json", import.meta.url), JSON.stringify({ events }, null, 2) + "\n");
console.log("calendar.json: 일정 " + events.length + "개");
