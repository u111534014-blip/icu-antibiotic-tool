import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";

type Tab = "calculator" | "bundle" | "notes";
type Sex = "female" | "male";

function n(value: string) {
  return parseFloat(value) || 0;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pbwKg(heightCm: number, sex: Sex) {
  if (!heightCm) return 0;
  const base = sex === "male" ? 50 : 45.5;
  return Math.max(0, base + 0.91 * (heightCm - 152.4));
}

function pfSeverity(pf: number, peep: number) {
  if (!pf) return "請輸入 PaO2 與 FiO2";
  if (peep < 5) return "PEEP/CPAP <5：不符合 Berlin ARDS oxygenation 條件";
  if (pf <= 100) return "Severe ARDS：P/F <=100";
  if (pf <= 200) return "Moderate ARDS：P/F 101-200";
  if (pf <= 300) return "Mild ARDS：P/F 201-300";
  return "P/F >300：未達 ARDS oxygenation 分級";
}

function ResultRow({ label, value, note, highlight = false }: { label: string; value: string; note?: string; highlight?: boolean }) {
  return (
    <div style={{ ...S.resultRow, ...(highlight ? S.resultRowHighlight : {}) }}>
      <div>
        <div style={S.resultLabel}>{label}</div>
        {note && <div style={S.resultNote}>{note}</div>}
      </div>
      <strong style={S.resultValue}>{value}</strong>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label>
      <span style={S.label}>{label}</span>
      {children}
      {hint && <div style={S.fieldHint}>{hint}</div>}
    </label>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={S.bulletList}>
      {items.map((item) => <li key={item} style={S.bulletItem}>{item}</li>)}
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

export default function ARDSTool() {
  const [tab, setTab] = useState<Tab>("calculator");
  const [sex, setSex] = useState<Sex>("female");
  const [height, setHeight] = useState("160");
  const [weight, setWeight] = useState("60");
  const [pao2, setPao2] = useState("80");
  const [fio2, setFio2] = useState("60");
  const [spo2, setSpo2] = useState("92");
  const [peep, setPeep] = useState("10");
  const [vt, setVt] = useState("320");
  const [rr, setRr] = useState("24");
  const [pplat, setPplat] = useState("26");
  const [pco2, setPco2] = useState("45");
  const [ph, setPh] = useState("7.30");
  const [atracuriumDose, setAtracuriumDose] = useState("11");
  const [atracuriumConc, setAtracuriumConc] = useState("10");

  const calc = useMemo(() => {
    const ht = n(height);
    const wt = n(weight);
    const pbw = pbwKg(ht, sex);
    const pa = n(pao2);
    const fio2Number = n(fio2);
    const fio2Fraction = fio2Number > 1 ? fio2Number / 100 : fio2Number;
    const saturation = n(spo2);
    const peepValue = n(peep);
    const vtMl = n(vt);
    const rrValue = n(rr);
    const plateau = n(pplat);
    const co2 = n(pco2);
    const phValue = n(ph);
    const pf = pa && fio2Fraction ? pa / fio2Fraction : 0;
    const vtPerPbw = pbw && vtMl ? vtMl / pbw : 0;
    const vt4 = pbw * 4;
    const vt6 = pbw * 6;
    const vt8 = pbw * 8;
    const minuteVent = vtMl && rrValue ? vtMl * rrValue / 1000 : 0;
    const driving = plateau && peepValue ? plateau - peepValue : 0;
    const compliance = vtMl && driving > 0 ? vtMl / driving : 0;
    const oxygenationText = pfSeverity(pf, peepValue);
    const vtStatus = vtPerPbw > 8
      ? "過高：明顯超過 lung protective range"
      : vtPerPbw > 6.5
        ? "偏高：建議往 6 mL/kg PBW 或更低調整"
        : vtPerPbw >= 4
          ? "符合 4-6 mL/kg PBW protective range"
          : "偏低：需確認 minute ventilation、pH、同步性與設定目的";
    const pplatStatus = plateau > 30
      ? "Pplat >30：需降低肺泡壓力"
      : plateau > 0
        ? "Pplat <=30：符合基本安全目標"
        : "請輸入 plateau pressure";
    const drivingStatus = driving > 15
      ? "Driving pressure >15：肺受壓風險較高，建議檢查 VT/PEEP/recruitability"
      : driving > 0
        ? "Driving pressure <=15：較理想"
        : "需 Pplat 與 PEEP 才能計算";
    const atracuriumMcgMin = wt * n(atracuriumDose);
    const atracuriumMgHr = atracuriumMcgMin * 60 / 1000;
    const atracuriumMlHr = n(atracuriumConc) > 0 ? atracuriumMgHr / n(atracuriumConc) : 0;

    const actionHints: string[] = [];
    if (pf && pf <= 150 && fio2Fraction >= 0.6 && peepValue >= 5) {
      actionHints.push("P/F <=150 且 FiO2 >=0.6：若無禁忌，優先評估 prone positioning，通常採 prolonged prone session。");
    }
    if (pf && pf <= 100) {
      actionHints.push("Severe ARDS：確認 lung protective ventilation、較高 PEEP 策略、prone、深鎮靜/同步性；refractory hypoxemia 時提早討論 ECMO center。");
    }
    if (vtPerPbw > 6.5) {
      actionHints.push("VT 偏高：先用 PBW 重新設定 VT，ARDS 起始常抓 6 mL/kg PBW，必要時 4 mL/kg PBW。");
    }
    if (plateau > 30) {
      actionHints.push("Pplat >30：優先降低 VT、檢查 PEEP 是否過高/過度充氣、改善同步；可接受 permissive hypercapnia，但要看 pH。");
    }
    if (driving > 15) {
      actionHints.push("Driving pressure 偏高：代表每口氣造成的壓力差大；可檢查 VT、PEEP、肺順應性與 recruitability。");
    }
    if (saturation && saturation < 88) {
      actionHints.push("SpO2 <88：先確認 pulse ox、airway/ETT、呼吸器 circuit、PEEP/FiO2；若是真的低氧，按 severe hypoxemia 路徑處理。");
    }
    if (phValue && phValue < 7.25 && co2 > 45) {
      actionHints.push("pH <7.25 且 PaCO2 偏高：這是通氣問題。可先調 RR、檢查死腔/auto-PEEP/同步性；不要為了降 CO2 把 VT 拉太高。");
    }
    if (actionHints.length === 0) {
      actionHints.push("目前設定大致落在保護性通氣範圍；持續追蹤 P/F、Pplat、driving pressure、pH/PaCO2、hemodynamics 與 fluid balance。");
    }

    return {
      ht, wt, pbw, pa, fio2Fraction, saturation, peepValue, vtMl, rrValue, plateau, co2, phValue, pf,
      vtPerPbw, vt4, vt6, vt8, minuteVent, driving, compliance, oxygenationText,
      vtStatus, pplatStatus, drivingStatus, actionHints, atracuriumMcgMin, atracuriumMgHr, atracuriumMlHr,
    };
  }, [height, weight, sex, pao2, fio2, spo2, peep, vt, rr, pplat, pco2, ph, atracuriumDose, atracuriumConc]);

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>ARDS & Ventilator</div>
        <h1 style={S.title}>ARDS / 呼吸器快速工具</h1>
        <div style={S.subtitle}>用 PBW 設定 tidal volume，分開看氧合與通氣，再用 plateau / driving pressure 檢查肺保護。</div>
      </header>

      <section style={S.notice}>
        <div style={S.noticeTitle}>使用提醒</div>
        <div>ARDS 呼吸器設定需要 RT/醫師團隊共同調整。這頁幫你快速抓 PBW、VT、P/F ratio、plateau pressure、driving pressure 與常見 escalation 方向；不取代床邊評估、呼吸器波形與院內 protocol。</div>
      </section>

      <div style={S.tabBar}>
        {([
          ["calculator", "呼吸器計算"],
          ["bundle", "院內套餐速查"],
          ["notes", "讀書筆記"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{ ...S.tabButton, ...(tab === id ? S.tabButtonActive : {}) }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "calculator" && (
        <>
          <section style={S.section}>
            <div style={S.sectionTitle}>病人與目前呼吸器資料</div>
            <div style={S.grid3}>
              <Field label="生理性別" hint="用於 PBW，不是用實際體重算 tidal volume。">
                <select value={sex} onChange={(e) => setSex(e.target.value as Sex)} style={S.select}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </Field>
              <Field label="身高" hint="cm">
                <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="實際體重" hint="kg；NMB 劑量估算用，VT 仍用 PBW。">
                <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="PaO2" hint="mmHg；若只有 SpO2，P/F 會少一個關鍵數字。">
                <input value={pao2} onChange={(e) => setPao2(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="FiO2" hint="可填 60 或 0.6。">
                <input value={fio2} onChange={(e) => setFio2(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="SpO2" hint="目標常抓 88-95%，仍需看 PaO2。">
                <input value={spo2} onChange={(e) => setSpo2(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="PEEP" hint="cmH2O">
                <input value={peep} onChange={(e) => setPeep(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="目前 VT" hint="mL">
                <input value={vt} onChange={(e) => setVt(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="RR" hint="/min">
                <input value={rr} onChange={(e) => setRr(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Plateau pressure" hint="cmH2O；需 inspiratory hold 量測，不是 peak pressure。">
                <input value={pplat} onChange={(e) => setPplat(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="PaCO2" hint="mmHg；用來看通氣/CO2 問題。">
                <input value={pco2} onChange={(e) => setPco2(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="pH">
                <input value={ph} onChange={(e) => setPh(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
            </div>
          </section>

          <div style={S.layoutGrid}>
            <section style={S.section}>
              <div style={S.sectionTitle}>Lung protective ventilation</div>
              <div style={S.resultCard}>
                <ResultRow label="PBW" value={calc.pbw ? `${round(calc.pbw)} kg` : "請輸入身高"} note="ARDS tidal volume 用 predicted body weight，不用實際體重。" highlight />
                <ResultRow label="VT 4 / 6 / 8 mL/kg PBW" value={calc.pbw ? `${round(calc.vt4)} / ${round(calc.vt6)} / ${round(calc.vt8)} mL` : "-"} note="常用起始 6 mL/kg PBW；必要時 4 mL/kg PBW。" />
                <ResultRow label="目前 VT/PBW" value={calc.vtPerPbw ? `${round(calc.vtPerPbw, 2)} mL/kg PBW` : "請輸入 VT"} note={calc.vtStatus} highlight={calc.vtPerPbw > 6.5 || (calc.vtPerPbw > 0 && calc.vtPerPbw < 4)} />
                <ResultRow label="Minute ventilation" value={calc.minuteVent ? `${round(calc.minuteVent, 2)} L/min` : "請輸入 VT/RR"} note="Minute ventilation = VT x RR；主要影響 PaCO2/pH。" />
                <ResultRow label="Plateau pressure" value={calc.plateau ? `${round(calc.plateau)} cmH2O` : "請輸入 Pplat"} note={calc.pplatStatus} highlight={calc.plateau > 30} />
                <ResultRow label="Driving pressure" value={calc.driving ? `${round(calc.driving)} cmH2O` : "需 Pplat 與 PEEP"} note={calc.drivingStatus} highlight={calc.driving > 15} />
                <ResultRow label="Static compliance" value={calc.compliance ? `${round(calc.compliance)} mL/cmH2O` : "需 VT、Pplat、PEEP"} note="Compliance = VT / (Pplat - PEEP)；越低代表肺越硬。" />
              </div>
            </section>

            <section style={S.section}>
              <div style={S.sectionTitle}>氧合與下一步</div>
              <div style={S.resultCard}>
                <ResultRow label="P/F ratio" value={calc.pf ? `${round(calc.pf)}` : "請輸入 PaO2/FiO2"} note="P/F = PaO2 / FiO2 fraction；Berlin 分級需 PEEP/CPAP >=5。" highlight={calc.pf > 0 && calc.pf <= 300} />
                <ResultRow label="ARDS 分級" value={calc.oxygenationText} highlight={calc.pf > 0 && calc.pf <= 200} />
                <ResultRow label="氧合目標" value="常用 SpO2 88-95% 或 PaO2 55-80 mmHg" note="避免一味追求 SpO2 100%，FiO2 過高也有氧毒性風險。" />
              </div>
              <div style={S.actionBox}>
                <div style={S.cardTitle}>選路提示</div>
                <Bullets items={calc.actionHints} />
              </div>
              <div style={S.twoColumnMini}>
                <div style={S.miniCard}>
                  <strong>氧合差</strong>
                  <span>優先想 FiO2、PEEP、prone、recruitability、fluid balance、肺水腫/分泌物、iNO/ECMO bridge。</span>
                </div>
                <div style={S.miniCard}>
                  <strong>CO2 / pH 差</strong>
                  <span>優先想 minute ventilation、RR、dead space、auto-PEEP、呼吸器同步；不要直接把 VT 拉很大。</span>
                </div>
              </div>
            </section>
          </div>

          <section style={S.section}>
            <div style={S.sectionTitle}>NMBA / Atracurium 估算</div>
            <div style={S.grid3}>
              <Field label="Atracurium 劑量" hint="mcg/kg/min；ICU continuous infusion 常見約 11-13 mcg/kg/min，依同步性與 TOF/PNS 調整。">
                <input value={atracuriumDose} onChange={(e) => setAtracuriumDose(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Genso 濃度" hint="院內 Atracurium（Genso）25 mg/2.5 mL/Amp = 10 mg/mL。">
                <input value={atracuriumConc} onChange={(e) => setAtracuriumConc(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
            </div>
            <div style={S.resultCard}>
              <ResultRow label="重量基礎估算" value={calc.wt ? `${round(calc.atracuriumMgHr, 2)} mg/hr` : "請輸入實際體重"} note={`${atracuriumDose || "0"} mcg/kg/min x ${calc.wt || 0} kg。若院內以 fixed mL/hr pure run，請以實際濃度換算。`} highlight />
              <ResultRow label="Pump rate" value={calc.atracuriumMlHr ? `${round(calc.atracuriumMlHr, 2)} mL/hr` : "填入濃度後換算"} note="以 Genso 10 mg/mL pure run 估算。Cisatracurium/Nimbex 目前限麻醉科開立，舊套餐文字需確認現行品項。" />
              <div style={S.warning}>使用 neuromuscular blocker 前，必須先有足夠鎮痛鎮靜；paralytic 會讓病人不能表現痛苦，但不會止痛或鎮靜。</div>
            </div>
          </section>
        </>
      )}

      {tab === "bundle" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>院內 ARDS order concept</div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>區塊</th>
                  <th style={S.th}>常見醫囑/內容</th>
                  <th style={S.th}>重點</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={S.tdStrong}>追蹤</td><td style={S.td}>F/U CXR QD；ABG 依病況 Q4H 或 Q8H。</td><td style={S.td}>看 P/F trend、PaCO2/pH、肺水腫/肺塌陷/氣胸、tube position。</td></tr>
                <tr><td style={S.tdStrong}>氧合目標</td><td style={S.td}>ETT with MV support，adjust by RT，keep SpO2 &gt;88%。</td><td style={S.td}>ARDS 常接受較低氧合目標，避免 FiO2/壓力拉太高。</td></tr>
                <tr><td style={S.tdStrong}>呼吸器照護</td><td style={S.td}>Mouth care；cuff pressure keep 20-30 cmH2O；chest care and suction。</td><td style={S.td}>預防 VAP、避免 cuff leak/氣管損傷、確保 airway clearance。</td></tr>
                <tr><td style={S.tdStrong}>Recruitment</td><td style={S.td}>Lung recruitment；前後 ABG；Atracurium/Genso 或 NMBA before recruitment。</td><td style={S.td}>現在不建議 prolonged recruitment maneuver 常規使用；若做，需挑病人並嚴密看血壓/氣壓傷。舊套餐若寫 Nimbex，請改以院內可開立品項確認。</td></tr>
                <tr><td style={S.tdStrong}>Lung protect</td><td style={S.td}>Lung protect strategy，adjust by RT。</td><td style={S.td}>VT 4-6 mL/kg PBW、Pplat {"<="}30、driving pressure 盡量 {"<="}15。</td></tr>
                <tr><td style={S.tdStrong}>Prone</td><td style={S.td}>Prone position since 日期/時間。</td><td style={S.td}>P/F {"<="}150 且 FiO2/PEEP 已不低時，早期 prolonged prone 最重要。</td></tr>
                <tr><td style={S.tdStrong}>iNO</td><td style={S.td}>iNO ___ ppm；使用期間用密閉式抽痰。</td><td style={S.td}>Rescue/bridge，改善氧合但非死亡率治療；監測 methemoglobin、NO2、腎功能與能否降階。</td></tr>
                <tr><td style={S.tdStrong}>鎮痛鎮靜/NMBA</td><td style={S.td}>Propofol 或 Midatin 擇一；Atracurium/Genso pure run as titration；Fentanyl 1 mg + NS 30 mL total 50 mL run 0-5 mL/hr。</td><td style={S.td}>先止痛鎮靜，再 NMBA；每日重評是否可減量、解除 paralysis、SAT/SBT。</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "notes" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>ARDS 讀書筆記</div>
          <NoteCard title="1. ARDS 是什麼？定義要符合幾項？" open>
            <p style={S.paragraph}>ARDS 是急性發炎造成肺泡滲漏、肺水腫與可通氣肺容積變小。重點不是肺裡都是水而已，而是「baby lung」變小：能安全通氣的肺很少，所以每一口氣都要小心。</p>
            <Bullets items={[
              "Berlin definition 不是四選一，而是四大條件都要符合：急性時間、雙側肺部影像、肺水腫不是完全由心衰/容量負荷解釋、氧合變差。",
              "急性時間：已知臨床 insult 後 1 週內，新發或惡化呼吸症狀。",
              "影像：CXR 或 CT 有 bilateral opacities，且不能完全用積液、肺葉/肺塌陷或結節解釋。",
              "原因：呼吸衰竭不能完全用 cardiac failure 或 fluid overload 解釋；若不清楚，通常需要 echo 或臨床評估排除 hydrostatic edema。",
              "氧合：Berlin 使用 P/F <=300，且 PEEP/CPAP >=5 cmH2O。",
              "P/F 201-300 mild，101-200 moderate，<=100 severe。",
              "2024 New Global Definition 有更新：保留核心概念，但納入 HFNO、SpO2/FiO2 與 lung ultrasound，較適合資源有限或未插管病人；臨床與研究仍常同時看到 Berlin 分級。",
            ]} />
          </NoteCard>

          <NoteCard title="2. CPAP、PEEP、HFNO、NIV 在做什麼？">
            <Bullets items={[
              "PEEP：positive end-expiratory pressure。吐氣末仍保留一點壓力，像把肺泡撐住，避免每次吐氣都塌掉、下次又硬撐開。",
              "CPAP：continuous positive airway pressure。整個呼吸週期都給一個固定正壓，病人自己吸吐，機器不主動給每一口 VT；可想成非插管時的一種 PEEP 概念。",
              "NIV：non-invasive ventilation。用面罩給壓力支持，通常包含 inspiratory pressure support + expiratory PEEP，會幫病人多推一點氣。",
              "HFNO：high-flow nasal oxygen。高流量鼻導管可提供穩定 FiO2、沖掉 nasopharyngeal dead space，也會有少量 PEEP-like effect，但不是完整呼吸器。",
              "ARDS 如果 oxygenation 很差，CPAP/HFNO/NIV 可用在部分未插管病人；但若 work of breathing 很大、氧合惡化或休克，延遲插管反而可能危險。",
            ]} />
          </NoteCard>

          <NoteCard title="3. 呼吸器畫面上常看到的基本數字">
            <p style={S.paragraph}>可以先把呼吸器想成在回答三個問題：每一口多大、每分鐘幾口、用多少氧氣和壓力把肺泡撐住。先抓這幾個字，後面看設定會比較不痛苦。</p>
            <Bullets items={[
              "VT（tidal volume）：每一口氣的體積，單位 mL。例：VT 350 mL = 每次吸氣約打 350 mL 進去。",
              "RR（respiratory rate）：每分鐘幾口氣。例：RR 24 = 一分鐘 24 口。",
              "Minute ventilation：每分鐘總通氣量，約等於 VT x RR。例：VT 350 mL x RR 24 = 8.4 L/min，主要影響 PaCO2 和 pH。",
              "FiO2：吸入氧氣濃度。空氣是 21%，呼吸器可給 40%、60%、100%。FiO2 越高，通常 PaO2/SpO2 會上升，但太高太久有氧毒性風險。",
              "PEEP：吐氣末正壓，主要是撐住肺泡、改善氧合。PEEP 太低肺泡會反覆塌陷，太高可能過度充氣、血壓下降。",
              "Pplat（plateau pressure）：暫停吸氣測到的肺泡壓力，比 peak pressure 更能代表肺承受的壓力。",
            ]} />
          </NoteCard>

          <NoteCard title="4. VT 是什麼？為什麼 ARDS 特別重要？">
            <p style={S.paragraph}>VT = tidal volume，就是呼吸器每打一口氣進肺裡的體積。對沒有 ARDS 的病人，一口氣大一點未必立刻出事；但 ARDS 的「可用肺」變小，同樣 500 mL 可能像把氣硬塞進很小的肺，容易造成 volutrauma/barotrauma。</p>
            <Bullets items={[
              "VT 太大：肺泡被撐太開，可能增加 ventilator-induced lung injury，所以 ARDS 會用 low tidal volume。",
              "VT 太小：PaCO2 可能上升、pH 下降，也可能比較容易 dyssynchrony；所以不是越小越好，要看 pH、PaCO2、RR 與病人同步性。",
              "調 CO2 時，先想 minute ventilation = VT x RR。ARDS 通常優先調 RR，而不是直接把 VT 拉大。",
              "VT 應用 PBW 算，不是用實際體重。因為肺大小跟身高比較相關，跟胖瘦沒有等比例增加。",
              "ARDS 常用起始 VT 6 mL/kg PBW；若 Pplat 或 driving pressure 太高，可降到 4 mL/kg PBW；若通氣不足且壓力安全，有時可到 7-8 mL/kg PBW。",
            ]} />
          </NoteCard>

          <NoteCard title="5. 為什麼 tidal volume 要用 PBW？">
            <p style={S.paragraph}>PBW = predicted body weight，可以理解成「用身高推估肺大小」。ARDS 可用的肺容量跟身高比較相關，跟實際體重不一定相關。肥胖病人肺不會因為體重變重就變大，所以 VT 用實際體重會很容易過量。</p>
            <div style={S.formulaBox}>
              <div style={S.formulaLine}><span>Male PBW</span><strong>50 + 0.91 x (height cm - 152.4)</strong></div>
              <div style={S.formulaLine}><span>Female PBW</span><strong>45.5 + 0.91 x (height cm - 152.4)</strong></div>
              <div style={S.formulaLine}><span>ARDS VT</span><strong>4-6 mL/kg PBW，常用 6 起始</strong></div>
            </div>
            <p style={S.paragraph}>例：女性 160 cm，PBW 約 52 kg，6 mL/kg 的 VT 約 312 mL。這就是為什麼 ARDS 的 VT 看起來常常比直覺小很多。</p>
          </NoteCard>

          <NoteCard title="6. Peak、Plateau、PEEP、Driving pressure">
            <Bullets items={[
              "Peak pressure：氣體推進去時看到的最高壓，受 airway resistance 影響很大，例如痰、bronchospasm、tube kink。",
              "Plateau pressure：吸氣暫停時的壓力，比較接近肺泡承受的壓力；ARDS 常希望 <=30 cmH2O。",
              "PEEP：吐氣末仍保留的壓力，用來防止肺泡塌陷，但太高也會過度充氣、降 venous return。",
              "Driving pressure = Plateau - PEEP；代表每口氣造成的壓力差，常希望盡量 <=15 cmH2O。",
              "Compliance = VT / driving pressure；越低代表肺越硬，通常越難打。",
            ]} />
          </NoteCard>

          <NoteCard title="7. 氧合差和 CO2 高是兩條不同路">
            <div style={S.twoColumnMini}>
              <div style={S.miniCard}>
                <strong>氧合差</strong>
                <span>看 PaO2/FiO2、SpO2、PEEP、FiO2、肺塌陷、分泌物、肺水腫、prone、iNO/ECMO。</span>
              </div>
              <div style={S.miniCard}>
                <strong>CO2 高 / pH 低</strong>
                <span>看 minute ventilation、RR、dead space、auto-PEEP、同步性、鎮靜、代謝性酸中毒。</span>
              </div>
            </div>
            <p style={S.paragraph}>很常見的陷阱是：看到 CO2 高就想把 VT 拉高。但 ARDS 的肺很小，VT 拉高可能換來 barotrauma/volutrauma。通常會先調 RR、處理死腔與同步性，必要時接受 permissive hypercapnia。</p>
          </NoteCard>

          <NoteCard title="8. Prone、PEEP、Recruitment、iNO 怎麼排？">
            <Bullets items={[
              "Prone：moderate-severe ARDS，特別 P/F <=150 時最值得早期做；重點是長時間 prone session，不是翻一下就好。",
              "Higher PEEP：moderate-severe ARDS 可考慮，但不是越高越好；要看 recruitability、血壓、overdistension、driving pressure。",
              "Recruitment maneuver：短暫、慎選病人可討論；prolonged recruitment maneuver 不建議常規使用。",
              "iNO：可短暫改善氧合，通常當 rescue/bridge，例如等 prone、轉院 ECMO 或其他處置，不是固定長期治療。",
              "ECMO：refractory severe ARDS、P/F 很低且已最佳化 lung protective/prone/NMBA 時，早點討論轉 ECMO center。",
            ]} />
          </NoteCard>

          <NoteCard title="9. NMBA 在 ARDS 扮演什麼角色？">
            <Bullets items={[
              "NMBA 不是為了鎮靜或止痛，而是短期改善 ventilator synchrony、降低 oxygen consumption、讓 lung protective ventilation/prone/recruitment 比較能執行。",
              "使用前一定要先有足夠 analgesia + sedation，否則病人會清醒但不能動，非常不舒服也不安全。",
              "目前指引多偏向 early severe ARDS、明顯 ventilator dyssynchrony、需要 prone 或 refractory hypoxemia 時短期使用，不建議所有 ARDS routine 長時間 paralysis。",
              "院內現用品項：Atracurium（Genso）25 mg/2.5 mL/Amp，10 mg/mL；Cisatracurium/Nimbex 限麻醉科，舊套餐文字需跟現行藥品政策對齊。",
            ]} />
          </NoteCard>

          <NoteCard title="10. 參考來源">
            <Bullets items={[
              "ESICM 2023 ARDS guideline：definition、HFNO/NIV、tidal volume、PEEP/recruitment、prone、NMBA、ECLS。",
              "New Global Definition of ARDS 2024：加入 HFNO、SpO2/FiO2 與 lung ultrasound 等情境，補足 Berlin definition 在非插管與資源有限環境的限制。",
              "ATS 2017 mechanical ventilation guideline：low VT 4-8 mL/kg PBW、plateau pressure <30、severe ARDS prone >12 hr/day。",
              "ATS 2023 update：ARDS corticosteroids、VV-ECMO、early severe ARDS NMBA、higher PEEP without lung recruitment maneuvers、反對 prolonged recruitment maneuver。",
              "院內 ARDS order 套餐：CXR/ABG、ETT/MV、cuff pressure、recruitment、prone、iNO、propofol/midazolam、Atracurium/Genso、fentanyl。",
            ]} />
          </NoteCard>
        </section>
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 24px" },
  kicker: { fontSize: 12, fontWeight: 900, color: ACCENT, textTransform: "uppercase", letterSpacing: 0, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: 0, margin: 0 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4, lineHeight: 1.5 },
  notice: { background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E3A8A", borderRadius: 12, padding: 14, marginBottom: 16, lineHeight: 1.55, fontSize: 13 },
  noticeTitle: { color: "#1E40AF", fontWeight: 900, marginBottom: 4, fontSize: 14 },
  tabBar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, background: "#E2E8F0", padding: 4, borderRadius: 12, marginBottom: 16 },
  tabButton: { border: "none", borderRadius: 9, background: "transparent", color: "#475569", padding: "10px 6px", fontSize: 13, fontWeight: 900, cursor: "pointer" },
  tabButtonActive: { background: "#FFFFFF", color: ACCENT, boxShadow: "0 1px 3px rgba(15,23,42,0.12)" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0, marginBottom: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  layoutGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 },
  twoColumnMini: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 },
  miniCard: { display: "flex", flexDirection: "column", gap: 6, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, color: "#475569", fontSize: 13, lineHeight: 1.55 },
  label: { display: "block", fontSize: 13, fontWeight: 800, color: "#475569", marginBottom: 6 },
  fieldHint: { color: "#64748B", fontSize: 12, lineHeight: 1.5, marginTop: 6 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", boxSizing: "border-box" },
  resultCard: { marginTop: 14, border: "1px solid #DDE5F0", borderRadius: 10, padding: 14, background: "#FAFCFF" },
  actionBox: { marginTop: 14, border: "1px solid #CCFBF1", borderRadius: 10, padding: 14, background: "#F0FDFA" },
  cardTitle: { fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 10 },
  resultRow: { display: "grid", gridTemplateColumns: "minmax(110px, 0.65fr) minmax(0, 1.35fr)", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(148,163,184,0.25)", alignItems: "start" },
  resultRowHighlight: { background: "#F0FDFA", marginLeft: -8, marginRight: -8, paddingLeft: 8, paddingRight: 8, borderRadius: 6, borderBottom: "none" },
  resultLabel: { color: "#64748B", fontSize: 13, fontWeight: 800 },
  resultNote: { color: "#94A3B8", fontSize: 12, lineHeight: 1.45, marginTop: 3 },
  resultValue: { color: "#0F172A", fontSize: 14, lineHeight: 1.55, wordBreak: "break-word", fontWeight: 800 },
  warning: { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.55, marginTop: 10 },
  tableWrap: { overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { textAlign: "left", padding: "10px 12px", background: "#F8FAFC", color: "#475569", fontSize: 12, fontWeight: 800, borderBottom: "1px solid #E2E8F0", verticalAlign: "top" },
  td: { padding: "10px 12px", borderBottom: "1px solid #EEF2F7", color: "#334155", fontSize: 13, lineHeight: 1.55, verticalAlign: "top" },
  tdStrong: { padding: "10px 12px", borderBottom: "1px solid #EEF2F7", color: "#0F172A", fontSize: 13, lineHeight: 1.55, verticalAlign: "top", fontWeight: 800 },
  noteCard: { border: "1px solid #DDE5F0", borderRadius: 10, background: "#FAFCFF", padding: "0 12px", marginBottom: 10 },
  noteSummary: { cursor: "pointer", color: "#0F172A", fontSize: 15, fontWeight: 900, padding: "12px 0", listStylePosition: "inside" },
  noteBody: { color: "#334155", fontSize: 13, lineHeight: 1.65, padding: "0 0 12px" },
  paragraph: { margin: "0 0 10px", color: "#334155", fontSize: 13, lineHeight: 1.65 },
  formulaBox: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, margin: "10px 0", color: "#334155", fontSize: 13, lineHeight: 1.55 },
  formulaLine: { display: "grid", gridTemplateColumns: "110px minmax(0, 1fr)", gap: 10, padding: "8px 0", borderTop: "1px solid #E2E8F0", alignItems: "center" },
  bulletList: { margin: "0 0 0 18px", padding: 0, color: "#334155", fontSize: 13, lineHeight: 1.65 },
  bulletItem: { marginBottom: 4 },
};
