// ╔══════════════════════════════════════════════════════════════════╗
// ║  💉 院內針劑泡製速查 — 資料表                                       ║
// ║                                                                ║
// ║  📚 資料依「院內品項 Excel + 各藥仿單」整理（2026/07）。            ║
// ║     仍建議臨床配製前由藥師對照最新仿單/院內 SOP 再確認。           ║
// ║     少數為掃描檔（Ampholipad、Cefin、Flumarin）取得細節有限，       ║
// ║     已於 finalNote 標註。                                          ║
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
    vial: "安瓿 5 mL（TMP 80 mg + SMX 400 mg）",
    reconstitution: "安瓿為濃縮液，不需回溶",
    diluent: "須稀釋（5% 葡萄糖或 0.9% 生理食鹽水）：1 安瓿(5 mL)→125 mL、2 安瓿(10 mL)→250 mL、3 安瓿(15 mL)→500 mL",
    finalNote: "稀釋後振搖混勻、使用前才配製，輸注約 1.5 hr；不建議與其他藥混合；未用稀釋液丟棄。25℃ 以下儲存",
  },
  mepem: { // Meropenem
    vial: "乾粉 250 mg / 500 mg/Vial",
    reconstitution: "仿單：0.25 g / 0.5 g 用 ≥100 mL 生理食鹽水溶解（注射用水不得使用）",
    diluent: "等張生理食鹽水",
    finalNote: "溶解後立即使用；NS 室溫 ≤6 hr、5℃ ≤24 hr。重症可延長滴注 3 hr",
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
    vial: "乾粉（Ampicillin/Sulbactam = 2:1；Sulbactam 每日上限 4 g）",
    reconstitution: "以無菌注射用水回溶（依規格）；充分溶解",
    diluent: "無菌注射用水 / 生理食鹽水（≤45 mg/mL）；含葡萄糖溶液較不穩定",
    finalNote: "IV 緩慢注射或稀釋後輸注 15–30 min；NS/注射用水 45 mg/mL 25℃ 8 hr、5℃ 48 hr；5% 葡萄糖 15–30 mg/mL 僅 ~3 hr；勿與血液製劑/胺基酸混合",
  },
  tazocin: { // Tapimycin（Piperacillin/Tazobactam）
    vial: "乾粉 2.25 g / 4.5 g/Vial（Piperacillin/Tazobactam 8:1）",
    reconstitution: "每 1 g piperacillin 用 5 mL：2.25 g→10 mL、4.5 g→20 mL，充分振搖 → 202.5 mg/mL",
    diluent: "0.9% 食鹽水 / 5% 葡萄糖 / 滅菌注射用水",
    finalNote: "輸注 >30 min；室溫 20–25℃ 24 hr、冰箱 2–8℃ 48 hr；與 aminoglycoside 需分開或 Y 型（含 EDTA 藥瓶）",
  },
  brosym: { // Brosym（Cefoperazone/Sulbactam 1:1）
    vial: "乾粉 1g/1g、2g/2g、4g/4g（Cefoperazone/Sulbactam = 1:1）",
    reconstitution: "每瓶加稀釋液（1g/2g 瓶約 6–10 mL；4g 瓶約 10–15 mL），充分振搖至溶",
    diluent: "回溶：注射用水 / 5% 葡萄糖 / 0.9% 食鹽水；輸注稀釋：5% 葡萄糖或 0.9% 食鹽水",
    finalNote: "IV 注射 ≥3 min 或輸注 15–60 min；配好立即使用，室溫 ≤6 hr、冰箱 ≤48 hr",
  },
  vfend: { // Vfend（Voriconazole）
    vial: "乾粉 200 mg/Vial（30 mL 瓶）",
    reconstitution: "加 19 mL 注射用水 → 10 mg/mL（❌ 不可用於推注 bolus）",
    diluent: "稀釋至 ≤5 mg/mL（NS / D5W / LR 等相容輸液）",
    finalNote: "輸注速率 ≤3 mg/kg/hr、1–2 hr 完成；勿與其他輸注品共用管路",
  },
  flomoxef: { // Flumarin（Flomoxef，Shionogi）
    vial: "乾粉 1 g/Vial",
    reconstitution: "每 1 g 加約 10 mL 注射用水 / 生理食鹽水 / 葡萄糖溶解",
    diluent: "生理食鹽水或葡萄糖溶液",
    finalNote: "溶解後盡快使用；輸注 15–30 min（仿單為掃描檔，體積/時效細節有限）",
  },
  ertapenem: { // Ertapenem
    vial: "乾粉 1 g/Vial",
    reconstitution: "1 g 加 10 mL（注射用水 / 0.9% 食鹽水 / 制菌注射用水），充分搖溶",
    diluent: "立即移入 50 mL 0.9% 食鹽水（⚠️ 勿用含葡萄糖 α-D-glucose 稀釋液）",
    finalNote: "稀釋後 6 hr 內輸注完畢（輸注 >30 min）；勿與其他藥混合或同時輸注",
  },
  fluconazole: { // Diflucan
    vial: "點滴瓶 2 mg/mL（生理食鹽水配製之等張液）",
    reconstitution: "成品溶液，不需回溶",
    diluent: "本身即 NS 溶液；不建議輸注前與其他藥混合",
    finalNote: "靜脈輸注速率 ≤10 mL/min；每 200 mg(100 mL) 含 15 mmol 鈉，限鈉/限水者注意",
  },
  ceftriaxone: { // Cefin（Ceftriaxone，汎生舒復）
    vial: "乾粉 1 g/Vial",
    reconstitution: "IV：每 1 g 加 10 mL 注射用水 → 100 mg/mL",
    diluent: "0.9% 食鹽水或 5% 葡萄糖（⚠️ 勿與含鈣溶液如乳酸林格同管/同袋，尤其新生兒）",
    finalNote: "IV 注射 2–4 min 或輸注 30 min；稀釋後盡快使用（仿單為掃描檔，細節有限）",
  },
  zavicefta: { // Zavicefta（Ceftazidime/Avibactam）
    vial: "乾粉 2.5 g/Vial（Ceftazidime 2 g / Avibactam 0.5 g）",
    reconstitution: "加 10 mL 注射用水 → ceftaz 167.3 + avibactam 41.8 mg/mL（總量約 12 mL）",
    diluent: "取全量加入輸注袋（NS / D5W / LR），稀釋至 ceftaz 8–40 mg/mL",
    finalNote: "輸注 120 min；室溫 ≤25℃ 時效有限、冷藏 ≤24 hr（詳見劑量頁泡製說明）",
  },
  teicoplanin: { // Teicod
    vial: "乾粉 200 mg / 400 mg/Vial（附注射用水）",
    reconstitution: "整安瓿注射用水緩慢加入、輕轉溶解、避免起泡（200mg→200mg/3mL、400mg→400mg/3mL）；起泡靜置 ~15 min",
    diluent: "可直接注射或以 0.9% 食鹽水 / 5% 葡萄糖稀釋",
    finalNote: "IV 直接灌注 3–5 min 或輸注 >30 min（新生兒僅用輸注）",
  },
  cefepime: { // Antifect（Cefepime）
    vial: "乾粉 0.5 g / 1 g / 2 g/Vial",
    reconstitution: "依表6加稀釋液（約 1 g→10 mL、2 g→10 mL；無菌水 / 5% 葡萄糖 / 0.9% 食鹽水）",
    diluent: "0.9% 食鹽水 / 5%、10% 葡萄糖 / 乳酸林格等（1–40 mg/mL 相容）",
    finalNote: "IV 注射或輸注；室溫 24 hr、冰箱 7 天；勿與 β-lactam 抗生素同溶液混合",
  },
  levofloxacin: { // Cravit
    vial: "點滴瓶 5 mg/mL, 50 mL/瓶（等張黃綠色溶液）",
    reconstitution: "成品溶液，不需回溶",
    diluent: "相容：0.9% 食鹽水、5% 葡萄糖、含 2.5% 葡萄糖林格、非腸道營養劑",
    finalNote: "250 mg 輸注 ≥30 min、500 mg ≥60 min；僅供緩慢靜脈輸注",
  },
  ciprofloxacin: { // Seforce（Ciprofloxacin）
    vial: "點滴瓶 400 mg / 200 mL（2 mg/mL）",
    reconstitution: "成品溶液，不需回溶",
    diluent: "相容：食鹽水、林格、乳酸林格、5%/10% 葡萄糖、10% 果糖等",
    finalNote: "輸注 >60 min；避光；與鹼性/不相容輸液及藥品分開給予",
  },
  imipenem: { // Culin（Imipenem/Cilastatin，庫寧）
    vial: "乾粉 500 mg/Vial",
    reconstitution: "取部分稀釋液回溶成懸浮液後全部倒回稀釋（勿直接注射）",
    diluent: "0.9% 食鹽水或 5% 葡萄糖（⚠️ 禁乳酸鹽 / LR 稀釋）",
    finalNote: "滴注：≤500 mg 需 >20–30 min、>500 mg 需 40–60 min；輸注中噁心時放慢",
  },
  ceftazidime: { // Tatumcef（Ceftazidime）
    vial: "乾粉 0.5 g / 1 g / 2 g/Vial（含碳酸鹽）",
    reconstitution: "加注射用水發泡溶解、釋出 CO₂（小氣泡可忽略）；1 g 加 10 mL；點滴用稀釋液分兩次加入",
    diluent: "多數常用靜脈點滴輸注液相容（NS / D5W 等）",
    finalNote: "溶解時正壓、產生 CO₂ 屬正常；配好後可直接注射或注入點滴管",
  },
  cefoxitin: { // Cefmore（Cefoxitin）
    vial: "乾粉 1 g / 2 g/Vial",
    reconstitution: "每 1 g 加 10 mL、2 g 加 10–20 mL 注射用水 / 0.9% 食鹽水",
    diluent: "0.9% 食鹽水或 5% 葡萄糖",
    finalNote: "配製後注射液 37℃ 以下可保存 24 hr；25℃ 以下避光儲存；IV 注射或輸注",
  },
  acyclovir: { // Zovirax
    vial: "乾粉 250 mg/Vial（強鹼 pH ~11）",
    reconstitution: "加注射用水 / 0.9% 食鹽水 → 25 mg/mL（250 mg 加 10 mL）",
    diluent: "進一步稀釋至 <5 mg/mL（成人 100 mL 袋；兒童 4 mL 配製液＋20 mL 輸液）",
    finalNote: "以 1 hr 緩慢輸注並充分水化；室溫 15–25℃ 12 hr 安定（⚠️ 勿冷藏，會析晶）；強鹼避免接觸皮膚黏膜",
  },
  ceftaroline: { // Zinforo（捷復寧，Ceftaroline fosamil）
    vial: "乾粉 600 mg/Vial（相當於 ceftaroline 530 mg）",
    reconstitution: "加 20 mL 注射用水，搖勻後立即稀釋",
    diluent: "0.9% 食鹽水 / 5% 葡萄糖 等，移入輸注袋/瓶",
    finalNote: "標準劑量輸注 5–60 min；高劑量 600 mg Q8H 輸注 120 min；配好應盡快使用",
  },
  cefmetazole: { // Cetazone（喜達隆，Cefmetazole）
    vial: "乾粉 250 mg / 500 mg / 1 g / 2 g/Vial",
    reconstitution: "溶解液加入量：250mg→2.5mL、500mg→5mL、1g→10mL、2g→(點滴用)20mL 注射用蒸餾水",
    diluent: "注射用蒸餾水（點滴另以輸液稀釋）",
    finalNote: "溶解後 pH 4.2–6.2、滲透壓比約 1；配好盡快使用",
  },
  ganciclovir: { // Ganciclovir（強鹼，細胞毒性藥）
    vial: "乾粉 500 mg/Vial（強鹼 pH ~11，細胞毒性）",
    reconstitution: "加 10 mL 注射用水 → 50 mg/mL（勿用含 paraben 抑菌水，會析出）",
    diluent: "生理食鹽水 / 5% 葡萄糖 / 林格 / 乳酸林格，稀釋至 ≤10 mg/mL",
    finalNote: "☣️ 強鹼避免接觸皮膚黏膜；輸注 ≥1 hr 並水化、勿推注；配好盡快用，2–8℃ ≤24 hr",
  },
  anidulafungin: { // Eraxis（未附溶劑）
    vial: "乾粉 100 mg/Vial（未附溶劑）",
    reconstitution: "自備注射用水：每 100 mg 加 30 mL → 3.33 mg/mL（LD 200 mg 需 2 瓶）",
    diluent: "僅限 5% 葡萄糖或 0.9% 食鹽水，稀釋至 0.77 mg/mL",
    finalNote: "輸注速率 ≤1.1 mg/min（84 mL/hr）；LD 輸 ≥90 min；配製液 25℃ ≤24 hr；勿冷凍、勿與其他藥/電解質併輸",
  },
  zerbaxa: { // Zerbaxa（Ceftolozane/Tazobactam）
    vial: "乾粉 1.5 g/Vial（Ceftolozane 1 g / Tazobactam 0.5 g）",
    reconstitution: "加 10 mL 注射用水或 0.9% 食鹽水，輕搖溶解（總量約 11.4 mL）",
    diluent: "取需要量加入 100 mL（0.9% 食鹽水或 5% 葡萄糖）",
    finalNote: "非供直接注射；輸注 1 hr；不含防腐劑、需無菌操作；勿與其他藥混合",
  },
  micafungin: { // Myfungin（Micafungin，光敏感）
    vial: "乾粉 50 mg / 100 mg/Vial",
    reconstitution: "每 50 mg 加 5 mL（0.9% 食鹽水或 5% 葡萄糖，不含抑菌劑）沿壁輕搖勿劇搖 → 10 mg/mL",
    diluent: "加入 100 mL（0.9% 食鹽水或 5% 葡萄糖），最終 0.5–4 mg/mL",
    finalNote: "☂️ 避光；配製液/稀釋液室溫 25℃ ≤24 hr；輸注 1 hr、先以 NS 沖管；>1.5 mg/mL 建議中央靜脈",
  },
  vancomycin: { // U-Vanco
    vial: "乾粉 500 mg / 1 g/Vial",
    reconstitution: "500 mg 加 10 mL、1 g 加 20 mL 無菌注射用水 → 50 mg/mL",
    diluent: "500 mg 加 ≥100 mL、1 g 加 ≥200 mL 稀釋（5% 葡萄糖 / 0.9% 食鹽水 / 林格等）",
    finalNote: "輸注速率 ≤10 mg/min 且 ≥60 min（防紅人症/低血壓）",
  },
  polymyxinB: { // Bobimixyn（Polymyxin B）
    vial: "乾粉 500,000 units/Vial",
    reconstitution: "溶解後加入 300–500 mL 5% 葡萄糖或 0.9% 食鹽水",
    diluent: "5% 葡萄糖或 0.9% 食鹽水（連續輸注）",
    finalNote: "輸注 60–90 min；未開封 20–25℃、調製後 2–8℃ 冷藏 ≤72 hr（超過丟棄）",
  },
  amphotericinB: { // 三劑型分列（不可互換）
    products: [
      {
        name: "Fungizone（防治黴）",
        subtitle: "Amphotericin B deoxycholate",
        vial: "乾粉 50 mg/Vial",
        reconstitution: "加 10 mL 無菌注射用水（不含防腐劑）→ 5 mg/mL",
        diluent: "⚠️ 僅限 5% 葡萄糖稀釋至 0.1 mg/mL（禁食鹽水/含電解質，會析出）",
        finalNote: "避光；可先 test dose 1 mg in 20 mL D5W；給藥前 NS 水化降腎毒性；與 lipid/liposomal 劑型不可互換",
        infusionTime: "通常 ≥4 hr",
      },
      {
        name: "AmBisome（脂黴素）",
        subtitle: "Liposomal amphotericin B",
        vial: "凍晶 50 mg/Vial",
        reconstitution: "加 12 mL 無菌注射用水（不含抑菌劑）→ 4 mg/mL，用力搖 30 秒至完全分散",
        diluent: "經 ≥1.0 μm 濾膜，以 5% 葡萄糖稀釋至 1–2 mg/mL（幼兒 0.2–0.5）；⚠️ 勿用食鹽水",
        finalNote: "輸注約 120 min（耐受可減至 ~60 min）；勿與食鹽水/其他藥混合；與 Fungizone 不可互換（同 50 mg/vial 但 mg/kg 不同）",
        infusionTime: "約 120 min（耐受後可縮短）",
      },
      {
        name: "Ampholipad（安畢黴）",
        subtitle: "Amphotericin B liposome（微脂粒）",
        vial: "凍晶 50 mg/Vial（pH 5.0–6.0）",
        reconstitution: "以無菌注射用水配製成微脂粒懸液（體積詳依仿單，掃描檔細節有限）",
        diluent: "⚠️ 以 5% 葡萄糖稀釋；勿與食鹽水/電解質混合",
        finalNote: "液狀微脂粒；避光、25℃ 以下保存；輸注 >2 hr；與 Fungizone 不可互換",
        infusionTime: "> 2 hr",
      },
    ],
  },
};
