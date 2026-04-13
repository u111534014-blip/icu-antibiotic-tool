import { STANDARD_1G_TABLE, STANDARD_2G_TABLE } from './shared/crclTables';
import type { Drug } from './types';

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
export const mepem: Drug = {
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
          allowEscalation: true,
          hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
          cvvhDose: { dose_mg: 1000, freq: "Q8H" },
          usualDoseLabel: "1 g Q8H",
        },
        {
          label: "其他 IAI（膽管炎、複雜性膽囊炎、闌尾炎、憩室炎、腹腔內膿瘍）",
          note: "Source control 後總療程 4–5 天；穿孔性闌尾炎術後 2–4 天可能足夠",
          preferred: "IV",
          crclTable: STANDARD_1G_TABLE,
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
          hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
          cvvhDose: { dose_mg: 1000, freq: "Q8H" },
          usualDoseLabel: "1 g Q8H",
        },
        {
          label: "Hospital-acquired / Ventilator-associated pneumonia（HAP / VAP）",
          note: "MDR 革蘭氏陰性菌（P. aeruginosa、Acinetobacter、ESBL）。療程通常 7 天；重症建議延長/連續滴注",
          preferred: "IV",
          crclTable: STANDARD_1G_TABLE,
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
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
          allowEscalation: true,
          hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
          cvvhDose: { dose_mg: 1000, freq: "Q8H" },
          usualDoseLabel: "1–2 g Q8H",
        },
      ],
    },
  ],

  extraFields: [],

  calculate({ crcl, rrt, indicationData }) {
    // Helper：依 RRT 或 CrCl 從劑量表查詢實際劑量
    const lookupDose = (sc: any, table: any) => {
      if (rrt === "hd") {
        return { dose_mg: sc.hdDose.dose_mg, freq: sc.hdDose.freq, note: "HD 模式" };
      } else if (rrt === "pd") {
        return { dose_mg: sc.hdDose.dose_mg, freq: sc.hdDose.freq, note: "PD 模式（建議同 HD）" };
      } else if (rrt === "cvvh") {
        return { dose_mg: sc.cvvhDose.dose_mg, freq: sc.cvvhDose.freq, note: "CVVH / CVVHDF 模式" };
      } else {
        const match = table.find((row: any) => crcl >= row.min);
        return { dose_mg: match!.dose_mg, freq: match!.freq, note: "依 CrCl 調整" };
      }
    };

    // Helper：把劑量資料轉成顯示用 rows
    const buildRows = (sc: any, doseInfo: any, useTable: any) => {
      const vials = Math.ceil(doseInfo.dose_mg / 500);
      const dose_str = doseInfo.dose_mg >= 1000 ? `${doseInfo.dose_mg / 1000} g` : `${doseInfo.dose_mg} mg`;

      const rows = [
        { label: "適應症常規劑量", value: useTable === "2g" ? "2 g Q8H" : sc.usualDoseLabel },
        { label: "建議劑量", value: `${dose_str} IV`, highlight: true },
        { label: "給藥頻率", value: doseInfo.freq, highlight: true },
        { label: "每次取藥", value: `${vials} 支麥羅（每支 500 mg）` },
        { label: "調整依據", value: doseInfo.note },
      ];

      if (rrt === "none" && crcl >= 130) {
        rows.push({ label: "⚠️ ARC", value: "CrCl ≥130：可能需更高劑量或延長/連續滴注" });
      }
      return rows;
    };

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const subResults: any[] = [];

      // ── 常規劑量 ──
      const regularDose = lookupDose(sc, sc.crclTable);
      subResults.push({
        customLabel: "常規劑量",
        customLabelBg: "#FEF3C7",
        customLabelColor: "#92400E",
        rows: buildRows(sc, regularDose, "regular"),
      });

      // ── 升級劑量（若 scenario 允許）──
      if (sc.allowEscalation) {
        // 升級永遠用 STANDARD_2G_TABLE，但 HD/PD/CVVH 用 escalation 專用 dose
        const escalDoseInfo = (() => {
          if (rrt === "hd") {
            return { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）", note: "HD 模式" };
          } else if (rrt === "pd") {
            return { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H", note: "PD 模式（建議同 HD）" };
          } else if (rrt === "cvvh") {
            return { dose_mg: 1000, freq: "Q8H", note: "CVVH / CVVHDF 模式" };
          } else {
            const match = STANDARD_2G_TABLE.find((row: any) => crcl >= row.min);
            return { dose_mg: match!.dose_mg, freq: match!.freq, note: "依 CrCl 調整" };
          }
        })();

        subResults.push({
          customLabel: "⬆️ 升級劑量",
          customLabelBg: "#FEE2E2",
          customLabelColor: "#991B1B",
          rows: buildRows(sc, escalDoseInfo, "2g"),
          warnings: [
            "重症、致病菌 MIC 偏高、或對常規劑量反應不佳時，部分專家建議升級至 2 g Q8H（合併延長/連續滴注更佳）",
          ],
        });
      }

      return {
        title: sc.label,
        subResults,
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
};
