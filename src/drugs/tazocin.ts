import { TAZO_3375_TABLE, TAZO_45_TABLE } from './shared/crclTables';
import type { Drug } from './types';

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
export const tazocin: Drug = {
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
    // ── 熱病通則（不分適應症）──
    // Normal / CrCl ≥20: 4.5 g Q8H over 4hr
    // CrCl <20: 4.5 g Q12H over 4hr
    // HD: 4.5 g Q12H over 4hr
    // CAPD: 無資料
    // CRRT: 3.375–4.5 g Q8H over 4hr
    // SLED（PIRRT）: 僅有傳統輸注資料 4.5 g Q8H，可考慮延長輸注
    const getHotlineDose = () => {
      if (rrt === "hd") {
        return { doseStr: "4.5 g", freq: "Q12H over 4hr（透析後）", vialsStr: "2", note: "熱病 HD 建議" };
      } else if (rrt === "pd") {
        return { doseStr: null, freq: null, vialsStr: null, note: "熱病：CAPD 無資料", noData: true };
      } else if (rrt === "cvvh") {
        return { doseStr: "3.375–4.5 g", freq: "Q8H over 4hr", vialsStr: "1.5–2", note: "熱病 CRRT 建議" };
      } else if (crcl < 20) {
        return { doseStr: "4.5 g", freq: "Q12H over 4hr", vialsStr: "2", note: "CrCl <20" };
      } else {
        return { doseStr: "4.5 g", freq: "Q8H over 4hr", vialsStr: "2", note: "CrCl ≥20，無需調整" };
      }
    };

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      // ── UpToDate 常規劑量 ──
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
      } else if (crcl >= 130) {
        dose_mg = 4500;
        freq = crcl >= 170
          ? "Loading 4.5 g + 22.5 g/day CI"
          : "Q6H over 3hr（延長滴注）";
        note = "ARC 模式";
      } else {
        const match = sc.crclTable.find((row: any) => crcl >= row.min);
        dose_mg = match!.dose_mg;
        freq = match!.freq;
        note = "依 CrCl 調整";
      }

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

      // ── 熱病建議（通則，不分適應症）──
      const hotline = getHotlineDose();

      let hotlineRows;
      if (hotline.noData) {
        hotlineRows = [
          { label: "建議劑量", value: "無資料", highlight: true },
          { label: "說明", value: hotline.note },
        ];
      } else {
        hotlineRows = [
          { label: "建議劑量", value: `${hotline.doseStr} IV`, highlight: true },
          { label: "給藥頻率", value: hotline.freq, highlight: true },
          { label: "每次取藥", value: `${hotline.vialsStr} 支帝斯坦` },
          { label: "調整依據", value: hotline.note },
        ];
      }

      return {
        title: sc.title || sc.label,
        note: sc.note,
        subResults: [
          {
            customLabel: "📘 UpToDate 常規劑量",
            customLabelBg: "#FEF3C7",
            customLabelColor: "#92400E",
            rows,
          },
          {
            customLabel: "🔥 熱病建議（延長滴注）",
            customLabelBg: "#FEE2E2",
            customLabelColor: "#991B1B",
            rows: hotlineRows,
            warnings: [
              "熱病通則：不分適應症一律採延長滴注。急重症傾向積極抗生素給予",
            ],
          },
        ],
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
};
