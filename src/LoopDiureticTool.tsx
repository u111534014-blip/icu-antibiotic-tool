import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";

type LoopDrug = "furosemide" | "bumetanide" | "torsemide";
type Route = "PO" | "IV";
type Frequency = "QD" | "BID" | "TID" | "QID";
type Tab = "converter" | "notes";
type Scenario = "stableEdemaHf" | "adhfCongestion" | "severeRenalAki" | "oralMaintenance";

const DRUG_LABELS: Record<LoopDrug, string> = {
  furosemide: "Furosemide",
  bumetanide: "Bumetanide",
  torsemide: "Torsemide",
};

const FREQ_MULTIPLIER: Record<Frequency, number> = {
  QD: 1,
  BID: 2,
  TID: 3,
  QID: 4,
};

const SCENARIOS: Record<Scenario, { title: string; route: string; goal: string; caution: string }> = {
  stableEdemaHf: {
    title: "一般水腫 / 慢性心衰竭",
    route: "多半先用 PO 調整；若吸收差、腸胃水腫或鬱血明顯才改 IV。",
    goal: "症狀改善、體重緩慢下降、避免低血壓與電解質失衡。",
    caution: "如果只是 mild edema，不一定需要 aggressive IV diuresis。",
  },
  adhfCongestion: {
    title: "急性失代償 HF / 明顯鬱血",
    route: "以 IV loop 為主，常用 intermittent bolus q8-12h 起始。",
    goal: "早期解除肺水腫、JVP/下肢水腫、腹水等鬱血，並在 2-6 小時重評反應。",
    caution: "若反應不足且仍 wet，通常加量 50-100% 或直接加倍，而不是等到隔天才調。",
  },
  severeRenalAki: {
    title: "嚴重腎功能不全 / AKI 合併容量過多",
    route: "可用 IV bolus / IV loop trial，但不是拿 loop 治療 AKI 本身；有 clinically significant volume overload 時才使用。",
    goal: "處理肺水腫、顯著水腫、容量負荷造成的低氧或高血壓；常需要較高 threshold dose。",
    caution: "若無尿、利尿無反應、或合併 refractory hyperK/acidosis/uremia，要早期討論 RRT。",
  },
  oralMaintenance: {
    title: "出院前 / 口服維持",
    route: "穩定、接近 euvolemia 後轉 PO，最好觀察 24 小時尿量、體重與電解質。",
    goal: "找出可以維持乾重、不造成 AKI/低 K/低 Na 的口服劑量。",
    caution: "Torsemide 或 bumetanide PO 的口服生體可用率較可預期，可在 furosemide PO 反應不穩時考慮。",
  },
};

function n(value: string): number {
  return parseFloat(value) || 0;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function fmt(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "-";
  const rounded = round(value, digits);
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

function toOralFurosemideEquivalent(drug: LoopDrug, route: Route, totalDailyDose: number): number {
  if (drug === "furosemide") return route === "IV" ? totalDailyDose * 2 : totalDailyDose;
  if (drug === "bumetanide") return totalDailyDose * 40;
  return totalDailyDose * 2;
}

function fromOralFurosemideEquivalent(oralFurosemideEquivalent: number) {
  return {
    furosemidePO: oralFurosemideEquivalent,
    furosemideIV: oralFurosemideEquivalent / 2,
    bumetanidePO: oralFurosemideEquivalent / 40,
    bumetanideIV: oralFurosemideEquivalent / 40,
    torsemidePO: oralFurosemideEquivalent / 2,
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={S.field}>
      <span style={S.label}>{label}</span>
      {children}
      {hint && <span style={S.hint}>{hint}</span>}
    </label>
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

function MiniTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>{columns.map(col => <th key={col} style={S.th}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} style={cellIndex === 0 ? S.tdStrong : S.td}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultCard({ label, value, sub, tone = "green" }: { label: string; value: string; sub?: string; tone?: "green" | "blue" | "amber" }) {
  const colors = {
    green: { bg: "#ECFDF5", border: "#99F6E4", color: "#047857" },
    blue: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" },
    amber: { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" },
  }[tone];
  return (
    <div style={{ ...S.resultCard, background: colors.bg, borderColor: colors.border }}>
      <div style={S.resultLabel}>{label}</div>
      <div style={{ ...S.resultValue, color: colors.color }}>{value}</div>
      {sub && <div style={S.resultSub}>{sub}</div>}
    </div>
  );
}

export default function LoopDiureticTool() {
  const [tab, setTab] = useState<Tab>("converter");
  const [drug, setDrug] = useState<LoopDrug>("furosemide");
  const [route, setRoute] = useState<Route>("PO");
  const [dose, setDose] = useState("40");
  const [frequency, setFrequency] = useState<Frequency>("QD");
  const [scenario, setScenario] = useState<Scenario>("stableEdemaHf");

  const calc = useMemo(() => {
    const doseNum = n(dose);
    const dosesPerDay = FREQ_MULTIPLIER[frequency];
    const totalDailyDose = doseNum * dosesPerDay;
    const oralFurosemideEq = toOralFurosemideEquivalent(drug, route, totalDailyDose);
    const equivalents = fromOralFurosemideEquivalent(oralFurosemideEq);
    const adhfHomeIvFurosemideLow = oralFurosemideEq;
    const adhfHomeIvFurosemideHigh = oralFurosemideEq * 2.5;
    return {
      doseNum,
      dosesPerDay,
      totalDailyDose,
      oralFurosemideEq,
      equivalents,
      adhfHomeIvFurosemideLow,
      adhfHomeIvFurosemideHigh,
      adhfHomeBumetanideLow: adhfHomeIvFurosemideLow / 20,
      adhfHomeBumetanideHigh: adhfHomeIvFurosemideHigh / 20,
    };
  }, [dose, frequency, drug, route]);

  const inputLabel = `${DRUG_LABELS[drug]} ${route} ${calc.doseNum ? fmt(calc.doseNum) : "-"} mg ${frequency}`;
  const noInput = calc.doseNum <= 0;
  const scenarioInfo = SCENARIOS[scenario];

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>Diuresis</div>
        <h1 style={S.title}>Loop diuretic 轉換工具</h1>
        <p style={S.subtitle}>Furosemide、bumetanide、torsemide 等效劑量、IV bolus 思路與口服維持轉換。</p>
      </header>

      <section style={S.notice}>
        <strong>速記：</strong>PO furosemide 40 mg = IV furosemide 20 mg = PO/IV bumetanide 1 mg = PO torsemide 20 mg。Torsemide IV 通常不列入常規轉換。
      </section>

      <div style={S.tabBar}>
        {([
          ["converter", "等效轉換"],
          ["notes", "讀書筆記"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{ ...S.tabButton, ...(tab === id ? S.tabButtonActive : {}) }}>{label}</button>
        ))}
      </div>

      {tab === "converter" && (
        <>
          <section style={S.section}>
            <div style={S.sectionTitle}>目前 / home loop diuretic</div>
            <div style={S.grid4}>
              <Field label="藥物">
                <select value={drug} onChange={(e) => {
                  const nextDrug = e.target.value as LoopDrug;
                  setDrug(nextDrug);
                  if (nextDrug === "torsemide") setRoute("PO");
                }} style={S.select}>
                  <option value="furosemide">Furosemide</option>
                  <option value="bumetanide">Bumetanide</option>
                  <option value="torsemide">Torsemide</option>
                </select>
              </Field>
              <Field label="Route">
                <select value={route} onChange={(e) => setRoute(e.target.value as Route)} style={S.select}>
                  <option value="PO">PO</option>
                  <option value="IV" disabled={drug === "torsemide"}>IV</option>
                </select>
              </Field>
              <Field label="每次劑量" hint="mg/dose">
                <input value={dose} onChange={(e) => setDose(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="頻率">
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} style={S.select}>
                  <option value="QD">QD</option>
                  <option value="BID">BID</option>
                  <option value="TID">TID</option>
                  <option value="QID">QID</option>
                </select>
              </Field>
            </div>
            <div style={S.scenarioGrid}>
              <Field label="適應症情境">
                <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)} style={S.select}>
                  <option value="stableEdemaHf">一般水腫 / 慢性心衰竭</option>
                  <option value="adhfCongestion">急性失代償 HF / 明顯鬱血</option>
                  <option value="severeRenalAki">嚴重腎功能不全 / AKI 合併容量過多</option>
                  <option value="oralMaintenance">出院前 / 口服維持</option>
                </select>
              </Field>
              <div style={S.contextCard}>
                <div style={S.contextTitle}>{scenarioInfo.title}</div>
                <div style={S.contextText}>{scenarioInfo.route}</div>
                <div style={S.contextText}><strong>目標：</strong>{scenarioInfo.goal}</div>
                <div style={S.contextCaution}>{scenarioInfo.caution}</div>
              </div>
            </div>
            {drug === "torsemide" && route === "IV" && (
              <div style={S.warning}>Torsemide IV 不作為常規選項；已請改用 PO 或選其他 loop。</div>
            )}
            <div style={S.scenarioAction}>
              <div style={S.sectionTitle}>此情境建議</div>
              {scenario === "adhfCongestion" ? (
                <>
                  <div style={S.resultGrid}>
                    <ResultCard
                      label="未長期使用 loop"
                      value="40-80 mg/day"
                      sub="Furosemide IV 起始；依鬱血、腎功能、年齡調整，通常拆成 q8-12h bolus"
                      tone="blue"
                    />
                    <ResultCard
                      label="已長期使用 oral loop"
                      value={noInput ? "-" : `${fmt(calc.adhfHomeIvFurosemideLow)}-${fmt(calc.adhfHomeIvFurosemideHigh)} mg/day`}
                      sub="上方輸入 home dose；約 oral furosemide equivalent 的 1-2.5 倍，以 IV 給予"
                      tone="blue"
                    />
                    <ResultCard
                      label="Home-dose 路徑若換 bumetanide IV"
                      value={noInput ? "-" : `${fmt(calc.adhfHomeBumetanideLow)}-${fmt(calc.adhfHomeBumetanideHigh)} mg/day`}
                      sub="依 IV furosemide 20 mg = bumetanide 1 mg 換算"
                      tone="blue"
                    />
                  </div>
                  <MiniTable
                    columns={["給法", "適合情境", "怎麼想"]}
                    rows={[
                      ["IV bolus", "ADHF、肺水腫、腸胃水腫怕 PO 不吸收、需要快速 decongestion", "起始常 q8-12h；看 2-6 hr 尿量或 spot urine sodium 決定是否加量"],
                      ["Pump / continuous infusion", "bolus 反應短、需要很高總量、利尿阻抗時可考慮", "通常先給 loading bolus，再接 infusion；不是所有病人都比 bolus 好"],
                      ["Oral maintenance", "接近 euvolemia、出院前或慢性水腫控制", "用等效劑量轉 PO，最好觀察 24 hr 體重、尿量、Cr、Na/K/Mg"],
                    ]}
                  />
                  <MiniTable
                    columns={["如果 bolus fail", "下一步", "注意"]}
                    rows={[
                      ["尿量很少 / spot urine Na 低", "確認仍 wet 且血壓可承受後，下一劑通常加量 50-100% 或直接加倍", "不要一直重複同一個無效劑量"],
                      ["有尿但很快失效", "增加頻率到 q8h 或 q6h", "這比較像 duration 不夠，不一定是 dose 完全不夠"],
                      ["高劑量仍反應差", "考慮 pump / continuous infusion，通常先給 loading bolus 再接 infusion", "目標是讓藥物濃度維持在利尿 threshold 以上"],
                      ["足量 loop 仍 wet", "加 sequential nephron blockade：metolazone、chlorothiazide 或 acetazolamide", "Na/K/Mg/Cr 需密切追，低血鉀與低血鈉風險高"],
                      ["AKI/CKD 且無尿或容量壓不下來", "早期討論 nephrology/RRT", "不要因為還在加利尿劑而延誤 refractory overload、hyperK、acidosis、uremia 的處理"],
                    ]}
                  />
                </>
              ) : scenario === "severeRenalAki" ? (
                <>
                  <div style={S.pearlBox}>
                    <strong>重點：</strong>嚴重腎功能不全或 AKI 時，loop 的角色是處理 clinically significant volume overload，不是讓 Cr 變好。若仍有尿且確實 volume overloaded，可做 IV loop trial；若無尿或 refractory overload，要早期討論 RRT。
                  </div>
                  <MiniTable
                    columns={["步驟", "做法", "判讀"]}
                    rows={[
                      ["確認適應症", "肺水腫、低氧、明顯水腫、容量負荷造成高血壓或無法給必要輸液", "沒有容量過多時，不因 AKI 本身使用 loop"],
                      ["IV bolus / IV loop trial", "若仍有尿且 hemodynamically tolerable，可以 bolus 起始；常需較高 threshold dose 才有反應", "2-6 hr 看尿量、尿鈉、血壓與症狀，而不是只看 Cr"],
                      ["反應差", "確認灌流、血壓、NSAID/腎毒性藥物、低白蛋白、右心衰竭或高腹壓", "仍 wet 可加量或合併 sequential nephron blockade，但要嚴密追電解質"],
                      ["需要 RRT", "無尿、refractory hyperK/acidosis/uremia、利尿無反應的肺水腫或容量過多", "不要因為還在等利尿效果而延誤討論"],
                    ]}
                  />
                </>
              ) : scenario === "oralMaintenance" ? (
                <>
                  {noInput ? (
                    <div style={S.empty}>輸入目前劑量後，這裡會顯示可參考的口服維持等效劑量。</div>
                  ) : (
                    <div style={S.resultGrid}>
                      <ResultCard label="Furosemide PO" value={`${fmt(calc.equivalents.furosemidePO)} mg/day`} sub="可分 QD-BID，依尿量與症狀調整" />
                      <ResultCard label="Bumetanide PO" value={`${fmt(calc.equivalents.bumetanidePO)} mg/day`} sub="口服生體可用率較可預期，mg 數小" />
                      <ResultCard label="Torsemide PO" value={`${fmt(calc.equivalents.torsemidePO)} mg/day`} sub="作用較長，常見 QD 維持" />
                    </div>
                  )}
                  <div style={S.pearlBox}>
                    <strong>轉口服前：</strong>最好已接近 euvolemia、血壓穩、腎功能與 Na/K/Mg 可接受；轉 PO 後若情況允許，觀察 24 小時尿量、體重與症狀再決定出院劑量。
                  </div>
                </>
              ) : (
                <MiniTable
                  columns={["情境", "優先給法", "重點"]}
                  rows={[
                    ["一般水腫 / 慢性 HF", "多從 PO 調整", "先確認飲食鈉、水分、服藥順從性與是否真的 volume overload"],
                    ["需要 IV bolus 嗎？", "通常不需要", "除非有明顯鬱血、腸胃水腫造成 PO 效果差、或已進入 ADHF 情境"],
                    ["追蹤", "體重、尿量、症狀、Cr、Na/K/Mg", "目標是穩定變乾，不是快速脫水"],
                  ]}
                />
              )}
            </div>
          </section>
          <section style={S.section}>
            <div style={S.sectionTitle}>利尿反應評估</div>
            <div style={S.pearlBox}>
              <strong>適用：</strong>主要用在住院 IV diuresis，尤其 ADHF 或 AKI/CKD 合併鬱血。慢性口服維持則以症狀、體重趨勢與電解質/腎功能追蹤為主。
            </div>
            <MiniTable
              columns={["時間點", "反應足夠", "反應不足時"]}
              rows={[
                ["給藥前", "確認仍 wet：JVP、肺水腫、下肢水腫、腹水、體重上升、I/O positive", "若已低灌流、低血壓或偏乾，不要只加 loop"],
                ["2 小時", "尿量 >=300 mL，或 spot urine sodium 約 >=50-70 mmol/L", "若尿少/尿鈉低且仍 wet，下一劑加量 50-100% 或直接加倍"],
                ["6-8 小時", "累積尿量 >=1200 mL，症狀或氧合改善", "若有尿但很快失效，增加頻率到 q8h/q6h 或考慮 pump"],
                ["24 小時", "體重下降約 >=1 kg/day、net negative，Cr/Na/K/Mg 可接受", "若仍 wet 且未達目標，評估 diuretic resistance、加 sequential blockade 或討論 RRT"],
              ]}
            />
          </section>
          <section style={S.section}>
            <div style={S.sectionTitle}>等效劑量結果</div>
            {noInput ? (
              <div style={S.empty}>輸入每次劑量後會自動換算。</div>
            ) : (
              <>
                <div style={S.summaryLine}>{inputLabel} = total daily dose {fmt(calc.totalDailyDose)} mg/day</div>
                <div style={S.resultGrid}>
                  <ResultCard label="Oral furosemide equivalent" value={`${fmt(calc.oralFurosemideEq)} mg/day`} sub="所有轉換先回到這個共同單位" />
                  <ResultCard label="Furosemide PO" value={`${fmt(calc.equivalents.furosemidePO)} mg/day`} />
                  <ResultCard label="Furosemide IV" value={`${fmt(calc.equivalents.furosemideIV)} mg/day`} />
                  <ResultCard label="Bumetanide PO/IV" value={`${fmt(calc.equivalents.bumetanidePO)} mg/day`} />
                  <ResultCard label="Torsemide PO" value={`${fmt(calc.equivalents.torsemidePO)} mg/day`} />
                </div>
              </>
            )}
          </section>

          <section style={S.section}>
            <div style={S.sectionTitle}>常用等效表</div>
            <MiniTable
              columns={["共同等效", "口服", "靜脈"]}
              rows={[
                ["Furosemide", "40 mg PO", "20 mg IV"],
                ["Bumetanide", "1 mg PO", "1 mg IV"],
                ["Torsemide", "20 mg PO", "IV 不常規使用 / N/A"],
              ]}
            />
          </section>
        </>
      )}

      {tab === "notes" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>讀書筆記</div>
          <NoteCard title="1. 為什麼要先換成 oral furosemide equivalent？" open>
            <p>不同 loop 的 bioavailability、半衰期與劑型不同，直接「mg 對 mg」會錯很大。臨床上常先把所有 loop 轉回 oral furosemide equivalent，再決定住院 IV loop 要給多少。</p>
            <p>例：bumetanide 1 mg PO BID = bumetanide 2 mg/day = oral furosemide equivalent 80 mg/day。若是 ADHF 且仍明顯鬱血，初始 IV furosemide 可估 80-200 mg/day。</p>
          </NoteCard>
          <NoteCard title="2. Furosemide、bumetanide、torsemide 怎麼選？">
            <MiniTable
              columns={["藥物", "特色", "常見用途"]}
              rows={[
                ["Furosemide", "最熟悉、IV/PO 都常用；PO bioavailability 變異較大", "住院 IV 利尿、出院口服維持"],
                ["Bumetanide", "口服生體可用率較可預期、變異較小；mg 數小；IV/PO 轉換直覺", "高劑量 furosemide 體積太大或吸收不佳時"],
                ["Torsemide", "作用時間較長，口服生體可用率較可預期；通常 QD 較方便", "出院後維持、furosemide PO 反應不穩時"],
              ]}
            />
            <p style={S.smallNote}>這裡的「較可預期」是指 oral bioavailability 變異較小，不是說藥效一定比較強；重點是口服後實際進到血中的比例比 furosemide PO 更穩定。</p>
          </NoteCard>
          <NoteCard title="3. 不同適應症情境怎麼想？">
            <MiniTable
              columns={["情境", "優先給法", "重點"]}
              rows={[
                ["一般水腫 / 慢性 HF", "多從 PO 調整", "先確認飲食鈉、水分、服藥順從性與是否真的 volume overload"],
                ["ADHF / 明顯鬱血", "IV bolus q8-12h 起始", "home loop 先換 oral furosemide equivalent，再用 IV 1-2.5 倍/day"],
                ["嚴重 CKD / AKI 合併鬱血", "IV loop trial，劑量常需較高", "loop 只是在處理容量過多，不是治療 AKI；無尿或 refractory overload 要討論 RRT"],
                ["出院前維持", "轉 PO 後觀察", "確認 24 hr 尿量、體重、Cr 與電解質可接受，再決定 discharge dose"],
              ]}
            />
          </NoteCard>
          <NoteCard title="4. 怎麼知道是 diuretic resistance？">
            <MiniTable
              columns={["判斷點", "比較像 resistance", "先排除"]}
              rows={[
                ["前提", "已給足量 IV loop，而且病人仍然 wet / congested", "如果病人不 wet、低血壓、低灌流或已偏乾，不叫 resistance"],
                ["2 小時尿量", "給 IV loop 後 2 小時尿量未達約 300 mL", "Foley 阻塞、尿袋沒放低、I/O 沒記準"],
                ["8 小時尿量", "給藥後 8 小時累積尿量未達約 1200 mL", "同時輸液很多、尿量被漏記、沒有固定重評時間"],
                ["體重", "24 小時體重下降 <1 kg，且臨床仍有鬱血", "體重測量時間/衣物/床秤不一致"],
                ["Spot urine sodium", "給 IV loop 後約 2 小時尿鈉仍低，例如 <50-70 mmol/L", "抽太早/太晚、近期輸液或腎灌流差造成判讀困難"],
              ]}
            />
            <p style={S.smallNote}>簡單說：不是看到尿少就叫 resistance；要先確定「病人仍 wet + IV loop 劑量足夠 + 客觀尿量/尿鈉/體重沒有達標」。</p>
          </NoteCard>
          <NoteCard title="5. IV bolus fail 怎麼辦？">
            <MiniTable
              columns={["狀況", "下一步", "注意"]}
              rows={[
                ["先定義是不是真的 fail", "給藥後 2 小時尿量很少、8 小時累積尿量不足、或 spot urine sodium 仍低", "這才比較像 natriuretic response 不夠"],
                ["仍 wet 且血壓可承受", "下一劑通常加量 50-100% 或直接加倍", "loop 需要超過 threshold dose 才會有效"],
                ["有尿但很快失效", "增加頻率到 q8h 或 q6h", "比較像 duration 不夠，不一定是 dose 完全不夠"],
                ["高劑量仍不穩", "考慮 pump / continuous infusion，通常先給 loading bolus", "目標是維持在利尿 threshold 以上"],
                ["足量 loop 還是不夠", "加 sequential nephron blockade：metolazone、chlorothiazide 或 acetazolamide", "密切追 Na/K/Mg/Cr"],
                ["AKI/CKD 且無尿或容量壓不下來", "早期討論 RRT", "尤其 refractory hyperK、acidosis、uremia 或肺水腫"],
              ]}
            />
          </NoteCard>
          <NoteCard title="6. 什麼時候用 pump / continuous infusion？">
            <MiniTable
              columns={["情境", "為什麼用 pump", "注意"]}
              rows={[
                ["Bolus 有效但很快失效", "維持藥物濃度在利尿 threshold 以上，減少 rebound sodium retention", "先增加 bolus 頻率也可以；不是一定要直接 pump"],
                ["需要很高 bolus dose 才有尿", "避免一直用很高 peak bolus，讓濃度較平穩", "通常先 loading bolus，再接 pump"],
                ["Diuretic resistance", "足量 bolus 後仍無法達成尿量 / 尿鈉 / 體重目標", "同時評估腎灌流、右心衰竭、低白蛋白、NSAID、高腹壓等原因"],
                ["AKI/CKD 合併鬱血", "若仍有尿但 bolus 反應短或不穩，可考慮 pump 作為 volume management", "無尿或 refractory overload 時要早期討論 RRT，不要只延長 pump"],
              ]}
            />
          </NoteCard>
          <NoteCard title="7. AKI 病人可以 bolus 嗎？">
            <MiniTable
              columns={["問題", "答案", "臨床意思"]}
              rows={[
                ["AKI 可以用 IV bolus 嗎？", "可以，但前提是有 clinically significant volume overload，且病人還有可能利尿", "例如肺水腫、低氧、明顯鬱血或容量過多造成問題"],
                ["什麼時候不要只是一直 bolus？", "無尿、低灌流、低血壓、已經偏乾，或利尿無反應且容量壓不下來", "這時要想 hemodynamics、RRT 或其他原因，而不是只加 loop"],
                ["AKI 本身要用 loop 嗎？", "不建議為了治療 AKI 或把 oliguric AKI 變 non-oliguric 而使用", "loop 的角色是 volume management，不是腎功能恢復藥"],
              ]}
            />
          </NoteCard>
          <NoteCard title="8. Bolus 有 maximum dose 嗎？">
            <MiniTable
              columns={["藥物 / 指標", "Maximum / 門檻", "怎麼用"]}
              rows={[
                ["Furosemide IV bolus", "Maximum 200 mg/dose", "常用 40-160 mg/dose；若 160-200 mg bolus 仍效果差，通常不要只一直往上疊"],
                ["Furosemide PO", "Maximum 600 mg/day", "這是慢性 / outpatient oral dosing 表格常列的每日上限"],
                ["Furosemide IV infusion", "Maximum 40 mg/hr", "常用 5-20 mg/hr；通常先 loading bolus，再接 pump"],
                ["Bumetanide IV", "Maximum 12 mg/day", "常用 0.5-4 mg IV 1-3 次/day；依 20 mg IV furosemide = 1 mg bumetanide 換算"],
                ["Total daily furosemide equivalent", "400-500 mg/day 是策略門檻，不是 maximum", "超過此範圍仍反應差，應改想 pump、sequential blockade、hemodynamics 或 RRT"],
              ]}
            />
            <p style={S.smallNote}>Furosemide 的上限要分開看：IV bolus 是 per-dose maximum，PO 是 daily maximum，IV pump 是 infusion rate maximum。400-500 mg/day furosemide equivalent 是反應差時該重新評估策略的門檻，不是 maximum dose。</p>
          </NoteCard>
          <NoteCard title="9. 利尿反應不佳時先看什麼？">
            <ul style={S.bullets}>
              <li>病人真的還 wet 嗎？如果已經低灌流或太乾，繼續加 loop 會更糟。</li>
              <li>劑量有沒有超過 threshold？loop 不是線性，劑量太低常等於沒打到腎小管有效濃度。</li>
              <li>給藥後 2 小時尿量或 spot urine sodium 是否有反應？若尿鈉低或尿量差，要早點加強，不要等到隔天。</li>
              <li>腎功能、低白蛋白、NSAID、腎灌流差、sepsis、右心衰竭或高腹壓都可能讓 loop 反應變差。</li>
              <li>加 thiazide-type diuretic 或 acetazolamide 時，低 K、低 Na、低 Mg、AKI 風險會明顯上升。</li>
            </ul>
          </NoteCard>
          <NoteCard title="10. 來源">
            <ul style={S.bullets}>
              <li>Michigan Medicine Inpatient Diuretic Guideline：loop diuretic PO/IV equivalence 與轉口服治療表。</li>
              <li>ACC 2024 Expert Consensus Decision Pathway focused update：ADHF 起始 IV loop 依 home dose 1-2.5 倍、loop naive 40-80 mg IV/day、反應不足時加量策略與住院 maximum dosing table。</li>
              <li>AHA/ACC/HFSA 2022 HF guideline：慢性 HF 常用 loop 起始/最大劑量與作用時間。</li>
            </ul>
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
  tabButton: { border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#64748B", borderRadius: 10, padding: "13px 10px", fontSize: 15, fontWeight: 800, lineHeight: 1.3, cursor: "pointer" },
  tabButtonActive: { borderColor: ACCENT, background: "#ECFDF5", color: ACCENT },
  section: { background: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.06)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, color: "#94A3B8", fontWeight: 900, letterSpacing: 0, marginBottom: 14, textTransform: "uppercase" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 },
  scenarioGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12, alignItems: "stretch" },
  scenarioAction: { marginTop: 14, borderTop: "1px solid #E2E8F0", paddingTop: 14 },
  contextCard: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, color: "#334155", fontSize: 13, lineHeight: 1.65 },
  contextTitle: { color: "#0F172A", fontSize: 14, fontWeight: 900, marginBottom: 4 },
  contextText: { marginTop: 3 },
  contextCaution: { marginTop: 6, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "6px 8px" },
  field: { display: "block", minWidth: 0 },
  label: { display: "block", fontSize: 13, fontWeight: 800, color: "#475569", marginBottom: 6 },
  hint: { display: "block", color: "#94A3B8", fontSize: 12, marginTop: 4, lineHeight: 1.4 },
  input: { width: "100%", boxSizing: "border-box", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "11px 12px", fontSize: 16, color: "#0F172A", outline: "none" },
  select: { width: "100%", boxSizing: "border-box", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "11px 12px", fontSize: 16, color: "#0F172A", background: "#FFFFFF" },
  checkRow: { display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, color: "#475569", fontSize: 13, lineHeight: 1.5 },
  warning: { marginTop: 10, background: "#FEF3C7", border: "1px solid #F59E0B", color: "#92400E", borderRadius: 10, padding: 10, fontSize: 13, lineHeight: 1.5 },
  summaryLine: { color: "#475569", fontSize: 14, marginBottom: 12, lineHeight: 1.6 },
  empty: { border: "1px dashed #CBD5E1", borderRadius: 10, padding: 16, textAlign: "center", color: "#64748B", fontSize: 14 },
  resultGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 12 },
  resultCard: { border: "1px solid", borderRadius: 10, padding: 12 },
  resultLabel: { color: "#64748B", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  resultValue: { color: "#0F172A", fontSize: 22, fontWeight: 900, lineHeight: 1.2 },
  resultSub: { color: "#64748B", fontSize: 12, lineHeight: 1.5, marginTop: 5 },
  tableWrap: { overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10, marginTop: 8 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 680 },
  th: { textAlign: "left", background: "#F8FAFC", color: "#475569", padding: "10px 12px", borderBottom: "1px solid #E2E8F0", fontSize: 13 },
  td: { verticalAlign: "top", padding: "11px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155", fontSize: 13, lineHeight: 1.6 },
  tdStrong: { verticalAlign: "top", padding: "11px 12px", borderBottom: "1px solid #E2E8F0", color: "#0F172A", fontSize: 13, fontWeight: 900, lineHeight: 1.6 },
  pearlBox: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, color: "#334155", fontSize: 13, lineHeight: 1.7, margin: "10px 0 12px" },
  noteCard: { border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", marginBottom: 10, background: "#FFFFFF" },
  noteSummary: { cursor: "pointer", fontSize: 15, fontWeight: 900, color: "#0F172A" },
  noteBody: { color: "#334155", fontSize: 14, lineHeight: 1.75, marginTop: 10 },
  smallNote: { color: "#64748B", fontSize: 13, lineHeight: 1.7, margin: "10px 0 0" },
  bullets: { margin: 0, paddingLeft: 20 },
};
