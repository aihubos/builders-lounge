import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { createGzip } from "node:zlib";

const projectRoot = resolve(process.env.SITE_ROOT || process.cwd());
const port = Number(process.env.PORT || 4173);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".png", "image/png"],
  [".avif", "image/avif"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".txt", "text/plain; charset=utf-8"],
]);

function safePathname(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://127.0.0.1:${port}`).pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const absolutePath = resolve(projectRoot, `.${requestedPath}`);
  const rootPrefix = projectRoot.endsWith(sep) ? projectRoot : `${projectRoot}${sep}`;
  return absolutePath.startsWith(rootPrefix) ? absolutePath : null;
}

const GOOGLE_ICS_URL =
  "https://calendar.google.com/calendar/ical/aibuilderslab.kr%40gmail.com/public/basic.ics";
const GOOGLE_HTML_EMBED =
  "https://calendar.google.com/calendar/htmlembed?src=aibuilderslab.kr%40gmail.com&ctz=Asia%2FSeoul&mode=MONTH&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0&hl=ko&wkst=2";

const CALENDAR_FALLBACK_CSS = `
<style>
  html, body { margin: 0; padding: 0; background: #fff; color: #06102b; font-family: "SF Pro Text", "Apple SD Gothic Neo", sans-serif; }
  body.view-month { padding: 12px 16px 16px; }
  h1 { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font-size: 18px; }
  h1 img { height: 22px; width: auto; }
  .period-range { margin: 0 0 12px; font-size: 20px; font-weight: 700; }
  #nav { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  #nav td { vertical-align: middle; }
  .nav-buttons { white-space: nowrap; }
  .nav-buttons a, #nav-today { display: inline-flex; align-items: center; justify-content: center; min-height: 32px; margin-right: 6px; padding: 0 10px; border: 1px solid #d7deea; border-radius: 999px; background: #fff; color: #06102b; text-decoration: none; font-size: 13px; }
  #month-tab, #week-tab, #agenda-tab { display: none; }
  table.mv-daynames-table, table.st-grid, table[id^="mv"] { width: 100%; border-collapse: collapse; }
  .column-label, .date-marker { padding: 8px 6px; text-align: center; font-size: 12px; }
  .column-label { color: #667085; font-weight: 700; }
  .date-marker { border-top: 1px solid #e6ebf2; color: #06102b; font-weight: 700; }
  .date-not-month { color: #98a2b3; }
  .date-today, .today .date-marker, td.date-today { color: #0b63ce; background: #eef6ff; }
  .cell-empty, .cell-empty-below, .cell-last-row { border-top: 1px solid #f2f4f7; height: 18px; }
  .view-cap, #footer { margin-top: 12px; color: #667085; font-size: 12px; }
  #subscribe-link { display: none; }
</style>
`;

function rewriteGoogleCalendarHtml(html) {
  const styled = html.includes("</head>")
    ? html.replace("</head>", `${CALENDAR_FALLBACK_CSS}\n</head>`)
    : `${CALENDAR_FALLBACK_CSS}\n${html}`;
  return styled
    .replaceAll('href="/', 'href="https://calendar.google.com/')
    .replaceAll("href='/", "href='https://calendar.google.com/")
    .replaceAll('src="/', 'src="https://calendar.google.com/')
    .replaceAll("src='/", "src='https://calendar.google.com/")
    .replaceAll("url(/", "url(https://calendar.google.com/")
    .replaceAll("https://calendar.google.com/calendar/htmlembed", "/api/google-calendar")
    .replaceAll("https://calendar.google.com/api/google-calendar", "/api/google-calendar");
}

async function proxyGoogleCalendarIcs(response) {
  try {
    const upstream = await fetch(GOOGLE_ICS_URL, {
      headers: { "User-Agent": "AI-Builders-Lab-Site/1.0" },
      cache: "no-store",
    });
    const body = await upstream.text();
    response.writeHead(upstream.ok ? 200 : upstream.status, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    });
    response.end(body);
  } catch {
    response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("구글 캘린더를 불러오지 못했습니다.");
  }
}

async function proxyGoogleCalendarHtml(requestUrl, response) {
  try {
    const upstreamUrl = new URL(GOOGLE_HTML_EMBED);
    requestUrl.searchParams.forEach((value, key) => {
      if (key === "src") return;
      upstreamUrl.searchParams.set(key, value);
    });
    const upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    const body = rewriteGoogleCalendarHtml(await upstream.text());
    response.writeHead(upstream.ok ? 200 : upstream.status, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(502, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<p>구글 캘린더를 불러오지 못했습니다.</p>");
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  if (requestUrl.pathname === "/api/google-calendar.ics") {
    await proxyGoogleCalendarIcs(response);
    return;
  }
  if (requestUrl.pathname === "/api/google-calendar") {
    await proxyGoogleCalendarHtml(requestUrl, response);
    return;
  }

  if (
    requestUrl.pathname !== "/" &&
    !requestUrl.pathname.endsWith("/") &&
    !extname(requestUrl.pathname)
  ) {
    const directoryIndex = safePathname(`${requestUrl.pathname}/`);
    try {
      const indexStat = directoryIndex ? await stat(directoryIndex) : null;
      if (indexStat?.isFile()) {
        response.writeHead(308, { Location: `${requestUrl.pathname}/${requestUrl.search}` });
        response.end();
        return;
      }
    } catch {
      /* 파일 처리 단계에서 일반 404로 응답합니다. */
    }
  }

  const filePath = safePathname(request.url || "/");

  if (!filePath) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("접근할 수 없는 경로입니다.");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("not-file");
    const extension = extname(filePath);
    const acceptsGzip = String(request.headers["accept-encoding"] || "").includes("gzip");
    const compressible = new Set([".html", ".css", ".js", ".json", ".md", ".svg", ".txt"]).has(extension);
    const headers = {
      "Content-Type": contentTypes.get(extname(filePath)) || "application/octet-stream",
      "Cache-Control": "no-cache",
    };
    if (acceptsGzip && compressible) {
      headers["Content-Encoding"] = "gzip";
      headers.Vary = "Accept-Encoding";
    }
    response.writeHead(200, headers);
    const source = createReadStream(filePath);
    if (acceptsGzip && compressible) source.pipe(createGzip()).pipe(response);
    else source.pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("파일을 찾을 수 없습니다.");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local URL: http://127.0.0.1:${port}`);
});
