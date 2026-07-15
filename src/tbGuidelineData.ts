export type TbSectionId = "diagnosis" | "active" | "monitoring" | "drugs" | "ltbi" | "special";

export type TbKeyPoint = {
  title: string;
  body: string;
  bullets?: string[];
  source: string;
};

export type TbDrugCard = {
  name: string;
  abbr: string;
  role: string;
  adultDose: string;
  maxDose: string;
  renal: string;
  toxicities: string[];
  notes: string[];
  source: string;
};

export type TbLtbiRegimen = {
  id: string;
  regimen: string;
  duration: string;
  frequency: string;
  doses: string;
  dot: string;
  candidates: string;
  adultDose: string;
  pediatricDose?: string;
  completionWindow: string;
  cautions: string[];
  source: string;
};

export type TbActiveRegimen = {
  id: string;
  phase: string;
  duration: string;
  regimen: string;
  preferredFdc: string;
  tabletStrength: string;
  doseRows: { weight: string; tablets: string; note?: string }[];
  alternatives: string[];
  notes: string[];
  source: string;
};

export type TbMonitoringItem = {
  title: string;
  action: string;
  timing?: string;
  stopRule?: string;
  source: string;
};

export type TbSimpleTable = {
  title: string;
  source: string;
  columns: string[];
  rows: string[][];
  notes?: string[];
};

export const tbGuidelineMeta = {
  title: "結核病診治指引",
  subtitle: "Taiwan TB Diagnosis & Treatment",
  source: "衛生福利部疾病管制署，結核病診治指引第七版，2022 年 3 月；本 PDF 第十章標示 2025/7/09 修訂",
  notice: "內容以提供之PDF為基底整理；臨床使用前仍建議核對疾管署全球資訊網最新版公告。",
};

export const tbSections: { id: TbSectionId; label: string; short: string }[] = [
  { id: "diagnosis", label: "診斷流程", short: "疑似 TB" },
  { id: "active", label: "活動性 TB 治療", short: "HRZE" },
  { id: "monitoring", label: "監測與副作用", short: "第五章" },
  { id: "drugs", label: "藥物速查", short: "劑量" },
  { id: "ltbi", label: "LTBI", short: "預防治療" },
  { id: "special", label: "特殊族群", short: "HIV/兒童/抗藥" },
];

export const diagnosisCards: TbKeyPoint[] = [
  {
    title: "疑似肺結核的核心檢查",
    body: "診斷需整合臨床表現、影像與實驗室證據；能取得細菌學證據時應盡量取得。",
    bullets: [
      "疑似肺結核或影像懷疑時：痰 AFB smear、NAAT、mycobacterial culture。",
      "AFB 陽性無法分辨 MTB/NTM，NAAT 是重要鑑別工具。",
      "細菌學陰性不能完全排除肺結核，需看影像、病程與治療反應。",
    ],
    source: "第 3 章 3.4、表 3-1",
  },
  {
    title: "NAAT 判讀速查",
    body: "NAAT 是肺結核標準診斷流程的一部分，尤其用於疑似 TB 或 AFB smear 陽性者。",
    bullets: [
      "AFB(+)/NAAT(+)：支持結核分枝桿菌。",
      "AFB(+)/NAAT(-)：審慎評估 NTM 可能。",
      "AFB(-)/NAAT(+)：高度懷疑 MTB，必要時依臨床判斷重複檢測。",
      "AFB(-)/NAAT(-)：仍需依臨床與影像判斷，不能單獨排除。",
    ],
    source: "表 3-1",
  },
  {
    title: "需要快速分子抗藥性檢測的情境",
    body: "再治、抗藥接觸史、RMP 抗藥疑慮、治療 2 個月培養仍陽性、因副作用擬用二線藥等，應提高抗藥評估強度。",
    bullets: [
      "所有首次培養陽性 MTB 菌株都應做第一線藥敏。",
      "治療滿 2 個月後培養仍陽性，或陰轉後再培養陽性，也應重做藥敏。",
      "RMP 分子檢測與傳統 DST 不一致時，建議送參考實驗室並尋求專家協詢。",
    ],
    source: "第 3 章 3.4.2",
  },
];

export const activeTbCards: TbKeyPoint[] = [
  {
    title: "新病人標準處方",
    body: "加強期 2 個月 HRZE，持續期 4 個月 HRE；若 INH/RMP 均敏感，可考慮停用 EMB。",
    bullets: [
      "H = isoniazid、R = rifampin、Z = pyrazinamide、E = ethambutol。",
      "建議每日一次給藥，時間固定；可配合 DOT 與病人作息。",
      "固定成分複方可降低每日顆數與選擇性服藥風險。",
    ],
    source: "第 4 章 4.2",
  },
  {
    title: "療程需延長的常見條件",
    body: "胸部 X 光廣泛侵犯或空洞、治療第 2 個月痰培養仍陽性，或加強期未全程使用 PZA，通常需延長持續期。",
    bullets: [
      "常見做法是持續期延長至 7 個月，總療程約 9 個月以上。",
      "治療滿 2 個月 smear 仍陽性時，不等於治療失敗，但應提高警覺。",
      "反應不佳時不要只加一種新藥補強，建議重新評估抗藥與專家討論。",
    ],
    source: "第 4 章 4.2、4.4",
  },
  {
    title: "曾接受過治療的病人",
    body: "再次治療病人的 INH/RMP 抗藥風險較高；DST 未知前需考慮抗藥可能並盡早做抗藥基因檢測。",
    bullets: [
      "DST 未取得時，指引建議全程 HRZE 6-9 個月。",
      "肺部廣泛/空洞或高風險者，加強期可評估加入 streptomycin。",
      "若基因檢測顯示 INH 或 RMP 抗藥，應參考抗藥性 TB 章節或轉介專家團隊。",
    ],
    source: "第 4 章 4.3",
  },
  {
    title: "腎功能異常",
    body: "CCr <30 mL/min 時，INH/RMP 通常不調整；EMB/PZA 每次劑量不變但頻率改為每週 3 次。",
    bullets: [
      "血液透析日建議透析後服藥。",
      "INH 使用者應加開 pyridoxine。",
    ],
    source: "第 4 章 4.7",
  },
];

export const activeTbNewPatientRegimens: TbActiveRegimen[] = [
  {
    id: "intensive",
    phase: "加強期",
    duration: "2 個月",
    regimen: "H + R + Z + E",
    preferredFdc: "AKuriT-4 / Trac 4",
    tabletStrength: "每錠：INH 75 mg + RMP 150 mg + PZA 400 mg + EMB 275 mg",
    doseRows: [
      { weight: "30-37 kg", tablets: "每日 2 錠" },
      { weight: "38-54 kg", tablets: "每日 3 錠", note: "50 kg 以上可考慮依肝腎功能調整至每日 4 錠" },
      { weight: "55-70 kg", tablets: "每日 4 錠" },
      { weight: ">=71 kg", tablets: "可考慮每日 5 錠" },
    ],
    alternatives: [
      "若體重 <30 kg 或每日劑量需 >5 錠，不建議使用 AKT-4/Trac4，改用單方依體重調整。",
      "腎功能不全者不應開立 AKT-4/Trac4，以避免 PZA 過量。",
    ],
    notes: [
      "新病人標準處方加強期為 INH + RMP + PZA + EMB。",
      "建議每日一次，時間固定；可配合 DOT，不必強調空腹。",
    ],
    source: "第 4 章 4.2、第 6 章 6.1.7、表 6-2",
  },
  {
    id: "continuation",
    phase: "持續期",
    duration: "4 個月",
    regimen: "H + R + E；若 INH/RMP 均敏感，可考慮停 E",
    preferredFdc: "AKuriT-3 / Trac 3",
    tabletStrength: "每錠：INH 75 mg + RMP 150 mg + EMB 275 mg",
    doseRows: [
      { weight: "30-37 kg", tablets: "每日 2 錠" },
      { weight: "38-54 kg", tablets: "每日 3 錠", note: "50 kg 以上可考慮依肝腎功能調整至每日 4 錠" },
      { weight: "55-70 kg", tablets: "每日 4 錠" },
      { weight: ">=71 kg", tablets: "可考慮每日 5 錠" },
    ],
    alternatives: [
      "若確認 INH 與 RMP 均敏感且臨床合適，可改用 INH + RMP 二合一。",
      "Rifinah150：<50 kg 每日 3 錠；Rifinah300/RINA/Macox Plus：>=50 kg 每日 2 錠。",
    ],
    notes: [
      "若胸部 X 光廣泛侵犯或空洞、第 2 個月痰培養仍陽性，或加強期未全程使用 PZA，應考慮延長持續期。",
      "避免只依胸部 X 光貿然停藥，需整合症狀、痰檢查、影像與服藥順從性。",
    ],
    source: "第 4 章 4.2、第 5 章 5.1.2、第 6 章 6.1.7、表 6-2",
  },
];

export const activeTbRetreatmentRegimens: TbActiveRegimen[] = [
  {
    id: "retreatment-hrze",
    phase: "再治處方",
    duration: "6-9 個月",
    regimen: "H + R + Z + E 全程",
    preferredFdc: "依臨床狀況選用四合一/三合一或單方",
    tabletStrength: "DST 未知前，需考慮 INH/RMP 抗藥風險；有藥敏後再依結果調整。",
    doseRows: [
      { weight: "DST 未知", tablets: "HRZE 6-9 個月", note: "盡早送 INH/RMP 抗藥基因檢測" },
      { weight: "INH/RMP 均敏感", tablets: "可依新病人處方治療", note: "回到 2HRZE / 4HRE 或依臨床調整" },
      { weight: "INH 或 RMP 抗藥", tablets: "依抗藥性 TB 章節處理", note: "建議專家討論或轉 TMTC" },
    ],
    alternatives: [
      "若肺部廣泛或開洞，或預期治療中產生 RMP acquired resistance 風險較高，可在加強期評估加入 streptomycin。",
      "WHO 已不再建議在 DST 未明時常規使用舊 8 個月再治處方 2HRZES/HRZE/5HRE。",
    ],
    notes: [
      "再治病人的 INH/RMP 抗藥比例高於新病人，處方設計需更重視抗藥風險。",
      "中斷治療少於 2 個月且 RMP 基因檢測敏感者，可考慮繼續原處方，待 DST 結果後再調整。",
      "處理失落再治者，重點是找出中斷吃藥原因並解決。",
    ],
    source: "第 4 章 4.3",
  },
];

export const tbTermCards: TbKeyPoint[] = [
  {
    title: "AFB smear 是什麼？",
    body: "AFB smear 是耐酸性桿菌抹片檢查。把痰檢體染色後用顯微鏡看有沒有 acid-fast bacilli，速度快，可粗略反映傳染性與菌量。",
    bullets: [
      "優點：快，常用於初步判斷是否有排菌與傳染性。",
      "限制：看到 AFB 不等於一定是結核菌，NTM 也可能 AFB 陽性。",
      "Smear 陰性也不能排除 TB，因為菌量低時可能看不到。",
    ],
    source: "第 3 章 3.4、表 3-1",
  },
  {
    title: "NAAT 是什麼？",
    body: "NAAT 是核酸增幅檢驗，常見概念像 PCR。它直接偵測檢體中是否有結核分枝桿菌的核酸，有些檢測也能同時看 rifampin 抗藥相關基因。",
    bullets: [
      "優點：比培養快很多，能幫助分辨 MTB 與 NTM。",
      "AFB 陽性時，NAAT 可協助確認是不是 MTB。",
      "NAAT 陰性仍需搭配臨床、影像與培養判斷。",
    ],
    source: "第 3 章 3.3、3.4、表 3-1",
  },
  {
    title: "Culture 又扮演什麼角色？",
    body: "培養速度慢，但仍是取得菌株、確認診斷與做藥物感受性試驗的重要依據。",
    bullets: [
      "第一次培養陽性的 MTB 菌株應做第一線藥敏。",
      "治療 2 個月後培養仍陽性，或陰轉後再陽性，需重新評估藥敏與治療反應。",
    ],
    source: "第 3 章 3.4.2、第 5 章 5.1.2",
  },
];

export const monitoringTimeline: TbMonitoringItem[] = [
  {
    title: "服藥順從性",
    action: "鼓勵加入 DOT；未依約回診或無法正確描述服藥方式時，主動評估中斷原因。",
    timing: "每次回診",
    source: "第 5 章 5.1.2",
  },
  {
    title: "痰 smear/culture",
    action: "治療約 2 個月、5 個月、完治時至少追蹤；若 smear/culture 陽性，建議每月追蹤至陰轉。",
    timing: "2 個月、5 個月、完治；必要時每月",
    source: "第 5 章 5.1.2",
  },
  {
    title: "胸部 X 光",
    action: "非 MDR-TB 建議治療前、治療後 1-2 個月、完治時追蹤；處方改變或加入新藥前也建議追蹤。",
    timing: "治療前、1-2 個月、完治",
    source: "第 5 章 5.1.2",
  },
  {
    title: "CBC/DC 與生化",
    action: "考慮 CBC/DC、AST/ALT、bilirubin、uric acid、BUN/Cr；高風險或基礎異常者更密集追蹤。",
    timing: "治療前，第 2、4、8 週",
    source: "第 5 章 5.1.2",
  },
  {
    title: "病毒學與共病",
    action: "治療前若狀態未知，建議檢測 HBsAg、anti-HCV；病人未拒絕時建議 HIV 檢測。",
    timing: "治療前",
    source: "第 5 章 5.1.2",
  },
  {
    title: "視力與辨色力",
    action: "使用 EMB 時宜每月檢查；老年或腎功能不佳者風險較高，全敏感後可考慮停 EMB。",
    timing: "每月",
    source: "第 5 章 5.1.2",
  },
  {
    title: "聽力與平衡",
    action: "使用 aminoglycoside 或 polypeptide 類藥物時追蹤，出現障礙時停用針劑。",
    timing: "使用期間",
    source: "第 5 章 5.1.2、5.2.2",
  },
  {
    title: "完治後追蹤",
    action: "完治後第一年每半年追蹤一次，此後每年追蹤；有呼吸道症狀時考慮驗痰。",
    timing: "完治後",
    source: "第 5 章 5.1.3",
  },
];

export const adverseReactionRules: TbMonitoringItem[] = [
  {
    title: "肝炎停藥門檻",
    action: "有肝炎症狀且 AST/ALT >3x ULN，或無症狀但 AST/ALT >5x ULN，或 total bilirubin >3 mg/dL 時建議停藥評估。",
    stopRule: "治療前肝功能已 >2x ULN 者，以超過治療前 2 倍作為肝炎判斷門檻。",
    source: "第 5 章 5.2.1、5.2.2、圖 5-1",
  },
  {
    title: "輕微肝功能異常",
    action: "無症狀且未達停藥門檻，或症狀輕微但 AST/ALT 未達 3x ULN，可密切觀察與追蹤。",
    source: "第 5 章 5.2.1",
  },
  {
    title: "嚴重皮疹",
    action: "嚴重或無法緩解的皮疹/搔癢，或 TEN/SJS，建議停止所有抗結核藥物並處理過敏反應。",
    source: "第 5 章 5.2.1、5.2.2",
  },
  {
    title: "視力惡化",
    action: "嚴重視力傷害時停用可能造成視神經毒性的藥物並照會眼科；輕微視力模糊可先停 EMB 密切觀察。",
    source: "第 5 章 5.2.1、5.2.2",
  },
  {
    title: "高尿酸與痛風",
    action: "尿酸 <13 mg/dL 且無關節炎時通常不需停 PZA；嚴重症狀或尿酸仍 >13 mg/dL 時停 PZA。",
    source: "第 5 章 5.2.1、5.2.2",
  },
  {
    title: "腎功能惡化",
    action: "使用抗結核藥後 creatinine 上升 >0.5 mg/dL，建議停藥並鑑別 prerenal/postrenal 或藥物性腎損傷。",
    source: "第 5 章 5.2.1、5.2.2",
  },
  {
    title: "血球細胞減少",
    action: "嚴重貧血、血小板下降、紫斑、白血球低下或泛血球低下時停止所有抗結核藥物，恢復後再逐步試藥。",
    source: "第 5 章 5.2.1、5.2.2",
  },
];

export const rechallengeProtocols = [
  {
    title: "藥物性肝炎小量漸進式給藥",
    source: "表 5-1",
    notes: ["肝功能恢復或降至正常上限 3 倍以下後再開始。", "逐一加藥期間可同時使用足量 EMB。", "嚴重肝炎或合併黃疸者，成功恢復 INH/RMP 後不建議再嘗試 PZA。"],
    steps: [
      "Day 0：檢測 ALT/AST/total bilirubin",
      "Day 1：INH 100 mg/day",
      "Day 2：INH 200 mg/day",
      "Day 3-5：INH full dose，並追蹤肝功能",
      "Day 6：加 RMP 150 mg/day",
      "Day 7：RMP 300 mg/day",
      "Day 8-10：RMP full dose，並追蹤肝功能",
      "Day 11：加 PZA 250 mg/day",
      "Day 12：PZA 500 mg/day",
      "Day 13：PZA full dose，並追蹤肝功能",
    ],
  },
  {
    title: "皮疹反應減敏流程",
    source: "表 5-2",
    notes: ["症狀嚴重者先停所有抗結核藥物，待症狀完全解除後再進行。", "菌量大或空洞/強陽性時，可考慮輔以針劑以降低抗藥風險。"],
    steps: [
      "Day 1：INH 50 mg/day",
      "Day 2：INH 100 mg/day",
      "Day 3：INH 300 mg/day",
      "Day 4：加 RMP 150 mg/day",
      "Day 5：RMP 300 mg/day",
      "Day 6：RMP full dose",
      "Day 7：加 EMB 200 mg/day",
      "Day 8：EMB 400 mg/day",
      "Day 9：EMB full dose",
      "Day 10：加 PZA 250 mg/day",
      "Day 11：PZA 500 mg/day",
      "Day 12：PZA full dose",
    ],
  },
];

export const regimenAdjustmentRows = [
  { unavailable: "H", substitute: "-", unknownDst: "9REZS", knownDst: "9REZ" },
  { unavailable: "R", substitute: "B", unknownDst: "2HBEZ / 4HB", knownDst: "2HBEZ / 4HB" },
  { unavailable: "Z", substitute: "-", unknownDst: "9HRE", knownDst: "9HR(E)" },
  { unavailable: "E", substitute: "-", unknownDst: "2HRZ / 4HR", knownDst: "2HRZ / 4HR" },
  { unavailable: "HR", substitute: "B", unknownDst: "9BEZS", knownDst: "9BEZ" },
  { unavailable: "HE", substitute: "-", unknownDst: "2RZKQT / 7RZQ", knownDst: "9RZQ" },
  { unavailable: "RE", substitute: "B", unknownDst: "2HBZ / 4HB", knownDst: "2HBZ / 4HB" },
  { unavailable: "EZ", substitute: "-", unknownDst: "2HRQKT / 7HRQ", knownDst: "9HR(S)" },
  { unavailable: "HEZ", substitute: "-", unknownDst: "2RQKT / 7RQT", knownDst: "9RQT(S)" },
];

export const tbDrugCards: TbDrugCard[] = [
  {
    name: "Isoniazid",
    abbr: "INH / H",
    role: "核心早期殺菌藥",
    adultDose: "5 mg/kg PO daily",
    maxDose: "300 mg/day",
    renal: "腎功能不全不需調整；高風險者加 pyridoxine。",
    toxicities: ["肝炎", "周邊神經炎", "皮疹/過敏", "罕見神經毒性"],
    notes: ["孕婦可使用。", "糖尿病、尿毒症、營養不良、酗酒、懷孕等可考慮 vitamin B6。", "避免與食物併服；制酸劑建議間隔。"],
    source: "第 6 章 6.1.1、表 6-1",
  },
  {
    name: "Rifampin",
    abbr: "RMP / R",
    role: "短程治療最重要 sterilizing drug",
    adultDose: "10 mg/kg PO daily",
    maxDose: "600 mg/day",
    renal: "腎功能不全不需調整。",
    toxicities: ["體液橘紅色", "肝炎", "胃腸不適", "血小板低下", "類流感症狀"],
    notes: ["強效酵素誘導，會影響避孕藥、warfarin、抗癲癇藥、抗病毒藥等。", "HIV 或抗凝血等交互作用情境可評估 rifabutin。"],
    source: "第 6 章 6.1.2、表 6-1、表 6-4",
  },
  {
    name: "Pyrazinamide",
    abbr: "PZA / Z",
    role: "加強期 sterilizing drug",
    adultDose: "25 mg/kg PO daily",
    maxDose: "2000 mg/day",
    renal: "腎功能不全：每次劑量不變，頻率改每週 3 次。",
    toxicities: ["肝毒性", "高尿酸血症", "關節痛", "胃腸不適"],
    notes: ["常用體重級距：40-55 kg 1000 mg、56-75 kg 1500 mg、>=76 kg 2000 mg。", "PZA 造成尿酸升高時不建議用 allopurinol。"],
    source: "第 6 章 6.1.3、表 6-1",
  },
  {
    name: "Ethambutol",
    abbr: "EMB / E",
    role: "保護處方避免抗藥",
    adultDose: "15 mg/kg PO daily",
    maxDose: "1600 mg/day",
    renal: "腎功能不全：每次劑量不變，頻率改每週 3 次。",
    toxicities: ["視神經病變", "辨色力異常", "胃腸不適", "皮疹"],
    notes: ["常用體重級距：40-55 kg 800 mg、56-75 kg 1200 mg、76-90 kg 1600 mg。", "使用期間應定期評估視力與辨色力。"],
    source: "第 6 章 6.1.4、表 6-1",
  },
  {
    name: "Rifabutin",
    abbr: "RFB / B",
    role: "RMP 替代 rifamycin",
    adultDose: "5 mg/kg PO daily",
    maxDose: "300 mg/day",
    renal: "輕中度腎功能不全不需調整；Ccr <30 mL/min 劑量減半。",
    toxicities: ["白血球低下", "葡萄膜炎", "肝毒性", "皮疹/搔癢"],
    notes: ["較 RMP 少交互作用，但仍需監測。", "高劑量或與 clarithromycin、fluconazole、PI 併用時較易 uveitis。"],
    source: "第 6 章 6.1.6、表 6-1",
  },
  {
    name: "Streptomycin",
    abbr: "SM / S",
    role: "特定再治或替代處方針劑",
    adultDose: "15 mg/kg IM/IV daily",
    maxDose: "1000 mg/day；累積總量建議 <120 g",
    renal: "腎功能不全：每次劑量維持，頻率每週 2-3 次；HD 後使用。",
    toxicities: ["耳毒性", "腎毒性", "暈眩", "平衡/聽力障礙"],
    notes: ["孕婦、聽神經障礙、重症肌無力為禁忌。", "高齡或 <50 kg 可考慮 500-750 mg/day 或 10 mg/kg。"],
    source: "第 6 章 6.1.5、表 6-3",
  },
  {
    name: "Levofloxacin / Moxifloxacin",
    abbr: "LFX / MFX / Q",
    role: "替代處方與抗藥性 TB 重要藥物",
    adultDose: "LFX 7.5-10 mg/kg；MFX 400 mg daily",
    maxDose: "LFX 1000 mg/day；MFX 400 mg/day",
    renal: "LFX 需依腎功能考慮調整；MFX 通常較少腎調需求。",
    toxicities: ["胃腸不適", "頭暈/頭痛", "QTc 延長", "肌腱/關節問題"],
    notes: ["避免單獨加入既有失敗處方，以免 FQ 續發抗藥。", "與制酸劑、鐵劑、sucralfate 需間隔。"],
    source: "第 5 章 5.3.1、第 6 章表 6-3、表 6-4",
  },
  {
    name: "Linezolid",
    abbr: "LZD",
    role: "抗藥性 TB 重要口服藥",
    adultDose: "依抗藥性 TB 處方與專家建議",
    maxDose: "需個別化",
    renal: "依臨床與毒性監測調整。",
    toxicities: ["骨髓抑制", "周邊/視神經病變", "乳酸中毒", "血清素症候群交互作用"],
    notes: ["建議由抗藥性 TB 團隊或專家共同管理。", "需監測 CBC 與神經毒性。"],
    source: "第 6 章 6.2.6、第 12 章",
  },
];

export const ltbiRegimens: TbLtbiRegimen[] = [
  {
    id: "3HP",
    regimen: "3HP",
    duration: "3 個月",
    frequency: "每週一次",
    doses: "12 劑",
    dot: "必須",
    candidates: "2 歲(含)以上接觸者與風險族群；不建議孕婦及未滿 2 歲幼童。",
    adultDose: "INH 15 mg/kg + RPT 依體重級距；兩者 max 900 mg weekly。",
    pediatricDose: "2-11 歲 INH 25 mg/kg weekly；RPT 依體重級距。",
    completionWindow: "120 天",
    cautions: ["Rifamycin 交互作用需審慎評估。", "體重 >=50 kg 可用 HP FDC：INH 300/RPT 300 mg，每次 3 顆。"],
    source: "第 10 章 10.4.3、表 10-5",
  },
  {
    id: "3HR",
    regimen: "3HR",
    duration: "3 個月",
    frequency: "每日一次",
    doses: "90 劑",
    dot: "必須",
    candidates: "所有年齡層接觸者與風險族群。",
    adultDose: "INH 5 mg/kg max 300 mg + RMP 10 mg/kg max 600 mg daily。",
    pediatricDose: "INH 10 mg/kg (7-15) + RMP 15 mg/kg (10-20) daily。",
    completionWindow: "120 天",
    cautions: ["RMP 交互作用需審慎評估。", "可依體重使用 INH/RMP 二合一劑型。"],
    source: "第 10 章 10.4.3、表 10-5",
  },
  {
    id: "4R",
    regimen: "4R",
    duration: "4 個月",
    frequency: "每日一次",
    doses: "120 劑",
    dot: "必須",
    candidates: "所有年齡層接觸者與風險族群；指標單一 INH 抗藥時常用。",
    adultDose: "RMP 10 mg/kg daily，max 600 mg。",
    pediatricDose: "RMP 15 mg/kg (10-20) daily。",
    completionWindow: "160 天",
    cautions: ["Rifamycin 交互作用需審慎評估。"],
    source: "第 10 章 10.4.3、表 10-3、表 10-5",
  },
  {
    id: "6H9H",
    regimen: "6H / 9H",
    duration: "6 或 9 個月",
    frequency: "每日一次",
    doses: "180 / 270 劑",
    dot: "建議",
    candidates: "所有年齡層；無法使用 rifamycin 類藥物時可考慮。HIV 病毒量控制不佳或免疫不全者可考慮 9H。",
    adultDose: "INH 5 mg/kg daily，max 300 mg。",
    pediatricDose: "INH 10 mg/kg (7-15) daily。",
    completionWindow: "240 / 365 天",
    cautions: ["慢性肝炎者使用需謹慎。", "指標單一 RMP 抗藥時可用 6H/9H。"],
    source: "第 10 章 10.4.3、表 10-3、表 10-5",
  },
  {
    id: "1HP",
    regimen: "1HP",
    duration: "1 個月",
    frequency: "每日一次",
    doses: "28 劑",
    dot: "必須",
    candidates: "13 歲(含)以上接觸者與風險族群；不建議孕婦。",
    adultDose: "INH 300 mg daily + RPT 依體重級距 daily，RPT max 600 mg。",
    pediatricDose: "目前建議年齡 13 歲(含)以上。",
    completionWindow: "40 天",
    cautions: ["<35 kg：RPT 300 mg；35-45 kg：450 mg；>=45 kg：600 mg。", "Rifamycin 交互作用需審慎評估。"],
    source: "第 10 章 10.4.3、表 10-5",
  },
  {
    id: "6FQ9FQ",
    regimen: "6FQ / 9FQ",
    duration: "6 或 9 個月",
    frequency: "每日一次",
    doses: "180 / 270 劑",
    dot: "必須",
    candidates: "MDR-TB 接觸者，限 TMTC 團隊(含聯盟醫院)或約定院所評估提供。",
    adultDose: "LFX 10-15 mg/kg max 750 mg，或 MFX 400 mg daily。",
    pediatricDose: "LFX 15-20 mg/kg；MFX 10-15 mg/kg。",
    completionWindow: "240 / 365 天",
    cautions: ["治療前需確認無主動脈瘤病史/病灶並做 ECG。", "治療 1 個月與完成前建議 ECG；QTc >500 msec 通常應停藥評估。", "需評估 FQ 血中濃度以調整劑量。"],
    source: "第 10 章 10.4.3、10.2.6、表 10-3、表 10-5",
  },
];

export const ltbiPrinciples: TbKeyPoint[] = [
  {
    title: "治療前先排除活動性 TB",
    body: "LTBI 治療前及中斷超過 1 個月後要接續治療者，需身體檢查、評估與 1 個月內胸部 X 光。",
    bullets: ["治療期間仍需評估是否已發病，避免用 LTBI 處方治療活動性 TB。", "LTBI 檢驗陰性不能排除活動性 TB。"],
    source: "第 10 章 10.2.2、10.4.4",
  },
  {
    title: "檢驗工具",
    body: "未滿 2 歲以 TST；2 歲(含)以上以 IGRA。2 至未滿 5 歲若無法做 IGRA，可使用 TST。",
    source: "第 10 章 10.4.2",
  },
  {
    title: "處方選擇原則",
    body: "建議優先短程處方；無法使用短程處方時，再考慮 6H 或 9H。",
    bullets: ["指標全敏感：可選建議處方。", "指標 INH 單一抗藥：4R。", "指標 RMP 單一抗藥：6H/9H。", "MDR-TB 接觸者：轉 TMTC 評估 6FQ/9FQ。"],
    source: "第 10 章 10.4.3、表 10-3",
  },
  {
    title: "LTBI 監測",
    body: "治療期間每月回診；依問診與身體檢查決定是否需肝功能檢驗。肝炎達定義時建議停藥。",
    bullets: ["1HP/3HP/3HR/4R 肝炎發生率較低，但可採同樣監測模式。", "有肝病、貧血、血小板問題等醫療考量者，用藥前建議 CBC/DC baseline。", "FQ 處方需特別監測 QTc、肌腱/關節、血糖與神經精神症狀。"],
    source: "第 10 章 10.2.6",
  },
];

export const specialPopulationCards: TbKeyPoint[] = [
  {
    title: "HIV 感染者",
    body: "需特別處理 rifamycin 與抗病毒藥物交互作用；RFB 常作為 RMP 替代選項，詳細搭配需參考第 9 章表格。",
    bullets: ["TB 與 HIV 治療時序、IRIS、LTBI 治療均需個別化。", "建議與感染科/結核病專家共同評估。"],
    source: "第 9 章、表 9-1、表 9-2",
  },
  {
    title: "兒童 TB",
    body: "兒童診療另有第 8 章；抗藥性兒童 TB 另有第 13 章。",
    bullets: ["兒童藥物劑量、可溶錠與接觸者處置不應直接套用成人表格。", "LTBI 期間兒童每次回診應量體重，以便調整劑量並評估是否發病。"],
    source: "第 8 章、第 13 章、第 10 章 10.3.2",
  },
  {
    title: "肺外結核",
    body: "肺外 TB 治療期間依部位不同；中樞神經、骨關節等情境常需較長療程。",
    source: "第 7 章、表 7-1",
  },
  {
    title: "MDR/RR-TB",
    body: "建議與專家諮詢會診；處方涉及 FQ、bedaquiline、linezolid 等核心藥物，應由抗藥性 TB 團隊管理。",
    bullets: ["RMP 抗藥通常依 MDR-TB 治療處方思考。", "MDR-TB 接觸者 LTBI 治療需轉 TMTC 或約定院所評估。"],
    source: "第 12 章、第 10 章表 10-3",
  },
];

export const drugResistantTbTables: TbSimpleTable[] = [
  {
    title: "表 12-1 個人化長程 MDR-TB 處方藥物",
    source: "第 12 章，表 12-1",
    columns: ["類別", "藥物", "建議劑量"],
    rows: [
      ["Group A：3 種全部使用", "Levofloxacin (LFX) 或 Moxifloxacin (MFX)", "LFX 750-1000 mg/day，max 1500 mg/day；MFX 400 mg/day，high dose 600-800 mg/day"],
      ["Group A：3 種全部使用", "Bedaquiline (BDQ)", "400 mg/day x 2 weeks，then 200 mg TIW"],
      ["Group A：3 種全部使用", "Linezolid (LZD)", "600 mg/day，max 1200 mg/day"],
      ["Group B：使用 1-2 種", "Clofazimine (CFZ)", "100 mg/day"],
      ["Group B：使用 1-2 種", "Cycloserine (CS) 或 Terizidone (TRD)", "10-15 mg/kg/day，max 1000 mg/day"],
      ["Group C：強化處方完整性", "Ethambutol (EMB)", "15-25 mg/kg/day，max 1200 mg/day"],
      ["Group C：強化處方完整性", "Delamanid (DLM)", "200 mg daily"],
      ["Group C：強化處方完整性", "Pyrazinamide (PZA)", "20-30 mg/kg/day，max 2000 mg/day"],
      ["Group C：強化處方完整性", "Imipenem-cilastatin (IPM-CLN) 或 Meropenem (MPM)", "IPM-CLN 1000 mg q12h；MPM 1000 mg q8h 或 2000 mg q12h；每 dose 前給 clavulanate 125 mg"],
      ["Group C：強化處方完整性", "Amikacin (AM) 或 Streptomycin (SM)", "15 mg/kg/day，max 1 g/day"],
      ["Group C：強化處方完整性", "Ethionamide (ETO) 或 Prothionamide (PTO)", "15-20 mg/kg/day，max 1 g/day"],
      ["Group C：強化處方完整性", "p-aminosalicylic acid (PAS)", "8-12 g/day in 2-3 doses，max 12 g/day"],
    ],
    notes: [
      "腎功能不全需調整：LFX 750-1000 mg TIW；CS/TRD 250 mg/day 或 500 mg TIW；EMB 15-25 mg TIW；PZA 25 mg/kg TIW；IPM-CLN/MPM 500-750 mg q12h；AM/SM 避免使用。",
      "MPM 需合併 clavulanate；臨床可用 Augmentin 1 g 錠劑中的 clavulanate 125 mg。",
      "AM 可考慮高劑量間歇給藥 25 mg/kg/day TIW 並搭配血中濃度監測。",
    ],
  },
  {
    title: "表 12-2 BPaL/BPaLM 處方劑量",
    source: "第 12 章，表 12-2",
    columns: ["藥物", "劑量", "備註"],
    rows: [
      ["Bedaquiline", "400 mg once daily x 2 weeks，then 200 mg three times per week；或 200 mg daily x 8 weeks，then 100 mg daily", "每日 BDQ 設計來自 ZeNix trial，臨床仍需更多證據檢驗效果。"],
      ["Pretomanid", "200 mg once daily", ""],
      ["Linezolid", "600 mg once daily", "BPaL/BPaLM 中主要產生副作用的藥物；建議搭配 TDM 調整。"],
      ["Moxifloxacin", "400 mg once daily", "只用於 BPaLM 處方。"],
    ],
  },
  {
    title: "表 12-3 各種 MDR/RR-TB 處方的比較",
    source: "第 12 章，表 12-3",
    columns: ["處方", "療程", "LZD", "針劑", "<14 歲兒童", "嚴重肺結核", "嚴重肺外結核", "懷孕/哺乳"],
    rows: [
      ["Long regimen", "18-20 個月，或培養陰轉後 15-17 個月", "可用", "可用", "可用", "可用", "可用", "可用"],
      ["BPaLM / BPaL", "6 / 6-9 個月", "使用", "不用", "不適用", "可用", "不適用", "不適用"],
      ["BDQ(+) all-oral regimen", "9-11 個月", "不用", "不用", "可用", "不適用", "不適用", "可用；孕婦以 2 個月 LZD 取代 ETO"],
      ["STREAM control regimen", "9-11 個月", "不用", "使用 4 個月", "不適用", "可用", "不適用", "不適用"],
      ["STREAM oral regimen", "9-11 個月", "不用", "不用", "不適用", "可用", "不適用", "不適用"],
      ["STREAM 6m regimen", "6-8 個月", "不用", "使用 2 個月", "不適用", "可用", "不適用", "不適用"],
      ["NeXT TB 6m all-oral regimen", "6 個月", "使用", "不用", "不適用", "可用", "不適用", "不適用"],
    ],
    notes: [
      "原表以 o/x 比較各處方在特殊族群的適用性；此處轉成中文速查。",
      "新型短程處方臨床試驗條件較嚴格，常排除肝腎功能受損等慢性病族群；臨床使用需審慎評估療效與副作用。",
      "本 PDF 內文搜尋未找到表 12-4；第 12 章修訂版內文目前列出表 12-1 至表 12-3。",
    ],
  },
];
