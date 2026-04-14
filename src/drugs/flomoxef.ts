import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Flumarin / Flomoxef（日本藥，無 UpToDate 資料）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Flumarin 針（氟黴寧靜脈注射劑）1 g/Vial
//
// 資料來源（兩版本並列，使用者自行判斷）：
//   - 院內處方集版本：醫院正式文件（較保守）
//   - 臨床藥師前輩版本：2 g Q8H 為台灣臨床常用
//
// 特性：
//   - 3 代頭孢，G+/G-/厭氧皆涵蓋（不涵蓋 PsA、AB）
//   - 不需要體重（固定劑量）
//   - 不需要肝功能評估
// ═══════════════════════════════════════════════════════════════

// ── 院內處方集版本 ──────────────────────────────────────
const HOSPITAL_TABLE = [
  { min: 80, total_mg: 4000, freq: "Q6H 或 Q8H（例：1 g Q6H）", dose_str: "4 g/day" },
  { min: 50, total_mg: 3000, freq: "Q8H",  dose_str: "3 g/day（1 g Q8H）" },
  { min: 25, total_mg: 2000, freq: "Q12H", dose_str: "2 g/day（1 g Q12H）" },
  { min: 5,  total_mg: 1000, freq: "Q24H", dose_str: "1 g/day（1 g Q24H）" },
  { min: 0,  total_mg: 500,  freq: "Q24H", dose_str: "0.5 g/day" },
];

// ── 前輩版本 ────────────────────────────────────────────
const SENIOR_TABLE = [
  { min: 50, single_mg: 2000, freq: "Q8H",  label: "2 g Q8H（6 g/day）" },
  { min: 25, single_mg: 1000, freq: "Q8H",  label: "1 g Q8H（3 g/day）" },
  { min: 12, single_mg: 1000, freq: "Q12H", label: "1 g Q12H（2 g/day）" },
  { min: 0,  single_mg: 1000, freq: "Q24H", label: "1 g Q24H（1 g/day）" },
];

export const flomoxef: Drug = {
  name: "Flumarin",
  subtitle: "Flomoxef",
  searchTerms: [
    "flumarin", "flomoxef", "氟黴寧",
    "flumarin 針", "3 代頭孢", "3rd gen cephalosporin",
    "carbapenem sparing", "ESBL", "日本藥"
  ],

  needsRenal: true,
  needsWeight: false,
  needsHepatic: false,

  indications: [
    {
      id: "general",
      label: "一般感染",
      desc: "兩版本並列，使用者自行判斷",
      scenarios: [
        {
          label: "一般感染",
          note: "適用於 IAI、糖尿病足、UTI 等以 GNB（含 ESBL）為主的感染。院內處方集與臨床前輩建議劑量不同，請參考下方兩版本並依臨床判斷。",
        },
      ],
    },
  ],

  calculate({ crcl, rrt, indicationData }) {
    const scenario = indicationData.scenarios[0];
    const subResults: any[] = [];

    // ── 院內處方集建議 ──
    let hospitalRows: any[];
    if (rrt === "hd") {
      hospitalRows = [
        { label: "建議劑量", value: "1 g Q24H", highlight: true },
        { label: "給藥頻率", value: "Q24H（HD 日透析後給藥）" },
        { label: "每次取藥", value: "1 支 Flumarin" },
        { label: "備註", value: "院內處方集未明列 HD，比照 CrCl <5" },
      ];
    } else if (rrt === "pd") {
      hospitalRows = [
        { label: "建議劑量", value: "1 g Q24H", highlight: true },
        { label: "給藥頻率", value: "Q24H" },
        { label: "每次取藥", value: "1 支 Flumarin" },
        { label: "備註", value: "院內處方集未明列 PD，建議比照 HD" },
      ];
    } else if (rrt === "cvvh") {
      hospitalRows = [
        { label: "建議劑量", value: "1 g Q12H", highlight: true },
        { label: "給藥頻率", value: "Q12H" },
        { label: "每次取藥", value: "1 支 Flumarin" },
        { label: "備註", value: "院內處方集未明列 CVVH，介於 CrCl 25–50 與 5–25 之間" },
      ];
    } else {
      const match = HOSPITAL_TABLE.find((row: any) => crcl >= row.min);
      hospitalRows = [
        { label: "建議劑量", value: match!.dose_str, highlight: true },
        { label: "給藥頻率", value: match!.freq },
        { label: "每日總量", value: `${match!.total_mg / 1000} g/day` },
      ];
      if (crcl >= 80) {
        hospitalRows.push({ label: "備註", value: "院內處方集未明列 >80，依文件提及上限" });
      }
    }

    subResults.push({
      customLabel: "📋 院內處方集",
      customLabelBg: "#DBEAFE",
      customLabelColor: "#1E40AF",
      isPreferred: false,
      rows: hospitalRows,
    });

    // ── 前輩版本建議 ──
    let seniorRows: any[];
    if (rrt === "hd") {
      seniorRows = [
        { label: "建議劑量", value: "1 g Q24H", highlight: true },
        { label: "給藥頻率", value: "Q24H（HD 日透析後給藥）" },
        { label: "每次取藥", value: "1 支 Flumarin" },
      ];
    } else if (rrt === "pd") {
      seniorRows = [
        { label: "建議劑量", value: "1 g Q24H", highlight: true },
        { label: "給藥頻率", value: "Q24H" },
        { label: "每次取藥", value: "1 支 Flumarin" },
        { label: "備註", value: "比照 HD" },
      ];
    } else if (rrt === "cvvh") {
      seniorRows = [
        { label: "建議劑量", value: "2 g Q12H", highlight: true },
        { label: "給藥頻率", value: "Q12H" },
        { label: "每次取藥", value: "2 支 Flumarin" },
        { label: "備註", value: "介於 Full dose 與 HD 之間" },
      ];
    } else {
      const match = SENIOR_TABLE.find((row: any) => crcl >= row.min);
      const vials = match!.single_mg / 1000;
      seniorRows = [
        { label: "建議劑量", value: match!.label, highlight: true },
        { label: "給藥頻率", value: match!.freq },
        { label: "每次取藥", value: `${vials} 支 Flumarin` },
      ];
    }

    subResults.push({
      customLabel: "📖 前輩經驗",
      customLabelBg: "#FEF3C7",
      customLabelColor: "#92400E",
      isPreferred: false,
      rows: seniorRows,
    });

    return {
      scenarioResults: [
        {
          title: scenario.label,
          note: scenario.note,
          subResults,
        },
      ],
      infoBox: {
        text: "⚠️ 此藥物無 UpToDate 資料。上方兩版本來自不同來源：「院內處方集」為醫院正式文件（較保守）；「前輩經驗」為臨床藥師前輩依台灣本土研究整理（常規 2 g Q8H）。請依臨床情境判斷採用。詳細背景請展開下方「臨床參考」。",
        bg: "#FEF3C7",
        border: "#F59E0B",
        color: "#92400E",
      },
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // 臨床參考（整理自臨床藥師前輩經驗分享，非 UpToDate 資料）
  // ═══════════════════════════════════════════════════════════════
  clinicalPearls: {
    title: "臨床參考（非 UpToDate）",
    sections: [
      {
        heading: "藥品簡介",
        body: "Flumarin® (flomoxef 1 g/vial) 為日本鹽野義公司製造的 3 代頭孢菌素，G+、G-、厭氧菌皆有涵蓋，特性類似同樣不覆蓋 PsA 的 Ertapenem。",
      },
      {
        heading: "抗菌譜",
        body:
          "• GNB（主打強項）:E. coli、KP、Proteus 等腸桿菌科，含 ESBL 抗藥腸桿菌科，為 carbapenem-sparing 的好選擇。在 ESBL E. coli UTI 療效等同 cefmetazole、imipenem（因尿中濃縮 + ESBL 軍團 E. coli 為最弱一隻）。\n" +
          "• GPC：MSSA 與 Streptococcus「還算」有效（略弱於 cefazolin 與 cefotaxime）。\n" +
          "• 厭氧菌：B. fragilis、Peptostreptococcus、C. difficile（但未見用於治療 CDI）。\n" +
          "• 不涵蓋：PsA、Acinetobacter。",
      },
      {
        heading: "藥物分布",
        body:
          "血液、軟組織、尿中濃度皆佳；血中有濃度的藥物多能分布到肺部作用。\n" +
          "仿單載：可移行到膽汁、喀痰、腹腔/骨盆腔滲出液、膽囊、子宮（含附屬器官）、中耳黏膜、肺組織等。母乳中濃度低（靜注 1 g 後母乳 <0.5 μg/mL）。",
      },
      {
        heading: "治療角色",
        body:
          "• 主要價值：針對 GNB，特別是 ESBL 抗藥腸桿菌科，作為升級 carbapenem 前的選擇。治療 IAI 或糖尿病足壞疽（可能 ESBL + 厭氧）特別適合。其他選項：cefmetazole、ertapenem、moxifloxacin。\n" +
          "• 對 GPC 仍有一定療效（呼吸道常見陽性菌 MIC 低）。\n" +
          "• 屬廣效前線用藥，呼吸道、腹內、UTI 皆可。\n" +
          "• 研究顯示 IAI 等 GNB 感染才是強項；呼吸道、表皮感染可用，但不是頂好。",
      },
      {
        heading: "複合感染選藥策略",
        body:
          "• UTI 為主 + 肺炎為輔：Flomoxef 可用；或病人 QTc <450 ms 時 Cravit 亦是好選擇（UTI、肺炎皆可涵蓋）。\n" +
          "• 肺炎為主 + UTI 為輔：Tazocin、Cefepime 較適合；Cravit 依舊 OK。（Brosym 在 UTI 效果不好；Sintrix 腎排除比例偏低，雖可用但不優先）。",
      },
      {
        heading: "腦膜炎？",
        body:
          "傳統上認為 Flomoxef BBB 穿透差（類似 cefoperazone），不用於腦膜炎。\n" +
          "但有研究顯示神經術後 1 g IV bolus 6 hr 時 CSF 濃度可達 0.75 μg/mL（>多數 GPC/GNB MIC）；另一小兒腦膜炎研究，100 mg/kg 後 1 hr CSF 濃度 2–6 μg/mL（CSF/serum 2–5%），20 例中 18 例有效。\n" +
          "對照其他藥物 CSF/serum：ceftazidime 23.5%、ceftriaxone 8.6%、cefotaxime 18%、vancomycin 87%（發炎時）、meropenem 21%。\n" +
          "結論：「可以，但有更好、更有資料的選擇，何苦冒險？」針對病原菌選有佐證的藥物（如 3 代 cefa、ertapenem、ampicillin、vancomycin、metronidazole）較合理。",
      },
      {
        heading: "劑量版本差異說明",
        body:
          "【院內處方集版本】\n" +
          "• CrCl >80：4 g/day（文件提及上限）\n" +
          "• CrCl 50–80：3 g/day\n" +
          "• CrCl 25–50：2 g/day\n" +
          "• CrCl 5–25：1 g/day\n" +
          "• CrCl <5：0.5 g/day\n\n" +
          "【臨床藥師前輩版本】\n" +
          "日本藥，歐美資料庫多數沒有。仿單多用 2 g Q12H 作 full dose，但台灣早期研究顯示 2 g Q8H 效果好、副作用低，已成臨床常規。\n" +
          "• Full dose（CrCl ≥50）：2 g Q8H（6 g/day）\n" +
          "• CrCl 25–50：1 g Q8H（3 g/day）\n" +
          "• CrCl 12–25：1 g Q12H（2 g/day）\n" +
          "• CrCl <12：1 g QD（1 g/day）\n" +
          "• HD：1 g QD（HD 日透析後給藥）\n\n" +
          "前輩版本腎調參考同為日本藥物的 cefmetazole（藥動相似），依日本私立醫院協會 manual p.30 整理。",
      },
      {
        heading: "副作用",
        body:
          "• 相對安全。\n" +
          "• 結構含 NHTT（非 NMTT），INR 增加、出血風險低於 cefmetazole 與 cefoperazone。\n" +
          "• 留意肝指數上升。",
      },
      {
        heading: "保存",
        body: "泡製後常溫僅能存放 6 hr；冷藏 24 hr。",
      },
    ],
  },
};
