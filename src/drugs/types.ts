// ╔══════════════════════════════════════════════════════════════════╗
// ║  📐 藥物資料的「合法格式」定義                                     ║
// ║                                                                ║
// ║  這個檔案定義了每個藥物物件「應該長什麼樣子」                       ║
// ║  當你寫藥物資料時，VS Code 會根據這裡的定義：                       ║
// ║    ✅ 自動補完欄位名稱                                            ║
// ║    ✅ 打錯字時用紅字警告                                          ║
// ║    ✅ 忘記必填欄位時提醒                                          ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── 劑量表（CrCl 對應劑量）─────────────────────────────────────
// 例：{ min: 50, dose_mg: 1000, freq: "Q8H" }
//     代表「CrCl ≥ 50 時，每次 1000 mg，Q8H 給藥」
export type CrClRow = {
  min: number;           // CrCl 下限
  dose_mg: number;       // 單次劑量（mg）
  freq: string;          // 給藥頻率，如 "Q8H"、"Q12H"
};

// ── 一個「劑量列」，顯示在結果裡 ──────────────────────────────
// 例：{ label: "建議單次劑量", value: "500 mg", highlight: true }
export type ResultRow = {
  label: string;
  value: string;
  highlight?: boolean;   // 要不要加強顯示（預設 false）
};

// ── 一個「子結果」，例如一個 scenario 算出的內容 ────────────────
export type SubResult = {
  title?: string;
  note?: string;
  rows: ResultRow[];
  warnings?: string[];
  preferred?: boolean;   // 是否為 UpToDate 首選（多個子結果時）
  routeLabel?: string;   // "IV" / "PO" / "Loading" / "Maintenance" 等
};

// ── 藥師配藥輸入（算抽藥支數、加水量的區塊）─────────────────────
export type DilutionResult = {
  text: string;          // 主要說明，如 "請抽取 2 支，加入 250 mL D5W"
  note?: string;         // 補充說明
};

export type PharmacistInput = {
  label: string;         // 輸入框的 label
  placeholder?: string;  // 輸入框提示文字
  suffix?: string;       // 輸入框後面的單位，如 "支"
  calcDilution: (value: string) => DilutionResult | null;
};

// ── 一個「情境 Scenario」（一種適應症下的一個給藥方式）───────────
export type Scenario = {
  label: string;                              // 顯示名稱
  route?: "IV" | "PO";                        // 給藥路徑
  note?: string;                              // 臨床備註
  freq?: string;                              // 給藥頻率

  // IV 計算用（mg/kg 公式）
  dosePerKg?: { min: number; max: number };
  divisions?: number;                         // 一日分幾次

  // 固定劑量（不用 kg 算）
  fixedDose?: string;                         // 如 "1–2 DS tab BID"
  detail?: string;                            // 補充說明

  // 其他覆寫設定
  weightStrategy?: "AdjBW_if_obese" | "TBW" | "IBW";
  hepaticOverride?: "noAdjust";
};

// ── 一個「適應症 Indication」─────────────────────────────────
export type Indication = {
  id: string;                      // 程式內部用的 ID（英文，不顯示）
  label: string;                   // 顯示在下拉選單的名字
  desc?: string;                   // 選單中附在後面的補充說明
  scenarios: Scenario[];           // 至少一個情境
  weightStrategy?: "AdjBW_if_obese" | "TBW" | "IBW";  // 整個適應症共用
};

// ── 額外欄位（如限水 toggle、肝功能下拉）─────────────────────
export type ExtraField = {
  key: string;
  type: "toggle" | "select";
  label: string;
  default?: boolean | string;
  options?: { id: string; label: string }[];  // 只 select 才需要
};

// ── calculate 函數的輸入參數 ─────────────────────────────────
export type CalculateParams = {
  tbw: number;                     // 實際體重
  ibw: number;                     // 理想體重
  adjbw: number;                   // 調整體重
  dosing_weight: number;           // 最後採用的劑量體重
  bmi: number;
  crcl: number;                    // Cockcroft-Gault CrCl
  rrt: "none" | "hd" | "pd" | "cvvh";
  childPugh?: "normal" | "A" | "B" | "C";
  indicationData: Indication;
  extras: Record<string, boolean | string>;  // 動態欄位（如 waterLimit）
};

// ── calculate 函數的輸出 ──────────────────────────────────────
export type CalculateResult = {
  // 多情境結果（用 scenarioResults 或 subResults）
  scenarioResults?: SubResult[];
  subResults?: SubResult[];

  // 單一結果（不分情境時）
  rows?: ResultRow[];
  warnings?: string[];

  // 藥師輸入區
  pharmacistInput?: PharmacistInput | null;
};

// ── 一個完整的「藥物」定義 ────────────────────────────────────
export type Drug = {
  name: string;                    // 商品名，如 "Bactrim"
  subtitle: string;                // 學名，如 "Trimethoprim-sulfamethoxazole"
  searchTerms?: string[];          // 別名、院內品項、中文名

  // 這個藥要哪些欄位
  needsRenal: boolean;             // 是否需要腎功能（CrCl）
  needsWeight: boolean;            // 是否需要體重
  needsHepatic?: boolean;          // 是否需要肝功能（Child-Pugh）

  weightStrategy?: "AdjBW_if_obese" | "TBW" | "IBW";  // 預設體重策略

  indications: Indication[];       // 適應症列表

  extraFields?: ExtraField[];      // 額外欄位（toggle、select）

  // 計算函數：接收病人資料 + 選項，回傳結果
  calculate: (params: CalculateParams) => CalculateResult;
};
