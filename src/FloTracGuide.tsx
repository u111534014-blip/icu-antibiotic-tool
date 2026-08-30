import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";

type Tab = "calculator" | "notes" | "pitfalls";

function n(value: string) {
  return parseFloat(value) || 0;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toneColor(tone: "green" | "blue" | "amber" | "red" | "gray") {
  if (tone === "green") return { bg: "#ECFDF5", border: "#A7F3D0", color: "#047857" };
  if (tone === "blue") return { bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" };
  if (tone === "amber") return { bg: "#FEF3C7", border: "#FBBF24", color: "#92400E" };
  if (tone === "red") return { bg: "#FEF2F2", border: "#FECACA", color: "#B91C1C" };
  return { bg: "#F8FAFC", border: "#E2E8F0", color: "#475569" };
}

function classifyCi(ci: number) {
  if (!ci) return "資料不足";
  if (ci < 2.2) return "低 cardiac index：需評估低血容量、心肌收縮差、RV failure、tamponade/obstruction";
  if (ci <= 4) return "CI 大致在常見範圍";
  return "高 CI：可見於 distributive shock、sepsis、anemia、AV shunt、thyrotoxicosis 等";
}

function classifySvr(svr: number) {
  if (!svr) return "資料不足";
  if (svr < 800) return "低 SVR：偏 distributive / vasoplegia pattern";
  if (svr <= 1200) return "SVR 大致在常見範圍";
  return "高 SVR：常見於 hypovolemia、cardiogenic shock、疼痛/寒顫或 vasopressor effect";
}

function shockPattern(ci: number, svr: number) {
  if (!ci || !svr) return "請先輸入 HR、SV、MAP、CVP、BSA。";
  if (ci < 2.2 && svr > 1200) return "低 CI + 高 SVR：像 cardiogenic / hypovolemic shock pattern。下一步先分辨 preload 不足還是 pump failure。";
  if (ci >= 2.2 && svr < 800) return "CI 尚可或偏高 + 低 SVR：像 distributive shock pattern。重點常是感染控制、vasopressor、確認是否仍 fluid responsive。";
  if (ci < 2.2 && svr < 800) return "低 CI + 低 SVR：mixed shock，要同時處理 vasoplegia 與低輸出，常需要 echo/乳酸/ScvO2/尿量一起看。";
  if (ci < 2.2) return "低 CI：即使 SVR 未明顯升高，也要找低輸出的原因。";
  if (svr > 1200) return "SVR 偏高但 CI 尚可：常是代償或 vasopressor effect；不要只因 SVR 高就補水，先看 fluid responsiveness。";
  return "CI/SVR 沒有明顯落在典型 shock pattern；趨勢與臨床比單點更重要。";
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label>
      <span style={S.label}>{label}</span>
      {children}
      {hint && <div style={S.hint}>{hint}</div>}
    </label>
  );
}

function ResultRow({ label, value, note, highlight }: { label: string; value: string; note?: string; highlight?: boolean }) {
  return (
    <div style={{ ...S.resultRow, ...(highlight ? S.resultHighlight : {}) }}>
      <div>
        <div style={S.resultLabel}>{label}</div>
        {note && <div style={S.resultNote}>{note}</div>}
      </div>
      <strong style={S.resultValue}>{value}</strong>
    </div>
  );
}

function NoteCard({ title, children, tone = "gray", open = false }: { title: string; children: ReactNode; tone?: "green" | "blue" | "amber" | "red" | "gray"; open?: boolean }) {
  const c = toneColor(tone);
  return (
    <details open={open} style={{ ...S.noteCard, borderColor: c.border, background: c.bg }}>
      <summary style={{ ...S.noteSummary, color: c.color }}>{title}</summary>
      <div style={S.noteBody}>{children}</div>
    </details>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={S.bullets}>
      {items.map((item) => <li key={item} style={S.bullet}>{item}</li>)}
    </ul>
  );
}

export default function FloTracGuide() {
  const [tab, setTab] = useState<Tab>("calculator");
  const [hr, setHr] = useState("100");
  const [sv, setSv] = useState("55");
  const [map, setMap] = useState("65");
  const [cvp, setCvp] = useState("8");
  const [bsa, setBsa] = useState("1.70");
  const [svv, setSvv] = useState("13");
  const [controlledVent, setControlledVent] = useState(true);
  const [regularRhythm, setRegularRhythm] = useState(true);
  const [noSpontaneous, setNoSpontaneous] = useState(true);
  const [adequateVt, setAdequateVt] = useState(false);
  const [noRvFailure, setNoRvFailure] = useState(true);

  const calc = useMemo(() => {
    const heartRate = n(hr);
    const strokeVolume = n(sv);
    const meanPressure = n(map);
    const centralVenousPressure = n(cvp);
    const bodySurfaceArea = n(bsa);
    const strokeVolumeVariation = n(svv);
    const co = heartRate && strokeVolume ? heartRate * strokeVolume / 1000 : 0;
    const ci = co && bodySurfaceArea ? co / bodySurfaceArea : 0;
    const svr = co ? (meanPressure - centralVenousPressure) / co * 80 : 0;
    const svri = ci ? (meanPressure - centralVenousPressure) / ci * 80 : 0;
    const svi = strokeVolume && bodySurfaceArea ? strokeVolume / bodySurfaceArea : 0;
    const svvValid = controlledVent && regularRhythm && noSpontaneous && adequateVt && noRvFailure;
    const svvText = !strokeVolumeVariation
      ? "未輸入 SVV"
      : strokeVolumeVariation >= 13
        ? svvValid
          ? "SVV >=13% 且條件符合：較支持 fluid responsive"
          : "SVV >=13%，但條件不完整，只能當警訊，不能單獨決定補水"
        : "SVV <13%：較不支持 fluid responsive，但仍要看限制條件與趨勢";

    return {
      co,
      ci,
      svr,
      svri,
      svi,
      svvValid,
      svvText,
      pattern: shockPattern(ci, svr),
      ciText: classifyCi(ci),
      svrText: classifySvr(svr),
    };
  }, [adequateVt, bsa, controlledVent, cvp, hr, map, noRvFailure, noSpontaneous, regularRhythm, sv, svv]);

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>FloTrac / EV1000</div>
        <h1 style={S.title}>FloTrac 血流動力學讀書筆記</h1>
        <p style={S.subtitle}>把 arterial waveform 轉成 CO、CI、SVV、SVR，用來判斷 shock pattern 與 fluid responsiveness。</p>
      </header>

      <div style={S.tabBar}>
        {([
          ["calculator", "數字判讀"],
          ["notes", "讀書筆記"],
          ["pitfalls", "限制與排錯"],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...S.tabButton, ...(tab === id ? S.tabButtonActive : {}) }}>{label}</button>
        ))}
      </div>

      {tab === "calculator" && (
        <>
          <section style={S.section}>
            <div style={S.sectionTitle}>輸入目前數字</div>
            <div style={S.grid3}>
              <Field label="HR" hint="beats/min"><input style={S.input} value={hr} onChange={(e) => setHr(e.target.value)} inputMode="decimal" /></Field>
              <Field label="SV" hint="mL/beat"><input style={S.input} value={sv} onChange={(e) => setSv(e.target.value)} inputMode="decimal" /></Field>
              <Field label="MAP" hint="mmHg"><input style={S.input} value={map} onChange={(e) => setMap(e.target.value)} inputMode="decimal" /></Field>
              <Field label="CVP" hint="mmHg；若沒有請先估填，SVR 會受影響"><input style={S.input} value={cvp} onChange={(e) => setCvp(e.target.value)} inputMode="decimal" /></Field>
              <Field label="BSA" hint="m2；用於 CI/SVI"><input style={S.input} value={bsa} onChange={(e) => setBsa(e.target.value)} inputMode="decimal" /></Field>
              <Field label="SVV" hint="%"><input style={S.input} value={svv} onChange={(e) => setSvv(e.target.value)} inputMode="decimal" /></Field>
            </div>
          </section>

          <section style={S.section}>
            <div style={S.sectionTitle}>計算結果</div>
            <ResultRow label="CO" value={calc.co ? `${round(calc.co)} L/min` : "-"} note="CO = HR x SV / 1000" highlight />
            <ResultRow label="CI" value={calc.ci ? `${round(calc.ci)} L/min/m2` : "-"} note={calc.ciText} highlight />
            <ResultRow label="SVI" value={calc.svi ? `${round(calc.svi)} mL/beat/m2` : "-"} note="SVI = SV / BSA；低 SVI 常表示每搏輸出不足。" />
            <ResultRow label="SVR" value={calc.svr ? `${Math.round(calc.svr)} dynes-sec/cm5` : "-"} note={calc.svrText} highlight />
            <ResultRow label="SVRI" value={calc.svri ? `${Math.round(calc.svri)} dynes-sec/cm5/m2` : "-"} note="SVRI = (MAP - CVP) / CI x 80。" />
            <ResultRow label="整體 pattern" value={calc.pattern} highlight />
          </section>

          <section style={S.section}>
            <div style={S.sectionTitle}>SVV 能不能信？</div>
            <div style={S.checkGrid}>
              <label style={S.checkRow}><input type="checkbox" checked={controlledVent} onChange={(e) => setControlledVent(e.target.checked)} /> controlled mechanical ventilation</label>
              <label style={S.checkRow}><input type="checkbox" checked={regularRhythm} onChange={(e) => setRegularRhythm(e.target.checked)} /> regular rhythm，沒有明顯 AF/PVC</label>
              <label style={S.checkRow}><input type="checkbox" checked={noSpontaneous} onChange={(e) => setNoSpontaneous(e.target.checked)} /> 沒有明顯 spontaneous breathing</label>
              <label style={S.checkRow}><input type="checkbox" checked={adequateVt} onChange={(e) => setAdequateVt(e.target.checked)} /> VT 足夠大，非極低 VT ARDS 設定</label>
              <label style={S.checkRow}><input type="checkbox" checked={noRvFailure} onChange={(e) => setNoRvFailure(e.target.checked)} /> 無明顯 RV failure / high PEEP 干擾</label>
            </div>
            <div style={{ ...S.callout, ...(calc.svvValid ? S.greenCallout : S.amberCallout) }}>
              {calc.svvText}
            </div>
          </section>
        </>
      )}

      {tab === "notes" && (
        <section style={S.section}>
          <NoteCard title="1. FloTrac 到底在看什麼？" tone="blue" open>
            <p>FloTrac 接 arterial line，不需要外加肺動脈導管。它從動脈壓波形的 pulsatility 估算 stroke volume，再乘上 HR 得到 cardiac output。因為 arterial waveform 會被血管張力、阻尼、心律、呼吸器、vasopressor 影響，所以它很適合看趨勢與治療反應，不適合把單一數字當絕對真理。</p>
          </NoteCard>
          <NoteCard title="2. 參數翻譯成白話" tone="green" open>
            <Bullets items={[
              "SV：每一下心跳打出去多少血。低 SV 可能是 preload 不足、收縮差、afterload 太高、RV/LV 問題。",
              "CO：每分鐘心臟總輸出量。CO = HR x SV。",
              "CI：CO 除以體表面積，比較適合不同體型之間比較。低 CI 通常要找低輸出原因。",
              "SVV：正壓呼吸下，每搏輸出隨呼吸週期變動的程度。變動大代表心臟可能站在 Frank-Starling curve 比較陡的地方，補 preload 可能會增加 SV。",
              "SVR：全身血管阻力。低 SVR 常見於 sepsis/vasoplegia；高 SVR 可見於 hypovolemia/cardiogenic shock 或升壓劑作用。",
              "CVP：右心房壓的近似，不等於血容量，但會影響 SVR 計算，也可協助判斷右心與靜脈回流。",
            ]} />
          </NoteCard>
          <NoteCard title="3. Fluid responsive 不是等於一定要補水" tone="amber">
            <p>Fluid responsive 的意思是「給一點 preload，SV/CO 可能會上升」。但病人如果 ARDS、肺水腫、右心衰竭或已經 fluid overloaded，即使 responsive，也不代表補水就是最好選擇。實務上常搭配 passive leg raise、mini-fluid challenge、echo、尿量、乳酸、皮膚灌流與肺部情況一起決定。</p>
          </NoteCard>
          <NoteCard title="4. Shock pattern 速記" tone="gray">
            <Bullets items={[
              "Low CI + high SVR：先想 cardiogenic 或 hypovolemic。下一步用 echo、CVP/IVC、肺水、乳酸與尿量分辨。",
              "Normal/high CI + low SVR：先想 distributive shock，尤其 sepsis。重點是 source control、抗生素、norepinephrine，補液看 responsiveness。",
              "Low CI + low SVR：mixed shock，例如 septic cardiomyopathy、MI 合併 sepsis。通常不能只用一招處理。",
              "High SVV/PPV：只有在條件符合時才像 fluid responsive；條件不符合時先排錯。",
            ]} />
          </NoteCard>
        </section>
      )}

      {tab === "pitfalls" && (
        <section style={S.section}>
          <NoteCard title="看 FloTrac 前先問的 8 件事" tone="amber" open>
            <Bullets items={[
              "A-line transducer 有沒有 level 到 phlebostatic axis？有沒有 zero？",
              "波形是否 overdamped：波形鈍、收縮壓被低估、舒張壓被高估、pulse pressure 變小。",
              "波形是否 underdamped：波形尖、收縮壓被高估、可能出現 ringing。",
              "病人是否 AF、頻繁 PVC、心律不規則？這會讓 SVV/PPV 很難判讀。",
              "病人是否有自發呼吸、咳嗽、躁動、ventilator dyssynchrony？",
              "VT 是否很低？ARDS 低 VT 時 SVV 常低估 fluid responsiveness。",
              "是否正在快速改 norepinephrine、propofol、PEEP 或 fluid？數字會跟著動。",
              "有沒有 RV failure、pulmonary hypertension、high PEEP、tamponade 或 tension pneumothorax？",
            ]} />
          </NoteCard>
          <NoteCard title="如果數字怪怪的，先這樣排" tone="blue" open>
            <Bullets items={[
              "先看 arterial waveform，不要先看 CI/SVR。",
              "做 fast flush test：確認 damping 狀態。",
              "重新 level/zero transducer。",
              "檢查 tubing 氣泡、血塊、接頭鬆動、pressure bag 是否足壓。",
              "確認輸入的 HR、BSA、CVP 是否合理。",
              "用趨勢判讀：治療前後 SV/CI 是否真的跟著改善，病人乳酸/尿量/皮膚灌流是否同步改善。",
            ]} />
          </NoteCard>
          <NoteCard title="常用正常值只是地圖，不是答案" tone="gray">
            <Bullets items={[
              "CI 常見目標約 2.5-4.0 L/min/m2；shock 時常以 >=2.2 作低輸出警訊。",
              "SVR 常見約 800-1200 dynes-sec/cm5；但正在用 vasopressor 時數字要和劑量一起看。",
              "SVV 常用 cutoff 約 10-13%，但只有在受控機械通氣、規則心律、無自發呼吸等條件下才比較可靠。",
              "MAP 只是壓力，CI 是流量，乳酸/尿量/意識/皮膚是灌流結果。三者要一起看。",
            ]} />
          </NoteCard>
        </section>
      )}

      <section style={S.sourceBox}>
        參考：Surviving Sepsis Campaign 2021 fluid responsiveness principles；Edwards FloTrac / EV1000 educational materials；critical care hemodynamic monitoring reviews。
      </section>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 24px" },
  kicker: { color: ACCENT, fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" },
  title: { margin: "6px 0", fontSize: 26, color: "#0F172A", fontWeight: 900, letterSpacing: 0 },
  subtitle: { margin: "0 auto", maxWidth: 760, color: "#64748B", fontSize: 14, lineHeight: 1.6 },
  notice: { background: "#F0FDFA", border: "1px solid #99F6E4", borderRadius: 12, padding: 14, color: "#115E59", fontSize: 14, lineHeight: 1.7, marginBottom: 16 },
  tabBar: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 16 },
  tabButton: { border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#64748B", borderRadius: 10, padding: "13px 10px", fontSize: 15, fontWeight: 800, lineHeight: 1.3, cursor: "pointer" },
  tabButtonActive: { borderColor: ACCENT, background: "#ECFDF5", color: ACCENT },
  section: { background: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.06)", overflow: "hidden", boxSizing: "border-box" },
  sectionTitle: { fontSize: 13, color: "#94A3B8", fontWeight: 900, letterSpacing: 0, marginBottom: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  label: { display: "block", color: "#475569", fontSize: 13, fontWeight: 800, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", border: "1.5px solid #DDE5F0", borderRadius: 10, minHeight: 44, padding: "10px 12px", color: "#0F172A", fontSize: 16, fontWeight: 700, outline: "none" },
  hint: { marginTop: 5, color: "#94A3B8", fontSize: 12, lineHeight: 1.4 },
  resultRow: { display: "grid", gridTemplateColumns: "minmax(130px, 0.8fr) minmax(0, 1.3fr)", gap: 12, padding: "10px 0", borderBottom: "1px solid #E2E8F0", alignItems: "start" },
  resultHighlight: { background: "#F8FAFC", margin: "0 -8px", padding: "10px 8px", borderRadius: 8 },
  resultLabel: { color: "#64748B", fontSize: 13, fontWeight: 900 },
  resultNote: { color: "#64748B", fontSize: 12, lineHeight: 1.45, marginTop: 4 },
  resultValue: { color: "#0F172A", fontSize: 14, lineHeight: 1.55 },
  checkGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 },
  checkRow: { display: "flex", gap: 8, alignItems: "center", color: "#334155", fontSize: 13, fontWeight: 700, lineHeight: 1.45 },
  callout: { marginTop: 12, borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 800, lineHeight: 1.55 },
  greenCallout: { background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0" },
  amberCallout: { background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" },
  noteCard: { border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", marginBottom: 10 },
  noteSummary: { cursor: "pointer", fontSize: 15, fontWeight: 900 },
  noteBody: { color: "#334155", fontSize: 14, lineHeight: 1.75, marginTop: 10 },
  bullets: { margin: 0, paddingLeft: 20 },
  bullet: { marginBottom: 8 },
  sourceBox: { color: "#64748B", fontSize: 12, lineHeight: 1.55, margin: "8px 2px 24px" },
};
