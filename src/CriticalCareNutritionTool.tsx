import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Tab = "calculator" | "refeeding" | "notes";
type Phase = "early" | "progressive" | "recovery";
type WeightBasis = "actual" | "adjusted" | "ideal";
type Perfusion = "unknown" | "stable" | "borderline" | "unstable";
const ACCENT = "#0D9488";

const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
const num = (v: string) => Number.parseFloat(v) || 0;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { return <label style={S.field}><span style={S.label}>{label}</span>{children}{hint && <span style={S.hint}>{hint}</span>}</label>; }
function NoteCard({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) { return <details open={open} style={S.noteCard}><summary style={S.noteSummary}>{title}</summary><div style={S.noteBody}>{children}</div></details>; }
function Table({ columns, rows }: { columns: string[]; rows: string[][] }) { return <div style={S.tableWrap}><table style={S.table}><thead><tr>{columns.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j} style={j===0?S.tdStrong:S.td}>{v}</td>)}</tr>)}</tbody></table></div>; }
function Metric({ label, value, sub }: { label: string; value: string; sub: string }) { return <div style={S.metric}><div style={S.metricLabel}>{label}</div><div style={S.metricValue}>{value}</div><div style={S.metricSub}>{sub}</div></div>; }

export default function CriticalCareNutritionTool() {
  const [tab, setTab] = useState<Tab>("calculator");
  const [weight, setWeight] = useState("60");
  const [height, setHeight] = useState("165");
  const [sex, setSex] = useState<"F"|"M">("F");
  const [phase, setPhase] = useState<Phase>("early");
  const [weightBasis, setWeightBasis] = useState<WeightBasis>("actual");
  const [formulaDensity, setFormulaDensity] = useState("1.2");
  const [feedingHours, setFeedingHours] = useState("24");
  const [propofolRate, setPropofolRate] = useState("0");
  const [refeedingChecks, setRefeedingChecks] = useState<Record<string, boolean>>({});
  const [perfusion, setPerfusion] = useState<Perfusion>("unknown");
  const [feedingBarriers, setFeedingBarriers] = useState<Record<string, boolean>>({});

  const calc = useMemo(() => {
    const w = num(weight); const h = num(height); const inchesOver5ft = Math.max(0, h / 2.54 - 60);
    const ibw = sex === "M" ? 50 + 2.3 * inchesOver5ft : 45.5 + 2.3 * inchesOver5ft;
    const bmi = w && h ? w / ((h / 100) ** 2) : 0;
    const adj = ibw + 0.4 * (w - ibw);
    const basis = weightBasis === "ideal" ? ibw : weightBasis === "adjusted" ? adj : w;
    const phaseTarget = phase === "early" ? [15, 20] : phase === "progressive" ? [20, 25] : [25, 30];
    const energyLow = round(basis * phaseTarget[0]); const energyHigh = round(basis * phaseTarget[1]);
    const proteinLow = round(basis * 1.2, 1); const proteinHigh = round(basis * 1.3, 1);
    const propofol = round(num(propofolRate) * 24 * 1.1);
    const nonPropofolLow = Math.max(0, energyLow - propofol); const nonPropofolHigh = Math.max(0, energyHigh - propofol);
    const density = num(formulaDensity); const hours = num(feedingHours) || 24;
    const volumeLow = density ? round(nonPropofolLow / density) : 0; const volumeHigh = density ? round(nonPropofolHigh / density) : 0;
    const rateLow = round(volumeLow / hours, 1); const rateHigh = round(volumeHigh / hours, 1);
    const riskCount = Object.values(refeedingChecks).filter(Boolean).length;
    return { ibw: round(ibw,1), adj: round(adj,1), bmi: round(bmi,1), basis: round(basis,1), energyLow, energyHigh, proteinLow, proteinHigh, propofol, nonPropofolLow, nonPropofolHigh, volumeLow, volumeHigh, rateLow, rateHigh, riskCount };
  }, [weight,height,sex,phase,weightBasis,formulaDensity,feedingHours,propofolRate,refeedingChecks]);

  const toggleRisk = (key: string) => setRefeedingChecks(v => ({ ...v, [key]: !v[key] }));
  const toggleBarrier = (key: string) => setFeedingBarriers(v => ({ ...v, [key]: !v[key] }));
  const hasBarrier = Object.values(feedingBarriers).some(Boolean);
  const feedingStatus = perfusion === "unknown" ? "unknown" : hasBarrier || perfusion === "unstable" ? "hold" : perfusion === "borderline" ? "trophic" : "start";

  return <div>
    <header style={S.header}><div style={S.kicker}>ICU nutrition</div><h1 style={S.title}>重症營養工具</h1><p style={S.subtitle}>熱量與蛋白估算、EN 處方草稿、再餵食風險與完整讀書筆記</p></header>
    <section style={S.notice}><strong>先看病人能不能餵，再算多少。</strong>休克未控制、升壓劑快速增加、腸缺血或腹腔 compartment syndrome 時，不應硬推 full feeding。穩定後優先 EN，早期逐步增加。</section>
    <div style={S.tabs}>{([['calculator','計算 / 處方'],['refeeding','再餵食風險'],['notes','讀書筆記']] as const).map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{...S.tab,...(tab===id?S.tabActive:{})}}>{label}</button>)}</div>

    {tab === "calculator" && <>
      <section style={S.section}>
        <div style={S.sectionTitle}>第 1 步：現在能不能開始 EN？</div>
        <div style={S.label}>血流動力學與組織灌流趨勢</div>
        <div style={S.choiceGrid}>{([
          ["stable","穩定或改善","復甦大致完成；升壓劑穩定/下降；lactate、尿量與末梢灌流未惡化"],
          ["borderline","邊緣但未惡化","仍需穩定劑量升壓劑，或有較高 intolerance 風險；可考慮低量試餵"],
          ["unstable","不穩定或惡化","shock 未控制、升壓劑快速增加，或 lactate/酸中毒/末梢灌流惡化"],
        ] as const).map(([id,title,desc])=><button type="button" key={id} onClick={()=>setPerfusion(id)} style={{...S.choice,...(perfusion===id?S.choiceActive:{})}}><strong>{title}</strong><span>{desc}</span></button>)}</div>
        <div style={{...S.label,marginTop:14}}>目前是否有下列任一情況？</div>
        <div style={S.barrierGrid}>{[
          ["ischemia","明確或高度懷疑 bowel ischemia"],
          ["obstruction","Bowel obstruction / ileus 合併明顯 distension"],
          ["acs","Abdominal compartment syndrome"],
          ["bleeding","Active upper GI bleeding 尚未控制"],
          ["respiratory","危及生命且未控制的 hypoxemia、hypercapnia 或 acidosis"],
          ["fistula","High-output fistula 且無法建立 distal feeding access"],
          ["grv","GRV >500 mL/6 hr"],
        ].map(([key,label])=><label key={key} style={{...S.check,...(feedingBarriers[key]?S.checkActive:{})}}><input type="checkbox" checked={!!feedingBarriers[key]} onChange={()=>toggleBarrier(key)}/>{label}</label>)}</div>
        <div style={{...S.feedingDecision,...(feedingStatus === "hold" ? S.decisionHold : feedingStatus === "trophic" ? S.decisionTrophic : feedingStatus === "start" ? S.decisionStart : S.decisionUnknown)}}>
          <strong>{feedingStatus === "hold" ? "先暫緩 EN" : feedingStatus === "trophic" ? "可考慮低量試餵" : feedingStatus === "start" ? "可以開始 EN" : "請先選擇灌流狀態"}</strong>
          <span>{feedingStatus === "hold" ? "先處理病因並重新評估。下方仍可計算未來營養目標，但不可直接把結果當成目前灌食速度。" : feedingStatus === "trophic" ? "可依院內流程考慮 continuous trophic EN 10-20 mL/hr，暫不追 full target；密切追蹤灌流與腹部耐受。" : feedingStatus === "start" ? "可進入下方計算；通常由低速 continuous EN 起始，再依耐受、病程與再餵食風險推進。" : "完成這一步後，工具才會告訴你下方數字是起始處方、低量試餵，還是僅供後續規劃。"}</span>
        </div>
      </section>
      <section style={S.section}><div style={S.sectionTitle}>病人與病程</div><div style={S.grid3}>
        <Field label="實際體重" hint="kg"><input value={weight} onChange={e=>setWeight(e.target.value)} inputMode="decimal" style={S.input}/></Field>
        <Field label="身高" hint="cm"><input value={height} onChange={e=>setHeight(e.target.value)} inputMode="decimal" style={S.input}/></Field>
        <Field label="生理性別（IBW 公式）"><select value={sex} onChange={e=>setSex(e.target.value as "F"|"M")} style={S.input}><option value="F">Female</option><option value="M">Male</option></select></Field>
        <Field label="病程階段"><select value={phase} onChange={e=>setPhase(e.target.value as Phase)} style={S.input}><option value="early">急性早期 day 1-2</option><option value="progressive">逐步推進 day 3-7</option><option value="recovery">穩定 / 恢復期</option></select></Field>
        <Field label="計算體重"><select value={weightBasis} onChange={e=>setWeightBasis(e.target.value as WeightBasis)} style={S.input}><option value="actual">Actual body weight</option><option value="adjusted">Adjusted body weight</option><option value="ideal">Ideal body weight</option></select></Field>
        <div style={S.smallInfo}>BMI {calc.bmi} kg/m²<br/>IBW {calc.ibw} kg · AdjBW {calc.adj} kg<br/><strong>目前採 {calc.basis} kg 計算</strong></div>
      </div></section>
      <section style={S.metricGrid}><Metric label="熱量區間" value={`${calc.energyLow}-${calc.energyHigh} kcal/day`} sub={phase === "early" ? "粗估 15-20 kcal/kg；避免早期 overfeeding" : phase === "progressive" ? "粗估 20-25 kcal/kg，依耐受逐步接近目標" : "粗估 25-30 kcal/kg，仍以 indirect calorimetry 優先"}/><Metric label="蛋白目標" value={`${calc.proteinLow}-${calc.proteinHigh} g/day`} sub="一般 ICU 粗估 1.2-1.3 g/kg/day，逐步達標"/><Metric label="Propofol 熱量" value={`${calc.propofol} kcal/day`} sub={`${num(propofolRate)} mL/hr × 24 × 1.1 kcal/mL`}/></section>
      {weightBasis !== "actual" && calc.bmi < 30 && <div style={S.caution}><strong>目前 BMI {calc.bmi}，通常不需要自行改用 IBW/AdjBW。</strong>一般非肥胖 ICU 成人的 kcal/kg 與 protein/kg 多以 actual body weight 粗估；特殊體型與水腫請由營養師個別決定計算體重。</div>}
      <section style={S.section}><div style={S.sectionTitle}>{feedingStatus === "hold" ? "Enteral nutrition 未來目標（目前先暫緩）" : feedingStatus === "trophic" ? "Enteral nutrition 目標（目前先低量試餵）" : "Enteral nutrition 處方草稿"}</div><div style={S.grid3}>
        <Field label="配方熱量密度" hint="kcal/mL"><input value={formulaDensity} onChange={e=>setFormulaDensity(e.target.value)} inputMode="decimal" style={S.input}/></Field>
        <Field label="每日實際灌食時數" hint="hr/day；預留停餵時間"><input value={feedingHours} onChange={e=>setFeedingHours(e.target.value)} inputMode="decimal" style={S.input}/></Field>
        <Field label="Propofol infusion" hint="mL/hr；沒有填 0"><input value={propofolRate} onChange={e=>setPropofolRate(e.target.value)} inputMode="decimal" style={S.input}/></Field>
      </div>
      <div style={S.prescription}><div><span style={S.prescriptionLabel}>扣除 propofol 後，配方需提供</span><strong>{calc.nonPropofolLow}-{calc.nonPropofolHigh} kcal/day</strong></div><div><span style={S.prescriptionLabel}>每日配方量</span><strong>{calc.volumeLow}-{calc.volumeHigh} mL/day</strong></div><div><span style={S.prescriptionLabel}>若連續灌 {num(feedingHours)||24} 小時</span><strong>{calc.rateLow}-{calc.rateHigh} mL/hr</strong></div></div>
      <div style={S.caution}><strong>{feedingStatus === "hold" ? "目前先不要依這個 rate 開始 EN。" : feedingStatus === "trophic" ? "目前建議只把完整 rate 當作後續目標。" : "不是直接從完整目標 rate 開始。"}</strong>{feedingStatus === "hold" ? "待 shock、灌流或腸道禁忌改善後重新評估；必要時依病程與營養風險評估 PN。" : "可依院內 protocol 以 10-20 mL/hr trophic EN 起始，每 4-12 小時增加 10-25 mL/hr；再餵食高風險需更慢，並先補 thiamine / 電解質。"}</div></section>
      <section style={S.section}><div style={S.sectionTitle}>結果怎麼使用</div><Table columns={["問題","bedside 做法"]} rows={[["有 indirect calorimetry（代謝車實測）？","它利用氧氣消耗量與二氧化碳產生量，測出目前 energy expenditure；優先用實測值。急性早期先給約 70%，day 3 後逐步接近 80-100%，避免 overfeeding。"],["沒有 IC？","用 kcal/kg 只是起始粗估；看病程、營養前史、肥胖、活動、體溫與治療反應調整。"],["蛋白怎麼給？","與非蛋白熱量分開思考；逐步推向約 1.3 g/kg/day。CRRT、大傷口、燒傷可能需求更高，需營養師個別化。"],["胃殘餘量？","不建議因單一低度 GRV 自動停餵；若持續嘔吐、腹脹、疼痛、灌食不耐或 GRV >500 mL/6 h，重評促動劑、幽門後餵食與腹部病因。"]]} /></section>
    </>}

    {tab === "refeeding" && <>
      <section style={S.section}><div style={S.sectionTitle}>快速風險盤點</div><p style={S.body}>下列不是完整 ASPEN 分級，但可用來提醒你停下來做正式評估。勾選越多，越不適合直接 full feeding。</p><div style={S.checkGrid}>{[
        ["littleIntake","幾乎沒吃 >5-7 天，或長期攝取明顯不足"],["weightLoss","近期顯著非預期體重下降 / 明顯 muscle or fat loss"],["lowElectrolytes","開始前 K、Mg 或 phosphate 低，或需大量補充"],["alcohol","Alcohol use disorder"],["malabsorption","Malabsorption、prolonged vomiting/diarrhea、short bowel、bariatric surgery"],["highRiskDisease","癌症、重度感染、神經性厭食、長期利尿劑/制酸劑、化療等高風險情境"],
      ].map(([key,label])=><label key={key} style={S.check}><input type="checkbox" checked={!!refeedingChecks[key]} onChange={()=>toggleRisk(key)}/>{label}</label>)}</div></section>
      <section style={{...S.resultBox, ...(calc.riskCount>=2?S.resultHigh:S.resultLow)}}><div style={S.resultCount}>{calc.riskCount}</div><div><strong>{calc.riskCount>=2?"有多項風險訊號：先按再餵食高風險處理":"仍需看完整病史、營養檢查與電解質"}</strong><div style={S.body}>風險不是靠單一 phosphate 判斷；正常的 baseline 值也不能排除餵食後快速下降。</div></div></section>
      <section style={S.sequence}><div style={S.sectionTitle}>高風險起始路徑</div>{[
        ["餵食前","抽 K/Mg/P/glucose；缺乏先補。Thiamine 100 mg 在 dextrose/feeding 前給，之後 100 mg/day 5-7 天或更久（嚴重缺乏依院內 protocol 使用更高劑量）。"],
        ["Day 1","ASPEN：10-20 kcal/kg（或 100-150 g dextrose）/ first 24 h；極高風險可更保守並由營養團隊個別化。所有 IV dextrose 也要算。"],
        ["推進","每 1-2 天增加約目標的 33%；若電解質難以矯正或快速下降，減少 calories/dextrose 約 50%，暫緩推進。"],
        ["監測","高風險前 3 天 K/Mg/P 可 q12h；另看 glucose、fluid balance、體重、edema、HR、呼吸與神經症狀。"],
      ].map(([t,b],i)=><div key={t} style={S.step}><span style={S.stepNo}>{i+1}</span><div><div style={S.stepTitle}>{t}</div><div style={S.body}>{b}</div></div></div>)}</section>
      <NoteCard title="什麼才算 refeeding syndrome？" open><p style={S.body}>ASPEN 定義是在重新引入 calories 後 5 天內，P、K、Mg 任一下降：10-20% 為 mild、20-30% 為 moderate、&gt;30% 或伴器官功能障礙 / thiamine deficiency 為 severe。它不只是低磷；水鈉滯留、心衰、呼吸衰竭、arrhythmia、delirium 都可能出現。</p></NoteCard>
    </>}

    {tab === "notes" && <>
      <NoteCard title="營養處置的思考順序" open><div style={S.flow}>{[
        ["血流動力學穩定嗎？","先看 shock、升壓劑與組織灌流趨勢。"],
        ["腸道現在能使用嗎？","排除腸缺血、阻塞、腹腔 compartment syndrome 等暫緩 EN 的情況。"],
        ["有再餵食風險嗎？","決定起始 calories、thiamine 與 K/Mg/P 監測強度。"],
        ["病程在哪個階段？","急性早期先避免 overfeeding，穩定後再逐步接近目標。"],
        ["計算營養目標","整合 energy、protein 與 propofol、dextrose 等 non-nutrition calories。"],
        ["開始、推進、每天重評","比較處方量與實際收到量，依耐受、灌流與病程調整。"],
      ].map(([title,desc],i)=><div key={title} style={S.flowRow}><div style={S.flowRail}><span style={S.flowNo}>{i+1}</span>{i<5&&<span style={S.flowLine}/>}</div><div style={S.flowContent}><strong>{title}</strong><span>{desc}</span></div></div>)}</div></NoteCard>
      <NoteCard title="怎麼判斷病人能不能餵？" open>
        <p style={S.body}><strong>這裡的「餵」主要指 enteral nutrition（EN）。</strong>不要只問「有沒有用升壓劑」或「有沒有腸音」，而要依序確認：灌流是否穩定、腸道有沒有結構性或缺血性危險、開始後是否耐受。</p>
        <Table columns={["判斷","bedside 線索","怎麼做"]} rows={[
          ["可以開始 EN","復甦完成或正在改善；MAP/升壓劑大致穩定或下降；lactate、尿量、末梢灌流沒有持續惡化；無腸缺血、阻塞或腹腔 compartment syndrome。","優先由胃開始 continuous EN；一般可先 10-20 mL/hr，再依耐受、病程與再餵食風險逐步增加。"],
          ["先低量試餵並密切看","仍使用穩定劑量 vasopressor、治療性低溫、intra-abdominal hypertension 但尚未達 compartment syndrome，或其他較高 intolerance 風險。","使用 trophic/low-dose EN，不急著餵滿；同時追灌流、腹部症狀、胃殘餘與升壓劑趨勢。"],
          ["先暫緩 EN","未控制 shock、升壓劑快速增加或組織低灌流持續；明確/高度懷疑 bowel ischemia；bowel obstruction；abdominal compartment syndrome；active upper GI bleeding 尚未控制；危及生命且未控制的 hypoxemia、hypercapnia 或 acidosis；high-output fistula 且無法在遠端建立餵食通路；GRV >500 mL/6 hr。","先處理病因與復甦。狀況控制後重新評估，不是永久禁食；若 EN 確實不可行，再依營養風險與病程評估 PN。"],
        ]}/>
        <div style={S.caution}><strong>沒有公認的單一 vasopressor 劑量切點。</strong>比起某一個 norepinephrine 數字，更重要的是需求正在上升、持平或下降，以及 lactate、末梢灌流、腹壓與器官功能的整體趨勢。</div>
      </NoteCard>
      <NoteCard title="開始餵以後，什麼情況要停下來重評？">
        <Table columns={["警訊","要想什麼"]} rows={[
          ["新出現或加劇的腹痛、腹脹、腹膜刺激徵象","feeding intolerance、ileus、obstruction、bowel ischemia 或 abdominal compartment syndrome。鎮靜病人不一定能說痛，要合併理學檢查與灌流判斷。"],
          ["升壓劑需求上升、lactate 持續上升、末梢灌流或代謝性酸中毒惡化","先停推進甚至暫停 EN，重新確認 shock 與腸道灌流；不要在低灌流時硬追 calories。"],
          ["反覆 vomiting、明顯 regurgitation/aspiration，或 GRV >500 mL/6 hr","重評藥物與腹部病因；可考慮 prokinetic、降低 rate、continuous feeding 或 post-pyloric access。"],
          ["腹瀉","通常不是單獨停 EN 的理由；先找感染、藥物、sorbitol、抗生素、滲透壓與糞便阻塞溢流，必要時調整配方或速度。"],
        ]}/>
        <p style={S.body}><strong>腸音消失本身也不是 EN 的絕對禁忌。</strong>腸音不能可靠代表小腸吸收與灌流；真正要排除的是 obstruction、ischemia、嚴重 distension、compartment syndrome 與持續低灌流。</p>
      </NoteCard>
      <NoteCard title="EN、PN 到底怎麼選？"><Table columns={["情境","原則"]} rows={[["能使用腸道","優先 early EN，通常 ICU admission 後 48 h 內；不需要一開始就 full target。"],["EN 有禁忌","未控制 shock/嚴重低灌流、腸缺血、active GI bleeding 未控制、abdominal compartment syndrome、high-output fistula 無 distal access 等先暫緩。"],["EN 不足","低營養風險者可觀察，通常 3-7 天內依缺口與病程考慮 supplemental PN；嚴重 malnutrition 且 EN 不可行可更早考慮，但仍須防 refeeding。"],["升壓劑中","不是絕對禁忌；若 dose 穩定/下降且 perfusion 改善，可低量 EN 嚴密觀察。dose 快速上升、lactate/灌流惡化則暫緩。"]]} /></NoteCard>
      <NoteCard title="熱量：為什麼不能第一天就餵滿？"><p style={S.body}>急性早期身體會自行產生內源性 glucose，外加 calories 無法把這部分關掉；直接餵滿容易 overfeeding，增加 hyperglycemia、CO₂ production、脂肪肝與 feeding intolerance。ESPEN 偏向早期 hypocaloric，逐步在 day 3 後接近 measured expenditure。</p></NoteCard>
      <NoteCard title="Indirect calorimetry 是什麼？">
        <p style={S.body}><strong>它是用呼吸氣體「實測」病人當下的能量消耗。</strong>儀器測量 oxygen consumption（VO₂）與 carbon dioxide production（VCO₂），再用 Weir equation 換算 resting energy expenditure（REE，kcal/day）。因此叫 indirect：不是直接量熱，而是由氣體交換推算產熱。</p>
        <Table columns={["問題","重點"]} rows={[
          ["怎麼測？","插管病人可把 metabolic cart 接在呼吸器迴路；可自行呼吸者可使用透明罩 canopy。通常需在相對安靜、設定穩定時連續測量一段時間。"],
          ["比 kcal/kg 好在哪？","kcal/kg 與預測公式只根據族群平均值粗估；IC 能反映 fever、sedation、ventilator、sepsis、肥胖與不同病程造成的個別差異。"],
          ["結果怎麼看？","儀器常回報 REE，例如 1,650 kcal/day。這是估計能量消耗，不代表急性第一天就要立刻灌滿 1,650 kcal。仍須依病程逐步給予。"],
          ["什麼時候不可靠？","氣漏、胸管大量漏氣、很高 FiO₂、ECMO、氣體交換快速變動、病人躁動或儀器校正不良時可能失真；需看設備限制與測量品質。"],
          ["它會算蛋白嗎？","不會。IC 主要協助設定 energy；protein 仍要依體重、病程、腎臟替代治療、傷口與營養狀態另外規劃。"],
        ]}/>
      </NoteCard>
      <NoteCard title="蛋白：不是熱量附屬品"><ul style={S.list}><li>一般 critically ill adult 常以約 1.3 g/kg/day progressively delivered 為方向。</li><li>不要因為早期 calories 較低，就完全不思考 protein；但也不需第一天暴衝到高蛋白。</li><li>AKI 未透析不代表一律限蛋白；CRRT 會增加 amino acid loss，常需更高蛋白並追 nitrogen balance/urea tolerance。</li><li>嚴重肥胖病人需另依 obesity-specific protocol 用 IBW/actual weight 設定 hypocaloric high-protein strategy，不直接套一般 actual-weight kcal。</li></ul></NoteCard>
      <NoteCard title="常被忘記的 non-nutrition calories"><Table columns={["來源","怎麼算 / 注意"]} rows={[["Propofol","約 1.1 kcal/mL；高流速可貢獻數百 kcal/day，也帶 lipid load。"],["Dextrose infusion","Dextrose 約 3.4 kcal/g；D5W 1 L 約 170 kcal。"],["Citrate CRRT","依 citrate solution 與代謝量可提供 calories，需看機型/處方。"],["口服藥糖漿 / lipid carrier","量通常較小，但大量或長期仍可能影響總量與 glucose。"]]} /></NoteCard>
      <NoteCard title="每天 rounds 要問什麼？"><ul style={S.list}><li>實際收到多少 kcal/protein？停餵原因與小時數？</li><li>腹脹、疼痛、vomiting、stool、GRV、腹壓、lactate/perfusion 有沒有變化？</li><li>K/Mg/P、glucose、TG、urea、LFT、fluid balance、體重與 edema。</li><li>Propofol/dextrose calories、CRRT、傷口/引流、fever、steroid 是否改變需求。</li><li>今天可否增加？若沒達標，真正障礙是 intolerance、流程中斷，還是處方 rate 太低？</li></ul></NoteCard>
      <div style={S.sources}>主要依據：ESPEN Practical and Partially Revised Guideline: Clinical Nutrition in the ICU (2023)；ASPEN Adult Critical Care Guideline (2021)；ASPEN Consensus Recommendations for Refeeding Syndrome (2020)。計算為 bedside 粗估，indirect calorimetry 與營養師評估優先。</div>
    </>}
  </div>;
}

const S: Record<string, CSSProperties> = {
  header:{textAlign:"center",padding:"16px 42px 22px"},kicker:{color:ACCENT,fontWeight:800,fontSize:12,textTransform:"uppercase",letterSpacing:1},title:{margin:"5px 0",fontSize:30,color:"#0F172A",letterSpacing:0},subtitle:{margin:0,color:"#64748B",fontSize:14},
  notice:{background:"#F0FDFA",border:"1px solid #99F6E4",color:"#115E59",padding:14,borderRadius:8,lineHeight:1.65,marginBottom:14},caution:{background:"#FFFBEB",border:"1px solid #FDE68A",color:"#92400E",padding:12,borderRadius:8,lineHeight:1.6,marginTop:14,fontSize:13},
  tabs:{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:8,marginBottom:16},tab:{padding:"11px 6px",border:"1.5px solid #CBD5E1",borderRadius:8,background:"#fff",color:"#64748B",fontWeight:700,cursor:"pointer"},tabActive:{borderColor:ACCENT,color:ACCENT,background:"#F0FDFA"},
  section:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,padding:16,marginBottom:14},sectionTitle:{fontSize:14,fontWeight:800,color:"#334155",marginBottom:14},grid3:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(190px, 1fr))",gap:12},field:{minWidth:0},label:{display:"block",fontSize:13,fontWeight:700,color:"#475569",marginBottom:6},hint:{display:"block",fontSize:11,color:"#94A3B8",marginTop:4},input:{width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"1.5px solid #DCE4EE",borderRadius:8,background:"#fff",color:"#0F172A",fontSize:15},smallInfo:{background:"#F8FAFC",borderRadius:8,padding:12,color:"#64748B",fontSize:12,lineHeight:1.65},
  choiceGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(210px, 1fr))",gap:8},choice:{display:"flex",flexDirection:"column",gap:5,textAlign:"left",padding:12,border:"1.5px solid #DCE4EE",borderRadius:8,background:"#fff",color:"#334155",cursor:"pointer",lineHeight:1.45},choiceActive:{borderColor:ACCENT,background:"#F0FDFA",color:"#0F766E"},barrierGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(250px,1fr))",gap:8},checkActive:{borderColor:"#F59E0B",background:"#FFFBEB"},feedingDecision:{display:"flex",flexDirection:"column",gap:5,padding:14,borderRadius:8,marginTop:14,lineHeight:1.55,fontSize:13},decisionStart:{background:"#ECFDF5",border:"1px solid #6EE7B7",color:"#065F46"},decisionTrophic:{background:"#FFFBEB",border:"1px solid #FDE68A",color:"#92400E"},decisionHold:{background:"#FEF2F2",border:"1px solid #FCA5A5",color:"#991B1B"},decisionUnknown:{background:"#F8FAFC",border:"1px solid #CBD5E1",color:"#475569"},
  metricGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(210px, 1fr))",gap:10,marginBottom:14},metric:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,padding:14},metricLabel:{fontSize:12,fontWeight:800,color:"#64748B"},metricValue:{fontSize:19,fontWeight:900,color:"#0F766E",margin:"6px 0"},metricSub:{fontSize:11,color:"#94A3B8",lineHeight:1.5},prescription:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(190px,1fr))",gap:8,marginTop:14},prescriptionLabel:{display:"block",fontSize:11,color:"#64748B",marginBottom:5},
  checkGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px,1fr))",gap:8},check:{display:"flex",alignItems:"flex-start",gap:8,padding:10,border:"1px solid #E2E8F0",borderRadius:8,color:"#334155",fontSize:13,lineHeight:1.5},resultBox:{display:"grid",gridTemplateColumns:"60px 1fr",gap:12,alignItems:"center",padding:14,borderRadius:8,marginBottom:14},resultHigh:{background:"#FFF7ED",border:"1px solid #FDBA74",color:"#9A3412"},resultLow:{background:"#F0FDFA",border:"1px solid #99F6E4",color:"#0F766E"},resultCount:{fontSize:34,fontWeight:900,textAlign:"center"},
  sequence:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,padding:16,marginBottom:14},step:{display:"grid",gridTemplateColumns:"32px 1fr",gap:10,marginBottom:12},stepNo:{display:"grid",placeItems:"center",width:28,height:28,borderRadius:"50%",background:ACCENT,color:"#fff",fontWeight:800},stepTitle:{fontWeight:800,color:"#0F172A",marginTop:4},body:{margin:"4px 0",fontSize:14,color:"#475569",lineHeight:1.7},
  noteCard:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,marginBottom:12,overflow:"hidden"},noteSummary:{padding:14,fontWeight:800,color:"#334155",cursor:"pointer"},noteBody:{padding:"0 14px 14px"},tableWrap:{overflowX:"auto",WebkitOverflowScrolling:"touch"},table:{width:"100%",borderCollapse:"collapse",minWidth:600,fontSize:13},th:{textAlign:"left",padding:10,background:"#F8FAFC",color:"#64748B",borderBottom:"1px solid #E2E8F0"},td:{padding:10,color:"#475569",lineHeight:1.55,borderBottom:"1px solid #EEF2F7",verticalAlign:"top"},tdStrong:{padding:10,color:"#0F172A",fontWeight:800,borderBottom:"1px solid #EEF2F7",verticalAlign:"top"},
  flow:{display:"grid",gap:0,maxWidth:760},flowRow:{display:"grid",gridTemplateColumns:"38px minmax(0,1fr)",gap:10,minHeight:64},flowRail:{display:"flex",flexDirection:"column",alignItems:"center"},flowNo:{display:"grid",placeItems:"center",width:30,height:30,borderRadius:"50%",background:ACCENT,color:"#fff",fontWeight:800,fontSize:13,flexShrink:0},flowLine:{width:2,background:"#99F6E4",flex:1,minHeight:24,margin:"4px 0"},flowContent:{display:"flex",flexDirection:"column",gap:3,padding:"4px 0 14px",color:"#475569",fontSize:13,lineHeight:1.55},list:{margin:"4px 0",paddingLeft:20,color:"#475569",fontSize:14,lineHeight:1.75},sources:{color:"#94A3B8",fontSize:11,lineHeight:1.6,padding:"8px 4px 20px"},
};
