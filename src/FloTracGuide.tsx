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

function MiniTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.miniTable}>
        <thead>
          <tr>
            {columns.map((column) => <th key={column} style={S.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`} style={{ ...S.td, ...(index === 0 ? S.rowHeader : {}) }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowBox({ title, text, tone = "gray" }: { title: string; text?: string; tone?: "green" | "blue" | "amber" | "red" | "gray" }) {
  const c = toneColor(tone);
  return (
    <div style={{ ...S.flowBox, background: c.bg, borderColor: c.border }}>
      <div style={{ ...S.flowTitle, color: c.color }}>{title}</div>
      {text && <div style={S.flowText}>{text}</div>}
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div style={S.flowArrow}>
      {label && <span style={S.flowArrowLabel}>{label}</span>}
      <span style={S.flowArrowLine}>↓</span>
    </div>
  );
}

function VolumeAlgorithmFlowchart() {
  return (
    <div style={S.flowOuter}>
      <div style={S.flowChart} aria-label="SVV and SVI volume responsive algorithm">
        <div style={S.flowCenter}><FlowBox title="SVV > 13% ?" text="先確認數值是否能代表 preload responsiveness" tone="green" /></div>
        <div style={S.flowSplit}>
          <div style={{ ...S.flowBranch, ...S.flowRouteYes }}>
            <div style={S.flowRouteTitle}>SVV 高路徑</div>
            <FlowArrow label="YES" />
            <FlowBox title="SVV 條件可信？" text="受控呼吸、規則心律、無自發呼吸、VT 足夠、無明顯 RV failure" tone="blue" />
            <FlowArrow label="YES" />
            <FlowBox title="Volume challenge" text="小量補液或 PLR，觀察 SV/CI 是否上升" tone="green" />
          </div>
          <div style={{ ...S.flowBranch, ...S.flowRouteNo }}>
            <div style={S.flowRouteTitle}>SVV 不高或不可信路徑</div>
            <FlowArrow label="NO 或不可信" />
            <FlowBox title="改看 SVI" text="SVI = SV / BSA；用每搏輸出方向分流" tone="gray" />
            <FlowArrow />
            <div style={S.flowLeafGrid}>
              <FlowBox title="SVI 40-50" text="流量尚可但低血壓：偏 pressor / SVR / vasoplegia" tone="amber" />
              <FlowBox title="SVI <40" text="每搏輸出不足：偏 inotrope、echo、pump failure 評估" tone="red" />
              <FlowBox title="SVI >50" text="流量不低：若鬱血明顯，偏 diuretic / fluid removal" tone="blue" />
            </div>
          </div>
        </div>
      </div>
    </div>
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
    const sViAlgorithm = !strokeVolumeVariation || !svi
      ? "請輸入 SVV、SV、BSA 後判讀。"
      : strokeVolumeVariation >= 13
        ? svvValid
          ? "SVV >13%：若沒有 fluid overload / RV failure，可考慮 volume challenge，觀察 SV/CI 是否上升。"
          : "SVV >13% 但條件不完整：先排除自發呼吸、心律不整、低 VT、高 PEEP、RV failure 等干擾。"
        : svi < 40
          ? "SVV 不高 + SVI <40：較像低每搏輸出，低血壓時常往 pump failure / inotrope / echo 評估。"
          : svi <= 50
            ? "SVV 不高 + SVI 40-50：若仍低血壓，較常往 vasoplegia / pressor / SVR 與感染控制評估。"
            : "SVV 不高 + SVI >50：若有鬱血或液體過多，常往 diuresis / fluid removal 評估。";

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
      sViAlgorithm,
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
            <ResultRow label="SVV/SVI 流程" value={calc.sViAlgorithm} highlight />
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
              "SVV：正壓呼吸下，每搏輸出隨呼吸週期上下波動的程度。數值高代表 SV 很容易被呼吸週期造成的 preload 改變影響，所以可能對補液有反應。",
              "SVR：全身血管阻力。低 SVR 常見於 sepsis/vasoplegia；高 SVR 可見於 hypovolemia/cardiogenic shock 或升壓劑作用。",
              "CVP：右心房壓的近似，不等於血容量，但會影響 SVR 計算，也可協助判斷右心與靜脈回流。",
            ]} />
          </NoteCard>
          <NoteCard title="3. SVV >13% 是什麼意思？" tone="green" open>
            <p>把心臟想成一條 Frank-Starling curve：在比較陡的地方，回心血量只要多一點，SV 就會明顯上升；在比較平的平台期，回心血量再增加，SV 也不太會上升。</p>
            <p>正壓呼吸每一次吸氣會改變胸腔壓、靜脈回流與左右心 preload。如果病人的心臟剛好站在 curve 比較陡的地方，這些呼吸週期造成的小幅 preload 變化，就會讓 SV 一下高、一下低，FloTrac 看到的 SVV 就會變大。</p>
            <p>所以 SVV &gt;13% 的白話是：「這個病人的 stroke volume 對 preload 變化很敏感，若限制條件符合，給 fluid challenge 或 passive leg raise 後，SV/CI 有機會上升。」它不是直接等於脫水，也不是看到就一定補水；ARDS、肺水腫、RV failure 或 fluid overload 時仍要非常小心。</p>
          </NoteCard>
          <NoteCard title="4. 常用參數正常值" tone="blue">
            <MiniTable
              columns={["參數", "常見範圍", "意思"]}
              rows={[
                ["CO", "4.0-8.0 L/min", "每分鐘心輸出量，受 HR 與 SV 影響。"],
                ["CI", "2.5-4.0 L/min/m2", "CO 校正體表面積，低 CI 常代表低輸出。"],
                ["SV", "60-100 mL/beat", "每一下打出去的血量。"],
                ["SVI", "33-47 mL/m2/beat", "SV 校正體表面積；部分 volume algorithm 會用 40-50 分層。"],
                ["SVR", "800-1200 dynes-sec/cm5", "全身血管阻力；低偏 vasoplegia，高偏代償或升壓劑效果。"],
                ["SVRI", "1970-2390 dynes-sec/cm5/m2", "SVR 校正體表面積。"],
                ["SVV", "<15%；常用 10-13% 當 fluid responsiveness cutoff", "只在受控呼吸、規則心律等條件下較可信。"],
                ["StO2", "60-80%", "組織氧飽和度，屬部分監測系統延伸參數。"],
              ]}
            />
          </NoteCard>
          <NoteCard title="5. SVV + SVI 的 volume responsive algorithm" tone="green">
            <p>這張小卡的概念是先看 SVV 是否大於約 13%。如果 SVV 高且條件可信，表示可能對 preload 有反應，可以做 volume challenge；如果 SVV 不高，再用 SVI 粗分下一步方向。</p>
            <VolumeAlgorithmFlowchart />
            <MiniTable
              columns={["條件", "常見判讀", "下一步方向"]}
              rows={[
                ["SVV >13%", "較支持 fluid responsive", "Volume challenge，觀察 SV/CI 是否上升。"],
                ["SVV <=13% + SVI 40-50", "每搏輸出尚可但仍低血壓", "偏向 pressor / SVR / vasoplegia 評估。"],
                ["SVV <=13% + SVI <40", "每搏輸出不足", "偏向 inotrope、echo、pump failure / RV failure 評估。"],
                ["SVV <=13% + SVI >50", "流量不低，可能不缺 preload", "若鬱血明顯，考慮 diuretic / fluid removal。"],
              ]}
            />
            <p style={S.smallNote}>這是決策輔助，不是固定醫囑。Sepsis、ARDS、RV failure、高 PEEP、AF、自發呼吸或血管張力劇烈變化時，SVV/SVI 都要降權判讀。</p>
          </NoteCard>
          <NoteCard title="6. Shock pattern 速查" tone="amber">
            <MiniTable
              columns={["型態", "MAP", "HR", "CO/CI", "SV", "SVV", "SVR", "重點"]}
              rows={[
                ["Hypovolemic 低血容量", "↓", "↑", "↓", "↓", "↑", "↑", "先想 preload 不足；確認 fluid responsiveness。"],
                ["Obstructive 阻塞性", "↓", "↑", "↓↓", "↓", "↑", "↔/↑", "PE、tamponade、tension pneumothorax；不要只補水。"],
                ["Cardiac dysfunction 心因性", "↓", "↔/↑", "↓↓", "↓", "↔", "↑", "pump failure；echo、inotrope、afterload/ischemia 處理。"],
                ["Septic 分布性", "↓", "↔/↑", "早期↑、晚期↓", "↔/↑", "↑", "↓↓", "vasoplegia；source control、抗生素、pressor，補液看反應。"],
                ["Anaphylactic 分布性", "↓", "↔/↑", "↑", "↑", "↑", "↓↓", "血管擴張與漏液；epinephrine 與 airway 優先。"],
                ["Neurogenic 分布性", "↓", "↓", "↓", "↔/↑", "↑", "↓↓", "交感張力下降；bradycardia + hypotension 是線索。"],
              ]}
            />
          </NoteCard>
          <NoteCard title="7. Fluid responsive 不是等於一定要補水" tone="amber">
            <p>Fluid responsive 的意思是「給一點 preload，SV/CO 可能會上升」。但病人如果 ARDS、肺水腫、右心衰竭或已經 fluid overloaded，即使 responsive，也不代表補水就是最好選擇。實務上常搭配 passive leg raise、mini-fluid challenge、echo、尿量、乳酸、皮膚灌流與肺部情況一起決定。</p>
          </NoteCard>
          <NoteCard title="8. Shock pattern 速記" tone="gray">
            <Bullets items={[
              "Low CI + high SVR：先想 cardiogenic 或 hypovolemic。下一步用 echo、CVP/IVC、肺水、乳酸與尿量分辨。",
              "Normal/high CI + low SVR：先想 distributive shock，尤其 sepsis。重點是 source control、抗生素、norepinephrine，補液看 responsiveness。",
              "Low CI + low SVR：mixed shock，例如 septic cardiomyopathy、MI 合併 sepsis。通常不能只用一招處理。",
              "High SVV/PPV：只有在條件符合時才像 fluid responsive；條件不符合時先排錯。",
            ]} />
          </NoteCard>
          <NoteCard title="9. 手術姿勢會讓 FloTrac 數字改變" tone="blue">
            <p>姿勢改變會重新分配靜脈回流與胸腹腔壓力，所以 FloTrac 數字可能跟著跳。重點是不要把「翻身後的生理變化」誤判成病人突然 shock 惡化。</p>
            <MiniTable
              columns={["姿勢", "CI", "SV", "SVV", "HR", "MAP", "SVR", "重點"]}
              rows={[
                ["仰臥", "↔", "↔", "↔", "↔", "↔", "↔", "常當作 baseline。"],
                ["趴姿", "↓", "↓", "↑", "↑", "↑/↔", "↑", "先用平躺時 SVV 當基準；翻趴後 SVV 上升可形成新基準。"],
                ["頭低腳高", "↑", "↑", "↓", "↑/↔", "↑/↔", "↑", "像短暫增加 venous return，可觀察 SV/CI 是否增加。"],
                ["頭高腳低", "↓", "↓", "↑", "↑/↔", "↓/↔", "↑↑", "胸腹腔 volume 降、下肢滯留，可能看起來較缺 preload。"],
                ["坐姿", "↓", "↓", "↑", "↑", "↓", "↑", "腦灌流更敏感，維持血壓很重要。"],
                ["側臥", "↓", "↓", "↑", "↑", "↓", "↑", "可因 venous return 與壓迫改變而波動。"],
              ]}
            />
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
  tableWrap: { overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10, margin: "10px 0 6px" },
  miniTable: { width: "100%", borderCollapse: "collapse", minWidth: 680, background: "#FFFFFF" },
  th: { background: "#F8FAFC", color: "#475569", fontSize: 12, fontWeight: 900, textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" },
  td: { color: "#334155", fontSize: 13, lineHeight: 1.55, padding: "10px 12px", borderBottom: "1px solid #E2E8F0", verticalAlign: "top" },
  rowHeader: { color: "#0F172A", fontWeight: 900, whiteSpace: "nowrap" },
  smallNote: { color: "#64748B", fontSize: 12, lineHeight: 1.6, margin: "10px 0 0" },
  flowOuter: { overflowX: "auto", padding: "6px 0 12px", marginTop: 8 },
  flowChart: { minWidth: 820, border: "1px solid #D1FAE5", borderRadius: 12, background: "#FFFFFF", padding: 14 },
  flowCenter: { display: "flex", justifyContent: "center" },
  flowSplit: { display: "grid", gridTemplateColumns: "0.95fr 1.45fr", gap: 34, alignItems: "stretch", marginTop: 10 },
  flowBranch: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, border: "1.5px dashed #CBD5E1", borderRadius: 12, padding: "10px 12px 12px" },
  flowRouteYes: { background: "#F0FDFA", borderColor: "#99F6E4" },
  flowRouteNo: { background: "#F8FAFC", borderColor: "#CBD5E1" },
  flowRouteTitle: { alignSelf: "stretch", textAlign: "center", color: "#475569", fontSize: 12, fontWeight: 900, padding: "2px 0 8px", borderBottom: "1px solid rgba(148,163,184,0.35)", marginBottom: 2 },
  flowLeafGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(145px, 1fr))", gap: 10, width: "100%" },
  flowBox: { width: "100%", maxWidth: 280, boxSizing: "border-box", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "11px 12px", textAlign: "center", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" },
  flowTitle: { fontSize: 14, fontWeight: 900, lineHeight: 1.35 },
  flowText: { color: "#475569", fontSize: 12, lineHeight: 1.5, marginTop: 5 },
  flowArrow: { minHeight: 34, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#0D9488", fontWeight: 900 },
  flowArrowLabel: { color: "#64748B", fontSize: 11, letterSpacing: 0, lineHeight: 1 },
  flowArrowLine: { color: "#0D9488", fontSize: 20, lineHeight: 1.05 },
  sourceBox: { color: "#64748B", fontSize: 12, lineHeight: 1.55, margin: "8px 2px 24px" },
};
