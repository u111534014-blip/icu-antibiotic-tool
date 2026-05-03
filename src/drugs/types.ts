// ╔══════════════════════════════════════════════════════════════════╗
// ║  📐 藥物資料的「合法格式」定義                                     ║
// ║                                                                ║
// ║  這個檔案定義了每個藥物物件「應該長什麼樣子」                       ║
// ║                                                                ║
// ║  🎯 設計原則：                                                    ║
// ║    - 藥物外層（name、needsRenal、indications 等）：嚴格檢查        ║
// ║    - Scenario 內部 & calculate 函數內部：寬鬆                     ║
// ║                                                                ║
// ║  🌟 這樣你會得到什麼：                                             ║
// ║    ✅ 新藥物忘了寫 name/subtitle/needsRenal 等 → 紅字提醒          ║
// ║    ✅ indications 結構錯誤 → 紅字                                  ║
// ║    ✅ 自動補完 Drug 頂層欄位                                       ║
// ║    ⚠️ scenario 內部欄位打錯 → 不會提醒（容忍各藥物結構差異）        ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── 劑量表（CrCl 對應劑量）─────────────────────────────────────
export type CrClRow = {
  min: number;
  dose_mg: number;
  freq: string;
};

// ── 一個「劑量列」，顯示在結果裡 ──────────────────────────────
export type ResultRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

// ── 子結果（一個情境裡的單一路徑，如 PO 或 IV）─────────────────
export type SubResult = {
  route?: string;
  rows: ResultRow[];
  warnings?: string[];
  isPreferred?: boolean;
  customLabel?: string;
  customLabelBg?: string;
  customLabelColor?: string;
  [key: string]: any;
};

// ── 情境結果 ─────────────────────────────────────────────────
export type ScenarioResult = {
  title?: string;
  note?: string;
  rows?: ResultRow[];
  subResults?: SubResult[];
  warnings?: string[];
  [key: string]: any;
};

// ── 資訊方塊 ─────────────────────────────────────────────────
export type InfoBox = {
  text: string;
  bg: string;
  border: string;
  color: string;
};

// ── 臨床參考區塊（可展開，適合放非 UpToDate 的補充知識）──────
// 每個 section 是一段獨立主題（如抗菌譜、治療角色、副作用等）
export type ClinicalPearlSection = {
  heading: string;       // 小節標題
  body: string;          // 內容文字（支援換行 \n）
};

export type ClinicalPearls = {
  title?: string;                        // 總標題（預設「臨床參考（非 UpToDate）」）
  sections: ClinicalPearlSection[];      // 多個小節
};

// ── 藥師配藥輸入 ─────────────────────────────────────────────
export type DilutionResult = {
  text: string;
  note?: string;
};

export type PharmacistInput = {
  label: string;
  placeholder?: string;
  suffix?: string;
  calcDilution: (value: string) => DilutionResult | null;
};

// ── Scenario（給 calculate 函數自由存取）──────────────────────
// 每個藥物的 scenario 結構不同，用 any 允許任何欄位
export type Scenario = any;

// ── 一個「適應症 Indication」─────────────────────────────────
export type Indication = {
  id: string;
  label: string;
  desc?: string;
  scenarios: Scenario[];
  weightStrategy?: "AdjBW_if_obese" | "TBW" | "IBW" | "IBW_if_obese";
  hepaticOverride?: "noAdjust";
  [key: string]: any;
};

// ── 額外欄位（toggle / select）───────────────────────────────
export type ExtraField = {
  key: string;
  type: "toggle" | "select";
  label: string;
  default?: boolean | string;
  options?: { id: string; label: string }[];
};

// ── calculate 函數的輸入 ──────────────────────────────────────
export type CalculateParams = {
  dosing_weight: number;
  crcl: number;
  rrt: string;
  hepatic?: string;
  indicationData: Indication;
  extras: Record<string, any>;
};

// ── calculate 函數的輸出（寬鬆，因為每個藥回傳結構不同）──────────
export type CalculateResult = any;

// ── 一個完整的「藥物」定義（外層嚴格）─────────────────────────
export type Drug = {
  name: string;                    // 必填：商品名
  subtitle: string;                // 必填：學名
  searchTerms?: string[];

  needsRenal: boolean;             // 必填
  needsWeight: boolean;            // 必填
  needsHepatic?: boolean;

  weightStrategy?: "AdjBW_if_obese" | "TBW" | "IBW" | "IBW_if_obese";

  indications: Indication[];       // 必填

  extraFields?: ExtraField[];

  clinicalPearls?: ClinicalPearls; // 選填：臨床參考（可展開的補充知識）

  calculate: (params: CalculateParams) => CalculateResult;
};
