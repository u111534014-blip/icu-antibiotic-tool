// ═══════════════════════════════════════════════════════════════════════════
// fluconazole.ts  ·  Fluconazole（Diflucan 泰復肯）
//
// 院內品項
//   IV：Diflucan 針  100 mg / 50 mL / 支（2 mg/mL）泰復肯靜脈注射劑
//   PO：膚黴克膠囊   50 mg / 顆（Fluene / 膚黴克）
//
// 腎功能調整原則（Lexicomp 2026）
//   CrCl > 50        → 不需調整
//   CrCl ≤ 50        → 維持量減半（loading 不減）
//   HD 3x/week       → Full dose 透析後給藥，每週三次
//                       替代：維持量減半 QD，透析日透析後給
//   CRRT（CVVH/D/HDF）→ 劑量需增加（tubular reabsorption 消失，
//                       clearance 增加 1.5–2x）
//   PD               → 維持量減半（同 CrCl ≤50 邏輯）
//
// CRRT 劑量上調對照（Lexicomp）
//   常規 200 mg → CRRT 400 mg QD
//   常規 400 mg → CRRT loading 800 mg → 維持 800 mg QD（或 Q12H）
//   常規 800 mg → CRRT loading 1200 mg → 維持 1200 mg QD（或 Q12H）
//
// 肝功能：Child-Pugh A–C 均不需調整
// ═══════════════════════════════════════════════════════════════════════════

import { round1 } from './shared/helpers';

// ── 院內品項常數 ───────────────────────────────────────────────────────────
const IV_MG_PER_VIAL = 100;   // 泰復肯靜脈注射劑 100 mg/支
const PO_MG_PER_CAP  = 50;    // 膚黴克膠囊 50 mg/顆

// CRRT 劑量上調表
function getCRRTDose(usualMaint_mg: number): {
  load_mg: number | null;
  maint_mg: number;
  freq: string;
} {
  if (usualMaint_mg <= 200) return { load_mg: null,  maint_mg: 400,  freq: "QD" };
  if (usualMaint_mg <= 400) return { load_mg: 800,   maint_mg: 800,  freq: "QD（或分 Q12H）" };
  return                           { load_mg: 1200,  maint_mg: 1200, freq: "QD（或分 Q12H）" };
}

// ── 藥物主體 ──────────────────────────────────────────────────────────────
export const fluconazole = {
  id: "fluconazole",
  name: "Fluconazole",
  subtitle: "Diflucan",
  color: "#0891B2",   // cyan-600

  // ★ needsRenal = true 時，needsWeight 也必須 true（計算 CrCl 所需）
  needsWeight: true,
  needsRenal:  true,
  needsHepatic: false,  // CTP A–C 均不需調整，不顯示肝功能欄位

  // ──────────────────────────────────────────────────────────────────────
  // 適應症清單（情境資料）
  // 標籤格式：英文名（中文說明）
  // ──────────────────────────────────────────────────────────────────────
  indications: [

    // ── 1. Candidemia ──────────────────────────────────────────────────
    {
      id: "candidemia_initial",
      label: "Candidemia - Initial therapy（菌血症，初始治療）",
      desc: "適用於非中性球低下、非危重症、低 azole 抗藥風險患者",
      scenarios: [
        {
          label: "Candidemia - Initial therapy（菌血症，初始治療）",
          note: [
            "適用條件：(1) 非中性球低下患者且非危重症；",
            "(2) 中性球低下患者且非危重症且無先前 azole 暴露。",
            "療程：末次陰性血培養後 ≥14 天（有轉移性併發症者需更長）",
          ].join(""),
          preferred: "IV",
          hasLoading: true,
          wt_load_mg_per_kg: 12,   // → 常用固定量 800 mg
          std_load_mg:        800,
          wt_maint_mg_per_kg:  6,  // → 常用固定量 400 mg
          std_maint_mg:       400,
          freq: "QD",
          usualMaint_mg: 400,       // CRRT 對照基準
        },
      ],
    },

    {
      id: "candidemia_stepdown",
      label: "Candidemia Step-down（菌血症，降階治療）",
      desc: "病情穩定後由 echinocandin 降階至口服",
      scenarios: [
        {
          label: "Candidemia Step-down - Non-C.glabrata（菌血症降階，非 C. glabrata 菌種）",
          note: [
            "適用條件：病情穩定、重複血培養陰性、確認非 C. glabrata / C. krusei 菌種。",
            "建議在 echinocandin 治療 5–7 天後降階。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Candidemia Step-down - C. glabrata susceptible（菌血症降階，C. glabrata 敏感株）",
          note: [
            "限 fluconazole 敏感（MIC ≤8 mg/L）或 susceptible-dose-dependent（MIC 16–32 mg/L）菌株。",
            "C. krusei 不建議使用 fluconazole。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 12,
          std_maint_mg: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
      ],
    },

    // ── 2. Candidiasis - 食道 / 口咽 ──────────────────────────────────
    {
      id: "candida_esophageal",
      label: "Candidiasis - Esophageal（食道念珠菌症）",
      desc: "療程 14–21 天",
      scenarios: [
        {
          label: "Candidiasis - Esophageal（食道念珠菌症）",
          note: [
            "療程 14–21 天。Loading 400 mg day 1，之後維持 200–400 mg QD。",
            "若 C. albicans 且治療 1 週無效，部分專家升至 800 mg QD。",
          ].join(""),
          preferred: "PO",
          hasLoading: true,
          wt_load_mg_per_kg: 6,
          std_load_mg: 400,
          wt_maint_mg_per_kg_min: 3,
          wt_maint_mg_per_kg_max: 6,
          std_maint_mg_min: 200,
          std_maint_mg_max: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

    {
      id: "candida_oropharyngeal",
      label: "Candidiasis - Oropharyngeal（口咽念珠菌症）",
      desc: "中重度或外用無效，療程 7–14 天",
      scenarios: [
        {
          label: "Candidiasis - Oropharyngeal（口咽念珠菌症）",
          note: [
            "保留給中重度、外用治療無效、或免疫低下患者。",
            "療程 7–14 天；不建議超過 14 天（抗藥風險）。",
          ].join(""),
          preferred: "PO",
          hasLoading: true,
          fixedDose: true,
          std_load_mg: 200,
          std_maint_mg_min: 100,
          std_maint_mg_max: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
      ],
    },

    // ── 3. Candidiasis - UTI ───────────────────────────────────────────
    {
      id: "candida_uti",
      label: "Candidiasis - UTI（泌尿道念珠菌感染）",
      desc: "症狀性膀胱炎或腎盂腎炎，療程 2 週",
      scenarios: [
        {
          label: "Cystitis（症狀性膀胱炎）",
          note: [
            "療程 2 週。",
            "無症狀 candiduria 除非是中性球低下患者或泌尿科術前，一般不建議治療。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 3,
          std_maint_mg: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
        {
          label: "Pyelonephritis（腎盂腎炎）",
          note: "療程 2 週。",
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg_min: 3,
          wt_maint_mg_per_kg_max: 6,
          std_maint_mg_min: 200,
          std_maint_mg_max: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

    // ── 4. Candidiasis - CNS / Cardiac step-down ──────────────────────
    {
      id: "candida_cns_cardiac",
      label: "Candidiasis - CNS / Cardiac Step-down（中樞 / 心臟念珠菌降階）",
      desc: "中樞神經或心內膜炎病情穩定後降階至口服維持",
      scenarios: [
        {
          label: "CNS Candidiasis Step-down（中樞神經念珠菌症，降階）",
          note: "持續至 CSF 與影像學完全改善（通常需數月）。",
          preferred: "IV",
          hasLoading: false,
          wt_maint_mg_per_kg_min: 6,
          wt_maint_mg_per_kg_max: 12,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
        {
          label: "Candida endocarditis / Device infection Step-down（心內膜炎 / 裝置感染，降階）",
          note: [
            "裝置感染（無心內膜炎）：移除後 ≥4 週（Generator pocket），導線感染 ≥6 週。",
            "心內膜炎：術後 ≥6 週（人工瓣膜或無法置換者建議長期維持）。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg_min: 6,
          wt_maint_mg_per_kg_max: 12,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
      ],
    },

    // ── 5. Cryptococcal meningitis ────────────────────────────────────
    {
      id: "crypto_consolidation",
      label: "Cryptococcal meningitis - Consolidation（隱球菌腦膜炎，鞏固期）",
      desc: "接續 induction 後，療程 ≥8 週",
      scenarios: [
        {
          label: "Consolidation - Patients with HIV（HIV 病人，鞏固期）",
          note: [
            "療程 ≥8 週。",
            "若以 AmB + flucytosine 完成 induction、CSF 培養陰性、且已開始 ART，",
            "可考慮降至 400 mg QD。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 800,
          freq: "QD",
          usualMaint_mg: 800,
          noteReduced: "部分病人可降至 400 mg QD（見備注）",
        },
        {
          label: "Consolidation - Patients without HIV（非 HIV 病人，鞏固期）",
          note: "療程 8 週。",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
      ],
    },

    {
      id: "crypto_maintenance",
      label: "Cryptococcal meningitis - Maintenance（隱球菌腦膜炎，維持期）",
      desc: "長期口服維持（HIV ≥12 個月；非 HIV 6–12 個月）",
      scenarios: [
        {
          label: "Maintenance - Patients with HIV（HIV 病人，維持期）",
          note: [
            "療程 ≥12 個月。",
            "可停藥條件：抗黴菌治療 ≥12 個月、無症狀、",
            "CD4 ≥100 cells/mm³ 且 HIV RNA 受抑制（若無法測 viral load，",
            "部分專家建議等到 CD4 ≥200）。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
        {
          label: "Maintenance - Patients without HIV（非 HIV 病人，維持期）",
          note: [
            "療程 6–12 個月；高劑量免疫抑制（如大劑量類固醇、alemtuzumab）",
            "或有 cryptococcoma 者療程延長。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 200,
          std_maint_mg_max: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

    // ── 6. Coccidioidomycosis ──────────────────────────────────────────
    {
      id: "coccidioidomycosis",
      label: "Coccidioidomycosis - Meningitis（球黴菌腦膜炎）",
      desc: "需終生治療，復發率高",
      scenarios: [
        {
          label: "Coccidioidomycosis - Meningitis（球黴菌腦膜炎）",
          note: [
            "需終生治療（高復發率）。",
            "起始 800–1200 mg QD，依嚴重度決定。",
            "無法取得 fluconazole 足量時，部分中心改用 itraconazole。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 800,
          std_maint_mg_max: 1200,
          freq: "QD",
          usualMaint_mg: 1200,
        },
      ],
    },

    // ── 7. ICU Prophylaxis ────────────────────────────────────────────
    {
      id: "icu_prophylaxis",
      label: "Prophylaxis - ICU（加護病房預防性投藥）",
      desc: "Off-label，限院內侵襲性念珠菌感染率 >5% 之高風險 ICU",
      scenarios: [
        {
          label: "ICU Prophylaxis（加護病房預防性投藥）",
          note: [
            "Off-label 使用。",
            "適用條件：所在 ICU 侵襲性念珠菌感染發生率 >5%，且患者屬高風險。",
            "廣泛預防性使用可能促進抗藥性，需謹慎評估適應症。",
          ].join(""),
          preferred: "IV",
          hasLoading: true,
          wt_load_mg_per_kg: 12,
          std_load_mg:        800,
          wt_maint_mg_per_kg:  6,
          std_maint_mg:       400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

  ], // ← end of indications


  // ──────────────────────────────────────────────────────────────────────
  // calculate()
  //   接收：dosing_weight（kg）、crcl（mL/min）、rrt（"none"|"hd"|"cvvh"|"pd"）、
  //         hepatic（不顯示，fluconazole 不需調整）、indicationData（已選適應症）
  //   回傳：{ scenarioResults, infoBox }
  // ──────────────────────────────────────────────────────────────────────
  calculate({ dosing_weight, crcl, rrt, indicationData }: any) {

    // ── 腎功能調整倍率（維持量） ──────────────────────────────────────
    const maintFactor: number = (() => {
      if (rrt === "cvvh") return 1.0;   // CRRT 另外處理（劑量上調）
      if (rrt === "hd" || rrt === "pd") return 0.5;
      return crcl <= 50 ? 0.5 : 1.0;
    })();
    // Loading 永遠給足量（不依腎功能減量）
    const loadFactor = 1.0;

    // ── 腎功能說明文字 ────────────────────────────────────────────────
    const renalNote = (() => {
      if (rrt === "cvvh")
        return "CRRT（CVVH/D/HDF）：劑量需增加，因 tubular reabsorption 消失，clearance 增加 1.5–2×";
      if (rrt === "hd")
        return "HD：透析可移除 33–38% fluconazole；透析後補回，透析間隔日可不需額外補給";
      if (rrt === "pd")
        return "PD：腎功能調整同 CrCl ≤50，維持量減半";
      if (crcl <= 50)
        return `CrCl ${Math.round(crcl)} mL/min（≤50）→ 維持量減半；Loading 不減`;
      return `CrCl ${Math.round(crcl)} mL/min（>50）→ 不需調整`;
    })();

    // ── 計算個別 scenario ─────────────────────────────────────────────
    const scenarioResults = indicationData.scenarios.map((sc: any) => {

      // ── CRRT：特殊處理 ──────────────────────────────────────────────
      if (rrt === "cvvh") {
        const crrt = getCRRTDose(sc.usualMaint_mg ?? 400);

        // Loading：若 CRRT 建議有 loading，優先用 CRRT loading；
        //          否則若情境本來有 loading，用情境 loading 劑量
        const crrtLoad_mg = crrt.load_mg ??
          (sc.hasLoading
            ? (sc.wt_load_mg_per_kg
                ? Math.round(dosing_weight * sc.wt_load_mg_per_kg)
                : sc.std_load_mg ?? null)
            : null);

        const rows: any[] = [];
        if (crrtLoad_mg) {
          rows.push({
            label: "Loading dose（Day 1）",
            value: `${crrtLoad_mg} mg IV（${Math.ceil(crrtLoad_mg / IV_MG_PER_VIAL)} 支）`,
            highlight: true,
          });
        }
        rows.push(
          { label: "維持劑量",   value: `${crrt.maint_mg} mg IV`, highlight: true },
          { label: "給藥頻率",   value: crrt.freq,                highlight: true },
          { label: "每次取藥（維持）", value: `${Math.ceil(crrt.maint_mg / IV_MG_PER_VIAL)} 支泰復肯（每支 100 mg / 50 mL）` },
          { label: "稀釋方式",   value: "原液直接輸注，速率 ≤200 mg/hr（建議輸注 ≥30 分鐘）" },
          { label: "腎功能調整", value: renalNote },
        );

        return {
          title: sc.label,
          note: sc.note,
          preferred: "IV",
          subResults: [{
            route: "IV",
            isPreferred: true,
            rows,
            warnings: [
              "⚠️ CRRT 劑量增加原因：Fluconazole 在正常腎功能時有大量 tubular reabsorption。無尿患者此機制消失，CRRT clearance 為正常人的 1.5–2 倍，若維持一般劑量會導致藥物濃度不足",
            ],
          }],
        };
      }

      // ── HD：提供兩種給藥策略 ────────────────────────────────────────
      if (rrt === "hd") {
        // 計算 full 劑量（Loading 不減，維持量取標準值）
        const hdLoad_mg = sc.hasLoading
          ? (sc.wt_load_mg_per_kg
              ? Math.round(dosing_weight * sc.wt_load_mg_per_kg * loadFactor)
              : sc.std_load_mg ?? null)
          : null;

        const hdFullMaint_mg = sc.fixedDose
          ? (sc.std_maint_mg ?? sc.std_maint_mg_max ?? 400)
          : (sc.wt_maint_mg_per_kg
              ? Math.round(dosing_weight * sc.wt_maint_mg_per_kg)
              : sc.wt_maint_mg_per_kg_max
                ? Math.round(dosing_weight * sc.wt_maint_mg_per_kg_max)
                : sc.std_maint_mg ?? sc.std_maint_mg_max ?? 400);

        const hdHalfMaint_mg = Math.round(hdFullMaint_mg * 0.5);

        // 策略一：3x/week 透析後 full dose
        const rows3x: any[] = [];
        if (hdLoad_mg) {
          rows3x.push({
            label: "Loading dose（Day 1）",
            value: `${hdLoad_mg} mg IV（${Math.ceil(hdLoad_mg / IV_MG_PER_VIAL)} 支）`,
            highlight: true,
          });
        }
        rows3x.push(
          { label: "維持劑量（每次）", value: `${hdFullMaint_mg} mg`, highlight: true },
          { label: "給藥頻率",        value: "每週三次，透析後給藥", highlight: true },
          { label: "每次取藥（維持）",
            value: `${Math.ceil(hdFullMaint_mg / IV_MG_PER_VIAL)} 支泰復肯（每支 100 mg）或 ${Math.ceil(hdFullMaint_mg / PO_MG_PER_CAP)} 顆膚黴克膠囊（每顆 50 mg）` },
          { label: "說明", value: "透析可移除 33–38% fluconazole；透析後補足；透析間隔日不需額外補給" },
        );

        // 策略二：每日 QD 劑量減半（透析日透析後給）
        const rowsQD: any[] = [];
        if (hdLoad_mg) {
          rowsQD.push({
            label: "Loading dose（Day 1）",
            value: `${hdLoad_mg} mg IV（${Math.ceil(hdLoad_mg / IV_MG_PER_VIAL)} 支）`,
            highlight: true,
          });
        }
        rowsQD.push(
          { label: "維持劑量",   value: `${hdHalfMaint_mg} mg QD`, highlight: true },
          { label: "給藥頻率",   value: "QD（透析日：透析後給藥）", highlight: true },
          { label: "每次取藥（維持）",
            value: `${Math.ceil(hdHalfMaint_mg / IV_MG_PER_VIAL)} 支泰復肯（每支 100 mg）或 ${Math.ceil(hdHalfMaint_mg / PO_MG_PER_CAP)} 顆膚黴克膠囊（每顆 50 mg）` },
          { label: "說明", value: "每日給藥的替代方案，住院病人管理更方便" },
        );

        return {
          title: sc.label,
          note: sc.note,
          preferred: sc.preferred,
          subResults: [
            {
              customLabel: "✅ 標準 HD 方案（3x/week 透析後）",
              customLabelBg: "#D1FAE5",
              customLabelColor: "#065F46",
              rows: rows3x,
            },
            {
              customLabel: "🔄 替代方案（QD 減量，透析日透析後）",
              customLabelBg: "#EFF6FF",
              customLabelColor: "#1E40AF",
              rows: rowsQD,
            },
          ],
        };
      }

      // ── 一般 CKD / 無透析（含 PD）───────────────────────────────────

      // 計算 loading dose
      let load_mg: number | null = null;
      if (sc.hasLoading) {
        if (sc.wt_load_mg_per_kg) {
          load_mg = Math.round(dosing_weight * sc.wt_load_mg_per_kg * loadFactor);
        } else if (sc.std_load_mg) {
          load_mg = Math.round(sc.std_load_mg * loadFactor);
        }
      }

      // 計算維持劑量（含腎功能 factor）
      let maint_mg: number;
      let maint_display: string;   // 顯示給使用者的字串（可能是範圍）

      if (sc.fixedDose) {
        // 純固定劑量
        if (sc.std_maint_mg_min !== undefined) {
          const lo = Math.round(sc.std_maint_mg_min * maintFactor);
          const hi = Math.round(sc.std_maint_mg_max * maintFactor);
          maint_mg = Math.round((lo + hi) / 2);
          maint_display = lo === hi ? `${lo} mg` : `${lo}–${hi} mg`;
        } else {
          maint_mg = Math.round(sc.std_maint_mg * maintFactor);
          maint_display = `${maint_mg} mg`;
        }
      } else if (sc.wt_maint_mg_per_kg_min !== undefined) {
        // 體重 × 範圍
        const lo = Math.round(dosing_weight * sc.wt_maint_mg_per_kg_min * maintFactor);
        const hi = Math.round(dosing_weight * sc.wt_maint_mg_per_kg_max * maintFactor);
        maint_mg = Math.round((lo + hi) / 2);
        maint_display = lo === hi ? `${lo} mg` : `${lo}–${hi} mg`;
      } else if (sc.wt_maint_mg_per_kg !== undefined) {
        // 體重 × 單一值
        maint_mg = Math.round(dosing_weight * sc.wt_maint_mg_per_kg * maintFactor);
        maint_display = `${maint_mg} mg`;
      } else if (sc.std_maint_mg_min !== undefined) {
        // 固定範圍（非 fixedDose flag）
        const lo = Math.round(sc.std_maint_mg_min * maintFactor);
        const hi = Math.round(sc.std_maint_mg_max * maintFactor);
        maint_mg = Math.round((lo + hi) / 2);
        maint_display = lo === hi ? `${lo} mg` : `${lo}–${hi} mg`;
      } else {
        maint_mg = Math.round(sc.std_maint_mg * maintFactor);
        maint_display = `${maint_mg} mg`;
      }

      const warnings: string[] = [];
      if (maintFactor < 1.0) {
        warnings.push("⚠️ 腎功能調整：維持量已減半。Loading dose 不受影響，以足量給予");
      }
      if (sc.std_maint_mg_min !== undefined || sc.wt_maint_mg_per_kg_min !== undefined) {
        warnings.push("⚖️ 劑量範圍：實際劑量請依感染嚴重度、感受性（MIC）及臨床反應調整");
      }
      if (sc.noteReduced) {
        warnings.push(`💡 ${sc.noteReduced}`);
      }

      // ── 建立 subResults（IV + PO 均提供）────────────────────────────
      const subResults: any[] = [];
      const buildLoadRow = (unit: "IV" | "PO"): any => ({
        label: "Loading dose（Day 1）",
        value: unit === "IV"
          ? `${load_mg} mg IV（${Math.ceil(load_mg! / IV_MG_PER_VIAL)} 支）`
          : `${load_mg} mg PO（${Math.ceil(load_mg! / PO_MG_PER_CAP)} 顆）`,
        highlight: true,
      });

      // IV sub-result
      const ivRows: any[] = [];
      if (load_mg) ivRows.push(buildLoadRow("IV"));
      ivRows.push(
        { label: "維持劑量", value: `${maint_display} IV`, highlight: true },
        { label: "給藥頻率", value: sc.freq ?? "QD", highlight: true },
        { label: "每次取藥（維持）",
          value: `${Math.ceil(maint_mg / IV_MG_PER_VIAL)} 支泰復肯（每支 100 mg / 50 mL）` },
        { label: "稀釋方式",
          value: "原液直接輸注，速率 ≤200 mg/hr（輸注 ≥30 分鐘）" },
        { label: "腎功能調整", value: renalNote },
      );

      subResults.push({
        route: "IV",
        isPreferred: sc.preferred === "IV",
        rows: ivRows,
        warnings: [...warnings],
      });

      // PO sub-result
      const poRows: any[] = [];
      if (load_mg) poRows.push(buildLoadRow("PO"));
      poRows.push(
        { label: "維持劑量", value: `${maint_display} PO`, highlight: true },
        { label: "給藥頻率", value: sc.freq ?? "QD", highlight: true },
        { label: "每次取藥（維持）",
          value: `${Math.ceil(maint_mg / PO_MG_PER_CAP)} 顆膚黴克膠囊（每顆 50 mg）` },
        { label: "腎功能調整", value: renalNote },
      );

      subResults.push({
        route: "PO",
        isPreferred: sc.preferred === "PO",
        rows: poRows,
        warnings: [...warnings],
      });

      return {
        title: sc.label,
        note: sc.note,
        preferred: sc.preferred,
        subResults,
      };
    });

    // ── infoBox：底部臨床提醒 ─────────────────────────────────────────
    return {
      scenarioResults,
      infoBox: {
        text: [
          "🔬 抗黴菌譜：C. krusei 天然抗藥；C. glabrata MIC 偏高（敏感性下降），",
          "建議使用前確認藥敏結果。",
          "⚗️ 藥物交互作用：Fluconazole 強效抑制 CYP2C9 / CYP3A4，",
          "與 warfarin（↑ INR）、tacrolimus、cyclosporine、statins、",
          "phenytoin 等藥物有顯著交互作用，請務必確認並評估調整。",
          "🫀 肝功能：Child-Pugh A–C 均不需調整劑量。",
          "若出現 fluconazole 引起之肝損傷（罕見），",
          "停藥後通常 ≈2 週內恢復，一般不需特別處置。",
        ].join(""),
        bg:     "#FFF7ED",
        border: "#FED7AA",
        color:  "#92400E",
      },
    };
  },
};
