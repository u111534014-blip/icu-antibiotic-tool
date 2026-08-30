import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";

type Tab = "flow" | "drugs" | "ecg" | "notes";
type Scenario = "arrest" | "tachy" | "brady" | "rosc";
type ArrestRhythm = "unknown" | "shockable" | "nonshockable";
type PulseTachy = "unstable" | "stable";
type QrsWidth = "narrow" | "wide";
type Regularity = "regular" | "irregular";
type BradyStatus = "unstable" | "stable";

type FlowStep = {
  title: string;
  badge?: string;
  tone?: "danger" | "warning" | "ok" | "neutral";
  body: string;
  bullets?: string[];
};

type DrugRow = {
  drug: string;
  use: string;
  dose: string;
  notes: string;
};

type EcgCard = {
  title: string;
  points?: string;
  path?: string;
  visual: string;
  rhythm: string;
  action: string;
};

function SelectPill<T extends string>({
  value,
  current,
  onClick,
  children,
}: {
  value: T;
  current: T;
  onClick: (value: T) => void;
  children: ReactNode;
}) {
  const active = value === current;
  return (
    <button onClick={() => onClick(value)} style={{ ...S.pillButton, ...(active ? S.pillButtonActive : {}) }}>
      {children}
    </button>
  );
}

function FlowCard({ step, index }: { step: FlowStep; index: number }) {
  const toneStyle =
    step.tone === "danger" ? S.flowDanger :
    step.tone === "warning" ? S.flowWarning :
    step.tone === "ok" ? S.flowOk :
    S.flowNeutral;

  return (
    <div>
      <div style={{ ...S.flowCard, ...toneStyle }}>
        <div style={S.flowTop}>
          <span style={S.stepNumber}>{index + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.flowTitle}>{step.title}</div>
            {step.badge && <div style={S.badge}>{step.badge}</div>}
          </div>
        </div>
        <p style={S.flowBody}>{step.body}</p>
        {step.bullets && <Bullets items={step.bullets} />}
      </div>
      <div style={S.arrow}>↓</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={S.bullets}>
      {items.map((item) => <li key={item} style={S.bullet}>{item}</li>)}
    </ul>
  );
}

function NoteCard({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} style={S.noteCard}>
      <summary style={S.noteSummary}>{title}</summary>
      <div style={S.noteBody}>{children}</div>
    </details>
  );
}

function SmallTable({ columns, rows }: { columns: string[]; rows: Array<Record<string, string>> }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>{columns.map((col) => <th key={col} style={S.th}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col, colIndex) => (
                <td key={col} style={colIndex === 0 ? S.tdStrong : S.td}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EcgStrip({ points, path }: { points?: string; path?: string }) {
  return (
    <svg viewBox="0 0 500 120" style={S.ecgSvg} aria-hidden="true">
      <defs>
        {/* 真實 ECG 紙：細格 1mm、粗格每 5 格，粉紅色 */}
        <pattern id="ecg-fine" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke="#F6C9D2" strokeWidth="0.6" />
        </pattern>
        <pattern id="ecg-bold" width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="url(#ecg-fine)" />
          <path d="M50 0H0V50" fill="none" stroke="#E39AA8" strokeWidth="1.3" />
        </pattern>
      </defs>
      <rect width="500" height="120" fill="#FFF6F7" />
      <rect width="500" height="120" fill="url(#ecg-bold)" />
      {path ? (
        <path d={path} fill="none" stroke="#111827" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ) : (
        <polyline points={points} fill="none" stroke="#111827" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}

function buildFlow({
  scenario,
  arrestRhythm,
  tachyStatus,
  qrsWidth,
  regularity,
  bradyStatus,
}: {
  scenario: Scenario;
  arrestRhythm: ArrestRhythm;
  tachyStatus: PulseTachy;
  qrsWidth: QrsWidth;
  regularity: Regularity;
  bradyStatus: BradyStatus;
}): FlowStep[] {
  if (scenario === "arrest") {
    const first: FlowStep[] = [
      {
        title: "確認 cardiac arrest 並啟動急救",
        badge: "No pulse / gasping / unresponsive",
        tone: "danger",
        body: "叫人、啟動 code、拿 defibrillator，立刻開始高品質 CPR。不要等完整心電圖才壓胸。",
        bullets: [
          "Compression rate 100-120/min，深度 5-6 cm，完全回彈。",
          "每 2 min 換手；盡量讓 interruption <10 sec。",
          "接 monitor/defib、建立 IV/IO、給氧，準備 airway。",
        ],
      },
      {
        title: "判斷 rhythm",
        badge: "每 2 min rhythm check",
        tone: "warning",
        body: "只分成 shockable 或 non-shockable。不要在 pulse check 花太久；不確定有沒有 pulse 時，先壓胸。",
      },
    ];

    if (arrestRhythm === "unknown") {
      return [
        ...first,
        {
          title: "尚未判讀 rhythm",
          tone: "neutral",
          body: "先持續 CPR，盡快貼 pad、看 monitor、確認是否可電擊。",
          bullets: [
            "VF/pulseless VT：走 shockable pathway。",
            "Asystole/PEA：走 non-shockable pathway。",
            "若 monitor artifact 或 lead 脫落，快速排除設備問題。",
          ],
        },
      ];
    }

    if (arrestRhythm === "shockable") {
      return [
        ...first,
        {
          title: "Shockable rhythm：VF / pulseless VT",
          badge: "Defibrillation",
          tone: "danger",
          body: "立即 defibrillation，使用 biphasic 能量依機器建議；未知時常用 200 J，後續可 escalate。",
          bullets: [
            "電完立刻 CPR 2 min，不要停下來看 rhythm。",
            "每 2 min rhythm check；仍 VF/pVT 就再 shock。",
          ],
        },
        {
          title: "Epinephrine",
          badge: "1 mg IV/IO q3-5 min",
          tone: "warning",
          body: "Shockable arrest 通常在初始 defibrillation/CPR 後仍未 ROSC 時給 epinephrine，之後每 3-5 min 重複。",
          bullets: [
            "給藥不要中斷 CPR。",
            "每次 rhythm check 後立刻回到壓胸。",
          ],
        },
        {
          title: "Refractory VF/pVT：抗心律不整藥",
          badge: "Amiodarone 或 lidocaine",
          tone: "warning",
          body: "多次 shock 後仍 VF/pVT，可給 amiodarone 或 lidocaine；同時積極找 Hs & Ts。",
          bullets: [
            "Amiodarone：300 mg IV/IO bolus，必要時第二劑 150 mg。",
            "Lidocaine：1-1.5 mg/kg IV/IO，之後 0.5-0.75 mg/kg，可重複至 max 3 mg/kg。",
            "Torsades / hypomagnesemia：MgSO4 1-2 g IV/IO。",
          ],
        },
        {
          title: "持續循環",
          tone: "neutral",
          body: "CPR 2 min → rhythm check → shock if indicated → drug → Hs/Ts。ROSC 後立刻轉 post-ROSC care。",
          bullets: [
            "若有 advanced airway：continuous compression，ventilation 10 breaths/min。",
            "ETCO2 持續很低要檢查 CPR 品質；ETCO2 突然上升可提示 ROSC。",
          ],
        },
      ];
    }

    return [
      ...first,
      {
        title: "Non-shockable rhythm：PEA / asystole",
        badge: "No shock",
        tone: "danger",
        body: "不要電擊。重點是高品質 CPR、盡早 epinephrine、找可逆原因。",
        bullets: [
          "Epinephrine 1 mg IV/IO ASAP，之後 q3-5 min。",
          "每 2 min rhythm check；若轉成 VF/pVT，改走 shockable pathway。",
        ],
      },
      {
        title: "找 Hs & Ts",
        tone: "warning",
        body: "Non-shockable arrest 的關鍵常是 reversible cause。請邊 CPR 邊分工處理。",
        bullets: [
          "Hs：Hypovolemia、Hypoxia、Hydrogen ion/acidosis、Hypo-/hyperkalemia、Hypothermia。",
          "Ts：Tension pneumothorax、Tamponade、Toxins、Thrombosis pulmonary、Thrombosis coronary。",
          "POCUS 可以幫忙，但不可造成長時間 pause。",
        ],
      },
      {
        title: "持續 CPR 與重新評估",
        tone: "neutral",
        body: "每 2 min reassess rhythm/pulse，持續給 epinephrine q3-5 min，確認 airway、ETCO2、IV/IO、可逆原因處置。",
      },
    ];
  }

  if (scenario === "tachy") {
    const base: FlowStep[] = [
      {
        title: "確認 tachycardia with pulse",
        badge: "通常 HR >=150/min 較可能造成不穩",
        tone: "warning",
        body: "先確認有 pulse，接 monitor、量 BP、給氧、建立 IV、做 12-lead ECG，但不穩定時不要被 12-lead 卡住。",
      },
    ];

    if (tachyStatus === "unstable") {
      return [
        ...base,
        {
          title: "不穩定：同步電復律",
          badge: "Synchronized cardioversion",
          tone: "danger",
          body: "若 tachycardia 造成 hypotension、shock、altered mental status、ischemic chest discomfort、acute HF，優先 synchronized cardioversion。",
          bullets: [
            "可清醒且時間允許時先鎮靜，但不要因鎮靜延誤電復律。",
            "Narrow regular：50-100 J biphasic 起。",
            "Narrow irregular：120-200 J biphasic 起。",
            "Wide regular：100 J 起；wide irregular 或 polymorphic VT 要 defibrillation，不要 sync。",
          ],
        },
      ];
    }

    if (qrsWidth === "narrow" && regularity === "regular") {
      return [
        ...base,
        {
          title: "穩定 narrow regular tachycardia",
          tone: "ok",
          body: "常見是 SVT。先 vagal maneuvers；若無效可給 adenosine。",
          bullets: [
            "Adenosine 6 mg rapid IV push + flush；無效可 12 mg，再 12 mg。",
            "若變成 AF/flutter 或診斷不清，重新判讀 ECG，不要無限重複 adenosine。",
          ],
        },
      ];
    }

    if (qrsWidth === "narrow" && regularity === "irregular") {
      return [
        ...base,
        {
          title: "穩定 narrow irregular tachycardia",
          tone: "neutral",
          body: "常見是 AF/flutter with variable conduction。處置要看症狀、血壓、HF、pre-excitation、發作時間與抗凝血狀態。",
          bullets: [
            "若無 pre-excitation，可考慮 beta-blocker 或 diltiazem/verapamil 作 rate control；HFrEF/低血壓需小心。",
            "若疑似 WPW/pre-excited AF，避免 AV nodal blocker，請早期找心臟科。",
            "不穩定仍回到 synchronized cardioversion。",
          ],
        },
      ];
    }

    if (qrsWidth === "wide" && regularity === "regular") {
      return [
        ...base,
        {
          title: "穩定 wide regular tachycardia",
          tone: "warning",
          body: "先當 VT 處理比較安全。若 regular monomorphic 且診斷可能是 SVT with aberrancy，可考慮 adenosine；否則請準備 antiarrhythmic 或 cardioversion。",
          bullets: [
            "Procainamide 20-50 mg/min until suppressed、hypotension、QRS 增寬 >50% 或 max 17 mg/kg；避免 prolonged QT 或 HF。",
            "Amiodarone 150 mg over 10 min，可重複；之後 1 mg/min x 6 hr。",
            "Sotalol 100 mg over 5 min；避免 prolonged QT。",
          ],
        },
      ];
    }

    return [
      ...base,
      {
        title: "穩定 wide irregular tachycardia",
        tone: "danger",
        body: "可能是 polymorphic VT、torsades、AF with aberrancy 或 pre-excited AF。不要隨便給 AV nodal blocker。",
        bullets: [
          "若 polymorphic VT/torsades：MgSO4 1-2 g IV，修正 K/Mg，處理 QT prolongation。",
          "若變不穩定，立即 defibrillation。",
          "早期找心臟科/急重症支援。",
        ],
      },
    ];
  }

  if (scenario === "brady") {
    const base: FlowStep[] = [
      {
        title: "確認 bradycardia",
        badge: "HR <50/min 且症狀相關",
        tone: "warning",
        body: "先看病人是不是因為慢而不穩。接 monitor、BP、SpO2、IV access、12-lead ECG，尋找可逆原因。",
      },
    ];

    if (bradyStatus === "stable") {
      return [
        ...base,
        {
          title: "穩定或症狀不明顯",
          tone: "ok",
          body: "持續監測並找原因，不一定需要立刻給 atropine。",
          bullets: [
            "找藥物：beta-blocker、CCB、digoxin、amiodarone、opioid/sedative。",
            "找代謝：高血鉀、低溫、缺氧、酸中毒、MI/ischemia。",
            "若 high-grade AV block 或可能惡化，先準備 pacing。",
          ],
        },
      ];
    }

    return [
      ...base,
      {
        title: "不穩定 bradycardia",
        badge: "Hypotension / AMS / shock / ischemia / acute HF",
        tone: "danger",
        body: "Atropine 是第一線，但不要因為等 atropine 反應而延誤 pacing 或 infusion。",
        bullets: [
          "Atropine 1 mg IV bolus，q3-5 min，max 3 mg。",
          "若 atropine 無效：transcutaneous pacing，或 dopamine/epinephrine infusion。",
        ],
      },
      {
        title: "Pacing / infusion",
        tone: "warning",
        body: "準備 transcutaneous pacing；同時處理可逆原因並考慮 transvenous pacing。",
        bullets: [
          "Epinephrine infusion：2-10 mcg/min。",
          "Dopamine infusion：5-20 mcg/kg/min。",
          "Mobitz II、high-grade AV block、complete heart block 通常較需要 pacing。",
        ],
      },
    ];
  }

  return [
    {
      title: "ROSC 後先穩住 ABC",
      badge: "Post-cardiac arrest care",
      tone: "ok",
      body: "確認 airway、oxygenation、ventilation、blood pressure。避免低氧，也避免長時間高氧。",
      bullets: [
        "SpO2 目標常抓 92-98%。",
        "有 advanced airway 時，避免過度換氣；常以 ETCO2/ABG 調整。",
        "Treat hypotension：fluid/vasopressor/inotrope，維持 organ perfusion。",
      ],
    },
    {
      title: "找 arrest 原因",
      tone: "warning",
      body: "做 12-lead ECG、抽血、ABG/VBG、電解質、血糖、lactate，依情境安排 cath lab、CT、echo 或感染/source control。",
      bullets: [
        "STEMI 或高度懷疑 coronary thrombosis：早期討論 PCI。",
        "懷疑 PE、tamponade、tension pneumothorax、toxins 時按原因處置。",
      ],
    },
    {
      title: "腦保護與 ICU care",
      tone: "neutral",
      body: "昏迷病人需避免發燒、處理 seizure、維持血糖與血壓，後續神經預後評估要延後且多模式判斷。",
      bullets: [
        "Temperature management：避免 fever；是否低溫治療依院內 protocol。",
        "避免 hypoglycemia；也避免嚴重 hyperglycemia。",
        "和家屬溝通時避免太早下神經預後結論。",
      ],
    },
  ];
}

const arrestDrugs: DrugRow[] = [
  { drug: "Epinephrine", use: "Cardiac arrest", dose: "1 mg IV/IO q3-5 min", notes: "VF/pVT 在初始 shock/CPR 後仍未 ROSC 時給；PEA/asystole 盡早給。不要中斷 CPR。" },
  { drug: "Amiodarone", use: "Refractory VF/pVT", dose: "300 mg IV/IO bolus；可再 150 mg", notes: "用於多次 shock 後仍 VF/pVT。ROSC 後若需 infusion，常用 1 mg/min x 6 hr，再 0.5 mg/min。" },
  { drug: "Lidocaine", use: "Amiodarone 替代", dose: "1-1.5 mg/kg IV/IO；再 0.5-0.75 mg/kg，max 3 mg/kg", notes: "可作 VF/pVT 替代 antiarrhythmic；肝功能差、老年、低心輸出需小心累積。" },
  { drug: "MgSO4", use: "Torsades / hypomagnesemia", dose: "1-2 g IV/IO", notes: "Cardiac arrest 可 bolus；有 pulse 的 torsades 通常較慢給並監測 BP。" },
  { drug: "NaHCO3", use: "特定原因", dose: "50 mEq IV 可考慮", notes: "不 routine。高血鉀、TCA/Na-channel blocker overdose、嚴重代謝性酸中毒等特定情境才想。" },
];

const bradyTachyDrugs: DrugRow[] = [
  { drug: "Atropine", use: "Symptomatic bradycardia", dose: "1 mg IV q3-5 min；max 3 mg", notes: "High-grade AV block 常效果差，不要延誤 pacing。小於 0.5 mg 的舊式低劑量不建議。" },
  { drug: "Epinephrine infusion", use: "Bradycardia / shock support", dose: "2-10 mcg/min", notes: "作為 atropine 無效或等待 pacing/TVP 時的 bridge；監測 HR、BP、arrhythmia。" },
  { drug: "Dopamine infusion", use: "Bradycardia / shock support", dose: "5-20 mcg/kg/min", notes: "可替代 epinephrine infusion；tachyarrhythmia 風險需注意。" },
  { drug: "Adenosine", use: "Stable narrow regular SVT", dose: "6 mg rapid IV push + flush；無效 12 mg，再 12 mg", notes: "需近端 IV、快速 flush。避免用於 irregular wide complex tachycardia 或疑似 pre-excited AF。" },
  { drug: "Procainamide", use: "Stable regular wide-complex tachycardia", dose: "20-50 mg/min；max 17 mg/kg，之後 1-4 mg/min", notes: "若 hypotension、QRS 增寬 >50%、arrhythmia suppressed 即停。避免 prolonged QT 或 HF。" },
  { drug: "Amiodarone", use: "Stable wide-complex tachycardia", dose: "150 mg IV over 10 min；可重複，之後 1 mg/min x 6 hr", notes: "常用於 monomorphic VT；注意低血壓、QT、肝功能與交互作用。" },
  { drug: "Sotalol", use: "Stable regular wide-complex tachycardia", dose: "100 mg or 1.5 mg/kg IV over 5 min", notes: "避免 prolonged QT、低 K/Mg、腎功能差或 torsades 風險高者。" },
];

const hAndTs = [
  { cause: "Hypovolemia", clue: "出血、脫水、sepsis vasodilation、IVC small/collapsible", action: "輸液、止血、血品、source control" },
  { cause: "Hypoxia", clue: "低氧、airway problem、ETT/circuit 問題", action: "確認 airway、給氧、通氣、修正 tube/circuit" },
  { cause: "Hydrogen ion / acidosis", clue: "嚴重代謝性酸中毒、DKA、renal failure、shock", action: "改善 perfusion/ventilation，依原因治療；特定時考慮 NaHCO3" },
  { cause: "Hypo-/hyperkalemia", clue: "ESRD、DKA、K 異常、ECG peaked T/wide QRS", action: "高 K：calcium、insulin/glucose、beta agonist、dialysis；低 K/Mg 則補正" },
  { cause: "Hypothermia", clue: "低體溫、暴露、溺水", action: "復溫；低溫 arrest 藥物/電擊反應差，依 protocol" },
  { cause: "Tension pneumothorax", clue: "單側呼吸音低、氣壓高、低血壓、JVD", action: "needle decompression / chest tube" },
  { cause: "Tamponade", clue: "JVD、低血壓、心音低、POCUS pericardial effusion", action: "pericardiocentesis / surgical drainage" },
  { cause: "Toxins", clue: "藥物過量、QT/QRS 變化、低血壓", action: "特異解毒劑、NaHCO3 for TCA/Na-channel blockade、脂肪乳等依毒物中心" },
  { cause: "Thrombosis pulmonary", clue: "PE 風險、RV strain、低氧、PEA", action: "thrombolysis / thrombectomy 依情境" },
  { cause: "Thrombosis coronary", clue: "ACS/STEMI、VF/pVT、胸痛病史", action: "PCI/cath lab、ACS care" },
];

// ── 心電圖波形產生器（畫成接近真實 ECG 的描記）──────────────────
// 座標系：viewBox 500 × 120，y 越小越上面。
// organized 節律 baseline≈76；VF/torsades 以中線≈58 上下擺盪。
const EW = 500;

function toPath(pts: number[][]): string {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

// 半弦波隆起（P、T 波用）
function bump(pts: number[][], x0: number, w: number, amp: number, bl: number, steps = 8) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    pts.push([x0 + w * t, bl - amp * Math.sin(Math.PI * t)]);
  }
}

type Beat = { bl?: number; pAmp?: number; pw?: number; pr?: number; qrsW?: number; r?: number; q?: number; s?: number; tAmp?: number; tw?: number; st?: number; hasP?: boolean; drop?: boolean };

// 推入一個 P-QRS-T 心跳，回傳結束 x
function beat(pts: number[][], x: number, o: Beat = {}): number {
  const bl = o.bl ?? 76;
  let cx = x;
  pts.push([cx, bl]);
  if (o.hasP !== false) { bump(pts, cx, o.pw ?? 16, o.pAmp ?? 7, bl); cx += o.pw ?? 16; pts.push([cx, bl]); }
  cx += o.pr ?? 24; pts.push([cx, bl]);
  if (!o.drop) {
    const w = o.qrsW ?? 14;
    pts.push([cx + w * 0.16, bl + (o.q ?? 5)]);   // Q
    pts.push([cx + w * 0.42, bl - (o.r ?? 46)]);  // R
    pts.push([cx + w * 0.72, bl + (o.s ?? 13)]);  // S
    pts.push([cx + w, bl]);                        // J point
    cx += w;
    cx += o.st ?? 8; pts.push([cx, bl]);           // ST 段
    bump(pts, cx, o.tw ?? 30, o.tAmp ?? 13, bl); cx += o.tw ?? 30;
    pts.push([cx, bl]);
  }
  return cx;
}

// 規則節律：把心跳鋪滿整條
function tile(o: Beat & { gap?: number; start?: number } = {}): string {
  const pts: number[][] = []; const bl = o.bl ?? 76; const gap = o.gap ?? 30;
  let x = o.start ?? 8; pts.push([x, bl]);
  while (x < EW - 46) { x = beat(pts, x, o); x += gap; pts.push([x, bl]); }
  pts.push([EW, bl]);
  return toPath(pts);
}

const gVF = (): string => {
  const pts: number[][] = []; const c = 58; let ph = 0;
  for (let x = 4; x <= EW - 2; x += 3) {
    const prog = x / EW;
    const amp = (33 - 19 * prog) * (0.62 + 0.38 * Math.sin(x * 0.085 + 1.3));
    ph += 0.12 + 0.055 * prog;
    const y = c - amp * Math.sin(ph) - 7 * Math.sin(x * 0.33) * (0.55 - 0.35 * prog);
    pts.push([x, y]);
  }
  return toPath(pts);
};

const gVT = (): string => {
  const pts: number[][] = []; const bl = 80; const per = 54; let x = 6; pts.push([x, bl]);
  while (x < EW - per) {
    pts.push([x + 6, bl - 4], [x + 15, bl - 44], [x + 28, bl + 30], [x + 42, bl - 8], [x + per, bl]);
    x += per;
  }
  pts.push([EW, bl]);
  return toPath(pts);
};

const gTorsades = (): string => {
  const pts: number[][] = []; const c = 58;
  for (let x = 4; x <= EW - 2; x += 3) {
    const env = 8 + 34 * Math.abs(Math.sin(x * 0.021));
    pts.push([x, c - env * Math.sin(x * 0.29)]);
  }
  return toPath(pts);
};

const gAsystole = (): string => {
  const pts: number[][] = []; const bl = 62;
  for (let x = 2; x <= EW; x += 8) pts.push([x, bl + 1.3 * Math.sin(x * 0.045) + 0.8 * Math.sin(x * 0.5)]);
  return toPath(pts);
};

const gAF = (): string => {
  const bl = 72; const rs = [44, 100, 150, 226, 270, 338, 398, 452];
  const near = (x: number) => rs.some((r) => x >= r - 6 && x <= r + 10);
  const pts: number[][] = [];
  for (let x = 2; x <= EW; x += 4) {
    if (near(x)) continue;
    const f = 3 * Math.sin(x * 0.55) + 2 * Math.sin(x * 0.9 + 1) + 1.4 * Math.sin(x * 1.4);
    pts.push([x, bl - f]);
  }
  for (const r of rs) pts.push([r - 6, bl], [r - 1, bl + 5], [r + 2, bl - 40], [r + 5, bl + 9], [r + 10, bl]);
  pts.sort((a, b) => a[0] - b[0]);
  return toPath(pts);
};

const gPSVT = (): string => {
  const pts: number[][] = []; const bl = 74; const per = 30; let x = 6; pts.push([x, bl]);
  while (x < EW - per) {
    pts.push([x + 3, bl + 4], [x + 7, bl - 40], [x + 11, bl + 8], [x + 15, bl]);
    bump(pts, x + 16, 10, 9, bl);
    pts.push([x + per, bl]);
    x += per;
  }
  pts.push([EW, bl]);
  return toPath(pts);
};

const gWPW = (): string => {
  const pts: number[][] = []; const bl = 76; const per = 118; let x = 8; pts.push([x, bl]);
  while (x < EW - per + 10) {
    bump(pts, x, 16, 7, bl); let cx = x + 16; pts.push([cx, bl]);   // P
    cx += 6; pts.push([cx, bl]);                                     // 短 PR
    pts.push([cx + 12, bl - 14], [cx + 22, bl - 44], [cx + 34, bl + 16], [cx + 44, bl]); // delta + 寬 QRS
    cx += 44; cx += 8; pts.push([cx, bl]);
    bump(pts, cx, 30, 11, bl); cx += 30; pts.push([cx, bl]);        // T
    x += per;
  }
  pts.push([EW, bl]);
  return toPath(pts);
};

const g1AVB = (): string => tile({ pr: 52, gap: 40, r: 44 });   // 固定但延長的 PR

const gMobitz1 = (): string => {
  const pts: number[][] = []; const bl = 76; let x = 8; pts.push([x, bl]);
  for (let g = 0; g < 3; g++) {
    x = beat(pts, x, { pr: 22 }); x += 10; pts.push([x, bl]);
    x = beat(pts, x, { pr: 40 }); x += 10; pts.push([x, bl]);
    x = beat(pts, x, { pr: 56 }); x += 6; pts.push([x, bl]);
    x = beat(pts, x, { drop: true }); x += 20; pts.push([x, bl]);   // P 沒接 QRS
  }
  pts.push([EW, bl]);
  return toPath(pts);
};

const gMobitz2 = (): string => {
  const pts: number[][] = []; const bl = 76; let x = 8; pts.push([x, bl]); let n = 0;
  while (x < EW - 40) {
    n++;
    const drop = n % 3 === 0;   // PR 固定，每 3 個掉 1 個 QRS
    x = beat(pts, x, { pr: 30, drop }); x += drop ? 16 : 30; pts.push([x, bl]);
  }
  pts.push([EW, bl]);
  return toPath(pts);
};

const g3AVB = (): string => {
  const bl = 78; const pts: number[][] = [];
  const rs = [60, 200, 340, 470];                    // 慢、寬、規則的 escape QRS
  const inQRS = (x: number) => rs.some((r) => x >= r - 10 && x <= r + 46);
  const pPeriod = 52, pOff = 24;                      // 獨立行進、較快的 P 波
  for (let x = 2; x <= EW; x += 3) {
    if (inQRS(x)) continue;
    const k = Math.round((x - pOff) / pPeriod);
    const d = x - (pOff + k * pPeriod);
    const y = Math.abs(d) < 7 ? bl - 8 * Math.cos((d / 7) * (Math.PI / 2)) : bl;
    pts.push([x, y]);
  }
  for (const r of rs) pts.push([r - 10, bl], [r, bl - 40], [r + 12, bl + 22], [r + 30, bl - 8], [r + 44, bl]);
  pts.sort((a, b) => a[0] - b[0]);
  return toPath(pts);
};

const gPacer = (): string => {
  const pts: number[][] = []; const bl = 76; const per = 112; let x = 16; pts.push([x, bl]);
  while (x < EW - per + 24) {
    pts.push([x, bl], [x, bl - 52], [x, bl]);                        // pacing spike（細高垂直）
    pts.push([x + 6, bl + 6], [x + 16, bl - 30], [x + 30, bl + 34], [x + 48, bl - 6], [x + 60, bl]); // captured 寬 QRS
    x += per; pts.push([x, bl]);
  }
  pts.push([EW, bl]);
  return toPath(pts);
};

const ecgCards: EcgCard[] = [
  {
    title: "VF",
    path: gVF(),
    visual: "亂、沒有規則 QRS、沒有可數心跳。",
    rhythm: "Chaotic, no organized QRS, no pulse.",
    action: "Shockable：defibrillation + CPR。",
  },
  {
    title: "Pulseless VT",
    path: gVT(),
    visual: "寬、規則、每個 complex 長得像；沒脈搏就是 pulseless VT。",
    rhythm: "Wide regular tachycardia. If no pulse = pulseless VT.",
    action: "Shockable：defibrillation + CPR。",
  },
  {
    title: "PEA",
    path: tile({ gap: 34 }),
    visual: "看起來有 organized rhythm，但摸不到 pulse。PEA 的重點是臨床，不是波形長相。",
    rhythm: "Organized rhythm on monitor, but no palpable pulse.",
    action: "Non-shockable：CPR + epinephrine + Hs/Ts。",
  },
  {
    title: "Asystole",
    path: gAsystole(),
    visual: "幾乎平線；先確認 lead、gain、另一個導程。",
    rhythm: "Flat or near-flat line. Confirm leads/gain and another lead.",
    action: "Non-shockable：CPR + epinephrine + Hs/Ts。",
  },
  {
    title: "PSVT / regular SVT",
    path: gPSVT(),
    visual: "窄、很快、非常規則；P wave 常藏起來。",
    rhythm: "Narrow, regular, fast; P waves often hidden.",
    action: "Stable：vagal maneuver → adenosine。Unstable：sync cardioversion。",
  },
  {
    title: "Torsades",
    path: gTorsades(),
    visual: "寬、polymorphic，振幅忽大忽小，像繞著 baseline 扭轉。",
    rhythm: "Polymorphic VT with twisting axis; often QT-related.",
    action: "Unstable/no pulse：defib。With pulse：MgSO4, correct K/Mg, remove QT drugs。",
  },
  {
    title: "Atrial fibrillation",
    path: gAF(),
    visual: "Irregularly irregular，沒有固定 P wave，R-R 間距不規則。",
    rhythm: "Narrow irregular rhythm without consistent P waves.",
    action: "有 pulse 時依 stable/unstable、rate/rhythm control、抗凝血風險處理；不穩定則 synchronized cardioversion。",
  },
  {
    title: "WPW pattern",
    path: gWPW(),
    visual: "短 PR、QRS 起始有 slurred upstroke/delta wave，QRS 可能變寬。",
    rhythm: "Pre-excitation pattern; accessory pathway bypasses AV node.",
    action: "若 AF + WPW/pre-excitation，避免 adenosine、beta-blocker、diltiazem/verapamil、digoxin，請早期找心臟科。",
  },
  {
    title: "1st-degree AV block",
    path: g1AVB(),
    visual: "每個 P 都有 QRS，但 PR interval 固定延長。",
    rhythm: "AV conduction delay with 1:1 conduction.",
    action: "通常觀察與找原因；若合併症狀或其他 conduction disease，再依 bradycardia pathway。",
  },
  {
    title: "2nd-degree AV block Mobitz I",
    path: gMobitz1(),
    visual: "PR 越來越長，最後一個 P 沒有接 QRS，然後循環重來。",
    rhythm: "Wenckebach: progressive PR prolongation followed by dropped beat.",
    action: "常在 AV node；若有症狀走 bradycardia pathway，先找可逆原因。",
  },
  {
    title: "2nd-degree AV block Mobitz II",
    path: gMobitz2(),
    visual: "PR 固定，突然掉 QRS；比 Mobitz I 更危險。",
    rhythm: "Intermittent nonconducted P waves without progressive PR prolongation.",
    action: "常提示 His-Purkinje disease；症狀性或 high-grade 時準備 pacing/TVP。",
  },
  {
    title: "3rd-degree AV block",
    path: g3AVB(),
    visual: "P wave 和 QRS 各走各的，沒有固定關係；escape rhythm 通常慢。",
    rhythm: "Complete AV dissociation.",
    action: "若症狀或不穩定，準備 transcutaneous pacing 與 transvenous pacing。",
  },
  {
    title: "Pacemaker rhythm",
    path: gPacer(),
    visual: "細高 pacing spike 後接寬 QRS，代表 ventricular capture。",
    rhythm: "Pacemaker spike with captured QRS complex.",
    action: "若 brady/shock 且沒有 capture，要檢查 output、lead、電池、電解質，並準備外部 pacing。",
  },
];

export default function ACLSTool() {
  const [tab, setTab] = useState<Tab>("flow");
  const [scenario, setScenario] = useState<Scenario>("arrest");
  const [arrestRhythm, setArrestRhythm] = useState<ArrestRhythm>("unknown");
  const [tachyStatus, setTachyStatus] = useState<PulseTachy>("unstable");
  const [qrsWidth, setQrsWidth] = useState<QrsWidth>("narrow");
  const [regularity, setRegularity] = useState<Regularity>("regular");
  const [bradyStatus, setBradyStatus] = useState<BradyStatus>("unstable");

  const steps = useMemo(() => buildFlow({ scenario, arrestRhythm, tachyStatus, qrsWidth, regularity, bradyStatus }), [scenario, arrestRhythm, tachyStatus, qrsWidth, regularity, bradyStatus]);

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>ACLS</div>
        <h1 style={S.title}>成人 ACLS 急救流程與讀書筆記</h1>
        <p style={S.subtitle}>互動式流程用來快速整理方向；實際急救仍以現場 code leader、院內 protocol 與最新 AHA/ILCOR 指引為準。</p>
      </header>

      <section style={S.notice}>
        <strong>值班先記：</strong>ACLS 不是背藥物順序而已。先確認有沒有 pulse、rhythm 是否 shockable、病人是否 unstable，再把 CPR 品質、defibrillation、epinephrine、可逆原因與 post-ROSC care 串起來。
      </section>

      <div style={S.tabBar}>
        {([
          ["flow", "互動流程"],
          ["drugs", "藥物/電擊"],
          ["ecg", "心電圖判讀"],
          ["notes", "讀書筆記"],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...S.tabButton, ...(tab === id ? S.tabButtonActive : {}) }}>{label}</button>
        ))}
      </div>

      {tab === "flow" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>互動式 ACLS 流程</div>
          <div style={S.choiceBlock}>
            <div style={S.choiceLabel}>先選情境</div>
            <div style={S.pillRow}>
              <SelectPill value="arrest" current={scenario} onClick={setScenario}>Cardiac arrest</SelectPill>
              <SelectPill value="tachy" current={scenario} onClick={setScenario}>Tachycardia</SelectPill>
              <SelectPill value="brady" current={scenario} onClick={setScenario}>Bradycardia</SelectPill>
              <SelectPill value="rosc" current={scenario} onClick={setScenario}>Post-ROSC</SelectPill>
            </div>
          </div>

          {scenario === "arrest" && (
            <div style={S.choiceBlock}>
              <div style={S.choiceLabel}>Rhythm</div>
              <div style={S.pillRow}>
                <SelectPill value="unknown" current={arrestRhythm} onClick={setArrestRhythm}>還沒判讀</SelectPill>
                <SelectPill value="shockable" current={arrestRhythm} onClick={setArrestRhythm}>VF / pVT</SelectPill>
                <SelectPill value="nonshockable" current={arrestRhythm} onClick={setArrestRhythm}>PEA / asystole</SelectPill>
              </div>
            </div>
          )}

          {scenario === "tachy" && (
            <>
              <div style={S.choiceBlock}>
                <div style={S.choiceLabel}>Hemodynamic status</div>
                <div style={S.pillRow}>
                  <SelectPill value="unstable" current={tachyStatus} onClick={setTachyStatus}>不穩定</SelectPill>
                  <SelectPill value="stable" current={tachyStatus} onClick={setTachyStatus}>穩定</SelectPill>
                </div>
              </div>
              {tachyStatus === "stable" && (
                <>
                  <div style={S.choiceBlock}>
                    <div style={S.choiceLabel}>QRS width</div>
                    <div style={S.pillRow}>
                      <SelectPill value="narrow" current={qrsWidth} onClick={setQrsWidth}>Narrow</SelectPill>
                      <SelectPill value="wide" current={qrsWidth} onClick={setQrsWidth}>Wide</SelectPill>
                    </div>
                  </div>
                  <div style={S.choiceBlock}>
                    <div style={S.choiceLabel}>Regularity</div>
                    <div style={S.pillRow}>
                      <SelectPill value="regular" current={regularity} onClick={setRegularity}>Regular</SelectPill>
                      <SelectPill value="irregular" current={regularity} onClick={setRegularity}>Irregular</SelectPill>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {scenario === "brady" && (
            <div style={S.choiceBlock}>
              <div style={S.choiceLabel}>症狀/灌流</div>
              <div style={S.pillRow}>
                <SelectPill value="unstable" current={bradyStatus} onClick={setBradyStatus}>不穩定或症狀明顯</SelectPill>
                <SelectPill value="stable" current={bradyStatus} onClick={setBradyStatus}>穩定</SelectPill>
              </div>
            </div>
          )}

          <div style={S.flowList}>
            {steps.map((step, index) => (
              <FlowCard key={`${step.title}-${index}`} step={step} index={index} />
            ))}
            <div style={S.endCard}>流程終點：ROSC、轉換 rhythm pathway、或交由 code leader 依現場狀況調整。</div>
          </div>
        </section>
      )}

      {tab === "drugs" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>藥物 / 電擊速查</div>
          <NoteCard title="Cardiac arrest 常用藥" open>
            <SmallTable
              columns={["藥物", "用途", "成人劑量", "備註"]}
              rows={arrestDrugs.map((row) => ({ 藥物: row.drug, 用途: row.use, 成人劑量: row.dose, 備註: row.notes }))}
            />
          </NoteCard>
          <NoteCard title="Bradycardia / Tachycardia 常用藥" open>
            <SmallTable
              columns={["藥物", "用途", "成人劑量", "備註"]}
              rows={bradyTachyDrugs.map((row) => ({ 藥物: row.drug, 用途: row.use, 成人劑量: row.dose, 備註: row.notes }))}
            />
          </NoteCard>
          <NoteCard title="電擊能量怎麼記？">
            <SmallTable
              columns={["情境", "方式", "常用起始能量"]}
              rows={[
                { 情境: "VF / pulseless VT", 方式: "Defibrillation", 常用起始能量: "Biphasic 依機器建議；未知常用 200 J，後續 escalate" },
                { 情境: "Unstable narrow regular tachycardia", 方式: "Synchronized cardioversion", 常用起始能量: "50-100 J biphasic" },
                { 情境: "Unstable narrow irregular tachycardia", 方式: "Synchronized cardioversion", 常用起始能量: "120-200 J biphasic" },
                { 情境: "Unstable wide regular tachycardia", 方式: "Synchronized cardioversion", 常用起始能量: "100 J biphasic" },
                { 情境: "Wide irregular / polymorphic VT", 方式: "Defibrillation", 常用起始能量: "不要 sync；依 VF/pVT shock dose" },
              ]}
            />
          </NoteCard>
          <NoteCard title="輸注與禁忌提醒">
            <Bullets items={[
              "Adenosine：一定要 rapid push + flush；會短暫 AV block，先告知病人胸悶/瀕死感可能很短暫。避免用在 irregular wide complex tachycardia。",
              "Procainamide：避免 prolonged QT、HF、hypotension；輸注中若 QRS 增寬 >50% 要停。",
              "Diltiazem/verapamil：AF with RVR 常見，但 HFrEF、低血壓、pre-excited AF 要小心或避免。",
              "Beta-blocker：低血壓、shock、急性失代償 HF、嚴重 bronchospasm、high-grade AV block 需小心。",
              "NaHCO3：不是 cardiac arrest routine drug；高 K、TCA/Na-channel blocker overdose、嚴重酸中毒才比較有角色。",
            ]} />
          </NoteCard>
        </section>
      )}

      {tab === "ecg" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>ACLS 心電圖判讀</div>
          <div style={S.ecgGrid}>
            {ecgCards.map((card) => (
              <div key={card.title} style={S.ecgCard}>
                <div style={S.ecgTitle}>{card.title}</div>
                <EcgStrip points={card.points} path={card.path} />
                <div style={S.ecgVisual}>視覺重點：{card.visual}</div>
                <div style={S.ecgText}>{card.rhythm}</div>
                <div style={S.ecgAction}>{card.action}</div>
              </div>
            ))}
          </div>
          <NoteCard title="判讀順序">
            <Bullets items={[
              "這裡的圖是教學示意，不是診斷級 ECG。真正判讀要看 12-lead、clinical context、pulse 與 hemodynamics。",
              "先問：有 pulse 嗎？沒有 pulse 時，ECG 只需要分 shockable vs non-shockable。",
              "有 pulse 的 tachycardia：先看 unstable 嗎？不穩定就 synchronized cardioversion。",
              "穩定 tachycardia：看 QRS narrow/wide，再看 regular/irregular。",
              "Narrow irregular 常見 AF/flutter；若有 WPW/pre-excitation，AV nodal blocker 可能危險。",
              "Wide irregular 或 polymorphic rhythm 不要亂給 adenosine 或 AV nodal blocker。",
              "AV block 要分：一度通常只是 PR 長；Mobitz I 是 PR 越來越長後掉 beat；Mobitz II 是 PR 固定但突然掉 QRS；三度是 P 與 QRS 分離。",
              "Bradycardia：不是 HR 慢就一定要 atropine，要看 hypotension、AMS、shock、ischemia、acute HF 是否和 brady 相關；Mobitz II/high-grade/complete AV block 要早點準備 pacing。",
            ]} />
          </NoteCard>
        </section>
      )}

      {tab === "notes" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>讀書筆記</div>
          <NoteCard title="ACLS 的主軸" open>
            <Bullets items={[
              "Cardiac arrest：高品質 CPR + 早期 defibrillation 是 VF/pVT 的核心；PEA/asystole 則是 CPR + epinephrine + 找原因。",
              "Tachycardia：先看有沒有 pulse，再看是否 unstable。不穩定時，電比藥重要。",
              "Bradycardia：先判斷症狀是否由 brady 造成。Atropine 只是第一步，pacing/infusion 常常要同步準備。",
              "Post-ROSC：不要只開心 ROSC，要立刻處理氧合、通氣、血壓、ECG/cath lab、腦保護與 arrest 原因。",
            ]} />
          </NoteCard>
          <NoteCard title="Hs & Ts 可逆原因" open>
            <SmallTable
              columns={["原因", "線索", "處置方向"]}
              rows={hAndTs.map((row) => ({ 原因: row.cause, 線索: row.clue, 處置方向: row.action }))}
            />
          </NoteCard>
          <NoteCard title="CPR 品質與監測">
            <Bullets items={[
              "Compression rate 100-120/min、depth 5-6 cm、完整回彈、避免過度換氣。",
              "每 2 min 換手與 rhythm check；shock 後立刻恢復 CPR。",
              "有 advanced airway 後：continuous compression，ventilation 約 10 breaths/min。",
              "ETCO2 可反映 CPR 品質與 ROSC 線索；突然上升常提示 ROSC，持續很低要檢查 CPR 品質、tube/circuit、可逆原因。",
            ]} />
          </NoteCard>
          <NoteCard title="Post-ROSC care">
            <Bullets items={[
              "Oxygen：避免低氧，ROSC 後可 titrate FiO2，常抓 SpO2 92-98%。",
              "Ventilation：避免過度換氣；用 ETCO2/ABG 調整，目標 normocapnia 依情境。",
              "Blood pressure：低血壓會傷腦與心，需 fluid、vasopressor、inotrope，找 shock 原因。",
              "ECG/PCI：做 12-lead；STEMI 或高度懷疑 coronary occlusion 要討論 cath lab。",
              "Temperature：昏迷病人至少避免發燒；是否 TTM 依院內 protocol。",
              "Neurologic prognostication：不要太早判定預後，需延後且多模式評估。",
            ]} />
          </NoteCard>
          <NoteCard title="來源與版本">
            <p>主要依 2025 AHA Guidelines for CPR and ECC、AHA Adult Advanced Life Support algorithms、ILCOR CoSTR 與 AHA ACLS 教材常用成人劑量整理。院內急救時請以 code leader、院內 protocol、除顫器型號與藥品濃度為準。</p>
          </NoteCard>
        </section>
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 24px" },
  kicker: { color: ACCENT, fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" },
  title: { margin: "6px 0", fontSize: 26, color: "#0F172A", fontWeight: 900, letterSpacing: 0 },
  subtitle: { margin: "0 auto", maxWidth: 760, color: "#64748B", fontSize: 14, lineHeight: 1.6 },
  notice: { background: "#F0FDFA", border: "1px solid #99F6E4", borderRadius: 12, padding: 14, color: "#115E59", fontSize: 14, lineHeight: 1.7, marginBottom: 16 },
  tabBar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 16 },
  tabButton: { border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#64748B", borderRadius: 10, padding: "10px 8px", fontWeight: 800, cursor: "pointer" },
  tabButtonActive: { borderColor: ACCENT, background: "#ECFDF5", color: ACCENT },
  section: { background: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.06)", overflow: "hidden", boxSizing: "border-box" },
  sectionTitle: { fontSize: 13, color: "#94A3B8", fontWeight: 900, letterSpacing: 0, marginBottom: 14 },
  choiceBlock: { marginBottom: 14 },
  choiceLabel: { fontSize: 13, fontWeight: 900, color: "#475569", marginBottom: 8 },
  pillRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  pillButton: { border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#475569", borderRadius: 999, padding: "8px 11px", fontSize: 13, fontWeight: 800, cursor: "pointer" },
  pillButtonActive: { borderColor: ACCENT, background: "#ECFDF5", color: ACCENT },
  flowList: { marginTop: 8 },
  flowCard: { border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, background: "#FFFFFF" },
  flowDanger: { borderColor: "#FCA5A5", background: "#FEF2F2" },
  flowWarning: { borderColor: "#FCD34D", background: "#FFFBEB" },
  flowOk: { borderColor: "#86EFAC", background: "#F0FDF4" },
  flowNeutral: { borderColor: "#E2E8F0", background: "#FFFFFF" },
  flowTop: { display: "flex", alignItems: "flex-start", gap: 10 },
  stepNumber: { width: 24, height: 24, borderRadius: 999, background: ACCENT, color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 },
  flowTitle: { color: "#0F172A", fontSize: 16, fontWeight: 900, lineHeight: 1.35 },
  badge: { display: "inline-flex", marginTop: 5, color: "#64748B", fontSize: 12, fontWeight: 800 },
  flowBody: { margin: "10px 0 0", color: "#334155", fontSize: 14, lineHeight: 1.7 },
  arrow: { textAlign: "center", color: "#CBD5E1", fontSize: 22, lineHeight: "28px" },
  endCard: { border: "1px dashed #CBD5E1", borderRadius: 10, padding: 12, color: "#64748B", fontSize: 13, textAlign: "center", background: "#F8FAFC" },
  bullets: { margin: "10px 0 0", paddingLeft: 20 },
  bullet: { marginBottom: 6, color: "#334155", fontSize: 13.5, lineHeight: 1.65 },
  noteCard: { border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", marginBottom: 10, background: "#FFFFFF" },
  noteSummary: { cursor: "pointer", fontSize: 15, fontWeight: 900, color: "#0F172A" },
  noteBody: { color: "#334155", fontSize: 14, lineHeight: 1.75, marginTop: 10 },
  tableWrap: { overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 820 },
  th: { textAlign: "left", background: "#F8FAFC", color: "#475569", padding: "10px 12px", borderBottom: "1px solid #E2E8F0", fontSize: 13 },
  td: { verticalAlign: "top", padding: "11px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155", fontSize: 13, lineHeight: 1.6 },
  tdStrong: { verticalAlign: "top", padding: "11px 12px", borderBottom: "1px solid #E2E8F0", color: "#0F172A", fontSize: 13, fontWeight: 900, lineHeight: 1.6 },
  ecgGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 },
  ecgCard: { border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, background: "#FFFFFF" },
  ecgTitle: { fontSize: 15, fontWeight: 900, color: "#0F172A", marginBottom: 8 },
  ecgSvg: { width: "100%", height: "auto", aspectRatio: "500 / 120", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", display: "block" },
  ecgVisual: { color: "#475569", fontSize: 13, fontWeight: 800, lineHeight: 1.55, marginTop: 8 },
  ecgText: { color: "#334155", fontSize: 13, lineHeight: 1.55, marginTop: 8 },
  ecgAction: { color: "#0F766E", fontSize: 13, fontWeight: 900, lineHeight: 1.55, marginTop: 4 },
};
