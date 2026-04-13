// ╔══════════════════════════════════════════════════════════════════╗
// ║  📚 共用劑量表（給多個適應症共用）                                ║
// ║                                                                ║
// ║  這些表會被多個藥物的檔案 import 使用                              ║
// ║  改動劑量只要改這裡一處，所有引用的藥物都會一起更新                 ║
// ╚══════════════════════════════════════════════════════════════════╝

// Meropenem 1g Q8H 起始的 CrCl 調整表（依 UpToDate 2026）
export const STANDARD_1G_TABLE = [
  { min: 50,  dose_mg: 1000, freq: "Q8H" },     // CrCl >50–<130
  { min: 25,  dose_mg: 1000, freq: "Q12H" },    // >25–≤50
  { min: 10,  dose_mg: 500,  freq: "Q12H" },    // 10–≤25
  { min: 0,   dose_mg: 500,  freq: "Q24H" },    // <10
];

// Meropenem 2g Q8H 起始的 CrCl 調整表
export const STANDARD_2G_TABLE = [
  { min: 50,  dose_mg: 2000, freq: "Q8H" },
  { min: 25,  dose_mg: 2000, freq: "Q12H" },
  { min: 10,  dose_mg: 1000, freq: "Q12H" },
  { min: 0,   dose_mg: 1000, freq: "Q24H 或 500 mg Q12H" },
];

// Unasyn 標準 3 g Q6H 的 CrCl 調整表
export const UNASYN_3G_TABLE = [
  { min: 30, dose_mg: 3000, freq: "Q6H" },
  { min: 15, dose_mg: 3000, freq: "Q12H" },
  { min: 0,  dose_mg: 3000, freq: "Q24H" },
];

// Unasyn 1.5 g Q6H 的 CrCl 調整表（吸入性肺炎、咬傷等）
export const UNASYN_15_3G_TABLE = [
  { min: 30, dose_mg: 1500, freq: "Q6H" },
  { min: 15, dose_mg: 1500, freq: "Q12H" },
  { min: 0,  dose_mg: 1500, freq: "Q24H" },
];

// Unasyn MDR Acinetobacter 高劑量表（9 g Q8H over 4hr）
export const UNASYN_MDR_AB_TABLE = [
  { min: 90, dose_mg: 9000, freq: "Q8H over 4hr" },
  { min: 60, dose_mg: 6000, freq: "Q8H over 4hr" },
  { min: 30, dose_mg: 3000, freq: "Q6H over 4hr" },
  { min: 15, dose_mg: 3000, freq: "Q8H over 4hr" },
  { min: 0,  dose_mg: 3000, freq: "Q12H over 4hr" },
];

// ── Tazocin (Pip/Tazo) 劑量表 ───────────────────────────
// 注意：CrCl ≥130 (ARC) 在 calculate 內另外處理
//
// 標準 3.375 g Q6H 起始
export const TAZO_3375_TABLE = [
  { min: 100, dose_mg: 3375, freq: "Q6H（建議改延長滴注）" },
  { min: 40,  dose_mg: 3375, freq: "Q6H" },
  { min: 20,  dose_mg: 2250, freq: "Q6H" },
  { min: 0,   dose_mg: 2250, freq: "Q8H" },
];

// 標準 4.5 g Q6H 起始
export const TAZO_45_TABLE = [
  { min: 100, dose_mg: 4500, freq: "Q6H（建議改延長滴注）" },
  { min: 40,  dose_mg: 4500, freq: "Q6H" },
  { min: 20,  dose_mg: 4500, freq: "Q8H 或 3.375 g Q6H" },
  { min: 0,   dose_mg: 4500, freq: "Q12H 或 2.25 g Q6H" },
];

// ── Brosym (Cefoperazone/Sulbactam) 表 ────────────────────
// 廠商劑量：腎功能不論高低均 4 g Q12H
export const BROSYM_STANDARD_TABLE = [
  { min: 0, dose_mg: 4000, freq: "Q12H" },
];

// CRAB 高劑量替代方案
export const BROSYM_HIGH_TABLE = [
  { min: 0, dose_mg: 4000, freq: "Q8H" },
];
