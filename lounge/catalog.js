import { COMMUNITY_DATA } from "./community-data.js";

const STORAGE_KEY = "builders-lounge-catalog-v1";
const TYPES = Object.freeze(["prompts", "newsletters", "memes"]);
const PUBLISHED = "published";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readOverrides() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { extras: {}, removed: {} };
    return {
      extras: parsed.extras && typeof parsed.extras === "object" ? parsed.extras : {},
      removed: parsed.removed && typeof parsed.removed === "object" ? parsed.removed : {},
    };
  } catch {
    return { extras: {}, removed: {} };
  }
}

function writeOverrides(next) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function seedItems(type) {
  return clone(COMMUNITY_DATA[type] || []).filter((item) => item.status === PUBLISHED);
}

function sortItems(type, items) {
  if (type === "newsletters") {
    return items.slice().sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  }
  return items.slice();
}

export function catalogItems(type) {
  if (!TYPES.includes(type)) return [];
  const { extras, removed } = readOverrides();
  const hidden = new Set(removed[type] || []);
  const extra = Array.isArray(extras[type]) ? extras[type] : [];
  const merged = [...extra, ...seedItems(type).filter((item) => !hidden.has(item.id) && !extra.some((candidate) => candidate.id === item.id))];
  return sortItems(type, merged.filter((item) => item && item.status === PUBLISHED));
}

export function catalogFeaturedPrompts() {
  return catalogItems("prompts").filter((item) => item.featured).slice(0, 4);
}

export function catalogLatestNewsletter() {
  return catalogItems("newsletters")[0] || null;
}

export function isCatalogAdmin() {
  return Boolean(window.BuildersPlatform?.snapshot?.()?.user?.isAdmin);
}

function itemFromForm(type, form) {
  const title = String(form.elements.title?.value || "").trim().slice(0, 80);
  const summary = String(form.elements.summary?.value || "").trim().slice(0, 280);
  const cover = String(form.elements.cover?.value || "").trim().slice(0, 500);
  const body = String(form.elements.body?.value || "").trim().slice(0, 4000);
  const category = String(form.elements.category?.value || "").trim().slice(0, 40);
  if (title.length < 2) throw new Error("제목을 입력해 주세요.");
  if (summary.length < 4) throw new Error("한 줄 요약을 입력해 주세요.");
  const now = new Date().toISOString().slice(0, 10);
  const id = `${type.slice(0, -1)}-admin-${Date.now()}`;
  const author = window.BuildersPlatform?.snapshot?.()?.user?.name || "운영진";
  if (type === "prompts") {
    if (body.length < 8) throw new Error("복사할 프롬프트를 입력해 주세요.");
    return {
      id, type: "prompt", title, summary, cover, kicker: category || "프롬프트",
      tags: [category || "프롬프트"], category: category || "업무",
      useCase: summary, expected: "관리자가 등록한 공개 프롬프트입니다.",
      copyText: body, author, sourceLabel: "Builders Lounge 운영진",
      sourceUrl: "https://aihubos.github.io/builders-lounge/", featured: true,
      publishedAt: now, status: PUBLISHED,
    };
  }
  if (type === "newsletters") {
    if (body.length < 8) throw new Error("뉴스레터 본문을 입력해 주세요.");
    return {
      id, type: "newsletter", title, summary, cover, kicker: "뉴스레터",
      tags: [category || "뉴스레터"], issue: category || "새 호", publishedAt: now,
      author, sourceLabel: "Builders Lounge 운영진",
      sourceUrl: "https://aihubos.github.io/builders-lounge/", featured: true,
      status: PUBLISHED,
      sections: [{ heading: "이번 카드", body }],
    };
  }
  if (body.length < 2) throw new Error("이미지 설명을 입력해 주세요.");
  return {
    id, type: "meme", title, summary, cover, kicker: category || "이미지",
    tags: [category || "이미지"], category: category || "빌더 결과물",
    caption: body, credit: author, sourceLabel: "Builders Lounge 운영진",
    sourceUrl: "https://aihubos.github.io/builders-lounge/",
    tone: "blue", publishedAt: now, status: PUBLISHED,
  };
}

export function addCatalogItem(type, form) {
  if (!TYPES.includes(type)) throw new Error("지원하지 않는 게시판입니다.");
  if (!isCatalogAdmin()) throw new Error("관리자만 등록할 수 있습니다.");
  const item = itemFromForm(type, form);
  const current = readOverrides();
  current.extras[type] = [item, ...(current.extras[type] || [])];
  writeOverrides(current);
  return item;
}

export function removeCatalogItem(type, id) {
  if (!TYPES.includes(type)) throw new Error("지원하지 않는 게시판입니다.");
  if (!isCatalogAdmin()) throw new Error("관리자만 삭제할 수 있습니다.");
  const current = readOverrides();
  current.extras[type] = (current.extras[type] || []).filter((item) => item.id !== id);
  current.removed[type] = Array.from(new Set([...(current.removed[type] || []), id]));
  writeOverrides(current);
}

export function catalogCardCover(item) {
  const cover = String(item?.cover || "").trim();
  if (cover) return cover;
  if (item?.type === "newsletter") return "assets/hero-builders-wave-poster.jpg";
  if (item?.type === "meme") return "assets/og.png";
  return "assets/report-hub-banner.png";
}
