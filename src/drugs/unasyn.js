import { UNASYN_3G_TABLE, UNASYN_15_3G_TABLE, UNASYN_MDR_AB_TABLE } from './shared/crclTables';
import { round2 } from './shared/helpers';

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
export const unasyn = {
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
};
