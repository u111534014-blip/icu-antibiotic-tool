import type { Drug } from "./types";

type DosePlan = {
  loading: string;
  maintenance: string;
  frequency: string;
  vialUse: string;
  renalNote: string;
  warnings: string[];
};

function getDosePlan(crcl: number, rrt: string): DosePlan {
  if (rrt === "hd") {
    return {
      loading: "1.33 g（aztreonam 1 g / avibactam 0.33 g）",
      maintenance: "0.9 g（aztreonam 0.675 g / avibactam 0.225 g）",
      frequency: "Q12H",
      vialUse: "LD 回溶液 7.6 mL；MD 回溶液 5.1 mL",
      renalNote: "Intermittent HD：透析日於 HD 後給藥。",
      warnings: [],
    };
  }
  if (rrt === "pd") {
    return {
      loading: "尚無確立劑量",
      maintenance: "尚無確立劑量",
      frequency: "—",
      vialUse: "—",
      renalNote: "腹膜透析資料不足，不可直接套用 HD 劑量；請會診感染科與臨床藥師個別化。",
      warnings: ["仿單對非 HD 的 renal replacement therapy 資料不足。"],
    };
  }
  if (rrt === "cvvh") {
    return {
      loading: "尚無確立劑量",
      maintenance: "依 CLCRRT、感染嚴重度與 MIC 個別化",
      frequency: "—",
      vialUse: "—",
      renalNote: "CRRT/CVVHDF 可能需要高於重度 CKD 的劑量；仿單無標準 regimen。",
      warnings: ["文獻僅有少量個案資料；不可把單一 CVVHDF case regimen 當作常規處方。"],
    };
  }
  if (crcl <= 15) {
    return {
      loading: "1.33 g（aztreonam 1 g / avibactam 0.33 g）",
      maintenance: "0.9 g（aztreonam 0.675 g / avibactam 0.225 g）",
      frequency: "Q12H",
      vialUse: "LD 回溶液 7.6 mL；MD 回溶液 5.1 mL",
      renalNote: "CrCl <=15 mL/min：LD 1.33 g once，then 0.9 g Q12H。",
      warnings: ["台灣仿單註明：CrCl <=15 mL/min 者若尚未開始 HD 或其他 RRT，不建議使用。UpToDate／Sanford 仍列上述劑量；實務使用時請由感染科與臨床藥師依腎功能趨勢、感染嚴重度及是否即將開始 RRT 個別評估。"],
    };
  }
  if (crcl <= 30) {
    return {
      loading: "1.8 g（aztreonam 1.35 g / avibactam 0.45 g）",
      maintenance: "0.9 g（aztreonam 0.675 g / avibactam 0.225 g）",
      frequency: "Q8H",
      vialUse: "LD 回溶液 10.3 mL；MD 回溶液 5.1 mL",
      renalNote: "CrCl >15 to <=30 mL/min。",
      warnings: [],
    };
  }
  if (crcl <= 50) {
    return {
      loading: "2.67 g（aztreonam 2 g / avibactam 0.67 g）",
      maintenance: "1 g（aztreonam 0.75 g / avibactam 0.25 g）",
      frequency: "Q6H",
      vialUse: "LD 回溶液 15.2 mL；MD 回溶液 5.7 mL",
      renalNote: "CrCl >30 to <=50 mL/min。",
      warnings: [],
    };
  }
  return {
    loading: "2.67 g（aztreonam 2 g / avibactam 0.67 g）",
    maintenance: "2 g（aztreonam 1.5 g / avibactam 0.5 g）",
    frequency: "Q6H",
    vialUse: "LD 回溶液 15.2 mL；MD 回溶液 11.4 mL",
    renalNote: "CrCl >50 mL/min：不需調整。",
    warnings: [],
  };
}

export const emblaveo: Drug = {
  name: "Emblaveo",
  subtitle: "Aztreonam / Avibactam 1.5 g / 0.5 g",
  infusionTime: "每一劑皆輸注 3 小時",
  searchTerms: ["emblaveo", "恩必復", "aztreonam", "avibactam", "ATM-AVI", "AZT-AVI"],
  needsRenal: true,
  needsWeight: false,
  needsHepatic: false,
  indications: [
    {
      id: "ndm_enterobacterales",
      label: "NDM / MBL-producing Enterobacterales（產金屬 β-內醯胺酶腸桿菌目）",
      desc: "IDSA preferred option；先確認 susceptibility",
      scenarios: [{
        label: "NDM / MBL-producing Enterobacterales invasive infection（產金屬 β-內醯胺酶腸桿菌目侵襲性感染）",
        note: "IDSA 2026 將 aztreonam-avibactam 列為 NDM-producing Enterobacterales 的 preferred option。若藥品不可得，ceftazidime-avibactam + aztreonam 才是替代策略。",
      }],
    },
    {
      id: "ciai",
      label: "Complicated intra-abdominal infection（複雜性腹腔內感染）",
      desc: "+ metronidazole；仿單 5-10 天",
      scenarios: [{
        label: "Complicated intra-abdominal infection（複雜性腹腔內感染）",
        note: "必須合併 metronidazole 補 anaerobic coverage，並重視 source control。台灣仿單療程 5-10 天，實際療程依 source control 與臨床反應決定。",
      }],
    },
    {
      id: "hap_vap",
      label: "HAP / VAP（院內／呼吸器相關肺炎）",
      desc: "仿單 7-14 天",
      scenarios: [{
        label: "Hospital-acquired / ventilator-associated pneumonia（院內／呼吸器相關肺炎）",
        note: "限已知或高度懷疑 susceptible gram-negative pathogen；台灣仿單療程 7-14 天。",
      }],
    },
    {
      id: "cuti",
      label: "Complicated UTI / pyelonephritis（複雜性泌尿道感染／腎盂腎炎）",
      desc: "仿單 5-10 天",
      scenarios: [{
        label: "Complicated UTI including pyelonephritis（複雜性泌尿道感染／腎盂腎炎）",
        note: "台灣仿單療程 5-10 天；能依培養結果使用較窄譜或口服藥時應 de-escalate。",
      }],
    },
    {
      id: "stenotrophomonas",
      label: "Invasive S. maltophilia infection（侵襲性嗜麥芽窄食單胞菌感染）",
      desc: "IDSA alternative；初期偏向合併第二個 active agent",
      scenarios: [{
        label: "Invasive Stenotrophomonas maltophilia infection（侵襲性嗜麥芽窄食單胞菌感染）",
        note: "IDSA 2026 列為 alternative option，初期 preferably 與另一個 active agent 合併；臨床穩定、持續改善且確認體外感受性後才考慮單藥。現有 breakpoint 與臨床資料仍有限。",
      }],
    },
  ],
  calculate({ crcl, rrt, indicationData }) {
    const plan = getDosePlan(crcl, rrt);
    return {
      scenarioResults: indicationData.scenarios.map((scenario: any) => ({
        title: scenario.label,
        rows: [
          { label: "Loading dose", value: `${plan.loading} IV once`, highlight: true },
          { label: "Maintenance dose", value: `${plan.maintenance} IV ${plan.frequency}`, highlight: true },
          { label: "輸注時間", value: "3 小時" },
          { label: "每支規格", value: "Aztreonam 1.5 g + avibactam 0.5 g = total 2 g/Vial" },
          { label: "回溶液取量", value: plan.vialUse },
          { label: "腎功能調整", value: plan.renalNote },
          { label: "療程與定位", value: scenario.note },
        ],
        warnings: [
          ...plan.warnings,
          "劑量一律以 aztreonam/avibactam 合計重量表示；2.67 g loading dose 不是單支 2 g vial。",
          indicationData.id === "ciai" ? "cIAI 必須合併 metronidazole。" : "",
        ].filter(Boolean),
      })),
    };
  },
  clinicalPearls: {
    title: "臨床參考",
    sections: [
      {
        heading: "IDSA 2026 抗藥菌定位",
        body:
          "NDM-producing Enterobacterales：aztreonam-avibactam 或 cefiderocol 為 preferred options。Avibactam 可抑制共存的 ESBL、AmpC、KPC、OXA-48-like 等 serine beta-lactamases，讓本來不易被 MBL 水解的 aztreonam 保留活性。\n\n" +
          "MBL-producing Pseudomonas aeruginosa：IDSA 不建議 aztreonam-avibactam，因活性有限；不要因為同樣寫 MBL 就直接套用 NDM-Enterobacterales 路徑。這類綠膿桿菌感染通常優先評估 cefiderocol；若 cefiderocol 也無法使用，再由感染科依完整藥敏、感染部位與 source control 設計替代方案。\n\n" +
          "Invasive S. maltophilia：屬 alternative option，通常先與第二個 active agent 合併，資料仍有限。",
      },
      {
        heading: "腎功能劑量速查（每劑皆 over 3 hr）",
        body:
          "CrCl >50：LD 2.67 g once，then 2 g Q6H\n" +
          "CrCl >30 to <=50：LD 2.67 g once，then 1 g Q6H\n" +
          "CrCl >15 to <=30：LD 1.8 g once，then 0.9 g Q8H\n" +
          "CrCl <=15：LD 1.33 g once，then 0.9 g Q12H；台灣仿單對尚未開始 RRT 者另有不建議使用的限制，實務需個別評估\n" +
          "Intermittent HD：LD 1.33 g once，then 0.9 g Q12H；透析日於 HD 後給\n" +
          "PD / CRRT：無確立標準劑量，依 RRT clearance 與感染情境個別化。",
      },
      {
        heading: "泡製速查（台灣仿單）",
        body:
          "每瓶以 10 mL sterile water 回溶；回溶後約 11.4 mL，濃度為 aztreonam 131.2 mg/mL + avibactam 43.7 mg/mL。\n" +
          "LD 2.67 g：取 15.2 mL；MD 2 g：取 11.4 mL；1.8 g：取 10.3 mL；1 g：取 5.7 mL；0.9 g：取 5.1 mL；1.33 g：取 7.6 mL。\n" +
          "加入 NS、D5W 或 LR，final volume 50-250 mL；每劑輸注 3 小時。開始回溶至完成輸注液製備應在 30 分鐘內完成。",
      },
      {
        heading: "安定性與配伍",
        body:
          "Final bag 可冷藏 2-8°C 最長 24 小時；取出後 D5W 在 <=30°C 最長 6 小時，NS/LR 最長 12 小時。不可與未列明的其他藥品混合；小瓶單次使用。",
      },
      {
        heading: "安全與其他調整",
        body:
          "注意 beta-lactam hypersensitivity、C. difficile-associated diarrhea、腎功能惡化時的蓄積與 CNS adverse effects。每瓶約含 sodium 44.6 mg。肝功能不需調整；未滿 18 歲安全性與療效尚未確立。",
      },
    ],
  },
};
