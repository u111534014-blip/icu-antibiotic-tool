// ╔══════════════════════════════════════════════════════════════════╗
// ║  💉 院內針劑泡製速查 — 資料表                                       ║
// ║                                                                ║
// ║  📚 資料依「院內品項 Excel + 各藥仿單」整理（2026/07）。            ║
// ║     仍建議臨床配製前由藥師對照最新仿單/院內 SOP 再確認。           ║
// ║     掃描檔（Ampholipad、Cefin、Flumarin）已逐頁 OCR 補齊回溶體積。 ║
// ║                                                                ║
// ║  🔑 key 必須對應 drugs/index.ts 裡 DRUG_REGISTRY 的名稱            ║
// ║  🛠 要修改：直接改下面文字即可，頁面會自動更新。缺欄位顯示「—」。 ║
// ║                                                                ║
// ║  欄位：vial 院內品項/規格　reconstitution 回溶（溶劑+體積+濃度）  ║
// ║        diluent 建議稀釋液　finalNote 稀釋後/安定性/備註            ║
// ║        products 多品項分列（如 Amphotericin B 三劑型）            ║
// ╚══════════════════════════════════════════════════════════════════╝

import type { PrepInfo } from './types';

export const PREP_DATA: Record<string, PrepInfo> = {
  bactrim: { // Sevatrim（TMP/SMX）
    brand: "Sevatrim",
    vial: "安瓿 5 mL（TMP 80 mg + SMX 400 mg）",
    reconstitution: "安瓿為濃縮液，不需回溶",
    diluent: "須稀釋（5% 葡萄糖或 0.9% 生理食鹽水）：1 安瓿(5 mL)→125 mL、2 安瓿(10 mL)→250 mL、3 安瓿(15 mL)→500 mL；限水可每 5 mL→75 mL",
    finalNote: "稀釋後振搖混勻、使用前才配製；不建議與其他藥混合；未用稀釋液丟棄。25℃ 以下儲存；限水濃度仍需觀察析晶/混濁",
  },
  mepem: { // Meropenem
    brand: "Meropenem",
    vial: "乾粉 500 mg/Vial",
    reconstitution: "0.5 g 用 ≥100 mL 生理食鹽水溶解（仿單：注射用水不得使用）",
    diluent: "等張生理食鹽水；IV infusion final concentration 1–20 mg/mL（院內常用 0.5 g/100 mL = 5 mg/mL）",
    finalNote: "溶解後立即使用；NS 室溫 ≤6 hr、5℃ ≤24 hr；勿與其他藥品混合",
  },
  cresemba: { // Cresemba（Isavuconazole）
    vial: "乾粉 200 mg/Vial",
    reconstitution: "加 5 mL 注射用水，輕搖至完全溶解 → 40 mg/mL",
    diluent: "取全量濃縮液加入 250 mL（0.9% 食鹽水或 5% 葡萄糖）→ 0.4–0.8 mg/mL",
    finalNote: "需 in-line filter 0.2–1.2 μm（PES）；勿與其他藥併輸、輸注前後沖管；室溫（含輸注）≤6 hr、冷藏 2–8℃ ≤24 hr、勿冷凍",
  },
  tygacil: { // Tygacil（Tigecycline）
    vial: "乾粉 50 mg/Vial（實際含量多 6%）",
    reconstitution: "加 5.3 mL（0.9% 食鹽水 / 5% 葡萄糖 / 乳酸林格）→ 10 mg/mL；取 5 mL 即含 50 mg",
    diluent: "取 5 mL 加入 100 mL 點滴袋（最高濃度 1 mg/mL）",
    finalNote: "黃橙色為正常；室溫 ≤25℃ 24 hr（瓶內 6 hr + 袋中）、稀釋後 2–8℃ 48 hr；專用/Y 型管路（勿與 amphotericin B 共管）",
  },
  unasyn: { // Sulampi（Ampicillin/Sulbactam 2:1）
    brand: "Sulampi",
    vial: "乾粉 1.5 g/Vial（Ampicillin 1 g / Sulbactam 0.5 g）",
    reconstitution: "1.5 g 加 3.2 mL 無菌水 → 375 mg/mL；IV 用再稀釋",
    diluent: "IV infusion：回溶後以 compatible diluent 稀釋至 50–100 mL；建議 final concentration 3–45 mg/mL。含葡萄糖溶液較不穩定",
    finalNote: "NS/注射用水 45 mg/mL 25℃ 8 hr、4℃ 48 hr；5% 葡萄糖依濃度約 2–4 hr；勿與血液製劑/胺基酸混合",
  },
  tazocin: { // Tapimycin（Piperacillin/Tazobactam）
    brand: "Tapimycin",
    vial: "乾粉 2.25 g/Vial（Piperacillin 2 g / Tazobactam 0.25 g）",
    reconstitution: "2.25 g 加 10 mL 稀釋液，充分振搖 → 202.5 mg/mL",
    diluent: "0.9% 食鹽水 / 5% 葡萄糖 / 滅菌注射用水（每劑最多 50 mL），常稀釋至 50–150 mL；final concentration：piperacillin 20–80 mg/mL、tazobactam 2.5–10 mg/mL",
    finalNote: "瓶內未用部分：室溫 20–25℃ 24 hr、冰箱 2–8℃ 48 hr；輸液袋：室溫 24 hr、冰箱 1 週；移動式輸液幫浦可稀釋至 25 或 37.5 mL，室溫 12 hr；與 aminoglycoside 需分開或 Y 型（含 EDTA 藥瓶）",
  },
  brosym: { // Brosym（Cefoperazone/Sulbactam 1:1）
    vial: "乾粉 2 g/Vial（Cefoperazone 1 g / Sulbactam 1 g）",
    reconstitution: "每瓶（2 g）加 6–10 mL 注射用水 / 5% 葡萄糖 / 0.9% 食鹽水，充分振搖至完全溶解",
    diluent: "回溶：注射用水 / 5% 葡萄糖 / 0.9% 食鹽水；輸注稀釋：50–100 mL 5% 葡萄糖或 0.9% 食鹽水",
    finalNote: "配好立即使用；室溫 ≤6 hr、冰箱 ≤48 hr",
  },
  vfend: { // Vfend（Voriconazole）
    vial: "乾粉 200 mg/Vial（30 mL 瓶）",
    reconstitution: "加 19 mL 注射用水 → 10 mg/mL（❌ 不可用於推注 bolus）",
    diluent: "NS / D5W / LR 等相容輸液；需稀釋至 0.5–5 mg/mL（200 mg 至少 40 mL、400 mg 至少 80 mL，臨床常用 100 mL；較高劑量需更大體積）",
    finalNote: "輸注速率 ≤3 mg/kg/hr；勿與其他輸注品共用管路；不可 IV push",
  },
  flomoxef: { // Flumarin（氟黴寧，Flomoxef Sodium，Shionogi）
    vial: "乾粉 1 g/Vial（10 mL 瓶，含氯化鈉 50 mg）",
    reconstitution: "每 1 g 加 ≥4 mL（注射用水 / 5% 葡萄糖 / 生理食鹽水），充分振盪溶解",
    diluent: "IVD：回溶後再以 50–100 mL 0.9% 食鹽水或 5% 葡萄糖稀釋",
    finalNote: "調製後盡快使用；室溫 6 hr、冰箱 2–8℃ 24 hr；IVD 15–30 min，IV 大量投與放慢速度防血管痛/靜脈炎",
  },
  ertapenem: { // Ertapenem
    brand: "Ertapenem",
    vial: "乾粉 1 g/Vial",
    reconstitution: "1 g 加 10 mL（注射用水 / 0.9% 食鹽水 / 制菌注射用水），充分搖溶",
    diluent: "立即移入 50 mL 0.9% 食鹽水；final concentration ≤20 mg/mL（⚠️ 勿用含葡萄糖 α-D-glucose 稀釋液）",
    finalNote: "稀釋後 6 hr 內使用完畢；勿與其他藥混合或同時輸注",
  },
  fluconazole: { // Diflucan
    vial: "點滴瓶 100 mg / 50 mL（2 mg/mL 等張液）",
    reconstitution: "成品輸注液，不需回溶或再稀釋",
    diluent: "原瓶輸注；本身即 NS 溶液，不建議輸注前與其他藥混合",
    finalNote: "靜脈輸注速率 ≤10 mL/min；含 NaCl（限鈉/限水者注意）",
  },
  ceftriaxone: { // Cefin（汎生舒復，Ceftriaxone）
    brand: "Cefin",
    vial: "乾粉 2 g/Vial",
    reconstitution: "2 g 加約 20 mL 滅菌注射用水 → ~100 mg/mL（供輸注再稀釋；仿單比例 1 g→10 mL）",
    diluent: "0.9% 食鹽水或 5% 葡萄糖；IVD 建議 final concentration 10–40 mg/mL（2 g 約 50–200 mL，臨床常用 50–100 mL）。⚠️ 勿用含鈣溶液 Ringer's/Hartmann's 配製或稀釋；勿與含鈣同管，尤其新生兒",
    finalNote: "IVD 通常 30 min；配製後室溫 6 hr、2–8℃ 24 hr；溶液顏色淡黃至琥珀色不影響效價",
  },
  zavicefta: { // Zavicefta（Ceftazidime/Avibactam）
    vial: "乾粉 2.5 g/Vial（Ceftazidime 2 g / Avibactam 0.5 g）",
    reconstitution: "加 10 mL 注射用水 → ceftaz 167.3 + avibactam 41.8 mg/mL（總量約 12 mL）",
    diluent: "取全量加入 100 mL 輸注袋（NS / D5W / LR），稀釋至 ceftazidime 8–40 mg/mL",
    finalNote: "調配小瓶應立即使用；稀釋後 ceftazidime 8 mg/mL 可 2–8℃ ≤12 hr 後室溫 ≤4 hr，>8–40 mg/mL 室溫 ≤4 hr",
  },
  teicoplanin: { // Teicod
    vial: "乾粉 200 mg/Vial（附注射用水）",
    reconstitution: "附帶注射用水（約 3 mL）緩慢沿壁加入、輕轉溶解、避免起泡（→ 200 mg/3 mL）；起泡靜置 ~15 min",
    diluent: "可直接注射或以 0.9% 食鹽水 / 5% 葡萄糖稀釋",
    finalNote: "製備後 24 hr 內使用；若無法立即使用，2–8℃ 保存且 24 hr 後丟棄；不可抽入針筒保存",
  },
  cefepime: { // Antifect（Cefepime）
    brand: "Antifect",
    vial: "乾粉 1 g/Vial（1000 mg）",
    reconstitution: "1 g 加 10 mL 稀釋液（無菌水 / 5% 葡萄糖 / 0.9% 食鹽水）",
    diluent: "回溶後以 0.9% 食鹽水 / 5%、10% 葡萄糖 / D5NS / 乳酸林格等稀釋；IV infusion 相容濃度 1–40 mg/mL（1 g 至少 25 mL、2 g 至少 50 mL；臨床常用 50–100 mL）",
    finalNote: "輸注約 30 min；室溫 24 hr、冰箱 7 天；勿與 β-lactam 抗生素、vancomycin、metronidazole、aminoglycoside 等同溶液混合",
  },
  levofloxacin: { // Cravit
    vial: "點滴瓶 5 mg/mL, 50 mL/瓶（等張黃綠色溶液）",
    reconstitution: "成品 premix 輸注液，不需回溶或再稀釋",
    diluent: "原瓶輸注；若同線序貫輸注，前後以相容輸液沖管（0.9% 食鹽水、5% 葡萄糖等）",
    finalNote: "成品等張溶液；勿加入其他藥或同時同管輸注；僅供緩慢靜脈輸注，避免快速 IV push",
  },
  ciprofloxacin: { // Seforce（Ciprofloxacin）
    brand: "Seforce",
    vial: "點滴瓶 400 mg / 200 mL（2 mg/mL）",
    reconstitution: "成品 premix 輸注液，不需回溶或再稀釋",
    diluent: "原瓶輸注；必要時可與相容輸液序貫給予（食鹽水、林格、乳酸林格、5%/10% 葡萄糖、10% 果糖等）",
    finalNote: "避光；與鹼性/不相容輸液及藥品分開給予；避免加入其他藥品",
  },
  imipenem: { // Culin（Imipenem/Cilastatin，庫寧）
    brand: "Culin",
    vial: "乾粉 500 mg/Vial（Imipenem 500 mg + Cilastatin 500 mg）",
    reconstitution: "500 mg 加 100 mL、250 mg 加 50 mL 輸注液 → imipenem 5 mg/mL；小瓶先以約 10 mL 輸注液製成懸浮液後轉入輸注容器，再重複沖洗轉入",
    diluent: "0.9% 食鹽水、5%/10% 葡萄糖、D5NS、D5 0.45%/0.225% NaCl、D5 0.15% KCl、5%/10% mannitol；不可用含 lactate 稀釋液調配",
    finalNote: "懸浮液不可直接輸注；已調配 IV 溶液室溫 25℃ 4 hr、冷藏 4℃ 24 hr；可加入正在輸注的含 lactate 溶液一同輸注",
  },
  ceftazidime: { // Tatumcef（Ceftazidime）
    brand: "Tatumcef",
    vial: "乾粉 2 g/Vial（含碳酸鹽）",
    reconstitution: "IV bolus：2 g 加 10 mL 無菌注射用水；IVD：先加 10 mL 稀釋液溶解，待溶解後再加餘量稀釋液至 50–100 mL",
    diluent: "IV infusion 相容濃度 1–40 mg/mL；0.9% 食鹽水、5%/10% 葡萄糖、D5NS、D5 0.45%/0.225% NaCl、D5 0.18% NaCl、乳酸林格、Hartmann's、M/6 sodium lactate、Dextran 40/70 等；⚠️ 不建議 sodium bicarbonate，勿與 aminoglycoside 同針筒混合，與 vancomycin 分開並沖管",
    finalNote: "溶解時產生 CO₂ 與正壓屬正常；IV bolus 3–5 min，IVD 稀釋至 50–100 mL 後輸注 15–30 min；室溫 18 hr、冷藏 7 天仍保持效價",
  },
  cefoxitin: { // Cefmore（Cefoxitin）
    brand: "Cefmore",
    vial: "乾粉 2 g/Vial",
    reconstitution: "2 g 加 10–20 mL 注射用水 / 0.9% 食鹽水",
    diluent: "回溶後可再以 50–1000 mL 相容輸液稀釋（常用 50–100 mL）：0.9% 食鹽水、5%/10% 葡萄糖、D5NS、乳酸林格等",
    finalNote: "配製後注射液 37℃ 以下可保存 24 hr；25℃ 以下避光儲存",
  },
  acyclovir: { // Zovirax
    vial: "乾粉 250 mg/Vial（強鹼 pH ~11）",
    reconstitution: "加注射用水 / 0.9% 食鹽水 → 25 mg/mL（250 mg 加 10 mL）",
    diluent: "進一步稀釋至 <5 mg/mL（成人 100 mL 袋；兒童 4 mL 配製液＋20 mL 輸液）",
    finalNote: "給藥期間需充分水化；室溫 15–25℃ 12 hr 安定（⚠️ 勿冷藏，會析晶）；強鹼避免接觸皮膚黏膜",
  },
  ceftaroline: { // Zinforo（捷復寧，Ceftaroline fosamil）
    vial: "乾粉 600 mg/Vial（相當於 ceftaroline 530 mg）",
    reconstitution: "加 20 mL 注射用水，搖勻後立即稀釋 → 約 30 mg/mL",
    diluent: "0.9% 食鹽水 / 5% 葡萄糖等，稀釋至 50–250 mL 輸注袋；final concentration 不可 >12 mg/mL",
    finalNote: "配製後立即稀釋；稀釋後 6 hr 內使用，2–8℃ 可 12 hr、取出回室溫後 6 hr 內用",
    infusionTime: "標準劑量 5–60 min；高劑量 600 mg Q8H：120 min",
  },
  cefmetazole: { // Cetazone（喜達隆，Cefmetazole）
    brand: "Cetazone",
    vial: "乾粉 500 mg/Vial",
    reconstitution: "500 mg 加 5 mL 注射用蒸餾水 / 生理食鹽水 / 5% 葡萄糖（仿單比例：1 g→10 mL、2 g→20 mL）",
    diluent: "IV 注射可用注射用蒸餾水 / 生理食鹽水 / 5% 葡萄糖；點滴用 100 mL 大瓶輸注液時勿用注射用蒸餾水",
    finalNote: "溶解後 pH 4.2–6.2、滲透壓比約 1；配好盡快使用",
  },
  ganciclovir: { // Ganciclovir（強鹼，細胞毒性藥）
    brand: "Ganciclovir",
    vial: "乾粉 500 mg/Vial（強鹼 pH ~11，細胞毒性）",
    reconstitution: "加 10 mL 注射用水 → 50 mg/mL（勿用含 paraben 抑菌水，會析出）",
    diluent: "取所需量加入生理食鹽水 / 5% 葡萄糖 / 林格 / 乳酸林格；通常加入 100 mL，final concentration 不可 >10 mg/mL",
    finalNote: "☣️ 強鹼避免接觸皮膚黏膜；需水化、勿推注；配好盡快用，2–8℃ ≤24 hr",
  },
  anidulafungin: { // Eraxis（未附溶劑）
    vial: "乾粉 100 mg/Vial（未附溶劑）",
    reconstitution: "自備注射用水：每 100 mg 加 30 mL → 3.33 mg/mL（LD 200 mg 需 2 瓶）",
    diluent: "僅限 5% 葡萄糖或 0.9% 食鹽水，稀釋至 0.77 mg/mL；100 mg 加 100 mL（總量 130 mL），200 mg 加 200 mL（總量 260 mL）",
    finalNote: "輸注速率 ≤1.1 mg/min（84 mL/hr）；配製液 25℃ ≤24 hr；勿冷凍、勿與其他藥/電解質併輸",
  },
  zerbaxa: { // Zerbaxa（Ceftolozane/Tazobactam）
    vial: "乾粉 1.5 g/Vial（Ceftolozane 1 g / Tazobactam 0.5 g）",
    reconstitution: "加 10 mL 注射用水或 0.9% 食鹽水，輕搖溶解（總量約 11.4 mL）→ 約 132 mg/mL（ceftolozane 88 mg/mL + tazobactam 44 mg/mL）",
    diluent: "取需要量加入 100 mL（0.9% 食鹽水或 5% 葡萄糖）",
    finalNote: "非供直接注射；調製小瓶可保存 1 hr；稀釋後室溫 24 hr、2–8℃ 7 天；不可冷凍；勿與其他藥混合",
  },
  micafungin: { // Myfungin（Micafungin，光敏感）
    brand: "Myfungin",
    vial: "乾粉 50 mg/Vial",
    reconstitution: "50 mg 加 5 mL（0.9% 食鹽水或 5% 葡萄糖，不含抑菌劑）沿壁輕搖勿劇搖 → 10 mg/mL",
    diluent: "加入 100 mL（0.9% 食鹽水或 5% 葡萄糖），最終 0.5–4 mg/mL",
    finalNote: "☂️ 避光；配製液/稀釋液室溫 25℃ ≤24 hr；先以 NS 沖管；>1.5 mg/mL 建議中央靜脈",
  },
  vancomycin: { // U-Vanco
    brand: "U-Vanco",
    vial: "乾粉 1 g/Vial",
    reconstitution: "1 g 加 20 mL 無菌注射用水 → 50 mg/mL",
    diluent: "IV：500 mg 至少加 100 mL、1 g 至少加 200 mL，稀釋至 ≤5 mg/mL（D5W / NS / 林格等）；限水可 500 mg/50 mL 或 1 g/100 mL（10 mg/mL）",
    finalNote: "避免紅人症/低血壓，限水高濃度可能增加 infusion reaction；回溶液需冷藏，可 14 天；再稀釋後室溫 24 hr、冷藏 96 hr；與 β-lactam 分開並沖管；口服/NG（非 IV）：DailyMed 1 g + 10 mL 無菌注射用水 → 100 mg/mL；院內常見 1 g + 8 mL NS → 125 mg/mL，抽 1 mL = 125 mg",
  },
  polymyxinB: { // Bobimixyn（Polymyxin B）
    vial: "乾粉 500,000 units/Vial",
    reconstitution: "仿單未列小瓶另行回溶體積；每 500,000 units 直接溶於 300–500 mL 5% 葡萄糖或 0.9% 食鹽水作連續輸注",
    diluent: "5% 葡萄糖或 0.9% 食鹽水；限水病人可依單次劑量稀釋於 50–100 mL D5W 或 NS",
    finalNote: "輸注 60–90 min；限水病人：單次劑量 0.5–1.5 mg/kg（5,000–15,000 units/kg = 5–15 KIU/kg）稀釋於 50–100 mL D5W 或 NS，IV over 1–4 hr；未開封 20–25℃、調製後 2–8℃ 冷藏 ≤72 hr（超過丟棄）",
  },
  amphotericinB: { // 三劑型分列（不可互換）
    products: [
      {
        name: "Fungizone（防治黴）",
        subtitle: "Amphotericin B deoxycholate",
        vial: "乾粉 50 mg/Vial",
        reconstitution: "加 10 mL 無菌注射用水（不含防腐劑）→ 5 mg/mL",
        diluent: "⚠️ 僅限 pH >4.2 的 5% 葡萄糖稀釋至 0.1 mg/mL（禁食鹽水/含電解質，會析出）",
        finalNote: "可先 test dose 1 mg in 20 mL D5W；給藥前 NS 水化降腎毒性；可用管線濾膜但孔徑不得 <1.0 μm；與 lipid/liposomal 劑型不可互換",
        infusionTime: "通常 2–6 hr",
      },
      {
        name: "AmBisome（脂黴素）",
        subtitle: "Liposomal amphotericin B",
        vial: "凍晶 50 mg/Vial",
        reconstitution: "加 12 mL 無菌注射用水（不含抑菌劑）→ 4 mg/mL，用力搖 30 秒至完全分散",
        diluent: "經附帶 5 μm 過濾器轉入 5% 葡萄糖，稀釋至 1–2 mg/mL（幼兒 0.2–0.5）；IV 管路濾膜若使用，孔徑不可 <1.0 μm；⚠️ 勿用食鹽水",
        finalNote: "勿與食鹽水/其他藥混合；與 Fungizone 不可互換（同 50 mg/vial 但 mg/kg 不同）",
        infusionTime: "約 120 min（耐受後可縮短）",
      },
      {
        name: "Ampholipad（安畢黴）",
        subtitle: "Amphotericin B liposome（微脂粒）",
        vial: "凍晶 50 mg/Vial（附 5 μm 過濾器，pH 5.0–6.0）",
        reconstitution: "加 12 mL 無菌注射用水（不含抑菌劑）→ 4 mg/mL，加水後用力搖 30 秒至完全分散",
        diluent: "經附贈 5 μm 過濾器，以 5% 葡萄糖稀釋至 1–2 mg/mL（幼兒 0.2–0.5）；⚠️ 勿用食鹽水/抑菌劑",
        finalNote: "濃縮液 2–8℃ ≤24 hr 勿冷凍、5% 葡萄糖稀釋液 6 hr 內用完；與 Fungizone 不可互換",
        infusionTime: "> 120 min（耐受後可縮短至 ~60 min）",
      },
    ],
  },
};
