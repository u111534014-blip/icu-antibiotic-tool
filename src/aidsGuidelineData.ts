export type AidsSectionId = "art" | "artDrugs" | "artInteractions" | "monitoring" | "oi" | "hepatitis" | "pep" | "sti" | "special";

export type AidsKeyPoint = {
  title: string;
  body: string;
  bullets?: string[];
  source: string;
};

export type AidsRegimen = {
  id: string;
  name: string;
  category: string;
  dose: string;
  localName?: string;
  regimenType?: string;
  backbone?: string;
  thirdAgent?: string;
  components?: { abbr: string; generic: string; drugClass: string; dose?: string }[];
  food?: string;
  renal?: string;
  hepatic?: string;
  viralLoadLimit?: string;
  cd4Limit?: string;
  crush?: string;
  hbv?: string;
  keyAdverse?: string;
  whenToUse: string;
  cautions: string[];
  source: string;
};

export type AidsTable = {
  title: string;
  source: string;
  columns: string[];
  rows: string[][];
  notes?: string[];
};

export const aidsGuidelineMeta = {
  title: "愛滋病檢驗及治療指引",
  subtitle: "Taiwan HIV/AIDS Guideline Quick Reference",
  source:
    "台灣愛滋病學會 / 衛生福利部疾病管制署：第 1 章 2024/10/16；第 2 章 2025/02/07；第 3 章 2022/12/26；第 5 章 2025/02/03；第 6 章 2024/12/18；第 9、11 章 2025/12/23；第 12 章 2022/05/12。",
  notice:
    "此頁是臨床速查，不取代完整指引、藥物交互作用資料庫、健保/疾管署給付規範或 HIV 專家會診。PEP、懷孕、治療失敗、抗藥、CNS OI、HBV/HCV 共病與複雜交互作用請務必核對最新版文件。",
};

export const aidsSections: { id: AidsSectionId; label: string; short: string }[] = [
  { id: "art", label: "初始 ART", short: "架構" },
  { id: "artDrugs", label: "ART 藥物", short: "搜尋/分線" },
  { id: "artInteractions", label: "ART 交互作用", short: "重大" },
  { id: "monitoring", label: "檢驗追蹤", short: "VL/CD4" },
  { id: "oi", label: "OI 預防/治療", short: "CD4 門檻" },
  { id: "hepatitis", label: "HBV/HCV", short: "共病" },
  { id: "pep", label: "PEP / nPEP", short: "72 hr" },
  { id: "sti", label: "STD", short: "篩檢治療" },
  { id: "special", label: "特殊情境", short: "孕產/癌症/物質" },
];

export const artPrinciples: AidsKeyPoint[] = [
  {
    title: "診斷後儘早開始 ART",
    body:
      "目前治療目標是快速抑制血漿 HIV RNA、提升 CD4、降低 OI/腫瘤/死亡風險，並減少傳播。新診斷者可採快速或當日治療，不需等待抗藥性基因檢測結果才開始。",
    bullets: [
      "開始前仍應抽 HIV viral load、CD4，並評估 HBV/HCV、梅毒、腎肝功能、懷孕、LTBI 與藥物交互作用。",
      "若後續抗藥或檢驗結果顯示不合適，再依結果調整處方。",
      "服藥後 2-4 週內回診，確認服藥時間、副作用與遵囑性。",
    ],
    source: "第 1 章；第 2 章表 2-1、2-2",
  },
  {
    title: "有 OI 時的 ART 時機",
    body:
      "多數 OI 建議儘快開始 ART，但結核腦膜炎、隱球菌腦膜炎，或會與 rifampin/rifabutin 等產生重大交互作用的治療，需要個別評估。",
    bullets: [
      "PJP：通常建議 OI 治療後 2 週內開始 ART。",
      "Toxoplasma encephalitis：一般建議診斷後 2-3 週內開始 ART。",
      "Cryptococcal meningitis：需注意 IRIS 與顱內壓，ART 時機應與 ID/專家討論。",
      "TB：依 CD4、疾病部位與 TB meningitis 風險調整 ART 時機與 rifamycin 交互作用。",
    ],
    source: "第 1 章；第 3 章 PJP、弓蟲、TB、隱球菌章節",
  },
];

export const artSelectionTables: AidsTable[] = [
  {
    title: "初始 ART 處方組成概念",
    source: "第 1 章前言、表 1-5、表 1-6",
    columns: ["架構", "常見組合", "臨床意義"],
    rows: [
      ["Backbone", "通常為 2 個 NRTIs，例如 TAF/FTC、TDF/3TC、ABC/3TC", "決定 HBV 涵蓋、腎功能/骨質限制與長期耐受性。"],
      ["Third agent", "NNRTI、INSTI 或 PI，例如 RPV、DOR、BIC、DTG、DRV/c", "決定抗藥屏障、交互作用、食物限制與快速抑制能力。"],
      ["第一線三合一", "2 NRTIs + NNRTI 或 2 NRTIs + INSTI", "台灣 2024 規範：TAF/FTC/RPV、TDF/3TC/DOR、ABC/3TC/DTG、TAF/FTC/BIC。"],
      ["第一線二合一", "INSTI + NRTI", "台灣 2024 規範：DTG/3TC；需確認 HBV 不適用、病毒量限制與抗藥風險。"],
      ["第二線/轉換", "PI-containing、DTG/RPV、LA CAB/RPV 等", "常需符合規範、審查或病毒穩定條件；處方前要查交互作用與抗藥史。"],
    ],
    notes: ["STR = single-tablet regimen；斜線代表固定劑量複方。"],
  },
  {
    title: "台灣第一線推薦處方（2024 年 4 月版）",
    source: "第 1 章表 1-5",
    columns: ["分類", "處方", "成分分類"],
    rows: [
      ["三合一 NNRTI-containing", "TAF/FTC/RPV", "2 NRTIs + NNRTI"],
      ["三合一 NNRTI-containing", "TDF/3TC/DOR", "2 NRTIs + NNRTI"],
      ["三合一 INSTI-containing", "ABC/3TC/DTG", "2 NRTIs + INSTI"],
      ["三合一 INSTI-containing", "TAF/FTC/BIC", "2 NRTIs + INSTI"],
      ["二合一", "DTG/3TC", "INSTI + NRTI"],
    ],
  },
];

export const artInteractionTables: AidsTable[] = [
  {
    title: "ART 常見重大交互作用速查",
    source: "NIH Adult and Adolescent ARV Guidelines：Drug Interactions Overview；Tables 24a, 24b, 24d；Statin Therapy in People With HIV；Special Populations: Transplantation",
    columns: ["ART / 併用藥", "主要風險", "建議處置", "監測"],
    rows: [
      [
        "BIC/DTG/EVG/RAL + polyvalent cations（Al/Mg/Ca/Fe/Zn、制酸劑、鐵鈣鎂鋅、sucralfate、multivitamin）",
        "螯合使 INSTI 吸收下降，可能造成病毒抑制失敗。",
        "BIC/DTG 與 Ca/Fe 可隨餐同服；空腹或 Al/Mg 制酸劑需錯開。常用原則：INSTI 至少提前 2 hr，或 cation 延後 4-6 hr；EVG/c、RAL 也需錯開。",
        "HIV viral load、服藥時間與營養品/制酸劑使用史；新併用後 2-4 週內確認遵囑性。",
      ],
      [
        "RPV PO + acid reducers",
        "胃酸下降使 RPV 暴露量下降；PPI 併用可能導致 virologic failure。",
        "PPI 禁用。H2 blocker 至少在 RPV 前 12 hr 或後 4 hr；antacid 至少在 RPV 前 2 hr 或後 4 hr。RPV 必須隨餐。",
        "HIV viral load、胃藥使用史、QTc 風險藥物；若需長期 PPI，改非 RPV 處方。",
      ],
      [
        "Rifampin / rifapentine / rifabutin 或強效 CYP/UGT/P-gp inducer（carbamazepine、phenytoin、phenobarbital、St. John's wort 等）",
        "降低多數 ART 暴露量；BIC、EVG/c、RPV、DOR、LA CAB/RPV、lenacapavir 特別容易受影響。",
        "避免自行併用；TB 治療需參考 rifamycin 表格。DTG/RAL 可能需加量；DOR/RPV/BIC/EVG/c/LA CAB/RPV 多需避免或改藥。",
        "HIV viral load、TB/OI 治療反應；開始與停用誘導劑後都要重新核對劑量，停 rifamycin 後通常仍需等待誘導消退。",
      ],
      [
        "DRV/c、EVG/c 或其他 boosted regimen + statins",
        "COBI/RTV 抑制 CYP3A/transporters，使 statin 暴露上升；simvastatin/lovastatin 可嚴重肌毒性。",
        "Simvastatin、lovastatin 禁用。優先 pitavastatin；pravastatin 相對安全但 DRV 併用仍需低劑量起始。Atorvastatin/rosuvastatin 低劑量起始、依耐受與 LDL 反應調整。",
        "肌痛/無力、CK（有症狀時）、AST/ALT、lipid profile；新增或停用 booster 時重估 statin 劑量。",
      ],
      [
        "Boosted PI/COBI regimens + DOAC / warfarin",
        "P-gp/CYP 交互作用使 DOAC 暴露上升；rivaroxaban 風險高。Warfarin 可能上升或下降，且 RTV 與 COBI 不可互相外推。",
        "Rivaroxaban 通常避免。Apixaban 需依原劑量判斷是否避免或減量；複雜抗凝建議改 warfarin/LMWH 並專家討論。",
        "出血/血栓、腎功能；warfarin 需密集 INR，開始/停用或更換 booster 後重新追蹤。",
      ],
      [
        "Boosted PI/COBI regimens + corticosteroids（特別是 fluticasone、budesonide、triamcinolone；含吸入、鼻噴、關節注射）",
        "Steroid 暴露上升，可能 Cushing syndrome、adrenal suppression；長效注射風險特別麻煩。",
        "避免 fluticasone/budesonide/triamcinolone；可評估 beclomethasone 或非 steroid 替代。必須使用時需明確療程與監測計畫。",
        "體重、血糖、血壓、Cushingoid features、早晨 cortisol/ACTH stimulation（有疑慮時）。",
      ],
      [
        "Boosted PI/COBI 或 EVG/c + tacrolimus / cyclosporine / sirolimus / everolimus",
        "免疫抑制劑濃度可大幅上升，造成腎毒性、神經毒性或感染；NNRTI inducer 則可能降低濃度。",
        "移植病人優先選 BIC 或 DTG 等 unboosted second-generation INSTI。若無法避免 booster，免疫抑制劑需大幅減量/延長間隔並以 TDM 調整。",
        "Tacrolimus/sirolimus/cyclosporine trough、SCr、K、血壓、神經毒性、排斥/感染徵象。",
      ],
      [
        "TDF 或 TAF + nephrotoxic drugs（NSAIDs、aminoglycoside、amphotericin B、vancomycin、contrast、boosted PI 等）",
        "Tenofovir 相關腎毒性或近端腎小管病變風險增加；TDF 風險較 TAF 高。",
        "高風險或 eGFR 下降者優先考慮 TAF 或非 tenofovir backbone；避免高劑量/多重 nephrotoxin，必要時縮短療程並補監測。",
        "SCr/eGFR、urinalysis、尿糖/尿蛋白、serum phosphate（蛋白尿/糖尿或骨痛肌痛時）、藥物濃度（如 vancomycin）。",
      ],
      [
        "DTG 或 BIC / COBI / RPV + SCr 解讀；DTG + metformin",
        "DTG、BIC、COBI、RPV 可抑制 creatinine tubular secretion，使 SCr 輕升但不代表真 GFR 下降；DTG 會增加 metformin 暴露。",
        "SCr 輕升需和真正 AKI 區分；DTG 併 metformin 時低劑量起始/調整，腎功能差或高劑量 metformin 者更謹慎。",
        "SCr 趨勢、尿液異常、乳酸中毒/腸胃副作用、血糖/HbA1c；SCr 上升 >0.4 mg/dL 或持續上升時評估真腎損傷。",
      ],
    ],
    notes: [
      "此表只列臨床常見且需要行動的重大交互作用；完整處方仍需逐項核對 Liverpool HIV interaction、NIH interaction tables 或同等資料庫。",
      "COBI 與 RTV 都是 booster，但不能把所有交互作用完全互相外推，特別是 warfarin、DOAC、statin、voriconazole、phenytoin 等。",
      "新增、停用或更換 ART / 交互作用藥物後，病毒量、毒性與治療效果都要重新確認。",
    ],
  },
];

export const initialArtRegimens: AidsRegimen[] = [
  {
    id: "biktarvy",
    name: "TAF/FTC/BIC (Biktarvy)",
    localName: "吉他韋",
    category: "第一線推薦 STR",
    dose: "1 tab PO QD",
    regimenType: "INSTI-containing three-drug combination",
    backbone: "TAF 25 mg + FTC 200 mg",
    thirdAgent: "BIC 50 mg",
    components: [
      { abbr: "TAF", generic: "tenofovir alafenamide", drugClass: "NRTI", dose: "25 mg" },
      { abbr: "FTC", generic: "emtricitabine", drugClass: "NRTI", dose: "200 mg" },
      { abbr: "BIC", generic: "bictegravir", drugClass: "INSTI", dose: "50 mg" },
    ],
    food: "空腹或隨餐",
    renal: "表 1-6：eGFR >=30 mL/min/1.73m2 或洗腎患者可用；註 e：不建議 eGFR 15-29，或 eGFR <15 且未洗腎者。",
    hepatic: "Child-Pugh A/B 可用不需調整；Child-Pugh C 無資料。",
    viralLoadLimit: "無",
    cd4Limit: "無",
    crush: "可泡水溶解；不建議磨碎。",
    hbv: "含 TAF/FTC，對 HBV 有活性；HBV 共病或 HBV 狀態未明時是較穩的選項。",
    keyAdverse: "BIC/INSTI：噁心、頭痛、腹瀉、體重增加；可能抑制腎小管 creatinine 排出，使 SCr 輕升但不影響實際 GFR。",
    whenToUse: "第二代 INSTI，抗藥屏障高；同時含 TAF/FTC，適合快速/當日治療，且可涵蓋 HBV 活性。",
    cautions: [
      "快速/當日治療常用選項，尤其 HBV 狀態未明、需要避免 3TC-only HBV pressure 時。",
      "與 polyvalent cations（Fe、Ca、Mg、Al 等）併用需注意服藥間隔或隨餐規則。",
    ],
    source: "第 1 章表 1-5、表 1-6",
  },
  {
    id: "odefsey",
    name: "TAF/FTC/RPV (Odefsey)",
    localName: "安以斯",
    category: "第一線推薦 STR",
    dose: "1 tab PO QD with food",
    regimenType: "NNRTI-containing three-drug combination",
    backbone: "TAF 25 mg + FTC 200 mg",
    thirdAgent: "RPV 25 mg",
    components: [
      { abbr: "TAF", generic: "tenofovir alafenamide", drugClass: "NRTI", dose: "25 mg" },
      { abbr: "FTC", generic: "emtricitabine", drugClass: "NRTI", dose: "200 mg" },
      { abbr: "RPV", generic: "rilpivirine", drugClass: "NNRTI", dose: "25 mg" },
    ],
    food: "隨餐；空腹 RPV 暴露量偏低。",
    renal: "表 1-6：eGFR >=30 mL/min/1.73m2。",
    hepatic: "Child-Pugh A/B 可用不需調整；Child-Pugh C 無資料。",
    viralLoadLimit: "HIV RNA <100,000 copies/mL",
    cd4Limit: "CD4 >200 cells/uL",
    crush: "不可切半或磨碎。",
    hbv: "含 TAF/FTC，對 HBV 有活性；停用 TAF 時需注意 HBV flare。",
    keyAdverse: "RPV：皮疹、肝功能異常、頭痛、憂鬱、睡眠障礙；會抑制腎小管 creatinine 排出但不影響實際 GFR。",
    whenToUse: "含 TAF/FTC，可涵蓋 HBV 活性；RPV 適合 CD4 >200 cells/uL 且 HIV RNA <100,000 copies/mL 的初始治療者。",
    cautions: [
      "須隨餐服用。",
      "不可併用 PPI；與 H2 blocker/antacid 需錯開。",
      "RPV 抗藥屏障較 INSTI/boosted PI 低。",
    ],
    source: "第 1 章表 1-5、表 1-6",
  },
  {
    id: "delstrigo",
    name: "TDF/3TC/DOR (Delstrigo)",
    localName: "達滋克",
    category: "第一線推薦 STR",
    dose: "1 tab PO QD",
    regimenType: "NNRTI-containing three-drug combination",
    backbone: "TDF 300 mg + 3TC 300 mg",
    thirdAgent: "DOR 100 mg",
    components: [
      { abbr: "TDF", generic: "tenofovir disoproxil fumarate", drugClass: "NRTI", dose: "300 mg" },
      { abbr: "3TC", generic: "lamivudine", drugClass: "NRTI", dose: "300 mg" },
      { abbr: "DOR", generic: "doravirine", drugClass: "NNRTI", dose: "100 mg" },
    ],
    food: "空腹或隨餐",
    renal: "表 1-6：eGFR >=50 mL/min/1.73m2。TDF 需監測腎功能、尿蛋白/近端腎小管病變與骨質風險。",
    hepatic: "Child-Pugh A/B 可用不需調整；Child-Pugh C 無資料。",
    viralLoadLimit: "無",
    cd4Limit: "無",
    crush: "不可切半或磨碎。",
    hbv: "含 TDF/3TC，對 HBV 有活性；停用 TDF 時需注意 HBV flare。",
    keyAdverse: "DOR：頭痛、睡眠障礙；TDF：腎功能損傷、近端腎小管病變、骨密度下降。",
    whenToUse: "DOR 為較新的 NNRTI；TDF/3TC 對 HBV 有活性。",
    cautions: [
      "TDF 需注意腎功能、尿蛋白與骨質風險。",
      "DOR 由 CYP3A4 代謝，不可併用強效 CYP3A inducer。",
      "懷孕資料較少，孕婦需另行評估。",
    ],
    source: "第 1 章表 1-5、表 1-6",
  },
  {
    id: "triumeq",
    name: "ABC/3TC/DTG (Triumeq)",
    localName: "三恩美",
    category: "第一線推薦 STR",
    dose: "1 tab PO QD",
    regimenType: "INSTI-containing three-drug combination",
    backbone: "ABC 600 mg + 3TC 300 mg",
    thirdAgent: "DTG 50 mg",
    components: [
      { abbr: "ABC", generic: "abacavir", drugClass: "NRTI", dose: "600 mg" },
      { abbr: "3TC", generic: "lamivudine", drugClass: "NRTI", dose: "300 mg" },
      { abbr: "DTG", generic: "dolutegravir", drugClass: "INSTI", dose: "50 mg" },
    ],
    food: "空腹或隨餐",
    renal: "表 1-6：eGFR >=30 mL/min/1.73m2；註 f：DHHS 建議 >=30，EACS 建議 >=50 可用 ABC/3TC/DTG 單錠。",
    hepatic: "表 1-6：不建議。註 g：Child-Pugh A 需降低 ABC 劑量，應用單方而非 Triumeq；Child-Pugh B/C 安全性、療效、PK 未確立，禁用。",
    viralLoadLimit: "無",
    cd4Limit: "無",
    crush: "可切半或磨碎。",
    hbv: "不建議 HBV coinfection；只有 3TC 對 HBV 有活性，長期易誘發 HBV 抗藥。",
    keyAdverse: "ABC：過敏反應、肝功能異常、可能增加缺血性心臟病風險；DTG：失眠、頭痛、噁心、肝毒性、體重增加。",
    whenToUse: "DTG 抗藥屏障高；國人 ABC 過敏風險低，指引未建議例行 HLA-B*5701。",
    cautions: [
      "不建議用於慢性 HBV coinfection，因只有 3TC 對 HBV 有活性且易產生 HBV 抗藥。",
      "ABC 過敏常在 2-4 週內出現，特別是 10-14 天。",
      "ABC 可能增加心血管風險，心血管高風險者需審慎。",
    ],
    source: "第 1 章；第 2 章初次評估",
  },
  {
    id: "dovato",
    name: "DTG/3TC (Dovato)",
    localName: "洛瓦梭",
    category: "第一線推薦二合一 STR",
    dose: "1 tab PO QD",
    regimenType: "Two-drug combination",
    backbone: "3TC 300 mg",
    thirdAgent: "DTG 50 mg",
    components: [
      { abbr: "DTG", generic: "dolutegravir", drugClass: "INSTI", dose: "50 mg" },
      { abbr: "3TC", generic: "lamivudine", drugClass: "NRTI", dose: "300 mg" },
    ],
    food: "空腹或隨餐",
    renal: "表 1-6：eGFR >=30 mL/min/1.73m2；註 f：DHHS 建議 >=30，EACS 建議 >=50 可用 DTG/3TC 單錠。",
    hepatic: "Child-Pugh A/B 可用不需調整；Child-Pugh C 無資料。",
    viralLoadLimit: "HIV RNA <500,000 copies/mL",
    cd4Limit: "無",
    crush: "可切半或磨碎。",
    hbv: "不建議 HBV coinfection 或 HBV 狀態未明；3TC 單獨壓 HBV 易產生 HBV 抗藥。",
    keyAdverse: "DTG：失眠、頭痛、噁心、肝毒性、體重增加；3TC 副作用少但仍可能嚴重肝功能異常或乳酸中毒。",
    whenToUse: "初始治療二合一處方；臨床試驗顯示在適當族群不劣於三合一。",
    cautions: [
      "證據主要限於 HIV RNA <500,000 copies/mL。",
      "不建議用於 HBV coinfection 或 HBV 狀態不明者。",
      "若疑似抗藥、PrEP failure、嚴重 OI 或需快速涵蓋 HBV，通常選其他三合一更穩。",
    ],
    source: "第 1 章表 1-5、表 1-6",
  },
  {
    id: "symtuza",
    name: "TAF/FTC/DRV/c (Symtuza)",
    localName: "信澤力",
    category: "第二線 / PI-containing STR",
    dose: "1 tab PO QD with food",
    regimenType: "PI-containing three-drug combination",
    backbone: "TAF 10 mg + FTC 200 mg",
    thirdAgent: "DRV 800 mg + COBI 150 mg",
    components: [
      { abbr: "TAF", generic: "tenofovir alafenamide", drugClass: "NRTI", dose: "10 mg" },
      { abbr: "FTC", generic: "emtricitabine", drugClass: "NRTI", dose: "200 mg" },
      { abbr: "DRV", generic: "darunavir", drugClass: "PI", dose: "800 mg" },
      { abbr: "COBI", generic: "cobicistat", drugClass: "PK booster", dose: "150 mg" },
    ],
    food: "隨餐",
    renal: "表 1-6：eGFR >=30 mL/min/1.73m2。",
    hepatic: "Child-Pugh A/B 可用不需調整；Child-Pugh C 無資料。",
    viralLoadLimit: "無",
    cd4Limit: "無",
    crush: "可切半或磨碎。",
    hbv: "含 TAF/FTC，對 HBV 有活性。",
    keyAdverse: "DRV/c：噁心、腹瀉、高血脂、皮疹、腎結石；COBI 抑制腎小管 creatinine 排出但不影響實際 GFR。",
    whenToUse: "PI 抗藥屏障高，來源或病人有疑似抗藥、治療史複雜時可考慮；PEP/nPEP 中也作替代處方。",
    cautions: [
      "CYP3A 交互作用多，處方前應查 Liverpool HIV interaction 或同等資料庫。",
      "DRV 含 sulfa moiety，需詢問磺胺藥物過敏史。",
      "第 11 章 nPEP 註明不適用於懷孕婦女和未滿 12 歲兒童。",
    ],
    source: "第 1 章表 1-3、表 1-6；第 9、11 章 PEP",
  },
  {
    id: "genvoya",
    name: "TAF/FTC/EVG/c (Genvoya)",
    category: "第二線 / INSTI-containing STR",
    dose: "1 tab PO QD with food",
    regimenType: "INSTI-containing three-drug combination",
    backbone: "TAF 10 mg + FTC 200 mg",
    thirdAgent: "EVG + COBI",
    components: [
      { abbr: "TAF", generic: "tenofovir alafenamide", drugClass: "NRTI", dose: "10 mg" },
      { abbr: "FTC", generic: "emtricitabine", drugClass: "NRTI", dose: "200 mg" },
      { abbr: "EVG", generic: "elvitegravir", drugClass: "INSTI" },
      { abbr: "COBI", generic: "cobicistat", drugClass: "PK booster" },
    ],
    food: "隨餐",
    renal: "表 1-6：eGFR >=30 mL/min/1.73m2。",
    hepatic: "Child-Pugh A/B 可用不需調整；Child-Pugh C 無資料。",
    viralLoadLimit: "無",
    cd4Limit: "無",
    crush: "可切半或磨碎。",
    hbv: "含 TAF/FTC，對 HBV 有活性。",
    keyAdverse: "EVG/INSTI：噁心、頭痛、腹瀉、體重增加；COBI 使 SCr 輕升但不影響實際 GFR。",
    whenToUse: "因第一代 INSTI 抗藥屏障較低，Biktarvy 等第二代 INSTI 單錠上市後已移出第一線清單。",
    cautions: [
      "含 COBI，交互作用較 BIC/DTG 多。",
      "需隨餐；polyvalent cations 也需注意間隔。",
    ],
    source: "第 1 章表 1-4、表 1-6",
  },
  {
    id: "juluca",
    name: "DTG/RPV (Juluca)",
    localName: "滋若愷",
    category: "二合一轉換處方",
    dose: "1 tab PO QD with food",
    regimenType: "Two-drug switch regimen",
    backbone: "無 NRTI backbone",
    thirdAgent: "DTG 50 mg + RPV 25 mg",
    components: [
      { abbr: "DTG", generic: "dolutegravir", drugClass: "INSTI", dose: "50 mg" },
      { abbr: "RPV", generic: "rilpivirine", drugClass: "NNRTI", dose: "25 mg" },
    ],
    food: "隨餐",
    renal: "表 1-6：無限制；註 e：腎功能不全臨床資料有限，但 PK 分析顯示劑量不需調整。",
    hepatic: "Child-Pugh A/B 可用不需調整；Child-Pugh C 無資料。",
    viralLoadLimit: "限用於病毒量控制穩定患者；HIV-1 RNA <50 copies/mL 持續至少 6 個月。",
    cd4Limit: "無",
    crush: "不可切半或磨碎。",
    hbv: "不適合 HBV coinfection；無 HBV 活性 backbone。",
    keyAdverse: "DTG：失眠、頭痛、體重增加；RPV：皮疹、肝功能異常、憂鬱、睡眠障礙。",
    whenToUse: "僅供病毒穩定且符合規範者轉換；不能作為 ART-naive 初始治療。",
    cautions: [
      "需確認對 DTG/RPV 無已知或疑似抗藥。",
      "不可併用 PPI；rifampin/rifapentine 禁用。",
      "轉換後下一次回診需檢測 viral load。",
    ],
    source: "第 1 章表 1-5、表 1-6 註 c",
  },
  {
    id: "cab-rpv",
    name: "LA CAB/RPV (Vocabria + Rekambys)",
    localName: "莫帕滋 + 瑞卡必",
    category: "長效針劑 / 第二線規範",
    dose: "CAB + RPV IM，依核准療程與給付規範",
    regimenType: "Long-acting injectable",
    backbone: "無 NRTI backbone",
    thirdAgent: "CAB + RPV",
    components: [
      { abbr: "CAB", generic: "cabotegravir", drugClass: "INSTI", dose: "200 mg/mL" },
      { abbr: "RPV", generic: "rilpivirine", drugClass: "NNRTI", dose: "300 mg/mL" },
    ],
    food: "肌肉注射；RPV 針劑不受食物或 PPI 影響。",
    renal: "表 1-6：無限制。",
    hepatic: "Child-Pugh A/B 可用不需調整；Child-Pugh C 無資料。",
    viralLoadLimit: "限用於病毒量控制穩定患者；近 6 個月 HIV viral load <50 copies/mL。",
    cd4Limit: "無",
    crush: "NA",
    hbv: "不適合 HBV coinfection；CAB/RPV 對 HBV 無活性。",
    keyAdverse: "注射部位疼痛/硬塊、頭痛；長效藥物需注意過敏與長尾濃度。",
    whenToUse: "台灣 2024 年納入給付；主要用於已達病毒抑制且符合條件者的轉換治療。",
    cautions: [
      "不適合 HBV coinfection，因 CAB/RPV 對 HBV 無活性。",
      "使用前需確認無已知或疑似 RPV 抗藥；長治療史或抗藥資料不完整者要小心。",
      "BMI >30 kg/m2 需選 2 英吋針頭並考慮更密切 viral load 追蹤。",
      "需同意每 2 個月注射；未完成 TB/LTBI 治療或 LTBI 檢驗未符合條件者需核對規範。",
    ],
    source: "第 1 章長效針劑處方；表 1-6 註 d",
  },
];

export const artDrugClassTable: AidsTable = {
  title: "成分分類與常見注意事項",
  source: "第 1 章表 1-1、1-2、1-3、1-4",
  columns: ["類別", "成分", "重點"],
  rows: [
    ["NRTI", "3TC, FTC, ABC, TAF, TDF, ZDV", "Backbone 主力。TAF/TDF + FTC/3TC 可治療 HBV；TDF 腎/骨風險較高；ABC 注意過敏與心血管風險。"],
    ["NNRTI", "DOR, RPV", "服用方便但抗藥屏障較低。RPV 需 VL <100,000、CD4 >200、隨餐且不可併 PPI；DOR 無 VL 限制但避開強效 CYP3A inducer。"],
    ["PI", "DRV", "抗藥屏障高，常需 booster；交互作用與代謝副作用較多，需隨餐。DRV 有 sulfa moiety。"],
    ["PK booster", "COBI", "抑制 CYP3A 增加藥物濃度；會抑制腎小管 creatinine 排出造成 SCr 上升，但不影響實際 GFR。"],
    ["INSTI", "BIC, DTG, EVG, RAL, CAB", "耐受性佳、快速抑制。BIC/DTG 為第二代、抗藥屏障較高；EVG/RAL 屬第一代；需注意 polyvalent cation 交互作用。"],
  ],
};

export const artAbbreviationTable: AidsTable = {
  title: "縮寫原文速查",
  source: "第 1 章表 1-1、1-2、1-3、1-4、1-6",
  columns: ["縮寫", "英文原文", "類別"],
  rows: [
    ["3TC", "lamivudine", "NRTI"],
    ["ABC", "abacavir", "NRTI"],
    ["BIC", "bictegravir", "INSTI"],
    ["CAB", "cabotegravir", "INSTI"],
    ["COBI / c", "cobicistat", "PK booster"],
    ["DOR", "doravirine", "NNRTI"],
    ["DRV", "darunavir", "PI"],
    ["DTG", "dolutegravir", "INSTI"],
    ["EVG", "elvitegravir", "INSTI"],
    ["FTC", "emtricitabine", "NRTI"],
    ["RAL", "raltegravir", "INSTI"],
    ["RPV", "rilpivirine", "NNRTI"],
    ["TAF", "tenofovir alafenamide", "NRTI"],
    ["TDF", "tenofovir disoproxil fumarate", "NRTI"],
    ["ZDV / AZT", "zidovudine", "NRTI"],
    ["ART", "antiretroviral therapy", "治療概念"],
    ["STR", "single-tablet regimen", "處方形式"],
    ["LA", "long-acting", "處方形式"],
  ],
};

export const monitoringTables: AidsTable[] = [
  {
    title: "HIV viral load / CD4 追蹤時程",
    source: "第 2 章表 2-1",
    columns: ["情境", "建議"],
    rows: [
      ["新開始服藥或停藥後重啟", "服藥前 VL/CD4；服藥 1 個月後 VL/CD4；第一年內 q3mo VL/CD4"],
      ["第一年內已穩定", "若遵囑性佳，且連續兩次間隔 3 個月 VL undetectable，可延長至 q6mo"],
      ["長期穩定且 VL <50 copies/mL", "至少 q6mo VL/CD4；漏藥、停藥、改服法或交互作用疑慮時加驗 VL"],
      ["因副作用或簡化處方而換藥", "換藥後 3 個月建議檢驗一次 viral load，確認仍維持病毒抑制"],
      ["疑似治療失敗或服藥 >6 個月仍未抑制", "考慮抗藥性基因檢測；傳統 population sequencing 通常 VL >1,000 copies/mL 成功率較高"],
    ],
    notes: ["健保病毒量檢驗原則上每年四次；額外檢驗需於病歷詳述適應症。"],
  },
  {
    title: "初次評估檢驗速查",
    source: "第 2 章表 2-2、表 2-3",
    columns: ["檢驗", "重點"],
    rows: [
      ["CBC/diff、AST/ALT、renal function、urinalysis", "建立基準；TDF 需追腎功能與近端腎小管相關指標"],
      ["HBsAg / anti-HBc / anti-HBs", "診斷 HIV 時即做；三者皆陰性建議 HBV vaccine；isolated anti-HBc 建議 HBV DNA"],
      ["anti-HCV；陽性接 HCV RNA", "anti-HCV 陽性應確認是否 active HCV；高風險再感染者用 HCV RNA/core antigen 追蹤"],
      ["RPR + TPHA/TPPA", "確診 HIV 時檢驗；高風險者 q6mo RPR；治療後梅毒 q3-6mo RPR"],
      ["anti-HAV IgG", "陰性者考慮 HAV vaccine"],
      ["lipid、glucose/HbA1c、體重", "服藥前建立基準；穩定後 lipid/glucose 至少每年，體重 q6-12mo"],
      ["CXR + TB symptoms + IGRA", "新診斷 HIV 建議評估 LTBI；IGRA 陽性或不確定且排除活動性 TB 後治療 LTBI"],
      ["Cryptococcal antigen", "CD4 <100 強烈建議篩檢；CD4 100-200 可考慮篩檢"],
    ],
  },
];

export const oiCards: AidsKeyPoint[] = [
  {
    title: "PJP / PCP",
    body: "CD4 <200 cells/uL 時給 primary prophylaxis；治療首選 TMP-SMX 21 天。中重症缺氧需在治療 72 小時內加 steroid。",
    bullets: [
      "預防：TMP-SMX DS 160/800 mg PO QD 或 SS 80/400 mg PO QD；替代 dapsone 100 mg QD。",
      "中重症治療：TMP 15-20 mg/kg/day + SMX 75-100 mg/kg/day IV divided q6-8h，改善後可改 PO，總療程 21 天。",
      "輕中症治療：TMP-SMX PO divided TID；或 DS 2 tabs PO TID。",
      "Steroid：room air PaO2 <70 mmHg 或 A-a gradient >=35 mmHg。",
      "停預防：ART 後 CD4 >200 超過 3 個月；VL 持續測不到且 CD4 100-200 時也可考慮。",
    ],
    source: "第 3 章表 3-1 PJP",
  },
  {
    title: "Toxoplasma encephalitis",
    body: "Toxoplasma IgG positive 且 CD4 <100 cells/uL 時需 primary prophylaxis。腦部病灶常先經驗性治療，1-2 週評估臨床/影像反應。",
    bullets: [
      "預防首選：TMP-SMX DS 160/800 mg PO QD；替代 TMP-SMX SS QD 或 dapsone + pyrimethamine + leucovorin。",
      "急性治療至少 6 週：pyrimethamine loading + sulfadiazine + leucovorin，依體重調整。",
      "Sulfadiazine 不耐受：pyrimethamine + clindamycin + leucovorin，但需另加 PCP 預防。",
      "維持治療：急性期後給 pyrimethamine + sulfadiazine + leucovorin，或替代處方。",
      "停維持：完成初始治療、無症狀且 ART 後 CD4 >200 超過 6 個月；CD4 <200 時應重啟。",
    ],
    source: "第 3 章表 3-1 Toxoplasma；弓蟲章節",
  },
  {
    title: "Disseminated MAC",
    body: "MAC 風險主要見於 CD4 <50 cells/uL。若可立即有效 ART，是否 primary prophylaxis 需個別化；發病後治療至少 12 個月。",
    bullets: [
      "治療骨幹：clarithromycin 500 mg PO BID + ethambutol 15 mg/kg PO QD；或 azithromycin 500-600 mg QD + ethambutol。",
      "高菌量、CD4 <50、未使用有效 ART 時，可考慮加 rifabutin、amikacin/streptomycin 或 fluoroquinolone。",
      "停治療/次級預防：治療至少 12 個月、症狀消失、ART 後 CD4 >100 超過 6 個月。",
      "CD4 再降至 <100 cells/uL 時需重啟次級預防。",
    ],
    source: "第 3 章表 3-1 MAC",
  },
  {
    title: "Cryptococcal meningitis",
    body: "CD4 低者若 cryptococcal antigen 陽性，不論有無症狀都應依指引處理。CNS disease 需注意腰穿、顱內壓與 ART 時機。",
    bullets: [
      "CD4 <100 建議篩檢 cryptococcal antigen；CD4 100-200 可考慮。",
      "典型治療分 induction、consolidation、maintenance，常以 amphotericin B formulation + flucytosine 開始，後接 fluconazole。",
      "ART 過早可能增加嚴重 IRIS 風險，尤其 CNS disease，建議 ID/專家共同決定。",
    ],
    source: "第 2 章表 2-3；第 3 章隱球菌腦膜炎章節",
  },
  {
    title: "CMV disease",
    body: "CMV retinitis、colitis、CNS disease 常見於重度免疫低下。治療以 ganciclovir/valganciclovir、foscarnet 或 cidofovir 為主，依部位與腎功能調整。",
    bullets: [
      "CMV retinitis 常需眼科評估，必要時 intravitreal therapy。",
      "Ganciclovir 注意骨髓抑制；foscarnet/cidofovir 注意腎毒性與電解質。",
      "Retinitis 維持治療通常至 CD4 >100 cells/uL，且 ART 超過 3-6 個月。",
      "不建議 valganciclovir 作 primary prophylaxis；最重要預防仍是有效 ART。",
    ],
    source: "第 3 章 CMV 章節、表 3-1",
  },
  {
    title: "TB / LTBI in HIV",
    body: "所有 HIV 感染者都建議評估 LTBI；IGRA/TST 陽性或 IGRA 不確定且排除活動性 TB 後，應治療 LTBI。",
    bullets: [
      "LTBI 檢驗陽性或不確定性（Mitogen-Nil <0.5），且排除活動性 TB、無既往完整治療史者，建議治療 LTBI。",
      "短程處方如 1HP、3HP 需注意 rifapentine 與 ART 交互作用。",
      "TB meningitis 或 rifamycin 交互作用複雜時，ART 時機與處方需專家討論。",
    ],
    source: "第 2 章表 2-2；第 3 章表 3-1 TB；結核病診治指引",
  },
];

export const irisCards: AidsKeyPoint[] = [
  {
    title: "IRIS 判斷重點",
    body:
      "IRIS（immune reconstitution inflammatory syndrome，免疫重建發炎症候群）是開始 ART 後，HIV viral load 下降、免疫功能恢復時，對已知或隱藏感染產生過度發炎反應的臨床症候群。",
    bullets: [
      "Paradoxical IRIS：已知 OI 在有效治療後本來改善，開始 ART 後又出現臨床或影像惡化。",
      "Unmasking IRIS：ART 前沒有明顯 OI，ART 後因免疫恢復而表現出原本隱藏的感染。",
      "診斷前需排除藥物過敏、新感染、原 OI 治療失敗、抗藥或服藥不佳；並確認原感染已有適當治療。",
      "多數發生在 ART 後 3 個月內，但可早至數天或晚於 1 年；低 CD4、高 viral load 與 viral load 快速下降者風險較高。",
    ],
    source: "第 1 章免疫重建發炎症候群；第 3 章 TB-IRIS、MAC、PJP、隱球菌章節",
  },
  {
    title: "IRIS 處理原則",
    body:
      "大多數 IRIS 不應停止 ART 或 OI 治療；重點是排除其他惡化原因、控制發炎與處理危及生命的部位，例如 CNS、呼吸衰竭或嚴重壓迫症狀。",
    bullets: [
      "輕中度：症狀治療或 NSAIDs，並密切追蹤。",
      "嚴重或危及器官功能：可考慮 systemic corticosteroid；TB-IRIS 指引列有 prednisone 依 rifamycin 併用情境調整的建議。",
      "Kaposi sarcoma 相關 IRIS 避免使用 steroid，因可能造成腫瘤快速惡化。",
      "隱球菌腦膜炎相關 IRIS 需特別處理顱內壓；嚴重時才考慮短期 steroid。",
    ],
    source: "第 1 章免疫重建發炎症候群；第 3 章 TB-IRIS、隱球菌、HHV-8/Kaposi 章節",
  },
];

export const artTimingTable: AidsTable = {
  title: "常見 OI 開始 ART 時機",
  source: "第 1 章 ART 起始原則；第 3 章 PJP、弓蟲、TB、隱球菌、MAC、CMV、青黴菌章節",
  columns: ["感染 / 情境", "開始 ART 時機", "IRIS / 處方注意"],
  rows: [
    ["一般新診斷 HIV", "診斷後儘早；台灣指引推動 7 日內或當日診斷當日治療。", "開始前仍抽 viral load、CD4、HBV/HCV、腎肝功能與交互作用；結果回來後再調整。"],
    ["PJP / PCP", "建議 OI 治療後盡快，通常 2 週內開始 ART。", "PJP-IRIS 可表現發燒、喘、肺部惡化；排除其他感染後可考慮 steroid。"],
    ["Toxoplasma encephalitis", "通常診斷後 2-3 週內開始 ART。", "Toxo-IRIS 少見；可能有病灶變大或腦水腫，需排除治療失敗。"],
    ["TB，CD4 <50 且非 TB meningitis", "抗 TB 治療開始後 2 週內。", "IRIS 風險高；需先核對 rifampin/rifabutin 與 ART 交互作用。"],
    ["TB，CD4 >=50 且衰弱、營養差、貧血、器官功能障礙或播散性 TB", "抗 TB 治療開始後 2-4 週。", "嚴重 TB-IRIS 可考慮 steroid；若有 Kaposi sarcoma 或 active HBV，預防性 steroid 需避免或審慎。"],
    ["TB，CD4 >=50 且非嚴重免疫低下 / 非嚴重 TB", "可延後，但應在抗 TB 治療開始後 8 週內。", "若使用 rifampin，DTG 常需調整；BIC、EVG/c、boosted PI 與 rifampin 多不適合併用。"],
    ["TB meningitis", "沒有一致定論；專家建議抗 TB 後 2-8 週，CD4 <50 可考慮第 2 週但需嚴密監測。", "CNS IRIS 可能危及生命；需 ID/神經/結核團隊共同決定。"],
    ["Cryptococcal meningitis", "不建議立即 ART；通常至少延後到診斷後 2 週，且依顱內壓、CSF 發炎與臨床穩定度個別化。", "CD4 <100、高顱內壓、CSF WBC <5 時尤其小心；早期 ART 研究顯示死亡率較高。"],
    ["Disseminated MAC", "可儘早加入 ART。", "NTM-IRIS 常約 ART 後 3 週；症狀明顯且 anti-inflammatory response 不佳時可考慮 prednisone 20-40 mg/day 4-8 週。"],
    ["Talaromycosis", "建議 amphotericin B induction 1 週後儘早開始 ART。", "提早 ART 有助預後，但仍需追蹤 IRIS 與藥物毒性。"],
    ["CMV disease", "多數情境在抗 CMV 治療後 2 週內開始；CMV neurological disease 則建議儘早。", "CNS CMV 或 retinitis 需小心 IRIS；眼病變需眼科追蹤。"],
  ],
  notes: [
    "此表是速查；實際時機需同時看感染部位、CD4、viral load、病況穩定度、顱內壓、藥物交互作用與抗藥史。",
    "若 OI 處方含 rifamycin，請特別核對 ART：rifampin 會明顯影響多數 INSTI/PI/NNRTI 暴露量。",
  ],
};

export const hepatitisCards: AidsKeyPoint[] = [
  {
    title: "HIV/HBV coinfection",
    body: "HIV/HBV 共病者，ART 的 NRTI backbone 應同時治療 HBV，通常使用 TDF 或 TAF 加上 FTC 或 3TC。",
    bullets: [
      "不建議以 3TC 或 FTC 單獨作為 HBV 活性藥物，容易誘發 HBV 抗藥。",
      "若停止或更換含 HBV 活性的 ART，需小心 HBV flare，監測肝功能與 HBV DNA。",
      "Odefsey、Delstrigo、Biktarvy 含兩種 HBV 活性成分；Triumeq、Dovato、CAB/RPV 不適合 HBV coinfection 作為唯一方案。",
      "HIV/HBV 感染者建議戒酒、HAV vaccine（若未免疫）、安全性行為與肝癌監測。",
    ],
    source: "第 1 章；第 5 章 HIV/HBV",
  },
  {
    title: "HBV serology 判讀入口",
    body: "診斷 HIV 時應檢驗 HBsAg、anti-HBc、anti-HBs。若三者皆陰性，建議接種 HBV vaccine；若 isolated anti-HBc，需以 HBV DNA 釐清。",
    bullets: [
      "HBsAg positive：慢性 HBV 或活動性感染，ART 需含 TAF/TDF + FTC/3TC。",
      "anti-HBs negative 且 HBsAg negative：若無免疫證據，建議疫苗。",
      "isolated anti-HBc：可能是低效價帶原或低效價保護抗體，開始 ART 前建議 HBV DNA。",
    ],
    source: "第 2 章表 2-2；第 5 章表 5-2",
  },
  {
    title: "HIV/HCV coinfection",
    body: "anti-HCV 陽性後需確認 HCV RNA，以判定是否為 active HCV；HCV RNA 陽性者應盡快接受 DAA 治療並檢查交互作用。",
    bullets: [
      "曾感染或治癒 HCV 後，anti-HCV 多半持續陽性；高風險再感染者不能用 anti-HCV 追再感染。",
      "持續高風險或疑似 reinfection：使用 HCV RNA 或 HCV core antigen。",
      "DAA 與 ART、acid reducer、抗癲癇藥、rifamycin、statin 等交互作用需逐一核對。",
    ],
    source: "第 2 章表 2-2、2-4；第 5 章 HIV/HCV",
  },
];

export const pepCards: AidsKeyPoint[] = [
  {
    title: "PEP 共通原則",
    body: "無論職業或非職業暴露，若評估需用藥，應越快越好，24 小時內最佳，不得晚於 72 小時；療程 28 天。",
    bullets: [
      "若證實無感染風險，可停止 PEP，但仍完成必要追蹤。",
      "PEP 前評估來源者 HIV 狀態、viral load、ART history、抗藥與 HBV/HCV/STI 風險。",
      "暴露者需驗 HIV baseline，並評估 HBV、HCV、懷孕與腎肝功能。",
      "疑似來源有抗藥、孕婦、兒童、腎肝功能問題或複雜交互作用，建議盡速與 HIV 專家討論。",
    ],
    source: "第 9 章重點提示；第 11 章使用預防藥物建議",
  },
];

export const pepRegimens: AidsRegimen[] = [
  {
    id: "pep-bic",
    name: "TAF/FTC/BIC (Biktarvy)",
    localName: "吉他韋",
    category: "PEP / nPEP 優先建議",
    dose: "1 tab PO QD x 28 days",
    whenToUse: "職業與非職業暴露後預防優先建議；單錠、耐受性佳、服藥方便。",
    cautions: ["開始前評估腎肝功能、HBV 狀態與交互作用。", "HBV 帶原者停藥後需追肝功能，必要時接續 HBV 治療。"],
    source: "第 9 章表 9-2；第 11 章表 11-2",
  },
  {
    id: "pep-tdfdtg",
    name: "TDF/FTC + DTG",
    category: "PEP / nPEP 替代處方",
    dose: "TDF/FTC 1 tab PO QD + DTG 50 mg PO QD x 28 days",
    whenToUse: "無法使用 TAF/FTC/BIC 或依院內可近性選用。",
    cautions: ["TDF 需注意腎功能。", "DTG 與 polyvalent cations 需注意間隔；孕婦目前主流指引可使用但仍需評估。"],
    source: "第 9 章表 9-2；第 11 章表 11-2",
  },
  {
    id: "pep-drv",
    name: "TAF/FTC/DRV/c (Symtuza)",
    localName: "信澤力",
    category: "PEP / nPEP 替代處方",
    dose: "1 tab PO QD x 28 days",
    regimenType: "Boosted PI-containing four-drug combination",
    backbone: "TAF 10 mg + FTC 200 mg",
    thirdAgent: "DRV 800 mg boosted with cobicistat 150 mg",
    components: [
      { abbr: "TAF", generic: "tenofovir alafenamide", drugClass: "NRTI", dose: "10 mg" },
      { abbr: "FTC", generic: "emtricitabine", drugClass: "NRTI", dose: "200 mg" },
      { abbr: "DRV", generic: "darunavir", drugClass: "PI", dose: "800 mg" },
      { abbr: "c", generic: "cobicistat", drugClass: "PK booster", dose: "150 mg" },
    ],
    food: "隨餐",
    renal: "含 TAF/FTC；PEP 前仍需評估腎功能，複雜腎功能異常建議 HIV 專家討論。",
    hbv: "含 TAF/FTC，對 HBV 有活性；HBV 帶原者停藥後需追肝功能。",
    whenToUse: "來源者已知或疑似抗藥時可考慮，抗藥屏障較高。",
    cautions: ["藥物交互作用較多。", "第 11 章註明不適用於懷孕婦女和未滿 12 歲兒童。"],
    source: "第 9 章表 9-2；第 11 章表 11-2",
  },
];

export const pepFollowUpTable: AidsTable = {
  title: "PEP 追蹤時程",
  source: "第 9 章重點提示、暴露者追蹤；第 11 章",
  columns: ["時間", "追蹤"],
  rows: [
    ["暴露當時", "HIV Ag/Ab baseline；評估 HBV/HCV、肝腎功能、懷孕、STI 與暴露風險"],
    ["72 小時內", "早期重新評估：確認是否繼續 PEP、處方是否需調整、副作用與遵囑性"],
    ["4-6 週", "HIV Ag/Ab 或抗體檢測；依暴露型態追 HBV/HCV/STI"],
    ["12 週", "HIV 最終追蹤點；現代 Ag/Ab 檢驗下通常不需延長至 6-12 個月"],
  ],
};

export const stiTables: AidsTable[] = [
  {
    title: "性傳染病篩檢頻次",
    source: "第 12 章表 12-1",
    columns: ["對象", "檢測", "頻次"],
    rows: [
      ["有性行為的年輕女性 <25 歲", "披衣菌、淋病", "每年"],
      ["高風險較年長女性", "披衣菌、淋病", "每年"],
      ["懷孕婦女", "梅毒、披衣菌、淋病", "第一次產檢；第三孕期視風險；生產時視風險追梅毒"],
      ["有性行為的 MSM", "梅毒、披衣菌、淋病", "診斷 HIV 時；每年；若持續風險則 q3-6mo"],
      ["已治療 STD 個案", "梅毒、披衣菌、淋病、陰道滴蟲", "治療後 3 個月追再感染"],
    ],
    notes: ["依性接觸部位採檢：尿液、肛門、咽部。"],
  },
  {
    title: "常見 STD 治療速查",
    source: "第 12 章表 12-2；尿道炎、淋病與梅毒章節",
    columns: ["疾病/情境", "建議治療", "追蹤/注意"],
    rows: [
      ["早期梅毒", "Benzathine penicillin G 2.4 MU IM once", "HIV 感染者 RPR 建議 3, 6, 9, 12, 24 個月追蹤"],
      ["晚期潛伏或不明期間梅毒", "Benzathine penicillin G 2.4 MU IM weekly x 3", "懷孕且 penicillin allergy 需減敏後給 penicillin"],
      ["神經性梅毒", "Aqueous crystalline penicillin G 3-4 MU IV q4h x 10-14 days", "有神經、眼、耳症狀需評估 CSF/眼科/耳鼻喉"],
      ["尿道炎經驗治療", "Ceftriaxone 500 mg IM once + doxycycline 100 mg PO BID x 7 days", "同時採檢 NAAT；依結果調整"],
      ["披衣菌", "Doxycycline 100 mg PO BID x 7 days；替代 azithromycin 1 g once", "治療後 3 個月追再感染"],
      ["淋病", "Ceftriaxone 500 mg IM once；若 chlamydia 未排除加 doxycycline", "咽喉部或替代處方治療時較需 test-of-cure"],
      ["DGI arthritis-dermatitis", "Ceftriaxone 1 g IM/IV QD >=7 days", "腦膜炎/心內膜炎需 ceftriaxone 1-2 g IV q12-24h x 10-14 days"],
    ],
  },
];

export const specialCards: AidsKeyPoint[] = [
  {
    title: "懷孕與母子垂直感染預防",
    body:
      "孕婦應儘早開始 ART，viral load 與母子傳染風險高度相關。用藥選擇、分娩方式、新生兒預防與哺乳建議需依第 6 章完整流程處理。",
    bullets: [
      "育齡女性新診斷 HIV 時應確認 LMP 與 pregnancy test。",
      "DTG 後續資料顯示神經管缺損風險很小，但孕婦處方仍需依第 6 章與專家評估。",
      "TAF/FTC/DRV/c 不適用於懷孕婦女作 nPEP 替代處方。",
    ],
    source: "第 2 章表 2-2；第 6 章；第 11 章表 11-2 註",
  },
  {
    title: "愛滋病毒感染者腫瘤",
    body:
      "第 4 章涵蓋 Kaposi sarcoma、lymphoma、HPV 相關癌症等。臨床上需同時控制 HIV、評估腫瘤分期、治療交互作用與 OI 風險。",
    bullets: [
      "疑似 AIDS-defining cancer 時建議早期 HIV/腫瘤/感染科共同照護。",
      "類固醇治療 IRIS 時若合併 Kaposi sarcoma 需特別小心，可能惡化。",
      "HPV 疫苗、子宮頸/肛門相關篩檢與 STD 控制是長期照護重點。",
    ],
    source: "第 4 章；第 3 章 TB-IRIS；第 12 章 HPV",
  },
  {
    title: "物質使用疾患",
    body:
      "第 10 章提醒 HIV care 需納入海洛因、安非他命等物質使用疾患照護，重點是降低失聯、提高 ART adherence、處理精神共病與 harm reduction。",
    bullets: [
      "評估藥物交互作用、肝炎共病、注射風險與伴侶服務。",
      "若有 HCV 風險，anti-HCV 陰性者至少每年追蹤；曾感染者用 HCV RNA/core antigen 追再感染。",
    ],
    source: "第 10 章；第 2 章表 2-4",
  },
];
