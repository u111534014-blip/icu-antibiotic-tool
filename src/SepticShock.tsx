import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

const ACCENT = "#0D9488";

type SepsisSectionId = "bundle" | "antimicrobial" | "hemodynamics" | "sedation" | "steroids" | "monitoring";

type KeyCard = {
  title: string;
  body: string;
  bullets?: string[];
  badge?: string;
  source: string;
};

type SimpleTable = {
  title: string;
  source: string;
  columns: string[];
  rows: string[][];
  notes?: string[];
};

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const sections: { id: SepsisSectionId; label: string; short: string }[] = [
  { id: "bundle", label: "1 小時 bundle", short: "初始處置" },
  { id: "antimicrobial", label: "抗生素", short: "coverage" },
  { id: "hemodynamics", label: "輸液/升壓劑", short: "MAP 目標" },
  { id: "sedation", label: "鎮痛鎮靜", short: "插管" },
  { id: "steroids", label: "類固醇/輔助", short: "refractory" },
  { id: "monitoring", label: "追蹤與降階", short: "reassess" },
];

const bundleCards: KeyCard[] = [
  {
    title: "辨識 septic shock 後立即啟動",
    badge: "T0",
    body: "Sepsis / septic shock 是 medical emergency；疑似感染合併急性器官功能惡化、低血壓或 hypoperfusion 時，不要等所有檢查回來才開始處置。",
    bullets: [
      "Sepsis-3：感染造成 life-threatening organ dysfunction，常以 SOFA 增加 >=2 分代表。",
      "Septic shock：足量輸液後仍需 vasopressor 維持 MAP >=65 mmHg，且 lactate >2 mmol/L。",
      "qSOFA 不能單獨用來 rule in / rule out sepsis；較適合提醒高風險。",
    ],
    source: "Sepsis-3；SSC 2026 Screening / Biomarkers",
  },
  {
    title: "抽血培養與 lactate",
    badge: "0-1 hr",
    body: "盡快抽 blood cultures，理想上在抗生素前完成；若會明顯延誤給藥，抗生素不應被培養卡住。",
    bullets: [
      "至少抽 lactate；若 elevated lactate 或 shock，後續以 serial lactate 搭配臨床灌流評估。",
      "同步評估 CBC、SCr、LFT、bilirubin、PT/INR、ABG/VBG、urine output、感染源相關檢體。",
      "血液培養建議兩套；已置入 central line 且疑似 catheter-related BSI 時，可考慮周邊與導管各抽。",
    ],
    source: "SSC 2026 Blood culture / Blood lactate / Serial lactate",
  },
  {
    title: "抗生素不要等",
    badge: "<=1 hr",
    body: "Septic shock、probable/definite sepsis 建議立即給 antimicrobial therapy，理想上在辨識後 1 小時內。",
    bullets: [
      "先給足 loading dose，腎功能不全通常不應延誤第一劑。",
      "依感染源、院內抗藥風險、近期培養與 colonization 調整 MRSA / MDR GNB / anaerobe / fungal coverage。",
      "維持劑量可依腎功能、RRT、PK/PD 與 TDM 後續調整。",
    ],
    source: "SSC 2026 Antibiotic initiation / Multidrug resistance / Drug monitoring",
  },
  {
    title: "輸液與升壓劑可並行",
    badge: "0-3 hr",
    body: "Sepsis-induced hypoperfusion 或 septic shock 可給至少 30 mL/kg crystalloid 於前 3 小時，但要反覆評估，不是一路灌到 lactate 正常。",
    bullets: [
      "Crystalloid 為第一線，SSC 2026 偏好 balanced crystalloids；TBI 情境可考慮 0.9% saline。",
      "若 unstable shock，可在輸液同時啟動 vasopressor；不必等 central line 才開始。",
      "周邊 vasopressor 應短期使用，選擇大條近端靜脈並嚴密觀察 extravasation。",
    ],
    source: "SSC 2026 Fluid resuscitation / Fluid type / Vasopressor administration",
  },
  {
    title: "找 source control",
    badge: "<=6 hr",
    body: "需要 source control 的感染源要快速辨識或排除；若已確認需要處置，建議在 medically/logistically practical 下盡早進行，理想上 6 小時內。",
    bullets: [
      "常見包括膿瘍引流、阻塞性泌尿感染解除阻塞、感染導管移除、壞死性軟組織感染清創、膽道感染 ERCP/PTCD。",
      "source control 前後都要回頭調整抗生素與療程長度。",
    ],
    source: "SSC 2026 Source control",
  },
];

const antimicrobialTables: SimpleTable[] = [
  {
    title: "經驗性 coverage 決策",
    columns: ["問題", "建議做法", "常見監測/備註"],
    rows: [
      ["是否要 cover MRSA", "有 MRSA colonization/previous infection、皮膚軟組織或導管相關、院內肺炎、重症 shock 且風險高時考慮。", "Vancomycin 需 LD 與 TDM；若 AKI/high MIC/肺炎治療反應差，需重新評估。"],
      ["是否要 cover MDR GNB / Pseudomonas", "依近期培養、抗生素暴露、長期住院、ICU/照護機構、當地 antibiogram、結構性肺病或 neutropenia 判斷。", "重症 beta-lactam 建議 LD 後 prolonged infusion；腎功能變動/RRT 要早期回頭調整。"],
      ["是否要 anaerobe coverage", "腹腔、婦產科深部感染、壞死性軟組織感染、頭頸感染、CNS abscess/empyema 等需納入。", "若使用 pip/tazo 或 carbapenem 通常已涵蓋；若 cefepime/ceftazidime 需另加 metronidazole。"],
      ["是否要 empiric antifungal", "不建議 routine；免疫低下、長期廣效抗生素、長住院、腹腔感染、TPN、HD、近期手術或 Candida colonization 多處時個別評估。", "echinocandin 常作為不穩定或 critically ill candidemia 經驗治療；4-5 天無證據且改善可考慮停。"],
    ],
    notes: [
      "不要因為 septic shock 就自動把所有 coverage 都加滿；coverage 要跟感染源與 MDR/fungal 風險連動。",
      "抗生素一開始要快且足量，後面要每日降階。",
    ],
    source: "SSC 2026 Multidrug resistance / Anaerobic coverage / Antifungal coverage / Beta-lactam antibiotics",
  },
  {
    title: "抗生素 timing",
    columns: ["臨床情境", "建議時間", "重點"],
    rows: [
      ["Septic shock", "立即，理想上辨識後 1 hr 內", "抽 culture 但不可明顯延誤。"],
      ["Probable / definite sepsis 無 shock", "立即，理想上 1 hr 內", "若 infection likelihood 高，不要等待完整檢查。"],
      ["Possible sepsis 無 shock", "快速限時評估；若仍疑似感染，3 hr 內給藥", "低感染可能且無 shock，可密切監測並暫緩抗生素。"],
    ],
    source: "SSC 2026 Antibiotic initiation",
  },
];

const vasopressorTable: SimpleTable = {
  title: "升壓劑與 inotrope 速查",
  columns: ["藥物", "角色", "常用劑量/範圍", "監測與提醒"],
  rows: [
    ["Norepinephrine", "第一線 vasopressor", "標示劑量：起始 8-12 mcg/min，常見維持 2-4 mcg/min；依 MAP/灌流 titrate。", "MAP、HR/arrhythmia、末梢灌流、extravasation；避免突然停藥。"],
    ["Vasopressin", "NE 升高仍 MAP 不足時 add-on", "Septic shock：0.01 units/min 起始，每 10-15 min 增 0.005；max 0.07 units/min。ICU add-on 常用固定 0.03 units/min。", "缺血、腸胃道/皮膚灌流、Na；通常不是單獨第一線。"],
    ["Epinephrine", "NE + vasopressin 後仍不足，或需較多 inotropy 時", "0.05-2 mcg/kg/min，依 MAP titrate。", "HR/arrhythmia、lactate 可能上升、高血糖、末梢灌流。"],
    ["Dobutamine", "心肌功能差且 adequate MAP/volume 後仍 hypoperfusion", "0.5-1 mcg/kg/min 起始；常用 2-20 mcg/kg/min，依反應調整。", "可能低血壓、tachyarrhythmia；需搭配 vasopressor 維持 MAP，不是用來替代 NE。"],
  ],
  notes: [
    "SSC 2026：NE 為第一線；NE escalation 時加 vasopressin；NE + vasopressin 仍 MAP 不足時加 epinephrine。",
    "有 cardiac dysfunction 且 despite adequate volume/MAP 仍 hypoperfusion，可加 inotrope；可選 dobutamine 加 NE 或 epinephrine alone。",
  ],
  source: "SSC 2026 Vasopressors / Inotropes；DailyMed norepinephrine, vasopressin, epinephrine, dobutamine labels",
};

const hemodynamicCards: KeyCard[] = [
  {
    title: "輸液選擇原則",
    body: "成人 sepsis / septic shock 的初始復甦液體以 crystalloids 為第一線；若是 initial resuscitation，SSC 2026 建議優先選 balanced crystalloids 而非 0.9% saline。",
    bullets: [
      "Balanced crystalloids：例如 Lactated Ringer's、Hartmann's、Plasma-Lyte 類溶液，chloride 較低、較接近 plasma strong ion difference。",
      "0.9% saline 仍可用；若合併 traumatic brain injury，SSC 2026 反而建議使用 0.9% saline。",
      "Albumin 不建議 routine 加在初始 resuscitation；大量 crystalloid 後或 cirrhosis 可個別考慮，TBI 應避免 supplemental albumin。",
    ],
    source: "SSC 2026 Fluid type",
  },
  {
    title: "第三間隙是什麼",
    body: "第三間隙指體液跑到血管內與細胞內以外、無法有效參與循環的空間，因此病人可能全身水腫或腹水很多，但真正的有效循環血量仍不足。",
    bullets: [
      "常見位置：腹水、胸水、腸壁水腫、組織間質水腫、燒傷或發炎組織。",
      "常見情境：sepsis capillary leak、cirrhosis、pancreatitis、大手術後、低白蛋白。",
      "臨床重點：不是看到水腫就完全不能補液，而是要用小量 bolus、動態灌流評估與早期 vasopressor 來避免越補越腫。",
    ],
    source: "SSC 2026 Fluid resuscitation / Albumin remarks；critical care physiology",
  },
  {
    title: "MAP 與灌流目標",
    body: "初始 MAP 目標以 65 mmHg 為主，不需要常規追高；65 歲以上可考慮 60-65 mmHg 範圍，仍需看慢性高血壓、腎灌流、心肌缺血與末梢灌流。",
    bullets: [
      "灌流指標：mentation、urine output、skin mottling/capillary refill、lactate trend、ScvO2/echo 視情境。",
      "血壓計讀值不穩、升壓劑中高劑量或多種升壓劑時，建議儘早 arterial line。",
    ],
    source: "SSC 2026 Mean arterial pressure / Blood pressure monitoring / Capillary refill",
  },
  {
    title: "輸液後續怎麼給",
    body: "30 mL/kg 是初始 resuscitation 起點，後續應看 fluid responsiveness 與 overload 風險，不要只看 CVP 或單次血壓。",
    bullets: [
      "可用 passive leg raise、small bolus 後 stroke volume/PPV/SVV/echo 反應來判斷 fluid responsiveness。",
      "已給大量 crystalloid 或 cirrhosis 可個別考慮 albumin；不建議 starches。",
      "若仍 hypoperfusion 但已不 fluid responsive，應轉向 vasopressor/inotrope/source control，而不是一直補液。",
    ],
    source: "SSC 2026 Resuscitation / Fluid type / Serial lactate",
  },
];

const fluidTypeTables: SimpleTable[] = [
  {
    title: "輸液選擇情境速查",
    columns: ["臨床情境", "較合理選擇", "理由與提醒"],
    rows: [
      ["一般 septic shock 初始復甦", "Balanced crystalloid 優先；NS 仍可用。", "SSC 2026：crystalloid 第一線，initial resuscitation 建議 balanced crystalloids over 0.9% saline。"],
      ["Traumatic brain injury / 腦水腫疑慮", "0.9% saline。", "SSC 2026 對 sepsis + TBI 建議使用 0.9% saline；避免 hypotonicity 與 supplemental albumin。"],
      ["高氯性代謝性酸中毒、AKI 風險或需大量 crystalloid", "偏向 balanced crystalloid。", "NS chloride load 較高，可能加重 hyperchloremic metabolic acidosis；仍需追 Cl/HCO3/SCr。"],
      ["Cirrhosis、腹水明顯或低白蛋白，且已需要大量 crystalloid", "先以 crystalloid resuscitation；大量 crystalloid 後仍需補 volume 時，可考慮 supplemental albumin。", "Albumin 不是 routine 起手式，也不是看到低白蛋白就直接取代 crystalloid；需看有效循環血量、肺水腫、Na、腎功能與腹水。"],
      ["心衰、ESRD、ARDS、肺水腫或限水", "小量 balanced crystalloid 或 NS fluid challenge；早期 vasopressor。", "重點是 fluid responsiveness，不是改用 albumin 就一定比較安全；若不 responsive，停止補液並轉向升壓劑/inotrope/source control。"],
      ["需要快速達 MAP 目標", "Crystalloid 與 norepinephrine 並行。", "不必等 central line 才開始升壓劑；短期周邊 NE 可接受，但要近端靜脈、低濃度、密切看外滲。"],
      ["已補大量 crystalloid 仍 hypoperfusion", "依個案採 restrictive 或 liberal strategy；可評估 albumin，但優先確認 source control 與心功能。", "看 PLR/echo/stroke volume response、lactate trend、UO、末梢灌流，不只看 CVP 或固定總量。"],
    ],
    notes: [
      "簡化記法：一般 septic shock 先 balanced crystalloid；TBI 選 NS；大量 crystalloid 後或 cirrhosis 才把 albumin 放進考慮。",
      "低白蛋白本身不是 sepsis resuscitation 的 albumin 適應症；要合併大量補液需求、第三間隙/肝硬化或有效循環血量不足才比較有臨床意義。",
    ],
    source: "SSC 2026 Fluid type / Fluid resuscitation after 30 mL/kg / Albumin remarks；SSC 2021 Fluid management rationale",
  },
  {
    title: "輸液分類與敗血性休克建議",
    columns: ["分類", "常見品項", "SSC 2026 建議", "臨床提醒"],
    rows: [
      ["Crystalloids", "0.9% saline、Lactated Ringer's、Hartmann's、Plasma-Lyte 類 balanced solution", "第一線 resuscitation fluid。", "便宜、取得容易；大量給仍需監測 fluid overload、Cl、酸鹼與腎功能。"],
      ["Balanced crystalloids", "LR、Hartmann's、Plasma-Lyte / Normosol 類", "Initial resuscitation 建議優於 0.9% saline。", "較少 chloride load；若嚴重高血鉀通常仍可個別評估，不必一概禁用 LR。TBI 情境例外偏好 NS。"],
      ["0.9% saline", "Normal saline / 生理食鹽水", "不是首選 preference，但仍是可用 crystalloid；TBI 合併 sepsis 建議使用。", "大量使用可能增加 hyperchloremic metabolic acidosis 與 AKI 風險；需追 Cl/HCO3/SCr。"],
      ["Natural colloid", "Albumin 5% 或 20/25%", "建議 crystalloids alone 優於 crystalloids + albumin；但大量 crystalloid 後或 cirrhosis 可考慮。", "成本高；TBI 應避免 supplemental albumin。若用 20/25% albumin，需同時評估 intravascular expansion 與總水量限制。"],
      ["Synthetic colloids", "Hydroxyethyl starches、gelatin、dextran", "HES：強烈不建議；gelatin：建議不要用。Dextran 不作常規 sepsis resuscitation。", "HES 增加 RRT/腎傷害風險；gelatin 有 anaphylaxis、凝血與成本疑慮；dextran 也有過敏/凝血與腎臟疑慮。"],
    ],
    notes: [
      "實務上：一般 septic shock 初始可優先選 balanced crystalloid；若院內只有 NS 或病人有 TBI，NS 仍可作為合理選項。",
      "限水/心衰/ESRD/ARDS 不是完全不補液，而是小量 bolus + fluid responsiveness + 早期 vasopressor 的策略。",
    ],
    source: "SSC 2026 Fluid type；SSC 2021 Fluid management rationale",
  },
  {
    title: "什麼時候不要再一直補 crystalloid",
    columns: ["情境", "建議轉向", "可用評估"],
    rows: [
      ["已給 30 mL/kg 但仍 hypoperfusion", "SSC 2026 可依病人與醫療環境採 liberal 或 restrictive strategy；不要只靠固定總量決定。", "MAP、vasopressor dose、UO、lactate trend、capillary refill、echo/IVC、PLR 反應。"],
      ["肺水腫、ARDS、心衰、ESRD 或明顯 fluid overload", "小量 fluid challenge；若不 fluid responsive，早期 vasopressor / inotrope / source control。", "肺部超音波 B-line、氧合惡化、CXR、JVP/echo、每日 fluid balance。"],
      ["Cirrhosis 或低白蛋白且已大量 crystalloid", "可考慮 albumin 作為 supplemental fluid，但不是 routine 起手式。", "血壓、腎功能、ascites/edema、Na、肺水腫風險。"],
      ["需要快速達 MAP 目標", "輸液同時啟動 NE；短期周邊 NE 可接受，之後建立 central access。", "近端大靜脈、低濃度、短時間、頻繁檢查外滲。"],
    ],
    source: "SSC 2026 Fluid resuscitation after 30 mL/kg / Vasopressor administration / Albumin remarks",
  },
];

const sedationCards: KeyCard[] = [
  {
    title: "插管病人先止痛，再鎮靜",
    body: "PADIS / ICU Liberation 的核心是 pain first 與 assessment-driven sedation。能溝通時用 0-10 NRS；不能溝通時用 CPOT 或 BPS，不要只用心跳、血壓當疼痛指標。",
    bullets: [
      "多數 mechanically ventilated ICU 病人目標為 light sedation，常見 RASS -2 到 0；需每日重新設定目標。",
      "Deep sedation 只保留給特定情境：severe ARDS/ventilator dyssynchrony、neuromuscular blockade、ICP crisis、active seizure、therapeutic hypothermia 等。",
      "若使用 neuromuscular blocker，一定要先有足夠鎮痛鎮靜；paralytic 不能取代 sedative。",
    ],
    source: "SCCM PADIS 2018；SCCM ICU Liberation ABCDEF bundle",
  },
  {
    title: "Midazolam 在 shock 病人的位置",
    body: "PADIS 整體偏好 propofol 或 dexmedetomidine over benzodiazepines；但在健保、藥價、深鎮靜需求與 shock 低血壓情境下，midazolam 仍是許多院內會實際使用的選項。",
    bullets: [
      "指引原則：一般避免 benzodiazepine 作 routine sedative；若使用，應有明確理由與每日退場評估。",
      "優點：相對熟悉、便宜、血壓影響通常比 propofol 可控，適合需要 deeper sedation 或 propofol 不耐受時。",
      "缺點：蓄積、延長清醒/拔管、delirium 風險；肝腎功能差、肥胖、長時間 infusion 時更明顯。",
      "做法：用最低有效劑量，至少每日評估能否減量、SAT/SBT 或轉成較容易喚醒的策略。",
    ],
    source: "SCCM PADIS 2018 Agitation-Sedation；DailyMed midazolam injection",
  },
  {
    title: "Daily SAT/SBT 與譫妄監測",
    body: "Sepsis 病人插管後很容易一路深鎮靜到忘記停。建議每天確認能否做 SAT/SBT，並至少每班用 CAM-ICU 或 ICDSC 追蹤 delirium。",
    bullets: [
      "SAT safety screen 常見排除：seizure、alcohol withdrawal、paralysis、ICP 升高、嚴重 hypoxemia 或 hemodynamic instability。",
      "SBT safety screen 需看氧合、apnea、agitation、vasopressor 劑量與 ICP 等。",
      "非藥物 delirium prevention：日夜節律、眼鏡/助聽器、睡眠保護、早期活動、家屬參與、避免不必要 restraint。",
    ],
    source: "SCCM ICU Liberation ABCDEF bundle；SCCM PADIS 2018",
  },
];

const sedationDoseTable: SimpleTable = {
  title: "ICU 插管鎮痛鎮靜常用劑量",
  columns: ["藥物", "常用角色", "起始/範圍", "Shock 與監測提醒"],
  rows: [
    ["Fentanyl", "第一線止痛；可 analgesia-first sedation", "IV bolus 25-100 mcg；CI 常見 12.5-25 mcg/hr 起始，或 0.35-0.5 mcg/kg/hr 起始；常用範圍 0.5-5 mcg/kg/hr。", "血壓相對穩；長時間 infusion 會蓄積、延長清醒；注意 ileus、呼吸抑制、胸壁僵硬（高劑量快速給）。"],
    ["Midazolam", "院內常見 sedative；shock/propofol 不耐受或需 deeper sedation 時常用", "需要快速鎮靜可 0.01-0.05 mg/kg slow IV/infuse，10-15 min 可重複；CI 起始 0.02-0.10 mg/kg/hr（約 1-7 mg/hr）。", "避免無目標長期深鎮靜；肝腎功能差、肥胖、長時間使用易蓄積；每日評估減量/SAT。"],
    ["Propofol", "短效 sedative；容易喚醒與調整", "ICU CI 起始 5 mcg/kg/min；每 5-10 min 增 5-10 mcg/kg/min；常用 5-50 mcg/kg/min。除非效益大於風險，不建議 >4 mg/kg/hr。", "Sepsis/低血容量/vasoplegia 易低血壓；監測 TG、乳酸、CK、酸中毒、PRIS 風險；注意熱量與無菌操作。"],
    ["Dexmedetomidine", "light sedation、減少 delirium/接近拔管時常用", "ICU maintenance 0.2-0.7 mcg/kg/hr；轉換其他 sedative 時常可不給 loading。", "可能 bradycardia/hypotension；深鎮靜效果有限；肝功能不全與老人可考慮降劑量。"],
    ["Ketamine adjunct", "opioid-sparing；疼痛明顯或 opioid tolerance 時可考慮", "PADIS 提及 postsurgical ICU adjunct：0.5 mg/kg IV once，接 1-2 mcg/kg/min。", "可能流涎、幻覺、tachycardia/HTN；shock 時血壓影響較複雜，依院內經驗與醫囑。"],
  ],
  notes: [
    "劑量需依 RASS/CPOT/BPS、血壓、器官功能、合併 opioid/sedative 與院內 protocol 調整。",
    "插管病人不是一定要深睡；能達到同步呼吸器與安全照護的最低鎮靜深度最好。",
  ],
  source: "SCCM PADIS 2018；SCCM PADIS focused update 2025；SCCM ICU Liberation；DailyMed midazolam, propofol, dexmedetomidine labels",
};

const pumpPresets = [
  { label: "Midazolam 50 mg/100 mL", amount: "50", amountUnit: "mg", volume: "100", dose: "0.03", doseUnit: "mg/kg/hr" },
  { label: "Midazolam 25 mg/50 mL", amount: "25", amountUnit: "mg", volume: "50", dose: "0.03", doseUnit: "mg/kg/hr" },
  { label: "Fentanyl 500 mcg/50 mL", amount: "500", amountUnit: "mcg", volume: "50", dose: "1", doseUnit: "mcg/kg/hr" },
  { label: "Fentanyl 2500 mcg/50 mL", amount: "2500", amountUnit: "mcg", volume: "50", dose: "50", doseUnit: "mcg/hr" },
  { label: "Propofol 10 mg/mL", amount: "1000", amountUnit: "mg", volume: "100", dose: "10", doseUnit: "mcg/kg/min" },
  { label: "Dexmedetomidine 200 mcg/50 mL", amount: "200", amountUnit: "mcg", volume: "50", dose: "0.4", doseUnit: "mcg/kg/hr" },
] as const;

const steroidCards: KeyCard[] = [
  {
    title: "何時考慮 hydrocortisone",
    body: "成人 septic shock 若仍需要 vasopressor，可考慮 IV corticosteroid。常見觸發點是 NE 或 epinephrine >=0.25 mcg/kg/min 且已持續至少 4 小時仍需升壓。",
    bullets: [
      "常用：hydrocortisone 200 mg/day，可 50 mg IV q6h 或 continuous infusion。",
      "目標是縮短 shock duration，不是取代抗生素、source control、輸液與升壓劑。",
      "監測 glucose、Na、感染控制、GI bleeding risk、delirium/myopathy；停用時依臨床與院內習慣 taper 或停止。",
    ],
    source: "SSC 2026 IV Corticosteroids；SSC 2021 Corticosteroids remarks",
  },
  {
    title: "不建議 routine 使用的輔助治療",
    body: "不要把 sepsis cocktail 當成 routine bundle。SSC 2026 不建議常規使用 IV vitamin C、IVIG、blood purification、polymyxin B hemoperfusion 或 vitamin D 作為 sepsis 治療。",
    bullets: [
      "Antipyretic 不建議以改善 sepsis outcome 為目的常規使用；若為疼痛/舒適或其他神經重症、post-arrest 體溫管理則另論。",
      "Septic shock + lactic acidosis 不建議用 bicarbonate 改善 hemodynamics；但 pH <=7.2 且 AKI AKIN 2-3 可考慮。",
      "Glucose >=180 mg/dL 才開始 insulin；常用目標 144-180 mg/dL。",
    ],
    source: "SSC 2026 Antipyretics / IV Vitamin C / IV Immunoglobulin / Blood purification；SSC 2021 Glucose / Bicarbonate",
  },
];

const monitoringTables: SimpleTable[] = [
  {
    title: "前 6-24 小時追蹤",
    columns: ["項目", "建議追蹤", "目的"],
    rows: [
      ["Hemodynamics", "MAP、vasopressor dose trend、HR/arrhythmia、末梢灌流、capillary refill", "確認 shock 是否改善，避免只盯著單一 MAP。"],
      ["Perfusion", "lactate trend、urine output、mentation、skin mottling、ABG/VBG", "lactate 要看趨勢與臨床背景，不是唯一目標。"],
      ["Organ function", "SCr/UO、bilirubin/LFT、platelet、PT/INR、氧合、SOFA trend", "評估 organ dysfunction 與藥物腎肝調整。"],
      ["Drug safety", "vancomycin/aminoglycoside TDM、beta-lactam prolonged infusion、QTc、K/Mg、C. difficile risk", "早期足量，後續安全降階。"],
    ],
    source: "SSC 2026 Serial lactate / Drug monitoring / Antimicrobial therapy",
  },
  {
    title: "每日抗生素 time-out",
    columns: ["問題", "處理方向", "提醒"],
    rows: [
      ["有 pathogen / susceptibility 嗎？", "有結果就 narrow 或停掉不必要 coverage。", "SSC 2026 建議有微生物結果時 de-escalation。"],
      ["culture final negative 嗎？", "若臨床改善且感染證據不足，考慮停用或縮窄。", "持續尋找 noninfectious mimic。"],
      ["source control 完成了嗎？", "完成後可用較短療程；未完成時應優先處理 source。", "療程長短取決於感染源、菌種、免疫狀態與控制程度。"],
      ["需要 PCT 嗎？", "若最佳療程不明，可用 PCT + clinical evaluation 輔助停藥。", "不要用 PCT 單獨決定是否開始抗生素。"],
    ],
    source: "SSC 2026 Antimicrobial therapy / Source control / Biomarkers",
  },
];

function Bullets({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul style={S.bulletList}>
      {items.map((item) => <li key={item} style={S.bulletItem}>{item}</li>)}
    </ul>
  );
}

function Source({ text }: { text: string }) {
  return <div style={S.source}>來源：{text}</div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={S.sectionHeader}>
      <div style={S.sectionTitle}>{title}</div>
      {subtitle && <div style={S.sectionSubtitle}>{subtitle}</div>}
    </div>
  );
}

function KeyPointCard({ item }: { item: KeyCard }) {
  return (
    <section style={S.card}>
      <div style={S.rowTop}>
        <div style={S.cardTitle}>{item.title}</div>
        {item.badge && <span style={S.badge}>{item.badge}</span>}
      </div>
      <div style={S.cardBody}>{item.body}</div>
      <Bullets items={item.bullets} />
      <Source text={item.source} />
    </section>
  );
}

function SimpleTableCard({ table }: { table: SimpleTable }) {
  return (
    <section style={S.card}>
      <div style={S.cardTitle}>{table.title}</div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {table.columns.map((column) => <th key={column} style={S.th}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${table.title}-${rowIndex}-${cellIndex}`} style={cellIndex === 0 ? S.tdStrong : S.td}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Bullets items={table.notes} />
      <Source text={table.source} />
    </section>
  );
}

function FluidCalculator() {
  const [weight, setWeight] = useState("");
  const [useObesityNote, setUseObesityNote] = useState(false);
  const weightNum = Number(weight);
  const fluidMl = Number.isFinite(weightNum) && weightNum > 0 ? Math.round(weightNum * 30) : null;

  return (
    <section style={S.calcCard}>
      <div style={S.cardTitle}>30 mL/kg 初始輸液粗估</div>
      <div style={S.calcGrid}>
        <label style={S.inputLabel}>
          <span>計算體重</span>
          <div style={S.inputWrap}>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder="kg"
              style={S.input}
            />
            <span style={S.inputSuffix}>kg</span>
          </div>
        </label>
        <button
          type="button"
          onClick={() => setUseObesityNote(!useObesityNote)}
          style={{ ...S.toggle, ...(useObesityNote ? S.toggleActive : {}) }}
        >
          BMI &gt;=30 / 限水提醒
        </button>
      </div>
      <div style={S.resultBox}>
        {fluidMl ? (
          <>
            <span style={S.resultLabel}>前 3 小時 crystalloid 起點</span>
            <strong style={S.resultValue}>{fluidMl.toLocaleString()} mL</strong>
          </>
        ) : (
          <span style={S.resultPlaceholder}>輸入體重後顯示 30 mL/kg 粗估量</span>
        )}
      </div>
      <div style={S.calcNote}>
        SSC 2026 提醒 BMI &gt;30 時可依實際體重、adjusted 或 ideal body weight 計算；心衰、ESRD、ARDS、肝硬化或明顯 overload 風險者需更密集 reassessment。
        {useObesityNote && <div style={{ marginTop: 6 }}>這個數字是起始 resuscitation 參考，不是硬性必達量；若不 fluid responsive，應及早轉向 vasopressor / inotrope / source control。</div>}
      </div>
    </section>
  );
}

function SedationPumpCalculator() {
  const [weight, setWeight] = useState("60");
  const [amount, setAmount] = useState("50");
  const [amountUnit, setAmountUnit] = useState<"mg" | "mcg">("mg");
  const [volume, setVolume] = useState("100");
  const [dose, setDose] = useState("0.03");
  const [doseUnit, setDoseUnit] = useState<"mg/kg/hr" | "mcg/kg/hr" | "mcg/kg/min" | "mg/hr" | "mcg/hr">("mg/kg/hr");

  const weightNum = Number(weight);
  const amountNum = Number(amount);
  const volumeNum = Number(volume);
  const doseNum = Number(dose);
  const concentrationMcgMl = amountNum > 0 && volumeNum > 0
    ? (amountUnit === "mg" ? amountNum * 1000 : amountNum) / volumeNum
    : null;

  const desiredMcgHr = doseNum > 0
    ? doseUnit === "mg/kg/hr" && weightNum > 0 ? doseNum * 1000 * weightNum
    : doseUnit === "mcg/kg/hr" && weightNum > 0 ? doseNum * weightNum
    : doseUnit === "mcg/kg/min" && weightNum > 0 ? doseNum * weightNum * 60
    : doseUnit === "mg/hr" ? doseNum * 1000
    : doseUnit === "mcg/hr" ? doseNum
    : null
    : null;

  const rateMlHr = concentrationMcgMl && desiredMcgHr ? desiredMcgHr / concentrationMcgMl : null;
  const desiredMgHr = desiredMcgHr ? desiredMcgHr / 1000 : null;
  const concentrationDisplay = concentrationMcgMl
    ? concentrationMcgMl >= 1000
      ? `${round(concentrationMcgMl / 1000, 2)} mg/mL`
      : `${round(concentrationMcgMl, 1)} mcg/mL`
    : "—";

  const applyPreset = (preset: typeof pumpPresets[number]) => {
    setAmount(preset.amount);
    setAmountUnit(preset.amountUnit);
    setVolume(preset.volume);
    setDose(preset.dose);
    setDoseUnit(preset.doseUnit);
  };

  return (
    <section style={S.calcCard}>
      <div style={S.cardTitle}>Pump mL/hr 換算</div>
      <div style={S.calcNote}>
        公式：先算濃度，再把目標劑量換成每小時總量。mL/hr = 每小時需求量 ÷ 濃度。
        <div style={{ marginTop: 6 }}>
          配製後總體積是藥物加稀釋液後的 final volume；例如 50 mg + NS 補至 100 mL，這格填 100，不是只填加入的 NS 量。
        </div>
      </div>

      <div style={S.presetRow}>
        {pumpPresets.map((preset) => (
          <button key={preset.label} type="button" onClick={() => applyPreset(preset)} style={S.presetButton}>
            {preset.label}
          </button>
        ))}
      </div>

      <div style={S.pumpGrid}>
        <label style={S.inputLabel}>
          <span>體重</span>
          <div style={S.inputWrap}>
            <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" style={S.input} />
            <span style={S.inputSuffix}>kg</span>
          </div>
        </label>

        <label style={S.inputLabel}>
          <span>藥物總量</span>
          <div style={S.inputWrap}>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" style={S.input} />
            <select value={amountUnit} onChange={(e) => setAmountUnit(e.target.value as "mg" | "mcg")} style={S.selectInline}>
              <option value="mg">mg</option>
              <option value="mcg">mcg</option>
            </select>
          </div>
        </label>

        <label style={S.inputLabel}>
          <span>配製後總體積</span>
          <div style={S.inputWrap}>
            <input value={volume} onChange={(e) => setVolume(e.target.value)} inputMode="decimal" style={S.input} />
            <span style={S.inputSuffix}>mL</span>
          </div>
        </label>

        <label style={S.inputLabel}>
          <span>目標劑量</span>
          <div style={S.inputWrap}>
            <input value={dose} onChange={(e) => setDose(e.target.value)} inputMode="decimal" style={S.input} />
            <select value={doseUnit} onChange={(e) => setDoseUnit(e.target.value as typeof doseUnit)} style={S.selectWide}>
              <option value="mg/kg/hr">mg/kg/hr</option>
              <option value="mcg/kg/hr">mcg/kg/hr</option>
              <option value="mcg/kg/min">mcg/kg/min</option>
              <option value="mg/hr">mg/hr</option>
              <option value="mcg/hr">mcg/hr</option>
            </select>
          </div>
        </label>
      </div>

      <div style={S.resultBox}>
        {rateMlHr ? (
          <>
            <span style={S.resultLabel}>Pump rate</span>
            <strong style={S.resultValue}>{round(rateMlHr, 1)} mL/hr</strong>
          </>
        ) : (
          <span style={S.resultPlaceholder}>輸入完整資料後顯示 mL/hr</span>
        )}
      </div>

      <div style={S.calcNote}>
        濃度：{concentrationDisplay}
        {desiredMgHr && <>｜每小時需求量：約 {round(desiredMgHr, 2)} mg/hr</>}
        {doseUnit.includes("/kg") && weightNum > 0 && <>｜體重：{weightNum} kg</>}
        <div style={{ marginTop: 6 }}>
          範例：Midazolam 50 mg/100 mL = 0.5 mg/mL；60 kg 給 0.03 mg/kg/hr → 1.8 mg/hr ÷ 0.5 mg/mL = 3.6 mL/hr。
        </div>
        <div style={{ marginTop: 6 }}>
          Pump volume 會計入每日 I/O；但通常不當作 septic shock 30 mL/kg 的主要 resuscitation volume，除非院內另有定義。
        </div>
      </div>
    </section>
  );
}

function BundleView() {
  return (
    <div>
      <SectionHeader title="Septic shock 初始處置" subtitle="把抽檢、抗生素、輸液、升壓劑與 source control 放在同一張臨床地圖上。" />
      {bundleCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
    </div>
  );
}

function AntimicrobialView() {
  return (
    <div>
      <SectionHeader title="抗生素與感染源控制" subtitle="快、準、後續每日降階。這頁先不替代各藥物劑量頁，而是告訴你何時該 cover 什麼。" />
      {antimicrobialTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
    </div>
  );
}

function HemodynamicsView() {
  return (
    <div>
      <SectionHeader title="輸液、升壓劑與灌流目標" subtitle="先分清楚 crystalloid、balanced crystalloid 與 colloid；MAP 只是其中一個目標，真正要看器官灌流是否改善。" />
      <FluidCalculator />
      {hemodynamicCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
      {fluidTypeTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
      <SimpleTableCard table={vasopressorTable} />
    </div>
  );
}

function SedationView() {
  return (
    <div>
      <SectionHeader title="插管病人鎮痛鎮靜" subtitle="Sepsis 頁面先放 bedside safety reminders；完整策略仍以 PADIS / ICU Liberation 為主。" />
      {sedationCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
      <SimpleTableCard table={sedationDoseTable} />
      <SedationPumpCalculator />
    </div>
  );
}

function SteroidsView() {
  return (
    <div>
      <SectionHeader title="類固醇與輔助治療" subtitle="重點是 refractory shock 何時加 hydrocortisone，以及哪些東西不要 routine 做。" />
      {steroidCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
    </div>
  );
}

function MonitoringView() {
  return (
    <div>
      <SectionHeader title="追蹤、降階與停藥" subtitle="Sepsis 不是第一小時做完就結束；後面每日 reassessment 才是抗菌藥 stewardship 的核心。" />
      {monitoringTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
    </div>
  );
}

function CurrentView({ active }: { active: SepsisSectionId }) {
  if (active === "bundle") return <BundleView />;
  if (active === "antimicrobial") return <AntimicrobialView />;
  if (active === "hemodynamics") return <HemodynamicsView />;
  if (active === "sedation") return <SedationView />;
  if (active === "steroids") return <SteroidsView />;
  return <MonitoringView />;
}

export default function SepticShock() {
  const [active, setActive] = useState<SepsisSectionId>("bundle");

  const sourceText = useMemo(
    () => "Surviving Sepsis Campaign 2026 adult guidelines；Sepsis-3；SCCM PADIS 2018/2025 focused update；SCCM ICU Liberation；DailyMed vasoactive/sedative drug labels。",
    []
  );

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>Critical Care Quick Reference</div>
        <h1 style={S.title}>Sepsis / Septic shock 速查</h1>
        <div style={S.subtitle}>1 小時 bundle、抗生素、升壓劑、類固醇與每日 reassessment</div>
      </header>

      <section style={S.notice}>
        <div style={S.noticeTitle}>資料來源</div>
        <div>{sourceText}</div>
        <div style={{ marginTop: 6 }}>
          本頁為成人 ICU 快速參考；需依院內 sepsis protocol、antibiogram、升壓劑濃度、感染源與病人限制水分/心腎功能調整。
        </div>
      </section>

      <nav style={S.tabRow} aria-label="Septic shock sections">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActive(section.id)}
            style={{ ...S.tab, ...(active === section.id ? S.tabActive : {}) }}
          >
            <span style={S.tabLabel}>{section.label}</span>
            <span style={S.tabShort}>{section.short}</span>
          </button>
        ))}
      </nav>

      <CurrentView active={active} />
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 18px" },
  kicker: { fontSize: 12, fontWeight: 800, color: ACCENT, textTransform: "uppercase", letterSpacing: 0, marginBottom: 6 },
  title: { fontSize: 26, lineHeight: 1.2, fontWeight: 850, color: "#0F172A", margin: 0, letterSpacing: 0 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4 },
  notice: { background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: 12, color: "#065F46", fontSize: 12, lineHeight: 1.55, marginBottom: 14 },
  noticeTitle: { fontWeight: 800, marginBottom: 4 },
  tabRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 12 },
  tab: { flex: "0 0 auto", border: "1.5px solid #DDE7EE", background: "#fff", borderRadius: 8, padding: "9px 10px", color: "#475569", cursor: "pointer", minWidth: 98, textAlign: "left" },
  tabActive: { border: `1.5px solid ${ACCENT}`, background: "#F0FDFA", color: "#0F766E" },
  tabLabel: { display: "block", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" },
  tabShort: { display: "block", fontSize: 11, color: "#94A3B8", marginTop: 2, whiteSpace: "nowrap" },
  sectionHeader: { margin: "10px 0 12px" },
  sectionTitle: { fontSize: 18, fontWeight: 850, color: "#0F172A", lineHeight: 1.3 },
  sectionSubtitle: { fontSize: 13, color: "#64748B", lineHeight: 1.5, marginTop: 4 },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" },
  calcCard: { background: "#fff", border: "1px solid #B6E4DA", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" },
  rowTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: 850, color: "#0F172A", lineHeight: 1.35 },
  cardBody: { fontSize: 13, color: "#334155", lineHeight: 1.6, marginTop: 7 },
  bulletList: { margin: "9px 0 0", paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.55 },
  bulletItem: { marginBottom: 4 },
  source: { marginTop: 10, fontSize: 11, color: "#94A3B8", lineHeight: 1.45 },
  badge: { flexShrink: 0, display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 8px", background: "#E0F2FE", color: "#0369A1", fontSize: 11, fontWeight: 750, lineHeight: 1.2 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, marginTop: 10, marginBottom: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 620 },
  th: { padding: "9px 8px", borderBottom: "2px solid #E2E8F0", textAlign: "left", color: "#475569", fontWeight: 850, background: "#F8FAFC", verticalAlign: "top" },
  td: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#334155", verticalAlign: "top", lineHeight: 1.5 },
  tdStrong: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#0F172A", fontWeight: 850, verticalAlign: "top", lineHeight: 1.5, whiteSpace: "nowrap" },
  calcGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "end", marginTop: 12 },
  pumpGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "end", marginTop: 12 },
  inputLabel: { display: "block", color: "#475569", fontSize: 12, fontWeight: 800 },
  inputWrap: { display: "flex", alignItems: "center", marginTop: 5, border: "1.5px solid #DDE7EE", borderRadius: 8, background: "#fff", overflow: "hidden" },
  input: { flex: 1, minWidth: 0, border: "none", outline: "none", padding: "10px 10px", fontSize: 14, color: "#0F172A" },
  inputSuffix: { padding: "0 10px", color: "#94A3B8", fontSize: 12, fontWeight: 800 },
  selectInline: { border: "none", borderLeft: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", padding: "10px 8px", fontSize: 12, fontWeight: 800, outline: "none" },
  selectWide: { border: "none", borderLeft: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", padding: "10px 8px", fontSize: 12, fontWeight: 800, outline: "none", maxWidth: 116 },
  presetRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 },
  presetButton: { border: "1px solid #CFE6E1", background: "#F8FFFD", color: "#0F766E", borderRadius: 8, padding: "7px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer" },
  toggle: { border: "1.5px solid #DDE7EE", borderRadius: 8, background: "#fff", color: "#475569", padding: "10px 12px", cursor: "pointer", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" },
  toggleActive: { border: `1.5px solid ${ACCENT}`, color: "#0F766E", background: "#F0FDFA" },
  resultBox: { marginTop: 12, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  resultLabel: { color: "#64748B", fontSize: 12, fontWeight: 800 },
  resultValue: { color: "#0F766E", fontSize: 24, lineHeight: 1 },
  resultPlaceholder: { color: "#94A3B8", fontSize: 13 },
  calcNote: { marginTop: 9, color: "#64748B", fontSize: 12, lineHeight: 1.55 },
};
