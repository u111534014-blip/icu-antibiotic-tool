import { useState, useEffect, useRef } from "react";

// ╔══════════════════════════════════════════════════════════════════╗
// ║  📚 共用劑量表（給多個適應症共用）                                ║
// ╚══════════════════════════════════════════════════════════════════╝

// Meropenem 1g Q8H 起始的 CrCl 調整表（依 UpToDate 2026）
const STANDARD_1G_TABLE = [
  { min: 50,  dose_mg: 1000, freq: "Q8H" },     // CrCl >50–<130
  { min: 25,  dose_mg: 1000, freq: "Q12H" },    // >25–≤50
  { min: 10,  dose_mg: 500,  freq: "Q12H" },    // 10–≤25
  { min: 0,   dose_mg: 500,  freq: "Q24H" },    // <10
];

// Meropenem 2g Q8H 起始的 CrCl 調整表
const STANDARD_2G_TABLE = [
  { min: 50,  dose_mg: 2000, freq: "Q8H" },
  { min: 25,  dose_mg: 2000, freq: "Q12H" },
  { min: 10,  dose_mg: 1000, freq: "Q12H" },
  { min: 0,   dose_mg: 1000, freq: "Q24H 或 500 mg Q12H" },
];

// Unasyn 標準 3 g Q6H 的 CrCl 調整表
const UNASYN_3G_TABLE = [
  { min: 30, dose_mg: 3000, freq: "Q6H" },
  { min: 15, dose_mg: 3000, freq: "Q12H" },
  { min: 0,  dose_mg: 3000, freq: "Q24H" },
];

// Unasyn 1.5 g Q6H 的 CrCl 調整表（吸入性肺炎、咬傷等）
const UNASYN_15_3G_TABLE = [
  { min: 30, dose_mg: 1500, freq: "Q6H" },
  { min: 15, dose_mg: 1500, freq: "Q12H" },
  { min: 0,  dose_mg: 1500, freq: "Q24H" },
];

// Unasyn MDR Acinetobacter 高劑量表（9 g Q8H over 4hr）
const UNASYN_MDR_AB_TABLE = [
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
const TAZO_3375_TABLE = [
  { min: 100, dose_mg: 3375, freq: "Q6H（建議改延長滴注）" },
  { min: 40,  dose_mg: 3375, freq: "Q6H" },
  { min: 20,  dose_mg: 2250, freq: "Q6H" },
  { min: 0,   dose_mg: 2250, freq: "Q8H" },
];

// 標準 4.5 g Q6H 起始
const TAZO_45_TABLE = [
  { min: 100, dose_mg: 4500, freq: "Q6H（建議改延長滴注）" },
  { min: 40,  dose_mg: 4500, freq: "Q6H" },
  { min: 20,  dose_mg: 4500, freq: "Q8H 或 3.375 g Q6H" },
  { min: 0,   dose_mg: 4500, freq: "Q12H 或 2.25 g Q6H" },
];

// ── Brosym (Cefoperazone/Sulbactam) 表 ────────────────────
// 廠商劑量：腎功能不論高低均 4 g Q12H
const BROSYM_STANDARD_TABLE = [
  { min: 0, dose_mg: 4000, freq: "Q12H" },
];

// CRAB 高劑量替代方案
const BROSYM_HIGH_TABLE = [
  { min: 0, dose_mg: 4000, freq: "Q8H" },
];

// ╔══════════════════════════════════════════════════════════════════╗
// ║  📦 藥物資料庫                                                  ║
// ║                                                                ║
// ║  命名慣例：                                                      ║
// ║  - name: 原廠商品名（如 Bactrim、Mepem、Cresemba）                ║
// ║  - subtitle: 學名（成分名）                                       ║
// ║  - searchTerms: 別名、院內品項、中文名（搜尋用）                    ║
// ╚══════════════════════════════════════════════════════════════════╝

const DRUG_REGISTRY = {

  // ═══════════════════════════════════════════════════════════════
  // Bactrim (Trimethoprim-sulfamethoxazole)
  // ═══════════════════════════════════════════════════════════════
  // 院內品項：
  //   IV: Sevatrim 注射劑（雪白淨）TMP 80 mg + SMX 400 mg / 5 mL/支
  //   PO: Morcasin 錠劑（孟克杏錠）TMP 80 mg + SMX 400 mg / 錠
  //       DS（double-strength）= 2 錠 Morcasin = TMP 160 mg + SMX 800 mg
  // 配藥（IV）：
  //   每支 5 mL 加入 D5W 75 / 100 / 125 mL（依濃度）
  //   標準 125 mL/支；限水 75 mL/支
  //   滴注時間 60–90 分鐘
  bactrim: {
    name: "Bactrim",
    subtitle: "Trimethoprim-sulfamethoxazole",
    needsRenal: true,
    needsWeight: true,
    needsHepatic: false,
    searchTerms: [
      "bactrim", "baktar", "septra", "co-trimoxazole",
      "trimethoprim", "sulfamethoxazole", "tmp-smx", "tmp/smx", "smx-tmp",
      "sevatrim", "雪白淨", "morcasin", "孟克杏",
      "PJP", "PCP",
    ],

    indications: [
      // ─── 一般感染（General） ───
      {
        id: "general",
        label: "一般劑量參考（General dosing）",
        desc: "未指定適應症時的標準劑量",
        scenarios: [
          {
            label: "標準口服 / 靜脈劑量",
            preferred: "PO",
            po: {
              fixedDose: "1–2 DS tab Q12–24H",
              detail: "DS tab = TMP 160 mg + SMX 800 mg（= 2 錠 Morcasin）",
            },
            iv: {
              dosePerKg: { min: 8, max: 20 },
              divisions: 2,
              freq: "Q6–12H",
            },
          },
        ],
      },

      // ─── PJP 治療與預防 ───
      {
        id: "pjp",
        label: "Pneumocystis pneumonia（PJP / PCP）",
        desc: "肺囊蟲肺炎",
        scenarios: [
          {
            label: "中重度感染：治療",
            note: "PaO₂ <70 mm Hg 或 A-a gradient ≥35 → 加上類固醇。療程 21 天",
            preferred: "IV",
            iv: {
              dosePerKg: { min: 15, max: 20 },
              divisions: 4,
              freq: "Q6H",
            },
            po: {
              fixedDose: "2 DS tab TID（PO 三次）",
              detail: "輕中度感染或 IV 改 PO；療程 21 天",
            },
          },
          {
            label: "初級或次級預防",
            note: "HIV：CD4 <200；移植後或免疫低下宿主皆適用",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab QD（首選）或 1 SS tab QD 或 1 DS tab 每週 3 次",
              detail: "DS = TMP 160 mg；SS = TMP 80 mg（= 1 錠 Morcasin）",
            },
          },
        ],
      },

      // ─── SSTI ───
      {
        id: "ssti",
        label: "Skin & Soft Tissue Infection（SSTI 皮膚軟組織感染）",
        desc: "膿瘍、蜂窩性組織炎等",
        scenarios: [
          {
            label: "Abscess（膿瘍）",
            note: "體重 >70 kg 建議採用較高劑量；療程 ≥5 天，依嚴重度可延長至 14 天",
            preferred: "PO",
            po: {
              fixedDose: "1–2 DS tab BID",
              detail: "DS tab = TMP 160 mg + SMX 800 mg（= 2 錠 Morcasin）",
            },
            iv: {
              dosePerKg: { min: 8, max: 10 },
              divisions: 2,
              freq: "Q12H",
            },
          },
          {
            label: "Cellulitis（蜂窩性組織炎，化膿性 / MRSA 風險）",
            note: "建議加上 beta-hemolytic streptococci 覆蓋（如 amoxicillin、cephalexin）",
            preferred: "PO",
            po: {
              fixedDose: "1–2 DS tab BID",
              detail: "DS tab = TMP 160 mg + SMX 800 mg（= 2 錠 Morcasin）",
            },
            iv: {
              dosePerKg: { min: 8, max: 10 },
              divisions: 2,
              freq: "Q12H",
            },
          },
          {
            label: "Cellulitis 長期抑制（Long-term suppression）",
            note: "復發性葡萄球菌 cellulitis 於完成治療後使用",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab QD–BID",
              detail: "DS tab = TMP 160 mg + SMX 800 mg",
            },
          },
          {
            label: "Impetigo / Ecthyma（膿痂疹，懷疑或確認 MRSA）",
            note: "膿痂疹病灶多或群聚感染才考慮全身治療；療程 7 天",
            preferred: "PO",
            po: {
              fixedDose: "1–2 DS tab BID × 7 天",
              detail: "DS tab = TMP 160 mg + SMX 800 mg",
            },
          },
        ],
      },

      // ─── UTI ───
      {
        id: "uti",
        label: "Urinary Tract Infection（UTI 泌尿道感染）",
        desc: "膀胱炎、腎盂腎炎等",
        scenarios: [
          {
            label: "Acute uncomplicated cystitis（急性單純性膀胱炎）",
            note: "若當地抗藥性 >20% 或多重抗藥性風險高，避免使用。女性 3 天，男性 7 天",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID",
              detail: "DS tab = TMP 160 mg + SMX 800 mg",
            },
          },
          {
            label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
            note: "症狀於 48 小時內改善者，總療程 5–7 天",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID",
              detail: "DS tab = TMP 160 mg + SMX 800 mg",
            },
          },
          {
            label: "Cystitis 預防（復發性感染）",
            note: "持續性預防或性交後預防",
            preferred: "PO",
            po: {
              fixedDose: "½ SS tab QD 或每週 3 次",
              detail: "SS tab = TMP 80 mg（= 1 錠 Morcasin）",
            },
          },
        ],
      },

      // ─── Stenotrophomonas maltophilia ───
      {
        id: "stenotrophomonas",
        label: "Stenotrophomonas maltophilia infection",
        desc: "嗜麥芽窄食單胞菌感染",
        scenarios: [
          {
            label: "Cystitis（單純性膀胱炎）",
            preferred: "PO",
            po: {
              fixedDose: "TMP 160 mg Q12H",
              detail: "= 1 DS tab BID",
            },
            iv: {
              dosePerKg: { min: 4, max: 4 },
              divisions: 2,
              freq: "Q12H",
            },
          },
          {
            label: "HAP / VAP / Bacteremia（醫院或呼吸器相關肺炎、菌血症）",
            note: "建議合併使用其他適當藥物。專家建議 max 960 mg/day（TMP）",
            preferred: "IV",
            iv: {
              dosePerKg: { min: 8, max: 15 },
              divisions: 3,
              freq: "Q8H",
            },
            po: {
              fixedDose: "2 DS tab BID",
              detail: "或 10–15 mg/kg/day 分 2–3 次",
            },
          },
        ],
      },

      // ─── Nocardiosis ───
      {
        id: "nocardiosis",
        label: "Nocardiosis（諾卡氏菌感染）",
        desc: "建議做藥敏試驗",
        scenarios: [
          {
            label: "皮膚或淋巴皮膚型感染",
            note: "無其他器官侵犯",
            preferred: "PO",
            po: {
              fixedDose: "5–10 mg/kg/day 分 2 次",
              detail: "依 TMP 計算",
            },
          },
          {
            label: "肺部感染（輕中度，免疫正常）",
            preferred: "PO",
            po: {
              fixedDose: "5–10 mg/kg/day 分 2 次",
              detail: "依 TMP 計算",
            },
          },
          {
            label: "肺部感染（輕中度，免疫低下）",
            preferred: "PO",
            po: {
              fixedDose: "15 mg/kg/day 分 3–4 次",
              detail: "依 TMP 計算",
            },
          },
          {
            label: "嚴重肺部感染 / CNS / 散播性 / 菌血症",
            note: "需合併用藥；療程通常 3 個月至 1 年以上",
            preferred: "IV",
            iv: {
              dosePerKg: { min: 15, max: 15 },
              divisions: 4,
              freq: "Q6H",
            },
          },
        ],
      },

      // ─── Toxoplasmosis ───
      {
        id: "toxoplasmosis",
        label: "Toxoplasma gondii encephalitis（弓形蟲腦炎）",
        desc: "治療與預防",
        scenarios: [
          {
            label: "治療",
            note: "至少 6 週；不完全反應時需延長",
            preferred: "PO",
            po: {
              fixedDose: "10 mg/kg/day 分 2 次",
              detail: "依 TMP 計算",
            },
            iv: {
              dosePerKg: { min: 10, max: 10 },
              divisions: 2,
              freq: "Q12H",
            },
          },
          {
            label: "次級預防（chronic maintenance）",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Bacterial meningitis ───
      {
        id: "meningitis",
        label: "Bacterial meningitis（細菌性腦膜炎）",
        desc: "MRSA、Listeria、E. coli、其他腸桿菌科",
        scenarios: [
          {
            label: "MRSA / Listeria / 其他敏感菌",
            preferred: "IV",
            iv: {
              dosePerKg: { min: 5, max: 5 },
              divisions: 4,
              freq: "Q6–8H",
            },
          },
        ],
      },

      // ─── Intracranial / spinal epidural abscess ───
      {
        id: "cnsAbscess",
        label: "Intracranial / Spinal epidural abscess（顱內或脊髓硬膜外膿瘍）",
        desc: "MRSA 替代藥物",
        scenarios: [
          {
            label: "MRSA 顱內或脊髓硬膜外膿瘍",
            note: "療程 4–8 週（脊髓硬膜外）或 6–8 週（腦部）",
            preferred: "IV",
            iv: {
              dosePerKg: { min: 5, max: 5 },
              divisions: 3,
              freq: "Q8–12H",
            },
          },
        ],
      },

      // ─── Endocarditis ───
      {
        id: "endocarditis",
        label: "Endocarditis（心內膜炎）",
        desc: "S. aureus 口服降階治療",
        scenarios: [
          {
            label: "S. aureus 心內膜炎（口服降階）",
            note: "資料有限；非首選。MRSA 或對 penicillin 過敏的 MSSA。連同初期 IV 療程共 6 週",
            preferred: "PO",
            po: {
              fixedDose: "2 DS tab BID × 6 週",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Osteomyelitis ───
      {
        id: "osteomyelitis",
        label: "Osteomyelitis / Discitis（骨髓炎 / 椎間盤炎）",
        desc: "MRSA 或革蘭氏陰性菌",
        scenarios: [
          {
            label: "Gram-negative 感染",
            preferred: "PO",
            po: {
              fixedDose: "1–2 DS tab BID",
              detail: "DS tab = TMP 160 mg",
            },
          },
          {
            label: "MRSA 感染",
            note: "建議合併 rifampin。療程通常 6 週",
            preferred: "PO",
            po: {
              fixedDose: "5–10 mg/kg/day 分 2–3 次（依 TMP）",
              detail: "或 7–12 mg/kg/day 分 2–3 次",
            },
            iv: {
              dosePerKg: { min: 5, max: 10 },
              divisions: 3,
              freq: "Q8H",
            },
          },
        ],
      },

      // ─── Septic arthritis ───
      {
        id: "septicArthritis",
        label: "Septic arthritis（化膿性關節炎）",
        desc: "MRSA 治療或 MSSA 替代藥物",
        scenarios: [
          {
            label: "MRSA / MSSA",
            note: "口服降階療法。療程 3–4 週",
            preferred: "PO",
            po: {
              fixedDose: "2 DS tab BID 或 4 mg/kg BID（max 320 mg/dose）",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Prosthetic joint infection ───
      {
        id: "pji",
        label: "Prosthetic joint infection（人工關節感染）",
        desc: "MRSA / Enterobacteriaceae 口服續用",
        scenarios: [
          {
            label: "口服延續治療",
            note: "S. aureus 感染建議合併 rifampin。最少 3 個月",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Prostatitis ───
      {
        id: "prostatitis",
        label: "Prostatitis（前列腺炎）",
        desc: "急性 / 慢性",
        scenarios: [
          {
            label: "Acute bacterial prostatitis",
            note: "療程 2–4 週",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID",
              detail: "DS tab = TMP 160 mg",
            },
          },
          {
            label: "Chronic bacterial prostatitis",
            note: "療程 4–6 週",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Diabetic foot infection ───
      {
        id: "diabeticFoot",
        label: "Diabetic foot infection（糖尿病足感染）",
        desc: "輕中度感染、MRSA 風險",
        scenarios: [
          {
            label: "輕中度糖尿病足感染",
            note: "可作為 empiric 或致病菌導向治療（含 MRSA）；常合併用藥。皮膚軟組織為主療程 1–2 週",
            preferred: "PO",
            po: {
              fixedDose: "1–2 DS tab BID",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Intra-abdominal infection ───
      {
        id: "iai",
        label: "Intra-abdominal infection（腹腔內感染）",
        desc: "急性憩室炎等",
        scenarios: [
          {
            label: "Acute diverticulitis（門診治療或降階）",
            note: "需合併 metronidazole；療程 4–14 天",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID + Metronidazole",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── COPD acute exacerbation ───
      {
        id: "copd",
        label: "COPD acute exacerbation（COPD 急性惡化）",
        desc: "替代藥物",
        scenarios: [
          {
            label: "COPD 急性惡化",
            note: "Pseudomonas 風險或預後不良者避免使用。療程 5–7 天",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab Q12H × 5–7 天",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Mastitis ───
      {
        id: "mastitis",
        label: "Mastitis, lactational（哺乳期乳腺炎）",
        desc: "MRSA 風險",
        scenarios: [
          {
            label: "哺乳期乳腺炎",
            note: "用於無法使用首選藥物或 MRSA 風險者。療程 10–14 天",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID × 10–14 天",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── SBP prophylaxis ───
      {
        id: "sbpProphylaxis",
        label: "SBP prophylaxis（自發性細菌性腹膜炎預防）",
        desc: "次級或初級預防",
        scenarios: [
          {
            label: "預防",
            note: "肝硬化合併急性 GI 出血或 ascites protein <1 g/dL 等高風險者",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab QD",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Cyclosporiasis / Cystoisosporiasis ───
      {
        id: "cyclosporiasis",
        label: "Cyclosporiasis / Cystoisosporiasis（環孢子蟲症 / 等孢子蟲症）",
        desc: "感染性腹瀉",
        scenarios: [
          {
            label: "Cyclosporiasis 治療",
            note: "療程 7–10 天；HIV 病人 14 天；移植病人 10 天",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID",
              detail: "DS tab = TMP 160 mg",
            },
          },
          {
            label: "Cystoisosporiasis 治療",
            note: "免疫正常 7–10 天；免疫低下需更長療程",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID 或 TMP 160 mg QID",
              detail: "嚴重時可增至 QID 或延長至 21–28 天",
            },
            iv: {
              dosePerKg: { min: 8, max: 8 },
              divisions: 4,
              freq: "Q6H",
            },
          },
        ],
      },

      // ─── Salmonella / Shigella ───
      {
        id: "salmonellaShigella",
        label: "Salmonella / Shigella infection（沙門氏 / 志賀氏菌感染）",
        desc: "胃腸炎、菌血症",
        scenarios: [
          {
            label: "Nontyphoidal Salmonella（嚴重或高風險）",
            note: "免疫正常 10–14 天；HIV 14 天以上",
            preferred: "IV",
            iv: {
              dosePerKg: { min: 8, max: 10 },
              divisions: 3,
              freq: "Q8H",
            },
            po: {
              fixedDose: "1 DS tab Q12H",
              detail: "DS tab = TMP 160 mg",
            },
          },
          {
            label: "Shigellosis",
            note: "建議先確認藥敏；療程 5–7 天",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab Q12H",
              detail: "DS tab = TMP 160 mg",
            },
            iv: {
              dosePerKg: { min: 4, max: 4 },
              divisions: 2,
              freq: "Q12H",
            },
          },
        ],
      },

      // ─── Q fever ───
      {
        id: "qFever",
        label: "Q fever, acute（Q 熱急性症狀，孕婦替代）",
        desc: "Coxiella burnetii",
        scenarios: [
          {
            label: "急性 Q 熱",
            note: "症狀 3 天內治療最有效。非孕婦療程 14 天；孕婦請諮詢感染科",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID × 14 天",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Plague ───
      {
        id: "plague",
        label: "Plague（鼠疫，Yersinia pestis）",
        desc: "替代藥物",
        scenarios: [
          {
            label: "暴露後預防",
            note: "療程 7 天",
            preferred: "PO",
            po: {
              fixedDose: "5 mg/kg/dose Q12H × 7 天",
              detail: "依 TMP 計算",
            },
          },
          {
            label: "治療",
            note: "療程 7–14 天，臨床改善後再多幾天",
            preferred: "IV",
            iv: {
              dosePerKg: { min: 5, max: 5 },
              divisions: 3,
              freq: "Q8H",
            },
            po: {
              fixedDose: "5 mg/kg Q8H",
              detail: "依 TMP 計算",
            },
          },
        ],
      },

      // ─── Brucellosis ───
      {
        id: "brucellosis",
        label: "Brucellosis（布氏桿菌病）",
        desc: "替代藥物（孕婦首選）",
        scenarios: [
          {
            label: "Neurobrucellosis / Endocarditis",
            note: "≥12 週（可能需 6 個月）。需合併用藥",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID",
              detail: "DS tab = TMP 160 mg",
            },
          },
          {
            label: "Uncomplicated brucellosis",
            note: "需合併用藥。療程 6 週",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID × 6 週",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Melioidosis ───
      {
        id: "melioidosis",
        label: "Melioidosis / Glanders（類鼻疽 / 鼻疽）",
        desc: "Burkholderia pseudomallei / B. mallei",
        scenarios: [
          {
            label: "Initial intensive therapy（依體重調整）",
            note: "與 ceftazidime 或 meropenem 合併，14 天起跳",
            preferred: "PO",
            po: {
              fixedDose: "<40 kg：160 mg Q12H｜40–60 kg：240 mg Q12H｜>60 kg：320 mg Q12H",
              detail: "依 TMP 計算",
            },
          },
          {
            label: "Eradication therapy（完成 intensive 後）",
            note: "口服維持治療。最少 3 個月（骨頭或 CNS 為 6 個月）",
            preferred: "PO",
            po: {
              fixedDose: "<40 kg：160 mg Q12H｜40–60 kg：240 mg Q12H｜>60 kg：320 mg Q12H",
              detail: "依 TMP 計算",
            },
          },
        ],
      },

      // ─── Bartonella ───
      {
        id: "bartonella",
        label: "Bartonella spp. infection（巴東體菌感染）",
        desc: "貓抓病等",
        scenarios: [
          {
            label: "Cat scratch disease, lymphadenitis（貓抓病淋巴炎）",
            note: "療程 7–10 天",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID × 7–10 天",
              detail: "DS tab = TMP 160 mg",
            },
          },
          {
            label: "Cat scratch disease, disseminated（CNS、視網膜炎）",
            note: "需合併 rifampin。CNS 10–14 天；視網膜炎 4–6 週",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID",
              detail: "DS tab = TMP 160 mg",
            },
            iv: {
              dosePerKg: { min: 4, max: 4 },
              divisions: 2,
              freq: "Q12H",
            },
          },
        ],
      },

      // ─── Bite wound ───
      {
        id: "biteWound",
        label: "Bite wound infection（動物或人類咬傷）",
        desc: "預防或治療（替代藥物）",
        scenarios: [
          {
            label: "咬傷預防或治療",
            note: "需合併厭氧菌覆蓋。預防 3–5 天；感染 5–14 天",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab BID + 厭氧菌覆蓋",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },

      // ─── Surgical prophylaxis ───
      {
        id: "surgicalProphylaxis",
        label: "Surgical prophylaxis（外科預防）",
        desc: "高風險泌尿外科操作",
        scenarios: [
          {
            label: "高風險膀胱鏡 / 經直腸前列腺切片",
            note: "手術切口前 60–120 分鐘給藥",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab × 1（術前 60–120 分鐘）",
              detail: "DS tab = TMP 160 mg",
            },
          },
        ],
      },
    ],

    extraFields: [
      { key: "waterLimit", type: "toggle", label: "限水病人", default: false },
    ],

    calculate({ dosing_weight, crcl, rrt, indicationData, extras }) {
      let hasIV = false;

      const scenarioResults = indicationData.scenarios.map(sc => {
        const result = {
          title: sc.label,
          note: sc.note,
          preferred: sc.preferred,
          subResults: [],
        };

        // ── PO ──
        if (sc.po) {
          result.subResults.push({
            route: "PO",
            isPreferred: sc.preferred === "PO",
            rows: [
              { label: "建議劑量", value: sc.po.fixedDose, highlight: true },
              ...(sc.po.detail ? [{ label: "品項說明", value: sc.po.detail }] : []),
            ],
          });
        }

        // ── IV ──
        if (sc.iv) {
          hasIV = true;
          let freq = sc.iv.freq;
          const ivWarnings = [];

          let s_min = (dosing_weight * sc.iv.dosePerKg.min) / sc.iv.divisions;
          let s_max = (dosing_weight * sc.iv.dosePerKg.max) / sc.iv.divisions;

          if (rrt === "hd") {
            s_min /= 2; s_max /= 2;
            freq = "Q24H（透析後）";
            ivWarnings.push("HD 病人建議劑量減半");
          } else if (rrt === "cvvh") {
            s_min /= 2; s_max /= 2;
            freq = "Q12H";
            ivWarnings.push("CVVH 建議維持 Q12H");
          } else if (rrt === "pd") {
            s_min /= 2; s_max /= 2;
            freq = "Q24H";
            ivWarnings.push("PD 病人建議比照 CrCl <15 處理（劑量減半）");
          } else {
            if (crcl < 15) {
              s_min /= 2; s_max /= 2;
              freq = "Q24H";
              ivWarnings.push("CrCl < 15 建議減半並 Q24H");
            } else if (crcl <= 30) {
              s_min /= 2; s_max /= 2;
              ivWarnings.push("CrCl 15–30 建議劑量減半");
            }
          }

          const amp_min = round2(s_min / 80);
          const amp_max = round2(s_max / 80);

          result.subResults.push({
            route: "IV",
            isPreferred: sc.preferred === "IV",
            rows: [
              { label: "建議單次劑量", value: `TMP ${round1(s_min)} – ${round1(s_max)} mg`, highlight: true },
              { label: "給藥頻率", value: freq, highlight: true },
              { label: "建議抽藥支數", value: `${amp_min} – ${amp_max} 支（Sevatrim）` },
            ],
            warnings: ivWarnings,
          });
        }

        return result;
      });

      const pharmacistInput = hasIV ? {
        label: "💉 藥師決定給予支數（IV 配藥用）",
        placeholder: "例：2 或 2.5",
        suffix: "支",
        calcDilution(ampules) {
          const a = parseFloat(ampules);
          if (!a || a <= 0) return null;
          const vol = extras.waterLimit ? a * 75 : a * 125;
          return {
            text: `請抽取 ${a} 支 Sevatrim，加入 ${Math.round(vol)} mL D5W`,
            note: extras.waterLimit ? "（限水配方：75 mL/支）" : "（標準配方：125 mL/支）",
          };
        },
      } : null;

      return { scenarioResults, pharmacistInput };
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // Mepem (Meropenem)
  // ═══════════════════════════════════════════════════════════════
  // 院內品項：麥羅乾粉注射劑 500 mg/Vial
  //
  // 給藥方法：
  //   - Traditional intermittent infusion: 30 分鐘
  //   - Extended infusion (off-label): 3 小時，重症或抗藥性首選
  //   - Continuous infusion (off-label): 8 或 12 小時
  //
  // 肥胖：BMI ≥30 使用 AdjBW 計算 CrCl（CG 公式）
  // 肝功能：Child-Pugh A–C 都不需調整
  mepem: {
    name: "Mepem",
    subtitle: "Meropenem",
    needsRenal: true,
    needsWeight: true,
    needsHepatic: false,
    searchTerms: [
      "mepem", "meropenem", "carbapenem",
      "麥羅", "美平",
    ],

    indications: [
      {
        id: "iai",
        label: "Intra-abdominal infection（腹腔內感染）",
        desc: "院內或高風險社區型；ESBL 風險",
        scenarios: [
          {
            label: "Acute uncomplicated cholecystitis（急性單純膽囊炎）",
            note: "膽囊切除後再給 1 天或保守治療直至臨床改善",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
          {
            label: "其他 IAI（膽管炎、複雜性膽囊炎、闌尾炎、憩室炎、腹腔內膿瘍）",
            note: "Source control 後總療程 4–5 天；穿孔性闌尾炎術後 2–4 天可能足夠",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
        ],
      },
      {
        id: "bsi",
        label: "Bloodstream infection（菌血症）",
        desc: "Gram-negative，含 P. aeruginosa",
        scenarios: [
          {
            label: "革蘭氏陰性菌血症",
            note: "重症或 MIC 偏高時可考慮 2 g Q8H 與延長/連續滴注。療程 7–14 天；ANC <500 延長至中性球恢復",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
        ],
      },
      {
        id: "pneumonia",
        label: "Pneumonia（肺炎）",
        desc: "CAP / HAP / VAP",
        scenarios: [
          {
            label: "Community-acquired pneumonia（CAP）",
            note: "需合併其他適當藥物。最少 5 天；P. aeruginosa 或重症需更長療程",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
          {
            label: "Hospital-acquired / Ventilator-associated pneumonia（HAP / VAP）",
            note: "MDR 革蘭氏陰性菌（P. aeruginosa、Acinetobacter、ESBL）。療程通常 7 天；重症建議延長/連續滴注",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
        ],
      },
      {
        id: "meningitis",
        label: "Meningitis, bacterial（細菌性腦膜炎）",
        desc: "院內感染、免疫低下、抗藥性 GNB",
        scenarios: [
          {
            label: "細菌性腦膜炎",
            note: "療程 7–21 天；GNB 至少 10–14 天，部分專家建議 21 天。抗藥菌建議延長/連續滴注",
            preferred: "IV",
            crclTable: STANDARD_2G_TABLE,
            hdDose: { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "2 g Q8H",
          },
        ],
      },
      {
        id: "cnsAbscess",
        label: "Intracranial / Spinal epidural abscess",
        desc: "顱內或脊髓硬膜外膿瘍",
        scenarios: [
          {
            label: "顱內或脊髓硬膜外膿瘍",
            note: "需合併用藥。脊髓 4–8 週；腦部 6–8 週",
            preferred: "IV",
            crclTable: STANDARD_2G_TABLE,
            hdDose: { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "2 g Q8H",
          },
        ],
      },
      {
        id: "sepsis",
        label: "Sepsis / Septic shock",
        desc: "敗血症 / 敗血性休克",
        scenarios: [
          {
            label: "敗血症 / 敗血性休克",
            note: "識別後盡速給藥，需合併其他適當藥物。重症首選延長/連續滴注",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1–2 g Q8H",
          },
        ],
      },
      {
        id: "neutropenicFever",
        label: "Neutropenic fever, high-risk（高風險發熱性嗜中性球低下）",
        desc: "癌症病人 empiric therapy",
        scenarios: [
          {
            label: "高風險嗜中性球低下發燒",
            note: "持續至退燒 ≥48 小時且 ANC ≥500 並回升。重症首選延長/連續滴注",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
        ],
      },
      {
        id: "ssti",
        label: "Skin & Soft Tissue Infection, moderate to severe",
        desc: "中重度皮膚軟組織感染",
        scenarios: [
          {
            label: "中重度 SSTI",
            note: "壞死性感染、術後感染、MDR 病原（含 P. aeruginosa）。療程 5–14 天；壞死性感染至無需 debridement",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
        ],
      },
      {
        id: "uti",
        label: "Complicated UTI / Pyelonephritis",
        desc: "複雜性 UTI / 腎盂腎炎",
        scenarios: [
          {
            label: "複雜性 UTI",
            note: "保留給重症或 MDR 風險（含 ESBL）。48 小時內改善者總療程 5–7 天",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1–2 g Q8H",
          },
        ],
      },
      {
        id: "diabeticFoot",
        label: "Diabetic foot infection, moderate to severe（糖尿病足）",
        desc: "P. aeruginosa 風險",
        scenarios: [
          {
            label: "中重度糖尿病足感染",
            note: "療程通常 2–4 週（無骨髓炎時）",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
        ],
      },
      {
        id: "osteomyelitis",
        label: "Osteomyelitis / Discitis（骨髓炎 / 椎間盤炎）",
        desc: "",
        scenarios: [
          {
            label: "骨髓炎 / 椎間盤炎",
            note: "Empiric 用合併治療。療程通常 6 週，可考慮 IV 後改口服",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
        ],
      },
      {
        id: "pji",
        label: "Prosthetic joint infection（人工關節感染）",
        desc: "MDR 革蘭氏陰性菌",
        scenarios: [
          {
            label: "人工關節感染（MDR GNB 致病菌導向）",
            note: "Resection arthroplasty 病人通常 4–6 週",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
        ],
      },
      {
        id: "cysticFibrosis",
        label: "Cystic fibrosis, pulmonary exacerbation",
        desc: "囊狀纖維化急性肺部惡化",
        scenarios: [
          {
            label: "CF 急性肺部惡化",
            note: "通常合併治療。療程 10–14 天。建議延長/連續滴注",
            preferred: "IV",
            crclTable: STANDARD_2G_TABLE,
            hdDose: { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "2 g Q8H",
          },
        ],
      },
      {
        id: "sbp",
        label: "Spontaneous bacterial peritonitis（SBP）",
        desc: "重症或 MDR 風險",
        scenarios: [
          {
            label: "SBP",
            note: "療程 5–7 天，需發燒與疼痛緩解",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H",
          },
        ],
      },
      {
        id: "anthrax",
        label: "Anthrax, systemic（炭疽，全身性）",
        desc: "含腦膜炎",
        scenarios: [
          {
            label: "全身性炭疽（含腦膜炎）",
            note: "需合併用藥。≥2 週，腦膜炎建議 IV 合併療程 ≥3 週。氣溶膠暴露需總療程 60 天",
            preferred: "IV",
            crclTable: STANDARD_2G_TABLE,
            hdDose: { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "2 g Q8H",
          },
        ],
      },
      {
        id: "melioidosis",
        label: "Melioidosis / Glanders（類鼻疽 / 鼻疽）",
        desc: "Initial intensive therapy",
        scenarios: [
          {
            label: "類鼻疽 / 鼻疽 — 初期密集治療",
            note: "至少 14 天；CNS 受侵犯時用 2 g Q8H。完成後接續口服 ≥12 週 eradication",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1 g Q8H（CNS：2 g Q8H）",
          },
        ],
      },
      {
        id: "nocardiosis",
        label: "Nocardiosis, severe（嚴重諾卡氏菌感染）",
        desc: "替代藥物",
        scenarios: [
          {
            label: "嚴重諾卡氏菌感染",
            note: "需合併用藥；建議感染科會診。療程 6 個月至 ≥1 年",
            preferred: "IV",
            crclTable: STANDARD_1G_TABLE,
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
            usualDoseLabel: "1–2 g Q8H",
          },
        ],
      },
    ],

    extraFields: [],

    calculate({ crcl, rrt, indicationData }) {
      const scenarioResults = indicationData.scenarios.map(sc => {
        let dose_mg, freq, note;

        if (rrt === "hd") {
          ({ dose_mg, freq } = sc.hdDose);
          note = "HD 模式";
        } else if (rrt === "pd") {
          ({ dose_mg, freq } = sc.hdDose);    // PD 與 HD 相同建議
          note = "PD 模式（建議同 HD）";
        } else if (rrt === "cvvh") {
          ({ dose_mg, freq } = sc.cvvhDose);
          note = "CVVH / CVVHDF 模式";
        } else {
          const match = sc.crclTable.find(row => crcl >= row.min);
          dose_mg = match.dose_mg;
          freq = match.freq;
          note = "依 CrCl 調整";
        }

        const vials = Math.ceil(dose_mg / 500);
        const dose_str = dose_mg >= 1000 ? `${dose_mg / 1000} g` : `${dose_mg} mg`;

        const rows = [
          { label: "適應症常規劑量", value: sc.usualDoseLabel },
          { label: "建議劑量", value: `${dose_str} IV`, highlight: true },
          { label: "給藥頻率", value: freq, highlight: true },
          { label: "每次取藥", value: `${vials} 支麥羅（每支 500 mg）` },
          { label: "調整依據", value: note },
        ];

        // ARC 警示
        if (rrt === "none" && crcl >= 130) {
          rows.push({ label: "⚠️ ARC", value: "CrCl ≥130：可能需更高劑量或延長/連續滴注" });
        }

        return {
          title: sc.label,
          subResults: [{
            route: "IV",
            isPreferred: true,
            rows,
          }],
        };
      });

      return {
        scenarioResults,
        infoBox: {
          text: "🕒 建議採用延長滴注（Extended Infusion）3 小時：重症、抗藥性病原或 ARC 病人首選",
          bg: "#EFF6FF", border: "#93C5FD", color: "#1E40AF",
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // Cresemba (Isavuconazole)
  // ═══════════════════════════════════════════════════════════════
  // 注意：劑量以 isavuconazonium sulfate 表示
  //   372 mg isavuconazonium sulfate = 200 mg isavuconazole
  cresemba: {
    name: "Cresemba",
    subtitle: "Isavuconazole",
    needsRenal: false,
    needsWeight: false,
    needsHepatic: false,
    searchTerms: [
      "cresemba", "isavuconazole", "isavuconazonium",
      "黴菌", "aspergillus", "mucor", "antifungal", "azole",
    ],

    indications: [
      {
        id: "aspergillosis",
        label: "Aspergillosis, invasive（侵襲性麴菌病）",
        desc: "Loading 與 Maintenance",
        scenarios: [
          {
            label: "Loading Dose（負荷劑量）",
            note: "靜脈滴注時間至少 1 小時，輸液套管須帶 inline filter（孔徑 0.2–1.2 μm）",
            preferred: "IV",
            po: {
              fixedDose: "372 mg（isavuconazole 200 mg）Q8H × 6 劑",
              detail: "= 2 顆膠囊 Q8H × 48 小時",
            },
            iv: {
              custom: true,
              fixedDose: "372 mg（isavuconazole 200 mg）IV Q8H × 6 劑",
              detail: "歷時 48 小時",
            },
          },
          {
            label: "Maintenance Dose（維持劑量）",
            note: "請於最後一劑 Loading dose 給完後 12–24 小時開始給予。口服生體可用率約 98%，因此兩種劑型互相轉換時不需重新給予起始劑量或調整劑量",
            preferred: "IV",
            po: {
              fixedDose: "372 mg（isavuconazole 200 mg）QD",
              detail: "= 2 顆膠囊 QD",
            },
            iv: {
              custom: true,
              fixedDose: "372 mg（isavuconazole 200 mg）IV QD",
              detail: "靜脈滴注同 Loading dose 注意事項",
            },
          },
        ],
      },
      {
        id: "mucormycosis",
        label: "Mucormycosis, invasive（侵襲性毛黴菌病）",
        desc: "Loading 與 Maintenance",
        scenarios: [
          {
            label: "Loading Dose",
            preferred: "IV",
            po: {
              fixedDose: "372 mg（isavuconazole 200 mg）Q8H × 6 劑",
              detail: "= 2 顆膠囊 Q8H × 48 小時",
            },
            iv: {
              custom: true,
              fixedDose: "372 mg（isavuconazole 200 mg）IV Q8H × 6 劑",
              detail: "歷時 48 小時",
            },
          },
          {
            label: "Maintenance",
            note: "Loading 完成 12–24 小時後開始；劑型可互換無需重新 loading",
            preferred: "IV",
            po: {
              fixedDose: "372 mg（isavuconazole 200 mg）QD",
              detail: "= 2 顆膠囊 QD",
            },
            iv: {
              custom: true,
              fixedDose: "372 mg（isavuconazole 200 mg）IV QD",
            },
          },
        ],
      },
      {
        id: "candidiasis",
        label: "Candidiasis, esophageal（食道念珠菌症）",
        desc: "Fluconazole 抗藥性的替代藥物",
        scenarios: [
          {
            label: "食道念珠菌症（fluconazole 抗藥）",
            note: "療程 14–28 天",
            preferred: "PO",
            po: {
              fixedDose: "744 mg loading（400 mg），再 186 mg（100 mg）QD",
              detail: "或 744 mg（400 mg）每週 1 次 × 4 週",
            },
          },
        ],
      },
      {
        id: "cryptococcal",
        label: "Cryptococcal meningitis（隱球菌腦膜炎）",
        desc: "Consolidation 與 Maintenance",
        scenarios: [
          {
            label: "Consolidation",
            note: "療程 8 週",
            preferred: "PO",
            po: {
              fixedDose: "372 mg（isavuconazole 200 mg）QD × 8 週",
              detail: "= 2 顆膠囊 QD",
            },
          },
          {
            label: "Maintenance（suppression）",
            note: "依免疫狀態約持續 12 個月",
            preferred: "PO",
            po: {
              fixedDose: "372 mg（isavuconazole 200 mg）QD",
              detail: "= 2 顆膠囊 QD",
            },
          },
        ],
      },
      {
        id: "antifungalProphylaxis",
        label: "Antifungal prophylaxis（抗黴菌預防）",
        desc: "血液惡性疾病或造血幹細胞移植",
        scenarios: [
          {
            label: "Loading Dose",
            preferred: "IV",
            po: {
              fixedDose: "372 mg（isavuconazole 200 mg）Q8H × 6 劑",
              detail: "= 2 顆膠囊 Q8H × 48 小時",
            },
            iv: {
              custom: true,
              fixedDose: "372 mg（isavuconazole 200 mg）IV Q8H × 6 劑",
            },
          },
          {
            label: "Maintenance",
            note: "依免疫抑制程度與時間決定療程",
            preferred: "IV",
            po: {
              fixedDose: "372 mg（isavuconazole 200 mg）QD",
              detail: "= 2 顆膠囊 QD",
            },
            iv: {
              custom: true,
              fixedDose: "372 mg（isavuconazole 200 mg）IV QD",
            },
          },
        ],
      },
    ],

    extraFields: [],

    calculate({ indicationData }) {
      const scenarioResults = indicationData.scenarios.map(sc => {
        const result = {
          title: sc.label,
          note: sc.note,
          preferred: sc.preferred,
          subResults: [],
        };

        if (sc.iv) {
          result.subResults.push({
            route: "IV",
            isPreferred: sc.preferred === "IV",
            rows: [
              { label: "建議劑量", value: sc.iv.fixedDose, highlight: true },
              ...(sc.iv.detail ? [{ label: "說明", value: sc.iv.detail }] : []),
            ],
          });
        }

        if (sc.po) {
          result.subResults.push({
            route: "PO",
            isPreferred: sc.preferred === "PO",
            rows: [
              { label: "建議劑量", value: sc.po.fixedDose, highlight: true },
              ...(sc.po.detail ? [{ label: "品項說明", value: sc.po.detail }] : []),
            ],
          });
        }

        return result;
      });

      return {
        scenarioResults,
        infoBox: {
          text: "💡 無需依據腎功能（含 HD/CVVH）或輕中度肝功能不全調整劑量",
          bg: "#F0FDF4", border: "#86EFAC", color: "#166534",
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // Tygacil (Tigecycline)
  // ═══════════════════════════════════════════════════════════════
  // 院內品項：老虎黴素凍晶注射劑 50 mg/Vial
  //
  // ⚠️ FDA Black Box Warning：使用 Tygacil 治療可能增加死亡率風險
  //    保留用於無其他替代治療時
  //
  // 腎功能：完全不需調整（含 HD / PD / CRRT / PIRRT）
  // 肝功能：
  //   - Child-Pugh A、B：不調整
  //   - Child-Pugh C：維持劑量改 50%（loading dose 不變）
  //   - 例外：Mycobacterial（NTM）感染即使 Child-Pugh C 也不調整
  tygacil: {
    name: "Tygacil",
    subtitle: "Tigecycline",
    needsRenal: false,
    needsWeight: false,
    needsHepatic: true,
    searchTerms: [
      "tygacil", "tigecycline", "glycylcycline",
      "老虎黴素", "老虎黴",
    ],

    indications: [
      {
        id: "mdrAcinetobacter",
        label: "Acinetobacter baumannii, MDR（多重抗藥鮑氏不動桿菌）",
        desc: "替代藥物",
        scenarios: [
          {
            label: "MDR Acinetobacter baumannii 感染",
            note: "不建議用於 UTI（尿中濃度不足）。需合併用藥",
            preferred: "IV",
            iv: {
              custom: true,
              loading_mg: 200,
              maintenance_mg: 100,
              freq: "Q12H",
            },
          },
        ],
      },
      {
        id: "iai",
        label: "Intra-abdominal infection（IAI 腹腔內感染）",
        desc: "MDR 風險（CRE、CRAB）時的替代",
        scenarios: [
          {
            label: "標準劑量",
            note: "Source control 後總療程 4–5 天",
            preferred: "IV",
            iv: {
              custom: true,
              loading_mg: 100,
              maintenance_mg: 50,
              freq: "Q12H",
            },
          },
          {
            label: "高劑量（抗藥菌感染）",
            note: "部分專家建議用於抗藥菌感染。可作為合併療法的一部分",
            preferred: "IV",
            iv: {
              custom: true,
              loading_mg: 200,
              maintenance_mg: 100,
              freq: "Q12H",
            },
          },
        ],
      },
      {
        id: "ntm",
        label: "Mycobacterial infection, NTM（非結核分枝桿菌）",
        desc: "Rapidly growing NTM",
        // 特例：Child-Pugh C 也不調整
        hepaticOverride: "noAdjust",
        scenarios: [
          {
            label: "NTM 感染",
            note: "需感染科或專家處理。需合併用藥。部分專家給 100 mg loading dose",
            preferred: "IV",
            iv: {
              custom: true,
              loading_mg: 0,           // 標準不需 loading
              maintenance_mg: 50,      // 25–50 mg QD 或 BID
              freq: "QD 或 BID",
              fixedDoseText: "25–50 mg QD 或 BID（部分專家先給 100 mg loading × 1）",
            },
          },
        ],
      },
      {
        id: "cap",
        label: "Pneumonia, community acquired（CAP 社區型肺炎）",
        desc: "無 P. aeruginosa 風險的住院病人",
        scenarios: [
          {
            label: "CAP（無 Pseudomonas 風險）",
            note: "替代藥物，給無法耐受 beta-lactam 或 fluoroquinolone 者。最少 5 天且臨床穩定",
            preferred: "IV",
            iv: {
              custom: true,
              loading_mg: 100,
              maintenance_mg: 50,
              freq: "Q12H",
            },
          },
        ],
      },
      {
        id: "cssti",
        label: "cSSTI（複雜性皮膚軟組織感染）",
        desc: "MDR 風險時的替代",
        scenarios: [
          {
            label: "複雜性皮膚軟組織感染",
            note: "療程 5–14 天",
            preferred: "IV",
            iv: {
              custom: true,
              loading_mg: 100,
              maintenance_mg: 50,
              freq: "Q12H",
            },
          },
        ],
      },
      {
        id: "stenotrophomonas",
        label: "Stenotrophomonas maltophilia, MDR",
        desc: "嗜麥芽窄食單胞菌（多重抗藥）",
        scenarios: [
          {
            label: "MDR S. maltophilia 感染",
            note: "不建議用於 UTI（尿中濃度不足）。需合併用藥",
            preferred: "IV",
            iv: {
              custom: true,
              loading_mg: 200,
              maintenance_mg: 100,
              freq: "Q12H",
            },
          },
        ],
      },
    ],

    extraFields: [],

    calculate({ indicationData, hepatic }) {
      const scenarioResults = indicationData.scenarios.map(sc => {
        const scWarnings = [];
        let loading = sc.iv.loading_mg;
        let maintenance = sc.iv.maintenance_mg;
        const freq = sc.iv.freq;
        let note = "Child-Pugh A 或 B：無需調整";

        // Mycobacterial 例外：Child-Pugh C 也不調整
        const isException = indicationData.hepaticOverride === "noAdjust";

        if (hepatic === "C" && !isException) {
          maintenance = Math.round(sc.iv.maintenance_mg / 2);
          note = "Child-Pugh C：維持劑量減半（Loading dose 不變）";
          scWarnings.push("Child-Pugh C：clearance 降低約 55%；維持劑量減半");
        } else if (hepatic === "C" && isException) {
          note = "Child-Pugh C：NTM 感染無需調整";
        }

        const rows = [];
        if (sc.iv.fixedDoseText) {
          rows.push({ label: "建議劑量", value: sc.iv.fixedDoseText, highlight: true });
        } else {
          if (loading > 0) {
            const loadingVials = Math.ceil(loading / 50);
            rows.push({ label: "Loading Dose", value: `${loading} mg IV × 1（${loadingVials} 支）`, highlight: true });
          }
          const maintVials = Math.ceil(maintenance / 50);
          rows.push({ label: "Maintenance", value: `${maintenance} mg IV ${freq}`, highlight: true });
          rows.push({ label: "院內品項", value: `每次 ${maintVials} 支老虎黴素（每支 50 mg）` });
        }
        rows.push({ label: "肝功能評估", value: note });

        return {
          title: sc.label,
          subResults: [{
            route: "IV",
            isPreferred: true,
            rows,
            warnings: scWarnings,
          }],
        };
      });

      return {
        scenarioResults,
        infoBox: {
          text: "⚠️ FDA Black Box Warning：與其他藥物比較，使用 Tygacil 治療可能增加死亡率風險。應僅在無其他替代方案時使用。",
          bg: "#FEF2F2", border: "#FCA5A5", color: "#991B1B",
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // Unasyn (Ampicillin/Sulbactam)
  // ═══════════════════════════════════════════════════════════════
  // 院內品項：Sulampi 舒安比乾粉注射劑 1.5 g/Vial
  //   每支 = Ampicillin 1 g + Sulbactam 0.5 g（2:1 比例）
  //
  // 劑量以「總克數（amp + sulb）」表示
  //   1.5 g = 1 支；3 g = 2 支
  //
  // 肝功能：Child-Pugh A–C 都不調整
  // PD：1.5 g Q12H 或 3 g Q24H
  // CRRT：3 g Q8–12H
  unasyn: {
    name: "Unasyn",
    subtitle: "Ampicillin / Sulbactam",
    needsRenal: true,
    needsWeight: true,
    needsHepatic: false,
    searchTerms: [
      "unasyn", "ampicillin", "sulbactam", "ampicillin/sulbactam",
      "sulampi", "舒安比",
    ],

    indications: [
      {
        id: "bsi",
        label: "Bloodstream infection（菌血症）",
        desc: "致病菌導向治療",
        scenarios: [
          {
            label: "革蘭氏菌血症（敏感菌株）",
            note: "療程 7–14 天；單純 Enterobacteriaceae 7 天",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "cap",
        label: "Pneumonia, community-acquired（CAP）",
        desc: "無 P. aeruginosa 風險的住院病人",
        scenarios: [
          {
            label: "社區型肺炎（非重症）",
            note: "通常合併用藥。最少 5 天且臨床穩定",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "aspirationCap",
        label: "Aspiration pneumonia, community（吸入性肺炎，社區）",
        desc: "非重症",
        scenarios: [
          {
            label: "吸入性肺炎（社區，非重症）",
            note: "療程通常 5 天（含口服降階）",
            preferred: "IV",
            crclTable: UNASYN_15_3G_TABLE,
            hdDose: { dose_mg: 1500, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 1500, freq: "Q12H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "1.5–3 g Q6H",
          },
        ],
      },
      {
        id: "hapVap",
        label: "HAP / VAP（醫院或呼吸器相關肺炎）",
        desc: "",
        scenarios: [
          {
            label: "HAP / VAP",
            note: "通常合併用藥。療程通常 7 天",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "diabeticFoot",
        label: "Diabetic foot infection, moderate to severe（糖尿病足）",
        desc: "",
        scenarios: [
          {
            label: "中重度糖尿病足感染",
            note: "療程通常 2–4 週（無骨髓炎時）",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "biteWound",
        label: "Bite wound infection（咬傷感染）",
        desc: "動物或人類咬傷",
        scenarios: [
          {
            label: "咬傷感染（治療）",
            note: "症狀緩解後再給 1–2 天；總療程 5–14 天",
            preferred: "IV",
            crclTable: UNASYN_15_3G_TABLE,
            hdDose: { dose_mg: 1500, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 1500, freq: "Q12H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "1.5–3 g Q6H",
          },
        ],
      },
      {
        id: "endocarditis",
        label: "Endocarditis, Enterococcus（腸球菌心內膜炎）",
        desc: "Beta-lactamase 產生菌、aminoglycoside 敏感",
        scenarios: [
          {
            label: "腸球菌心內膜炎",
            note: "需合併 gentamicin。療程 6 週（部分專家僅前 2 週合併 gentamicin）",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "odontogenic",
        label: "Odontogenic soft tissue infection（齒源性軟組織感染）",
        desc: "化膿性",
        scenarios: [
          {
            label: "化膿性齒源性軟組織感染",
            note: "需合併適當外科處置。臨床改善後改口服，總療程 7–14 天",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "pid",
        label: "Pelvic inflammatory disease（PID 骨盆腔發炎）",
        desc: "含 tubo-ovarian abscess",
        scenarios: [
          {
            label: "PID / Tubo-ovarian abscess",
            note: "需合併 doxycycline。臨床改善 24–48 小時後可改口服，總療程 14 天",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "postpartumEndometritis",
        label: "Postpartum endometritis（產後子宮內膜炎）",
        desc: "",
        scenarios: [
          {
            label: "產後子宮內膜炎",
            note: "治療至臨床改善（無底部壓痛）且退燒 24–48 小時",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "ssi",
        label: "Surgical site infection（手術部位感染）",
        desc: "腸道、泌尿生殖道、腹壁",
        scenarios: [
          {
            label: "手術部位感染",
            note: "療程依感染嚴重度與反應而定。請依當地敏感性決定 empiric 使用",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "anthrax",
        label: "Anthrax, systemic（炭疽，全身性）",
        desc: "含腦膜炎",
        scenarios: [
          {
            label: "全身性炭疽（含腦膜炎）",
            note: "需合併用藥，且加上抗毒素。≥2 週；腦膜炎建議 IV 合併治療 ≥3 週。氣溶膠暴露後總療程 60 天",
            preferred: "IV",
            crclTable: UNASYN_3G_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12–24H（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q24H" },
            cvvhDose: { dose_mg: 3000, freq: "Q8–12H" },
            usualDoseLabel: "3 g Q6H",
          },
        ],
      },
      {
        id: "mdrAcinetobacter",
        label: "Acinetobacter baumannii, MDR（多重抗藥鮑氏不動桿菌）",
        desc: "高劑量替代療法",
        scenarios: [
          {
            label: "MDR Acinetobacter baumannii — 高劑量",
            note: "需合併用藥。建議延長滴注（4 小時）或連續滴注。也可考慮 3 g Q4H（不耐受高劑量時）",
            preferred: "IV",
            // 用特殊的高劑量表
            crclTable: UNASYN_MDR_AB_TABLE,
            hdDose: { dose_mg: 3000, freq: "Q12H over 4hr（透析後）" },
            pdDose: { dose_mg: 3000, freq: "Q12H over 4hr" },
            cvvhDose: { dose_mg: 3000, freq: "Q6H over 4hr（比照 CrCl 30–60）" },
            usualDoseLabel: "9 g Q8H over 4hr 或 27 g/24hr CI（= 3 g sulbactam Q8H 或 9 g sulb/day）",
          },
        ],
      },
    ],

    extraFields: [],

    calculate({ crcl, rrt, indicationData }) {
      const scenarioResults = indicationData.scenarios.map(sc => {
        let dose_mg, freq, note;

        if (rrt === "hd") {
          ({ dose_mg, freq } = sc.hdDose);
          note = "HD 模式";
        } else if (rrt === "pd") {
          ({ dose_mg, freq } = sc.pdDose);
          note = "PD 模式";
        } else if (rrt === "cvvh") {
          ({ dose_mg, freq } = sc.cvvhDose);
          note = "CRRT / CVVH 模式";
        } else {
          const match = sc.crclTable.find(row => crcl >= row.min);
          dose_mg = match.dose_mg;
          freq = match.freq;
          note = "依 CrCl 調整";
        }

        // 1 支 Sulampi = 1.5 g 總量 = 0.5 g sulbactam
        const vials = Math.ceil(dose_mg / 1500);
        const dose_str = dose_mg >= 1000 ? `${dose_mg / 1000} g` : `${dose_mg} mg`;
        // Sulbactam 等量（總克數 ÷ 3）
        const sulbactam_g = round2(dose_mg / 3000);

        const rows = [
          { label: "適應症常規劑量", value: sc.usualDoseLabel },
          { label: "建議劑量（總量）", value: `${dose_str} IV`, highlight: true },
          { label: "Sulbactam 等量", value: `${sulbactam_g} g sulbactam ${freq}` },
          { label: "給藥頻率", value: freq, highlight: true },
          { label: "每次取藥", value: `${vials} 支 Sulampi（每支 1.5 g = 0.5 g sulbactam）` },
          { label: "調整依據", value: note },
        ];

        if (rrt === "none" && crcl >= 130) {
          rows.push({ label: "⚠️ ARC", value: "CrCl ≥130：可考慮 1.5–3 g Q4–6H 或合併 MDR 高劑量方案" });
        }

        return {
          title: sc.label,
          subResults: [{
            route: "IV",
            isPreferred: true,
            rows,
          }],
        };
      });

      return {
        scenarioResults,
        infoBox: {
          text: "💡 肝功能 Child-Pugh A–C 皆無需調整。最大劑量 12 g/day（標準劑量；MDR Acinetobacter 例外）",
          bg: "#F0FDF4", border: "#86EFAC", color: "#166534",
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // Tazocin (Piperacillin/Tazobactam)
  // ═══════════════════════════════════════════════════════════════
  // 院內品項：帝斯坦乾粉注射劑 2.25 g/Vial
  //   每支 = Piperacillin 2 g + Tazobactam 0.25 g（8:1）
  //
  // 劑量以「總克數（pip + tazo）」表示
  //   2.25 g = 1 支；3.375 g = 1.5 支；4.5 g = 2 支
  //
  // 標準劑量分兩種：
  //   - 3.375 g Q6H：輕中度感染、無 Pseudomonas 風險
  //   - 4.5 g Q6H：嚴重感染、Pseudomonas 風險、HAP/VAP、敗血症
  //
  // 肝功能：Child-Pugh A–C 都不需調整
  // 肥胖：BMI ≥30 用 AdjBW 算 CrCl
  tazocin: {
    name: "Tazocin",
    subtitle: "Piperacillin / Tazobactam",
    needsRenal: true,
    needsWeight: true,
    needsHepatic: false,
    searchTerms: [
      "tazocin", "piperacillin", "tazobactam", "pip-tazo", "pip/tazo", "piptazo",
      "帝斯坦", "pipe tazo",
    ],

    indications: [
      {
        id: "iai",
        label: "Intra-abdominal infection（IAI 腹腔內感染）",
        desc: "膽囊炎、膽管炎、闌尾炎、憩室炎等",
        scenarios: [
          {
            label: "標準劑量（社區型、低風險）",
            note: "Source control 後總療程 4–5 天",
            preferred: "IV",
            crclTable: TAZO_3375_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H 或 4.5 g loading + 2.25 g Q6H" },
            usualDoseLabel: "3.375 g Q6H",
          },
          {
            label: "高劑量（院內、重症、抗藥風險）",
            note: "保留給院內感染、嚴重社區感染、或高風險病人",
            preferred: "IV",
            crclTable: TAZO_45_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "4.5 g Q6H",
          },
        ],
      },
      {
        id: "bsi",
        label: "Bloodstream infection（菌血症）",
        desc: "致病菌導向治療",
        scenarios: [
          {
            label: "社區型感染、免疫正常",
            note: "療程 7–14 天；單純 Enterobacteriaceae 7 天",
            preferred: "IV",
            crclTable: TAZO_3375_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "3.375 g Q6H",
          },
          {
            label: "院內、免疫低下、含 Pseudomonas",
            note: "重症首選延長/連續滴注。中性球低下者持續至退燒 2 天且 ANC ≥500 回升。Pseudomonas 菌血症 + 中性球低下至少 14 天",
            preferred: "IV",
            crclTable: TAZO_45_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "4.5 g Q6H",
          },
        ],
      },
      {
        id: "cap",
        label: "Pneumonia, community-acquired（CAP）",
        desc: "有抗藥 GNB 風險（含 P. aeruginosa）",
        scenarios: [
          {
            label: "CAP（住院、有 Pseudomonas 風險）",
            note: "需合併用藥。最少 5 天且臨床穩定。免疫低下、重症或 P. aeruginosa 需更長療程",
            preferred: "IV",
            crclTable: TAZO_45_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "4.5 g Q6H",
          },
        ],
      },
      {
        id: "hapVap",
        label: "HAP / VAP（醫院或呼吸器相關肺炎）",
        desc: "",
        scenarios: [
          {
            label: "HAP / VAP",
            note: "通常合併用藥。療程通常 7 天。重症或抗藥菌建議延長/連續滴注",
            preferred: "IV",
            crclTable: TAZO_45_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "4.5 g Q6H",
          },
        ],
      },
      {
        id: "sepsis",
        label: "Sepsis / Septic shock",
        desc: "Empiric broad-spectrum",
        scenarios: [
          {
            label: "敗血症 / 敗血性休克",
            note: "識別後 1 小時內給藥。需合併其他適當藥物。重症首選延長/連續滴注",
            preferred: "IV",
            crclTable: TAZO_45_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "4.5 g Q6H",
          },
        ],
      },
      {
        id: "neutropenicFever",
        label: "Neutropenic fever, high-risk（高風險發熱性嗜中性球低下）",
        desc: "癌症病人 empiric therapy",
        scenarios: [
          {
            label: "高風險嗜中性球低下發燒",
            note: "持續至退燒 ≥48 小時且 ANC ≥500 回升。Pseudomonas 高風險（重症、未用 fluoroquinolone 預防）→ 4.5 g Q6H",
            preferred: "IV",
            crclTable: TAZO_45_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "4.5 g Q6–8H",
          },
        ],
      },
      {
        id: "ssti",
        label: "Skin & Soft Tissue Infection, moderate to severe",
        desc: "中重度，含壞死性感染",
        scenarios: [
          {
            label: "標準劑量",
            note: "療程 5–14 天。壞死性感染至無需 debridement 且退燒 48 小時",
            preferred: "IV",
            crclTable: TAZO_3375_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "3.375 g Q6H 或 4.5 g Q8H",
          },
          {
            label: "P. aeruginosa 感染",
            note: "證實或高度懷疑 P. aeruginosa 時使用",
            preferred: "IV",
            crclTable: TAZO_45_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "4.5 g Q6H",
          },
        ],
      },
      {
        id: "uti",
        label: "Complicated UTI / Pyelonephritis",
        desc: "複雜性 UTI / 腎盂腎炎",
        scenarios: [
          {
            label: "複雜性 UTI",
            note: "症狀於 48 小時內改善者，總療程 5–7 天",
            preferred: "IV",
            crclTable: TAZO_3375_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "3.375 g Q6H 或 4.5 g Q8H",
          },
        ],
      },
      {
        id: "diabeticFoot",
        label: "Diabetic foot infection, moderate to severe（糖尿病足）",
        desc: "",
        scenarios: [
          {
            label: "標準劑量",
            note: "療程通常 2–4 週（無骨髓炎時）",
            preferred: "IV",
            crclTable: TAZO_3375_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "3.375 g Q6H 或 4.5 g Q8H",
          },
          {
            label: "P. aeruginosa 感染",
            preferred: "IV",
            crclTable: TAZO_45_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "4.5 g Q6H",
          },
        ],
      },
      {
        id: "cysticFibrosis",
        label: "Cystic fibrosis, pulmonary exacerbation",
        desc: "嚴重急性肺部惡化或口服失敗",
        scenarios: [
          {
            label: "CF 急性肺部惡化",
            note: "通常合併用藥。療程 10–14 天。建議延長/連續滴注",
            preferred: "IV",
            crclTable: TAZO_45_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "4.5 g Q6H",
          },
        ],
      },
      {
        id: "biteWound",
        label: "Bite wound infection（咬傷感染）",
        desc: "動物或人類咬傷",
        scenarios: [
          {
            label: "咬傷感染（治療）",
            note: "Empiric 治療可能需加 MRSA 覆蓋。療程 5–14 天",
            preferred: "IV",
            crclTable: TAZO_3375_TABLE,
            hdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H（透析後）" },
            pdDose: { dose_mg: 4500, freq: "Q12H 或 2.25 g Q8H" },
            cvvhDose: { dose_mg: 4500, freq: "Q8H" },
            usualDoseLabel: "3.375 g Q6–8H",
          },
        ],
      },
    ],

    extraFields: [],

    calculate({ crcl, rrt, indicationData }) {
      const scenarioResults = indicationData.scenarios.map(sc => {
        let dose_mg, freq, note;
        let useExtended = false;

        if (rrt === "hd") {
          ({ dose_mg, freq } = sc.hdDose);
          note = "HD 模式";
        } else if (rrt === "pd") {
          ({ dose_mg, freq } = sc.pdDose);
          note = "PD 模式";
        } else if (rrt === "cvvh") {
          ({ dose_mg, freq } = sc.cvvhDose);
          note = "CRRT / CVVH 模式";
        } else if (crcl >= 130) {
          // ARC：CrCl ≥130 → 改用延長/連續滴注高劑量
          dose_mg = 4500;
          freq = crcl >= 170
            ? "Loading 4.5 g + 22.5 g/day CI"
            : "Q6H over 3hr（延長滴注）";
          note = "ARC 模式";
          useExtended = true;
        } else {
          const match = sc.crclTable.find(row => crcl >= row.min);
          dose_mg = match.dose_mg;
          freq = match.freq;
          note = "依 CrCl 調整";
          if (crcl >= 100) useExtended = true;
        }

        // 1 支帝斯坦 = 2.25 g 總量
        const vials = (dose_mg / 2250).toFixed(2).replace(/\.?0+$/, "");
        const dose_str = dose_mg >= 1000 ? `${dose_mg / 1000} g` : `${dose_mg} mg`;

        const rows = [
          { label: "適應症常規劑量", value: sc.usualDoseLabel },
          { label: "建議劑量", value: `${dose_str} IV`, highlight: true },
          { label: "給藥頻率", value: freq, highlight: true },
          { label: "每次取藥", value: `${vials} 支帝斯坦（每支 2.25 g）` },
          { label: "調整依據", value: note },
        ];

        if (rrt === "none" && crcl >= 130) {
          rows.push({
            label: "⚠️ ARC",
            value: crcl >= 170
              ? "CrCl ≥170：建議連續滴注（loading 4.5 g + 22.5 g/24hr）"
              : "CrCl 130–<170：建議延長滴注（4.5 g Q6H over 3hr）",
          });
        }

        return {
          title: sc.title || sc.label,
          note: sc.note,
          subResults: [{
            route: "IV",
            isPreferred: true,
            rows,
          }],
        };
      });

      return {
        scenarioResults,
        infoBox: {
          text: "🕒 以下情況首選延長滴注（4.5 g Q6H over 3hr）：① 重症病人；② 致病菌 MIC 偏高（≥16 mg/L）；③ GFR 較高（如 >100 mL/min）。實務上以 CrCl 為參考。肝功能 Child-Pugh A–C 不需調整",
          bg: "#EFF6FF", border: "#93C5FD", color: "#1E40AF",
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // Brosym (Cefoperazone/Sulbactam)
  // ═══════════════════════════════════════════════════════════════
  // 院內品項：博益欣注射劑 2 g/Vial
  //   每支 = Cefoperazone 1 g + Sulbactam 1 g（1:1 比例）
  //
  // 注意：美國已下市，UpToDate 沒有資料
  // 劑量依據廠商建議：
  //   - 標準：4 g Q12H（不論腎功能；HD 亦同）
  //   - CRRT：2 g Q6H
  //   - CRAB 高劑量替代：4 g Q8H（非首選；MDR Acinetobacter 首選為 Unasyn 高劑量）
  //
  // 肝功能：嚴重肝功能不全或膽道阻塞需注意（cefoperazone 經膽道代謝）
  brosym: {
    name: "Brosym",
    subtitle: "Cefoperazone / Sulbactam",
    needsRenal: true,
    needsWeight: false,    // 廠商劑量為固定 4 g，不需依體重計算
    needsHepatic: false,
    searchTerms: [
      "brosym", "cefoperazone", "sulbactam", "cefoperazone/sulbactam",
      "博益欣", "cps",
    ],

    indications: [
      {
        id: "standard",
        label: "標準劑量",
        desc: "一般感染",
        scenarios: [
          {
            label: "標準劑量",
            note: "廠商建議：腎功能正常或不全皆為 4 g Q12H。HD 病人也用同樣劑量",
            preferred: "IV",
            // 用簡化表：CrCl 不論多少都 4 g Q12H（HD/PD/CRRT 在 calculate 內處理）
            crclTable: BROSYM_STANDARD_TABLE,
            hdDose: { dose_mg: 4000, freq: "Q12H（透析後）" },
            pdDose: { dose_mg: 4000, freq: "Q12H" },
            cvvhDose: { dose_mg: 2000, freq: "Q6H" },
            usualDoseLabel: "4 g Q12H（標準）",
          },
        ],
      },
      {
        id: "crab",
        label: "Carbapenem-resistant A. baumannii（CRAB，高劑量替代）",
        desc: "非首選；MDR Acinetobacter 首選為 Unasyn 高劑量",
        scenarios: [
          {
            label: "CRAB 高劑量方案",
            note: "⚠️ 非首選方案。MDR Acinetobacter 首選為 Unasyn 高劑量（9 g Q8H）。Brosym 高劑量僅作備案",
            preferred: "IV",
            crclTable: BROSYM_HIGH_TABLE,
            hdDose: { dose_mg: 4000, freq: "Q8H（透析後）" },
            pdDose: { dose_mg: 4000, freq: "Q8H" },
            cvvhDose: { dose_mg: 2000, freq: "Q6H" },
            usualDoseLabel: "4 g Q8H（高劑量替代）",
          },
        ],
      },
    ],

    extraFields: [],

    calculate({ crcl, rrt, indicationData }) {
      const scenarioResults = indicationData.scenarios.map(sc => {
        let dose_mg, freq, note;
        const scWarnings = [];

        if (rrt === "hd") {
          ({ dose_mg, freq } = sc.hdDose);
          note = "HD 模式（廠商：HD 不需減量）";
        } else if (rrt === "pd") {
          ({ dose_mg, freq } = sc.pdDose);
          note = "PD 模式（比照 HD 推估）";
          scWarnings.push("廠商無 PD 劑量資料。此建議為比照 HD 之推估");
        } else if (rrt === "cvvh") {
          ({ dose_mg, freq } = sc.cvvhDose);
          note = "CRRT / CVVH 模式";
        } else {
          const match = sc.crclTable.find(row => crcl >= row.min);
          dose_mg = match.dose_mg;
          freq = match.freq;
          note = "腎功能不論高低均同劑量（廠商建議）";
        }

        // 1 支 Brosym = 2 g 總量 = 1 g cefoperazone + 1 g sulbactam
        const vials = Math.ceil(dose_mg / 2000);
        const dose_str = dose_mg >= 1000 ? `${dose_mg / 1000} g` : `${dose_mg} mg`;
        // Sulbactam 等量（1:1 比例 → ÷ 2）
        const sulbactam_g = round2(dose_mg / 2000);

        const rows = [
          { label: "適應症常規劑量", value: sc.usualDoseLabel },
          { label: "建議劑量（總量）", value: `${dose_str} IV`, highlight: true },
          { label: "Sulbactam 等量", value: `${sulbactam_g} g sulbactam ${freq}` },
          { label: "給藥頻率", value: freq, highlight: true },
          { label: "每次取藥", value: `${vials} 支 Brosym（每支 2 g = 1 g sulbactam）` },
          { label: "調整依據", value: note },
        ];

        return {
          title: sc.label,
          subResults: [{
            route: "IV",
            isPreferred: true,
            rows,
            warnings: scWarnings,
          }],
        };
      });

      return {
        scenarioResults,
        infoBox: {
          text: "💡 Brosym 在美國已下市，UpToDate 無資料。劑量依廠商建議。腎功能不論高低標準劑量皆為 4 g Q12H",
          bg: "#FFFBEB", border: "#FCD34D", color: "#92400E",
        },
      };
    },
  },
};

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔧 共用工具                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝

function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }

const RRT_OPTIONS = [
  { id: "none", label: "無透析（含 CKD）" },
  { id: "hd",   label: "HD（血液透析）" },
  { id: "pd",   label: "PD（腹膜透析）" },
  { id: "cvvh", label: "CVVH / CVVHDF" },
];

const CHILD_PUGH_OPTIONS = [
  { id: "A", label: "Child-Pugh A（輕度）" },
  { id: "B", label: "Child-Pugh B（中度）" },
  { id: "C", label: "Child-Pugh C（重度）" },
];

function calcPatientParams({ tbw, height, age, gender, scr, rrt, weightStrategy }) {
  const w = parseFloat(tbw) || 0;
  const h = parseFloat(height);
  const a = parseFloat(age);
  const s = parseFloat(scr);

  let dosing_weight = w;
  let weight_note = "使用實際體重（TBW）";
  let ibw = null;
  let adjBw = null;
  let bmi = null;

  // 算 BMI（給肥胖判斷用）
  if (w > 0 && h > 0) {
    bmi = w / Math.pow(h / 100, 2);
  }

  // 算 IBW（CrCl 計算可能用到）
  if (w > 0 && h > 0 && gender) {
    ibw = gender === "M" ? 50 + 0.91 * (h - 152.4) : 45.5 + 0.91 * (h - 152.4);
  }

  // 依策略決定 dosing weight
  const strategy = weightStrategy || "AdjBW_if_obese";   // 預設

  if (strategy === "TBW") {
    dosing_weight = w;
    weight_note = "策略：永遠使用 TBW";
  } else if (strategy === "IBW" && ibw) {
    dosing_weight = round1(ibw);
    weight_note = `策略：使用 IBW（${round1(ibw)} kg）`;
  } else {
    // AdjBW_if_obese（預設）：依 UpToDate，BMI ≥ 30 判定肥胖
    if (ibw && bmi && bmi >= 30) {
      adjBw = round1(ibw + 0.4 * (w - ibw));
      dosing_weight = adjBw;
      weight_note = `肥胖（BMI ${round1(bmi)}）→ AdjBW ${adjBw} kg`;
    }
  }

  // CrCl 一律用 dosing weight 算（與舊版相容）
  let crcl = null;
  if (dosing_weight > 0 && a > 0 && s > 0 && gender && rrt === "none") {
    crcl = ((140 - a) * dosing_weight) / (72 * s);
    if (gender === "F") crcl *= 0.85;
    crcl = round1(crcl);
  }

  return {
    dosing_weight, weight_note,
    ibw: ibw ? round1(ibw) : null,
    adjBw, bmi: bmi ? round1(bmi) : null,
    crcl,
  };
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔍 可搜尋下拉選單                                              ║
// ╚══════════════════════════════════════════════════════════════════╝

const ACCENT = "#0D9488";

function DrugSearchSelect({ drugList, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const filtered = drugList.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.subtitle.toLowerCase().includes(q) ||
      (d.searchTerms || []).some(t => t.toLowerCase().includes(q))
    );
  });

  const selected = drugList.find(d => d.id === selectedId);

  return (
    <div ref={wrapperRef} style={{ position: "relative", marginBottom: 20 }}>
      <label style={S.label}>選擇藥物</label>
      <div
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          padding: "12px 14px", borderRadius: 10,
          border: open ? `2px solid ${ACCENT}` : "2px solid #E2E8F0",
          background: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "border 0.15s",
        }}
      >
        {selected ? (
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{selected.name}</span>
            <span style={{ fontSize: 13, color: "#94A3B8", marginLeft: 8 }}>{selected.subtitle}</span>
          </div>
        ) : (
          <span style={{ color: "#94A3B8", fontSize: 15 }}>點擊選擇或搜尋藥物...</span>
        )}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginLeft: 8, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <path d="M4 6L8 10L12 6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          marginTop: 4, background: "#fff", borderRadius: 12,
          border: "1.5px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5"/>
                <path d="M11 11L14 14" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                ref={inputRef} type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="藥名、商品名、學名、中文..."
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#0F172A", width: "100%", minWidth: 0 }}
              />
              {search && (
                <button onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: 0 }}>✕</button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>找不到符合的藥物</div>
            ) : (
              filtered.map(d => (
                <div key={d.id}
                  onClick={() => { onSelect(d.id); setOpen(false); setSearch(""); }}
                  style={{
                    padding: "12px 16px", cursor: "pointer",
                    background: d.id === selectedId ? "#F0FDFA" : "transparent",
                    borderLeft: d.id === selectedId ? `3px solid ${ACCENT}` : "3px solid transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (d.id !== selectedId) e.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={e => { if (d.id !== selectedId) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.subtitle}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: "8px 16px", borderTop: "1px solid #F1F5F9", fontSize: 12, color: "#CBD5E1", textAlign: "center" }}>
            共 {drugList.length} 種藥物{search ? `，符合 ${filtered.length} 種` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🧩 其他 UI 元件                                                ║
// ╚══════════════════════════════════════════════════════════════════╝

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={S.select}>
        <option value="">{placeholder || "請選擇"}</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label}{o.desc ? ` — ${o.desc}` : ""}</option>
        ))}
      </select>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, suffix }) {
  return (
    <div style={{ marginBottom: 16, minWidth: 0 }}>
      <label style={S.label}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <input type="number" inputMode="decimal" value={value}
          onChange={e => onChange(e.target.value)} placeholder={placeholder} style={S.input} />
        {suffix && <span style={{ color: "#64748B", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <label style={{ ...S.label, marginBottom: 0 }}>{label}</label>
      <button onClick={() => onChange(!value)} style={{
        width: 52, height: 28, borderRadius: 14, border: "none",
        backgroundColor: value ? ACCENT : "#CBD5E1",
        position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff",
          position: "absolute", top: 3, left: value ? 27 : 3, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </button>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid #F1F5F9", gap: 8 }}>
      <span style={{ color: "#64748B", fontSize: 14, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, fontSize: highlight ? 17 : 15, color: highlight ? "#0F172A" : "#334155", textAlign: "right", minWidth: 0 }}>{value}</span>
    </div>
  );
}

function Warning({ text }) {
  return (
    <div style={{
      background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8,
      padding: "10px 14px", marginTop: 8, fontSize: 14, color: "#92400E",
      display: "flex", alignItems: "flex-start", gap: 8,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span> <span>{text}</span>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🏗️ 主程式                                                     ║
// ╚══════════════════════════════════════════════════════════════════╝

export default function App() {
  const [drugId, setDrugId] = useState("");
  const [tbw, setTbw] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [scr, setScr] = useState("");
  const [rrt, setRrt] = useState("");
  const [hepatic, setHepatic] = useState("");
  const [indication, setIndication] = useState("");
  const [ampules, setAmpules] = useState("");
  const [extras, setExtras] = useState({});
  const resultRef = useRef(null);

  const drugConfig = DRUG_REGISTRY[drugId] || null;

  const indicationData = drugConfig && indication
    ? drugConfig.indications.find(i => i.id === indication)
    : null;

  // 決定本次該採用哪種體重策略：indication > drug > 預設
  const activeWeightStrategy =
    indicationData?.weightStrategy ||
    drugConfig?.weightStrategy ||
    "AdjBW_if_obese";

  const patientParams = drugConfig?.needsRenal
    ? calcPatientParams({ tbw, height, age, gender, scr, rrt, weightStrategy: activeWeightStrategy })
    : { dosing_weight: 0, crcl: null, ibw: null, adjBw: null, weight_note: "" };

  const canCalc = (() => {
    if (!drugConfig || !indicationData) return false;
    if (drugConfig.needsRenal) {
      if (!rrt) return false;
      // 只有需要體重的藥才檢查體重相關欄位
      if (drugConfig.needsWeight !== false) {
        if (!tbw || !age || !scr || !gender) return false;
        if (rrt === "none" && patientParams.crcl === null) return false;
      }
    }
    if (drugConfig.needsHepatic && !hepatic) return false;
    return true;
  })();

  const result = canCalc ? drugConfig.calculate({
    dosing_weight: patientParams.dosing_weight,
    crcl: patientParams.crcl || 0,
    rrt, hepatic, indicationData, extras,
  }) : null;

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [!!result]);

  const resetAll = () => {
    setDrugId(""); setTbw(""); setHeight(""); setAge(""); setGender("");
    setScr(""); setRrt(""); setHepatic(""); setIndication(""); setAmpules(""); setExtras({});
  };

  const selectDrug = (id) => {
    setDrugId(id); setIndication(""); setAmpules("");
    const cfg = DRUG_REGISTRY[id];
    if (cfg?.extraFields) {
      const defaults = {};
      cfg.extraFields.forEach(f => { defaults[f.key] = f.default; });
      setExtras(defaults);
    } else { setExtras({}); }
  };

  const drugList = Object.entries(DRUG_REGISTRY).map(([id, cfg]) => ({ id, ...cfg }));

  return (
    <div style={S.shell}>
      <div style={S.container}>
        <div style={S.header}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: -0.5 }}>抗生素劑量及給藥方法</div>
          <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>臨床決策支援工具</div>
        </div>

        <DrugSearchSelect drugList={drugList} selectedId={drugId} onSelect={selectDrug} />

        {/* 病患資料 */}
        {drugConfig?.needsRenal && (
          <div style={S.section}>
            <div style={S.sectionTitle}>病患資料</div>
            {drugConfig.needsWeight !== false && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                  <Input label="體重 TBW" value={tbw} onChange={setTbw} placeholder="kg" suffix="kg" />
                  <Input label="身高（選填）" value={height} onChange={setHeight} placeholder="cm" suffix="cm" />
                  <Input label="年齡" value={age} onChange={setAge} placeholder="歲" suffix="歲" />
                  <div style={{ marginBottom: 16, minWidth: 0 }}>
                    <label style={S.label}>性別</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["M", "F"].map(g => (
                        <button key={g} onClick={() => setGender(g)} style={{
                          flex: 1, padding: "10px 0", borderRadius: 8, minWidth: 0,
                          border: gender === g ? `2px solid ${ACCENT}` : "2px solid #E2E8F0",
                          background: gender === g ? `${ACCENT}10` : "#fff",
                          fontWeight: 600, fontSize: 14, cursor: "pointer",
                          color: gender === g ? ACCENT : "#64748B",
                        }}>
                          {g === "M" ? "男 M" : "女 F"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Input label="血清肌酸酐 Scr" value={scr} onChange={setScr} placeholder="mg/dL" suffix="mg/dL" />
              </>
            )}
            <Select label="透析狀態" value={rrt} onChange={setRrt} options={RRT_OPTIONS} />
            {drugConfig.needsWeight !== false && patientParams.dosing_weight > 0 && rrt && (
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>📐 {patientParams.weight_note}{!patientParams.adjBw ? ` — ${round1(patientParams.dosing_weight)} kg` : ""}</span>
                {patientParams.ibw && <span>📏 IBW: {patientParams.ibw} kg{patientParams.bmi ? `　|　BMI: ${patientParams.bmi}` : ""}</span>}
                {rrt === "none" && patientParams.crcl !== null && <span>🧪 CrCl: {patientParams.crcl} mL/min</span>}
                {rrt !== "none" && <span>🔄 {RRT_OPTIONS.find(o => o.id === rrt)?.label}</span>}
              </div>
            )}
          </div>
        )}

        {drugConfig?.needsHepatic && (
          <div style={S.section}>
            <div style={S.sectionTitle}>肝功能評估</div>
            <Select label="Child-Pugh 分級" value={hepatic} onChange={setHepatic} options={CHILD_PUGH_OPTIONS} />
          </div>
        )}

        {drugConfig && (
          <div style={S.section}>
            <div style={S.sectionTitle}>{drugConfig.name} 設定</div>
            <Select label="適應症"
              value={indication} onChange={setIndication} options={drugConfig.indications} />
            {drugConfig.extraFields?.map(f => {
              if (f.type === "toggle") {
                return <Toggle key={f.key} label={f.label} value={!!extras[f.key]}
                  onChange={v => setExtras(prev => ({ ...prev, [f.key]: v }))} />;
              }
              return null;
            })}
          </div>
        )}

        {/* Result */}
        <div ref={resultRef}>
          {result && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginTop: 16, borderLeft: `4px solid ${ACCENT}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                {drugConfig.name} 建議處方
              </div>
              <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                {indicationData?.label}
              </div>

              {result.scenarioResults?.map((sc, idx) => (
                <div key={idx} style={{
                  marginBottom: idx < result.scenarioResults.length - 1 ? 16 : 0,
                  paddingBottom: idx < result.scenarioResults.length - 1 ? 16 : 0,
                  borderBottom: idx < result.scenarioResults.length - 1 ? "2px dashed #E2E8F0" : "none",
                }}>
                  {result.scenarioResults.length > 1 && (
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: "#0F172A",
                      marginBottom: sc.note ? 4 : 10,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT }}></span>
                      {sc.title}
                    </div>
                  )}
                  {sc.note && (
                    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10, lineHeight: 1.5 }}>
                      {sc.note}
                    </div>
                  )}

                  {sc.subResults && (() => {
                    // 只有當同時存在 PO 和 IV 時才顯示「UpToDate 首選」標籤
                    const hasMultipleRoutes = sc.subResults.length > 1;
                    return sc.subResults.map((sub, sIdx) => {
                      const showPreferredBadge = hasMultipleRoutes && sub.isPreferred;
                      return (
                        <div key={sIdx} style={{
                          marginTop: sIdx > 0 ? 12 : 0,
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: showPreferredBadge ? "#F0FDFA" : "#F8FAFC",
                          border: showPreferredBadge ? `1.5px solid ${ACCENT}` : "1px solid #E2E8F0",
                        }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            marginBottom: 8, flexWrap: "wrap",
                          }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              padding: "2px 8px", borderRadius: 10,
                              backgroundColor: sub.route === "PO" ? "#DBEAFE" : "#FEF3C7",
                              color: sub.route === "PO" ? "#1E40AF" : "#92400E",
                            }}>
                              {sub.route === "PO" ? "口服 PO" : "靜脈 IV"}
                            </span>
                            {showPreferredBadge && (
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                padding: "2px 8px", borderRadius: 10,
                                backgroundColor: ACCENT, color: "#fff",
                              }}>
                                ⭐ UpToDate 首選
                              </span>
                            )}
                          </div>
                          {sub.rows.map((r, i) => <Row key={i} label={r.label} value={r.value} highlight={r.highlight} />)}
                          {sub.warnings?.map((w, i) => <Warning key={i} text={w} />)}
                        </div>
                      );
                    });
                  })()}
                </div>
              ))}

              {result.infoBox && (
                <div style={{ background: result.infoBox.bg, borderRadius: 8, padding: 12, marginTop: 12, border: `1px solid ${result.infoBox.border}`, fontSize: 14, color: result.infoBox.color }}>
                  {result.infoBox.text}
                </div>
              )}
              {result.pharmacistInput && (
                <div style={{ marginTop: 16, padding: "14px 0 0", borderTop: "1px dashed #CBD5E1" }}>
                  <Input label={result.pharmacistInput.label} value={ampules} onChange={setAmpules}
                    placeholder={result.pharmacistInput.placeholder} suffix={result.pharmacistInput.suffix} />
                  {(() => {
                    const dil = result.pharmacistInput.calcDilution(ampules);
                    if (!dil) return null;
                    return (
                      <div style={{ background: "#ECFDF5", borderRadius: 8, padding: 14, border: "1px solid #6EE7B7" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#065F46", marginBottom: 4 }}>護理配藥指示</div>
                        <div style={{ fontSize: 14, color: "#065F46" }}>{dil.text}</div>
                        {dil.note && <div style={{ fontSize: 12, color: "#047857", marginTop: 4 }}>{dil.note}</div>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {drugId && <button onClick={resetAll} style={S.resetBtn}>重新評估</button>}
        <div style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 11, color: "#94A3B8" }}>僅供臨床參考，請依實際情境調整</div>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🎨 樣式                                                       ║
// ╚══════════════════════════════════════════════════════════════════╝

const S = {
  shell: { minHeight: "100vh", background: "linear-gradient(180deg, #F0FDFA 0%, #F8FAFC 40%)", fontFamily: "'SF Pro Text', -apple-system, 'Segoe UI', sans-serif" },
  container: { maxWidth: 460, margin: "0 auto", padding: "20px 16px 40px", boxSizing: "border-box" },
  header: { textAlign: "center", padding: "16px 0 24px" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", appearance: "auto", WebkitAppearance: "auto", boxSizing: "border-box" },
  input: { flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  resetBtn: { width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 15, fontWeight: 600, cursor: "pointer" },
};