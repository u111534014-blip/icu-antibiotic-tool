import { BROSYM_STANDARD_TABLE, BROSYM_HIGH_TABLE } from './shared/crclTables';
import { round2 } from './shared/helpers';
import type { Drug } from './types';

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
export const brosym: Drug = {
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
};
