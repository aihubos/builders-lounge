// kira-chan(키라쨩 카드뉴스)의 날짜별 발행본을 읽어 사이트가 쓰는 newsletter.json을 만듭니다.
// GitHub Actions가 30분마다 실행합니다. 직접 실행: npm run newsletter
import { writeFile } from "node:fs/promises";

const REPO = "aihubos/kira-chan";
const SITE = "https://aihubos.github.io/kira-chan/";
const EDITIONS = [
  { edition: "ai", folder: "", label: "카드뉴스" },
  { edition: "economy", folder: "economy/", label: "경제·시사 카드뉴스" },
];
const headers = { Accept: "application/vnd.github+json", "User-Agent": "builders-lounge" };
if (process.env.GITHUB_TOKEN) headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;

const response = await fetch("https://api.github.com/repos/" + REPO + "/git/trees/HEAD?recursive=1", { headers });
if (!response.ok) throw new Error("kira-chan 파일 목록을 불러오지 못했습니다: " + response.status);
const paths = (await response.json()).tree.map((node) => node.path);
const siteUrl = (path) => SITE + path.split("/").map(encodeURIComponent).join("/");
const dates = [...new Set(paths.map((path) => path.match(/^(\d{4}-\d{2}-\d{2})\/index\.html$/)?.[1]).filter(Boolean))].sort().reverse();

async function description(url) {
  try {
    const match = (await (await fetch(url)).text()).match(/<meta name="description" content="([^"]*)"/);
    return match ? match[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : "";
  } catch {
    return "";
  }
}

const items = [];
for (const date of dates) {
  for (const { edition, folder, label } of EDITIONS) {
    if (!paths.includes(date + "/" + folder + "index.html")) continue;
    const prefix = "assets/" + date + "/" + folder;
    const cards = paths.filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/") && /\.(png|jpe?g|webp)$/i.test(path)).sort().map(siteUrl);
    const url = SITE + date + "/" + folder;
    items.push({ id: date + "-" + edition, date, edition, title: date + " " + label, summary: await description(url), author: "키라쨩 & 픽셀쨩", sourceUrl: url, sourceLabel: "카드뉴스 원문", cards });
  }
}

await writeFile(new URL("../newsletter.json", import.meta.url), JSON.stringify({ items }, null, 2) + "\n");
console.log("newsletter.json: 발행본 " + items.length + "개");
