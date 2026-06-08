import { STANDARD_1G_TABLE, STANDARD_2G_TABLE } from './shared/crclTables';
import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Mepem (Meropenem)
// ═══════════════════════════════════════════════════════════════
// 院內品項：麥羅乾粉注射劑 500 mg/Vial
//
// 給藥方法：
//   - Traditional infusion: 30 min
//   - Extended infusion (off-label): 3 hr（重症首選）
//   - Continuous infusion (off-label): 8 or 12 hr
//
// 肝功能：CTP A–C 不調整
// ECMO：不需額外調整（依腎功能）
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 500;

function toVials(mg: number): string {
  const v = Math.ceil(mg / MG_PER_VIAL);
  return `${v} 支麥羅（每支 500 mg）`;
}

function doseStr(mg: number): string {
  return mg >= 1000 ? `${mg / 1000} g` : `${mg} mg`;
}

// ── 統一的 lookupDose ────────────────────────────────────────
function lookupDose(sc: any, crcl: number, rrt: string): { dose_mg: number; freq: string; note: string } {
  if (rrt === "hd") return { ...sc.hdDose, note: "HD：透析後給藥" };
  if (rrt === "pd") return { ...sc.hdDose, note: "PD：建議同 HD" };
  if (rrt === "cvvh") return { ...sc.cvvhDose, note: "CRRT / CVVH" };
  const match = sc.crclTable.find((row: any) => crcl >= row.min);
  return { dose_mg: match!.dose_mg, freq: match!.freq, note: `CrCl ${Math.round(crcl)} → 依表調整` };
}

function lookupEscalation(crcl: number, rrt: string): { dose_mg: number; freq: string; note: string } {
  if (rrt === "hd") return { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）", note: "HD" };
  if (rrt === "pd") return { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H", note: "PD" };
  if (rrt === "cvvh") return { dose_mg: 1000, freq: "Q8H", note: "CRRT" };
  const match = STANDARD_2G_TABLE.find((row: any) => crcl >= row.min);
  return { dose_mg: match!.dose_mg, freq: match!.freq, note: `CrCl ${Math.round(crcl)} → 升級劑量` };
}

export const mepem: Drug = {
  name: "Mepem",
  subtitle: "Meropenem",
  infusionTime: "30 min（傳統）/ 3 hr（延長滴注）",
  needsRenal: true,
  needsWeight: false,
  needsHepatic: false,
  searchTerms: [
    "mepem", "meropenem", "carbapenem",
    "麥羅", "美平",
  ],

  indications: [
    {
      id: "iai", label: "Intra-abdominal infection（腹腔內感染）", desc: "院內或高風險社區型；ESBL 風險",
      scenarios: [
        { label: "Acute uncomplicated cholecystitis（急性單純膽囊炎）", note: "膽囊切除後再給 1 天或保守治療直至臨床改善", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
        { label: "其他 IAI（膽管炎、複雜性膽囊炎、闌尾炎、憩室炎、腹腔內膿瘍）", note: "Source control 後總療程 4–5 天", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
      ],
    },
    {
      id: "bsi", label: "Bloodstream infection（菌血症）", desc: "Gram-negative，含 P. aeruginosa",
      scenarios: [
        { label: "革蘭氏陰性菌血症", note: "重症或 MIC 偏高時可考慮 2 g Q8H。療程 7–14 天", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
      ],
    },
    {
      id: "pneumonia", label: "Pneumonia（肺炎）", desc: "CAP / HAP / VAP",
      scenarios: [
        { label: "Community-acquired pneumonia（CAP）", note: "需合併其他藥物。最少 5 天", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
        { label: "HAP / VAP", note: "MDR GNB。療程通常 7 天。重症建議延長/連續滴注", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
      ],
    },
    {
      id: "meningitis", label: "Meningitis, bacterial（細菌性腦膜炎）", desc: "院內、免疫低下、抗藥性 GNB",
      scenarios: [
        { label: "細菌性腦膜炎", note: "療程 7–21 天。抗藥菌建議延長/連續滴注", crclTable: STANDARD_2G_TABLE, hdDose: { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "2 g Q8H" },
      ],
    },
    {
      id: "cnsAbscess", label: "Intracranial / Spinal epidural abscess（顱內/脊髓膿瘍）", desc: "",
      scenarios: [
        { label: "顱內或脊髓硬膜外膿瘍", note: "需合併用藥。脊髓 4–8 週；腦部 6–8 週", crclTable: STANDARD_2G_TABLE, hdDose: { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "2 g Q8H" },
      ],
    },
    {
      id: "sepsis", label: "Sepsis / Septic shock（敗血症）", desc: "敗血症 / 敗血性休克",
      scenarios: [
        { label: "敗血症 / 敗血性休克", note: "識別後盡速給藥。重症首選延長/連續滴注", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1–2 g Q8H" },
      ],
    },
    {
      id: "neutropenicFever", label: "Neutropenic fever, high-risk（高風險嗜中性球低下發燒）", desc: "癌症 empiric",
      scenarios: [
        { label: "高風險嗜中性球低下發燒", note: "持續至退燒 ≥48hr 且 ANC ≥500。重症首選延長/連續滴注", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
      ],
    },
    {
      id: "ssti", label: "Skin & Soft Tissue Infection（中重度 SSTI）", desc: "",
      scenarios: [
        { label: "中重度 SSTI", note: "壞死性感染、MDR 病原。療程 5–14 天", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
      ],
    },
    {
      id: "uti", label: "Complicated UTI / Pyelonephritis（複雜性 UTI）", desc: "MDR 風險",
      scenarios: [
        { label: "複雜性 UTI", note: "保留給重症或 MDR 風險。48hr 改善者 5–7 天", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1–2 g Q8H" },
      ],
    },
    {
      id: "diabeticFoot", label: "Diabetic foot infection（糖尿病足）", desc: "P. aeruginosa 風險",
      scenarios: [
        { label: "中重度糖尿病足感染", note: "療程通常 2–4 週（無骨髓炎時）", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
      ],
    },
    {
      id: "osteomyelitis", label: "Osteomyelitis / Discitis（骨髓炎）", desc: "",
      scenarios: [
        { label: "骨髓炎 / 椎間盤炎", note: "Empiric 合併治療。通常 6 週", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
      ],
    },
    {
      id: "pji", label: "Prosthetic joint infection（人工關節感染）", desc: "MDR GNB",
      scenarios: [
        { label: "人工關節感染（MDR GNB）", note: "通常 4–6 週", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
      ],
    },
    {
      id: "cysticFibrosis", label: "Cystic fibrosis, pulmonary exacerbation（CF 急性肺惡化）", desc: "",
      scenarios: [
        { label: "CF 急性肺部惡化", note: "通常合併治療。10–14 天。建議延長/連續滴注", crclTable: STANDARD_2G_TABLE, hdDose: { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "2 g Q8H" },
      ],
    },
    {
      id: "sbp", label: "Spontaneous bacterial peritonitis（SBP）", desc: "重症或 MDR 風險",
      scenarios: [
        { label: "SBP", note: "療程 5–7 天", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H" },
      ],
    },
    {
      id: "anthrax", label: "Anthrax, systemic（全身性炭疽）", desc: "含腦膜炎",
      scenarios: [
        { label: "全身性炭疽（含腦膜炎）", note: "需合併用藥。≥2 週，腦膜炎 ≥3 週。氣溶膠暴露 60 天", crclTable: STANDARD_2G_TABLE, hdDose: { dose_mg: 1000, freq: "Q24H 或 500 mg Q12H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "2 g Q8H" },
      ],
    },
    {
      id: "melioidosis", label: "Melioidosis / Glanders（類鼻疽 / 鼻疽）", desc: "Initial intensive therapy",
      scenarios: [
        { label: "類鼻疽 / 鼻疽 — 初期密集治療", note: "≥14 天；CNS 用 2 g Q8H。完成後接口服 ≥12 週", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1 g Q8H（CNS：2 g Q8H）" },
      ],
    },
    {
      id: "nocardiosis", label: "Nocardiosis, severe（嚴重諾卡氏菌感染）", desc: "替代藥物",
      scenarios: [
        { label: "嚴重諾卡氏菌感染", note: "需合併用藥。療程 6 個月至 ≥1 年", crclTable: STANDARD_1G_TABLE, allowEscalation: true, hdDose: { dose_mg: 500, freq: "Q24H（透析後）" }, cvvhDose: { dose_mg: 1000, freq: "Q8H" }, usualDoseLabel: "1–2 g Q8H" },
      ],
    },
  ],

  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const rows: any[] = [];
      const warnings: string[] = [];

      // ── 適應症常規劑量 ──
      rows.push({ label: "適應症常規劑量", value: sc.usualDoseLabel });

      // ── 常規劑量（腎調後）──
      const reg = lookupDose(sc, crcl, rrt);
      rows.push({ label: "建議劑量", value: `${doseStr(reg.dose_mg)} IV ${reg.freq}`, highlight: true });
      rows.push({ label: "每次取藥", value: toVials(reg.dose_mg) });
      rows.push({ label: "調整依據", value: reg.note });

      // ── 升級劑量（若允許）──
      if (sc.allowEscalation) {
        const esc = lookupEscalation(crcl, rrt);
        rows.push({ label: "── 升級劑量 ──", value: "" });
        rows.push({ label: "⬆️ 升級劑量", value: `${doseStr(esc.dose_mg)} IV ${esc.freq}`, highlight: true });
        rows.push({ label: "每次取藥", value: toVials(esc.dose_mg) });
        warnings.push("升級劑量適用於：重症、MIC 偏高、對常規劑量反應不佳。建議合併延長/連續滴注");
      }

      // ── ARC ──
      if (rrt === "none" && crcl >= 130) {
        warnings.push("⚡ ARC（CrCl ≥130）：可能需更高劑量或延長/連續滴注。建議 2 g Q8H over 3hr");
      }

      // ── 延長滴注提醒 ──
      warnings.push("🕒 重症建議延長滴注（Extended Infusion）3 小時，PK/PD 更佳");

      if (sc.note) rows.push({ label: "療程與備註", value: sc.note });

      return { title: sc.label, rows, warnings };
    });

    return { scenarioResults };
  },

  clinicalPearls: {
    title: "臨床參考",
    sections: [
      {
        heading: "藥物特性",
        body:
          "• Carbapenem 類（最廣譜 β-lactam）\n" +
          "• 院內品項：麥羅乾粉注射劑 500 mg/Vial\n" +
          "• 腎功能排除（100% 腎排泄）\n" +
          "• 肝功能 CTP A–C 不調整\n" +
          "• ECMO：不需額外調整",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• ESBL-producing Enterobacterales\n" +
          "• Pseudomonas aeruginosa（MIC breakpoint 2 mg/L）\n" +
          "• Anaerobes（含 B. fragilis）\n" +
          "• Nocardia（部分）\n" +
          "• Burkholderia pseudomallei（類鼻疽）\n\n" +
          "【不涵蓋】\n" +
          "• MRSA\n" +
          "• Stenotrophomonas maltophilia（天然抗藥）\n" +
          "• CRE / CRAB（需合併用藥或替代方案）\n" +
          "• Atypical pathogens（Mycoplasma、Legionella）",
      },
      {
        heading: "劑量速查",
        body:
          "【1 g Q8H】大部分適應症（IAI、BSI、肺炎、SSTI、UTI、敗血症、neutropenic fever）\n" +
          "【2 g Q8H】腦膜炎、CNS 膿瘍、CF、炭疽、類鼻疽 CNS\n" +
          "【升級】重症或 MIC 偏高時 1 g → 2 g Q8H",
      },
      {
        heading: "腎功能調整（UpToDate，1 g Q8H 基準）",
        body:
          "CrCl ≥50：1 g Q8H（不調整）\n" +
          "CrCl 25-49：1 g Q12H\n" +
          "CrCl 10-24：500 mg Q12H\n" +
          "CrCl <10：500 mg Q24H\n" +
          "HD：500 mg Q24H（透析後）\n" +
          "CRRT：1 g Q8H\n" +
          "ARC (≥130)：考慮 2 g Q8H over 3hr",
      },
      {
        heading: "給藥方法",
        body:
          "【Traditional】30 min（一般情境）\n" +
          "【Extended infusion】3 hr（重症首選！PK/PD 更佳，%T>MIC 更高）\n" +
          "【Continuous infusion】8-12 hr（文獻支持但實務較少用）\n\n" +
          "以下情況首選延長滴注：重症、MIC 偏高（≥2 mg/L）、ARC、Pseudomonas",
      },
      {
        heading: "Seizure 風險",
        body:
          "• Meropenem 的 seizure 風險比 imipenem 低\n" +
          "• 但腎功能不全 + 過量仍有風險\n" +
          "• 不降低 seizure threshold（vs imipenem）",
      },
    ],
  },
};