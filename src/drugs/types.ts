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

// ── 針劑泡製速查（回溶 / 稀釋 / 安定性）────────────────────────
// 給「院內針劑泡製速查」頁面用。皆為選填，缺欄位頁面顯示「—」。
export type PrepInfo = {
  brand?: string;           // 選填：院內商品名（僅泡製速查頁顯示；劑量頁用 drug.name 原商品名）
  subtitle?: string;        // 選填：覆蓋卡片副標（預設用 drug.subtitle 學名）
  vial?: string;            // 院內品項 / 規格（如「乾粉 500 mg/Vial」）
  reconstitution?: string;  // 回溶：溶劑 + 體積（+ 濃度）
  diluent?: string;         // 建議稀釋液（NS / D5W / 配伍禁忌）
  finalNote?: string;       // 稀釋後體積 / 安定性 / 備註
  infusionTime?: string;    // 選填：覆蓋 drug.infusionTime（多品項時各自不同）
  products?: PrepProduct[]; // 選填：同一藥有多種院內品項/劑型時分開列（如 Amphotericin B 三劑型）
};

// 多品項時的單一品項（如 Fungizone / AmBisome / Ampholipad）
export type PrepProduct = PrepInfo & {
  name: string;             // 該品項商品名（如 Fungizone）
  subtitle?: string;        // 補充（如 amphotericin B deoxycholate）
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
  weightStrategy?: "AdjBW_if_obese" | "AdjBW_if_bmi40" | "TBW" | "IBW" | "IBW_if_obese";
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

  weightStrategy?: "AdjBW_if_obese" | "AdjBW_if_bmi40" | "TBW" | "IBW" | "IBW_if_obese";

  indications: Indication[];       // 必填

  extraFields?: ExtraField[];

  clinicalPearls?: ClinicalPearls; // 選填：臨床參考（可展開的補充知識）

  infusionTime?: string;           // 選填：輸注時間（如 "30 min / 3 hr 延長"）

  prep?: PrepInfo;                 // 選填：針劑泡製速查資料（回溶/稀釋/安定性）

  calculate: (params: CalculateParams) => CalculateResult;
};
