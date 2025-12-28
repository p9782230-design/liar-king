// frontend/src/data/questions.js
import Papa from "papaparse";

/**
 * 注意：
 * 1. 這裡仍然 export const QUESTIONS
 * 2. 內部用 fetch + top-level await（Vite 支援）
 * 3. 其他檔案完全不用改
 */

async function loadQuestionsFromCsv() {
  const res = await fetch("/questions.csv", { cache: "no-store" });
  if (!res.ok) {
    console.error("Failed to load questions.csv, fallback to empty list");
    return [];
  }

  const csvText = await res.text();

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data
    .map((r, idx) => ({
      id: (r["題目"] || `q${idx + 1}`).trim(),
      title: (r["正確主題"] || "").trim(),
      explanation: (r["老實人解釋"] || "").trim(),
      tags: ["csv"],
    }))
    .filter((q) => q.title);
}

// 🔥 關鍵：維持原本 export 介面
export const QUESTIONS = await loadQuestionsFromCsv();
