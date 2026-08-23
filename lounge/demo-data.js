export const DEMO_MODE_STORAGE_KEY = "builders-lounge:demo-mode";

export const DEMO_DATA = Object.freeze({
  jobs: Object.freeze([
    Object.freeze({
      id: "demo-job-meeting-01",
      module: "AI 회의록",
      title: "AI 빌더스 랩 운영회의",
      status: "completed",
      progress: 100,
      detail: "결정 3개 · 할 일 5개",
      updatedAt: "2026-08-22T14:30:00+09:00",
      sample: true,
    }),
    Object.freeze({
      id: "demo-job-shorts-01",
      module: "AI 쇼츠 스튜디오",
      title: "Hermes 입문교육 하이라이트",
      status: "processing",
      progress: 68,
      detail: "후보 구간 분석 중",
      updatedAt: "2026-08-22T16:10:00+09:00",
      sample: true,
    }),
    Object.freeze({
      id: "demo-job-meeting-02",
      module: "AI 회의록",
      title: "커뮤니티 운영 정리",
      status: "queued",
      progress: 0,
      detail: "대기열 1번째",
      updatedAt: "2026-08-23T09:00:00+09:00",
      sample: true,
    }),
  ]),
  results: Object.freeze([
    Object.freeze({
      id: "demo-result-01",
      jobId: "demo-job-meeting-01",
      title: "운영회의 회의록 초안",
      formats: Object.freeze(["Markdown", "DOCX"]),
      summary: "결정사항 3개와 할 일 5개를 정리한 샘플 회의록입니다.",
      createdAt: "2026-08-22T14:34:00+09:00",
      sample: true,
    }),
  ]),
  files: Object.freeze([
    Object.freeze({ id: "demo-file-01", name: "builders-lab-meeting.m4a", kind: "오디오", size: "48MB", sample: true }),
    Object.freeze({ id: "demo-file-02", name: "hermes-class.mp4", kind: "영상", size: "820MB", sample: true }),
    Object.freeze({ id: "demo-file-03", name: "community-notes.txt", kind: "텍스트", size: "24KB", sample: true }),
  ]),
  usage: Object.freeze({ used: 42, total: 100, meeting: 24, shorts: 18 }),
});

export function getDemoSnapshot(demoMode = true) {
  if (!demoMode) {
    return { jobs: [], results: [], files: [], usage: null };
  }
  return DEMO_DATA;
}

export function getCounts(data) {
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  return {
    jobs: jobs.filter((job) => job.status === "processing" || job.status === "queued").length,
    results: Array.isArray(data?.results) ? data.results.length : 0,
    files: Array.isArray(data?.files) ? data.files.length : 0,
  };
}

