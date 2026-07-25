// ╔══════════════════════════════════════════════════════════════════╗
// ║  💉 院內針劑泡製速查 — 資料表                                       ║
// ║                                                                ║
// ║  ⚠️ 目前為「仿單標準值草稿」，尚未對過貴院藥劑部實際 SOP。          ║
// ║     臨床使用前務必由藥師逐項核對！                                  ║
// ║                                                                ║
// ║  🔑 key 必須對應 drugs/index.ts 裡 DRUG_REGISTRY 的名稱            ║
// ║     （如 mepem、vancomycin、tazocin…）                            ║
// ║                                                                ║
// ║  🛠 要修改：直接改下面文字即可，頁面會自動更新。                    ║
// ║     缺欄位（留空或整筆缺）→ 頁面顯示「—」。                        ║
// ║                                                                ║
// ║  欄位說明：                                                      ║
// ║    vial            院內品項 / 規格                                ║
// ║    reconstitution  回溶：溶劑 + 體積（+ 濃度）                     ║
// ║    diluent         建議稀釋液（NS / D5W / 配伍禁忌）               ║
// ║    finalNote       稀釋後體積 / 安定性 / 備註                      ║
// ╚══════════════════════════════════════════════════════════════════╝

import type { PrepInfo } from './types';

export const PREP_DATA: Record<string, PrepInfo> = {
  bactrim: {
    vial: "安瓿 5 mL（TMP 80 mg / SMX 400 mg）",
    reconstitution: "安瓿本身為濃縮液，不需回溶",
    diluent: "須用 D5W 稀釋（每 1 安瓿加 ≥75–125 mL D5W，約 1:25）",
    finalNote: "NS 易析出，應用 D5W；稀釋後室溫盡快輸畢（約 ≤6 hr）。限水可 1:15",
  },
  mepem: {
    vial: "乾粉 500 mg/Vial（麥羅）",
    reconstitution: "IV bolus：每 500 mg 加 10 mL 無菌水 → 約 50 mg/mL",
    diluent: "NS（首選）或 D5W；輸注再稀釋至 50–250 mL",
    finalNote: "NS 中較穩定（室溫約 ≤4 hr），D5W 較不穩定應盡快用畢；延長滴注 3 hr",
  },
  cresemba: {
    vial: "乾粉 200 mg/Vial（Isavuconazole）",
    reconstitution: "加 5 mL 無菌水，輕搖至完全溶解",
    diluent: "NS 或 D5W 250 mL",
    finalNote: "需 in-line filter 0.2–1.2 μm；勿與其他藥併輸；室溫（含輸注）≤6 hr、冷藏 ≤24 hr",
  },
  tygacil: {
    vial: "乾粉 50 mg/Vial（Tigecycline）",
    reconstitution: "加 5.3 mL NS 或 D5W → 10 mg/mL（黃橙色為正常）",
    diluent: "NS 或 D5W，移入 100 mL 點滴袋",
    finalNote: "回溶後盡快使用；室溫 ≤6 hr（或連同點滴袋冷藏 ≤24 hr）",
  },
  unasyn: {
    vial: "乾粉 1.5 g / 3 g/Vial（Ampicillin:Sulbactam = 2:1）",
    reconstitution: "1.5 g 加 3.2 mL、3 g 加 6.4 mL 無菌水 → 375 mg/mL；IV 用再稀釋",
    diluent: "NS（首選，較穩定）；亦可 D5W 但時效較短",
    finalNote: "稀釋至 ≤45 mg/mL；NS 室溫 ≤8 hr、冷藏 ≤48 hr；D5W 時效短",
  },
  tazocin: {
    vial: "乾粉 4.5 g/Vial（Piperacillin/Tazobactam）",
    reconstitution: "每 4.5 g 加 20 mL 無菌水或 NS，搖溶",
    diluent: "NS 或 D5W，稀釋至 50–150 mL",
    finalNote: "室溫 ≤24 hr、冷藏 ≤48 hr；延長滴注 3–4 hr。含 Na⁺",
  },
  brosym: {
    vial: "乾粉（Cefoperazone:Sulbactam = 1:1）",
    reconstitution: "每 1 g 加約 3–4 mL 無菌水 / D5W / NS，充分搖溶（體積依院內品項）",
    diluent: "NS 或 D5W",
    finalNote: "回溶後盡快使用；室溫時效有限，詳依仿單",
  },
  vfend: {
    vial: "乾粉 200 mg/Vial（Voriconazole）",
    reconstitution: "加 19 mL 無菌水 → 10 mg/mL（總量 20 mL）",
    diluent: "NS / D5W / LR，稀釋至 ≤5 mg/mL",
    finalNote: "❌ 禁 IV bolus；勿與其他藥同管；回溶後冷藏 ≤24 hr；輸速 ≤3 mg/kg/hr",
  },
  flomoxef: {
    vial: "乾粉 1 g/Vial（Flomoxef）",
    reconstitution: "每 1 g 加約 10 mL 無菌水 / NS / D5W",
    diluent: "NS 或 D5W",
    finalNote: "回溶後盡快使用；詳依仿單",
  },
  ertapenem: {
    vial: "乾粉 1 g/Vial（Invanz）",
    reconstitution: "加 10 mL 無菌水或 NS，搖溶",
    diluent: "僅限 NS，移入 50 mL NS（⚠️ 勿用 D5W）",
    finalNote: "回溶後立即稀釋；室溫 ≤6 hr、冷藏 ≤24 hr（取出後 4 hr 內用畢）",
  },
  fluconazole: {
    vial: "點滴袋 2 mg/mL（100 / 200 mg）— 即用溶液",
    reconstitution: "已是成品溶液，不需回溶",
    diluent: "本身即 NS 或 D5W 溶液",
    finalNote: "輸速 ≤200 mg/hr；勿與其他藥併輸",
  },
  ceftriaxone: {
    vial: "乾粉 1 g/Vial（Rocephin）",
    reconstitution: "IV：每 1 g 加 10 mL 無菌水 → 100 mg/mL",
    diluent: "NS 或 D5W",
    finalNote: "⚠️ 禁與含鈣溶液（LR、鈣劑）同管/同袋，尤其新生兒；稀釋後盡快用",
  },
  zavicefta: {
    vial: "乾粉 2.5 g/Vial（Ceftazidime 2 g / Avibactam 0.5 g）",
    reconstitution: "加 10 mL 無菌水 → ceftaz 167.3 mg/mL，總量約 12 mL",
    diluent: "NS / D5W / LR，稀釋至 ceftaz 8–40 mg/mL",
    finalNote: "室溫 ≤25°C ≤4 hr、冷藏 ≤24 hr；限水可用 syringe pump（詳見劑量頁泡製說明）",
  },
  teicoplanin: {
    vial: "乾粉 400 mg/Vial（附溶劑，Teicod）",
    reconstitution: "400 mg 加附帶 3.2 mL 無菌水，緩慢沿壁滾動溶解，避免起泡",
    diluent: "NS 或 D5W（亦可直接 IV push 3–5 min）",
    finalNote: "若起泡靜置消泡再抽取；回溶後盡快使用",
  },
  cefepime: {
    vial: "乾粉 1 g / 2 g/Vial（Maxipime）",
    reconstitution: "以無菌水 / NS / D5W 回溶（1 g 約加 10 mL）",
    diluent: "NS 或 D5W，稀釋至 50–100 mL",
    finalNote: "室溫 ≤24 hr、冷藏 ≤7 天；延長滴注 3 hr。可能偽陽性 Coombs",
  },
  levofloxacin: {
    vial: "點滴袋 5 mg/mL（250 / 500 / 750 mg）— 即用溶液",
    reconstitution: "成品袋不需回溶（濃縮小瓶則需稀釋至 5 mg/mL）",
    diluent: "NS 或 D5W",
    finalNote: "輸注 ≥60–90 min；勿與其他藥併輸",
  },
  ciprofloxacin: {
    vial: "點滴袋 2 mg/mL（200 / 400 mg）— 即用溶液",
    reconstitution: "成品袋不需回溶（濃縮劑則需稀釋至 1–2 mg/mL）",
    diluent: "NS 或 D5W",
    finalNote: "輸注 ≥60 min；避光保存",
  },
  imipenem: {
    vial: "乾粉 500 mg/Vial（Tienam）",
    reconstitution: "自 100 mL 稀釋液取約 10 mL 注入 vial 搖成懸浮液，再全部倒回該袋（勿直接注射）",
    diluent: "NS 或 D5W（⚠️ 禁乳酸鹽 / LR 稀釋）",
    finalNote: "稀釋至約 5 mg/mL（250–500 mg 用 100 mL）；室溫 ≤4 hr、冷藏 ≤24 hr",
  },
  ceftazidime: {
    vial: "乾粉 1 g / 2 g/Vial（Fortum）",
    reconstitution: "1 g 加 10 mL、2 g 加 10 mL 無菌水（回溶釋出 CO₂ 為正常，靜置排氣）",
    diluent: "NS 或 D5W",
    finalNote: "室溫 ≤24 hr、冷藏 ≤7 天；延長滴注 3 hr",
  },
  cefoxitin: {
    vial: "乾粉 1 g / 2 g/Vial（Mefoxin）",
    reconstitution: "1 g 加 10 mL、2 g 加 10–20 mL 無菌水 / NS",
    diluent: "NS 或 D5W",
    finalNote: "室溫 ≤6 hr、冷藏 ≤7 天；可 IV push 3–5 min",
  },
  acyclovir: {
    vial: "乾粉 250 mg / 500 mg/Vial（Zovirax）",
    reconstitution: "250 mg 加 10 mL 無菌水 → 25 mg/mL（勿用含 benzyl alcohol 抑菌水）",
    diluent: "NS 或 D5W，稀釋至 ≤7 mg/mL（建議 5 mg/mL）",
    finalNote: "⚠️ 勿冷藏（會析出結晶）；輸注 ≥1 hr 並充分水化；12 hr 內用畢",
  },
  ceftaroline: {
    vial: "乾粉 600 mg/Vial（Zinforo）",
    reconstitution: "加 20 mL 無菌水，輕搖至溶",
    diluent: "NS 或 D5W，稀釋至 50–250 mL",
    finalNote: "室溫 ≤6 hr、冷藏 ≤24 hr；輸注 60 min",
  },
  cefmetazole: {
    vial: "乾粉 1 g/Vial（Zefazone）",
    reconstitution: "每 1 g 加約 10 mL 無菌水 / NS / D5W",
    diluent: "NS 或 D5W",
    finalNote: "回溶後盡快使用；詳依仿單",
  },
  ganciclovir: {
    vial: "乾粉 500 mg/Vial（Cymevene，細胞毒性藥）",
    reconstitution: "加 10 mL 無菌水 → 50 mg/mL（勿用含 paraben 抑菌水，會析出）",
    diluent: "NS 或 D5W，稀釋至 ≤10 mg/mL（常用 100 mL）",
    finalNote: "☣️ 細胞毒性需防護；輸注 ≥1 hr 並水化；回溶室溫 ≤12 hr（勿冷藏原液）",
  },
  anidulafungin: {
    vial: "乾粉 100 mg/Vial（Eraxis，未附溶劑）",
    reconstitution: "自備無菌注射用水回溶：每 100 mg 加 30 mL → 3.33 mg/mL（LD 200 mg 需 2 瓶）",
    diluent: "僅限 NS 或 D5W",
    finalNote: "稀釋後約 0.5–0.77 mg/mL；輸速 ≤1.1 mg/min；室溫 ≤24 hr；LD 輸 ≥90 min",
  },
  zerbaxa: {
    vial: "乾粉 1.5 g/Vial（Ceftolozane 1 g / Tazobactam 0.5 g）",
    reconstitution: "加 10 mL 無菌水或 NS，輕搖溶解",
    diluent: "NS 或 D5W，稀釋至 100 mL",
    finalNote: "室溫 ≤24 hr、冷藏 ≤7 天；MDR 可延長滴注 3 hr",
  },
  micafungin: {
    vial: "乾粉 50 mg / 100 mg/Vial（Mycamine）",
    reconstitution: "加 5 mL NS（不含防腐劑），沿壁溶解勿搖（易起泡）",
    diluent: "NS 或 D5W，稀釋至 100 mL",
    finalNote: "☂️ 避光（6 hr 內用畢可不遮光）；室溫 ≤24 hr；輸注 ≥1 hr",
  },
  amphotericinB: {
    vial: "Fungizone 50 mg/Vial（去氧膽酸鹽）；AmBisome 50 mg/Vial（脂質體）",
    reconstitution: "Fungizone：加 10 mL 無菌水（不含防腐劑）→ 5 mg/mL；AmBisome：加 12 mL 無菌水 → 4 mg/mL，搖勻後過濾",
    diluent: "⚠️ 僅限 D5W（禁 NS / 含電解質，會析出）",
    finalNote: "Fungizone 稀釋至 0.1 mg/mL；AmBisome 至 0.2–2 mg/mL 需 ≥1 μm filter；避光；勿與其他藥同管",
  },
  vancomycin: {
    vial: "乾粉 500 mg / 1 g/Vial（Vancocin）",
    reconstitution: "500 mg 加 10 mL 無菌水 → 50 mg/mL",
    diluent: "NS 或 D5W，稀釋至 ≤5 mg/mL",
    finalNote: "輸速 ≤10 mg/min（≥60 min）防紅人症；室溫 ≤24 hr、冷藏數日",
  },
  polymyxinB: {
    vial: "乾粉 500,000 units/Vial（Bobimixyn）",
    reconstitution: "50 萬 units 加 2 mL 無菌水或 NS → 25 萬 units/mL",
    diluent: "D5W（輸注用）",
    finalNote: "LD 輸 ≥2 hr、MD 約 1 hr；回溶後冷藏 ≤72 hr；避免與其他藥混合",
  },
};
