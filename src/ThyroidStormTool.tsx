import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Tab = "assessment" | "treatment" | "notes";
type Cns = "none" | "mild" | "moderate" | "severe";
type Chf = "none" | "mild" | "moderate" | "severe";
type Gi = "none" | "moderate" | "severe";

const ACCENT = "#0D9488";

function scoreTemperature(c: number) {
  const f = c * 9 / 5 + 32;
  if (f >= 104) return 30;
  if (f >= 103) return 25;
  if (f >= 102) return 20;
  if (f >= 101) return 15;
  if (f >= 100) return 10;
  if (f >= 99) return 5;
  return 0;
}

function scoreHeartRate(hr: number) {
  if (hr >= 140) return 25;
  if (hr >= 130) return 20;
  if (hr >= 120) return 15;
  if (hr >= 110) return 10;
  if (hr >= 100) return 5;
  return 0;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label style={S.field}><span style={S.label}>{label}</span>{children}{hint && <span style={S.hint}>{hint}</span>}</label>;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} style={{ ...S.pill, ...(active ? S.pillActive : {}) }}>{children}</button>;
}

function NoteCard({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details open={open} style={S.noteCard}><summary style={S.noteSummary}>{title}</summary><div style={S.noteBody}>{children}</div></details>;
}

function MiniTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return <div style={S.tableWrap}><table style={S.table}><thead><tr>{columns.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={j === 0 ? S.tdStrong : S.td}>{v}</td>)}</tr>)}</tbody></table></div>;
}

export default function ThyroidStormTool() {
  const [tab, setTab] = useState<Tab>("assessment");
  const [temperature, setTemperature] = useState("38.5");
  const [heartRate, setHeartRate] = useState("130");
  const [af, setAf] = useState(false);
  const [chf, setChf] = useState<Chf>("none");
  const [gi, setGi] = useState<Gi>("none");
  const [cns, setCns] = useState<Cns>("none");
  const [precipitant, setPrecipitant] = useState(false);
  const [thyrotoxicosis, setThyrotoxicosis] = useState(true);

  const result = useMemo(() => {
    const tempPoints = scoreTemperature(Number(temperature));
    const hrPoints = scoreHeartRate(Number(heartRate));
    const afPoints = af ? 10 : 0;
    const chfPoints = ({ none: 0, mild: 5, moderate: 10, severe: 20 } as const)[chf];
    const giPoints = ({ none: 0, moderate: 10, severe: 20 } as const)[gi];
    const cnsPoints = ({ none: 0, mild: 10, moderate: 20, severe: 30 } as const)[cns];
    const triggerPoints = precipitant ? 10 : 0;
    const total = tempPoints + hrPoints + afPoints + chfPoints + giPoints + cnsPoints + triggerPoints;
    const label = total >= 45 ? "高度支持 thyroid storm" : total >= 25 ? "impending storm / 需高度警覺" : "分數較不支持 storm";
    const nonCnsCount = [Number(temperature) >= 38, Number(heartRate) >= 130, chf !== "none", gi !== "none"].filter(Boolean).length;
    const jta = !thyrotoxicosis ? "尚不能套用：需先有 thyrotoxicosis（FT3 或 FT4 升高）" : cns !== "none" && nonCnsCount >= 1 ? "符合 JTA TS1 組合" : nonCnsCount >= 3 ? "符合 JTA TS1 組合" : nonCnsCount >= 2 ? "符合 JTA TS2 組合" : "未達 JTA TS1/TS2 組合";
    return { total, label, jta, parts: [tempPoints, hrPoints, afPoints, chfPoints, giPoints, cnsPoints, triggerPoints] };
  }, [temperature, heartRate, af, chf, gi, cns, precipitant, thyrotoxicosis]);

  return <div>
    <header style={S.header}><div style={S.kicker}>Endocrine emergency</div><h1 style={S.title}>甲狀腺風暴</h1><p style={S.subtitle}>Thyroid storm 評估、急救處置順序與 bedside 讀書筆記</p></header>
    <section style={S.alert}><strong>臨床優先：</strong>這是臨床診斷。若高度懷疑且有器官失代償，不要等 FT3/FT4 或分數完整才治療；同步進 ICU、支持器官、找並處理誘因。</section>
    <div style={S.tabs}>{([['assessment','評估'],['treatment','處置路徑'],['notes','讀書筆記']] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={{ ...S.tab, ...(tab === id ? S.tabActive : {}) }}>{label}</button>)}</div>

    {tab === "assessment" && <>
      <section style={S.section}><div style={S.sectionTitle}>Burch-Wartofsky Point Scale (BWPS)</div>
        <div style={S.grid2}>
          <Field label="體溫" hint="°C"><input value={temperature} onChange={e => setTemperature(e.target.value)} inputMode="decimal" style={S.input} /></Field>
          <Field label="心率" hint="beats/min"><input value={heartRate} onChange={e => setHeartRate(e.target.value)} inputMode="numeric" style={S.input} /></Field>
          <Field label="中樞神經症狀"><select value={cns} onChange={e => setCns(e.target.value as Cns)} style={S.input}><option value="none">無</option><option value="mild">躁動（10）</option><option value="moderate">譫妄 / psychosis / 極度嗜睡（20）</option><option value="severe">癲癇 / coma（30）</option></select></Field>
          <Field label="心衰竭"><select value={chf} onChange={e => setChf(e.target.value as Chf)} style={S.input}><option value="none">無</option><option value="mild">輕度：腳踝水腫（5）</option><option value="moderate">中度：bibasilar rales（10）</option><option value="severe">重度：pulmonary edema（20）</option></select></Field>
          <Field label="GI / hepatic"><select value={gi} onChange={e => setGi(e.target.value as Gi)} style={S.input}><option value="none">無</option><option value="moderate">噁心、嘔吐、腹瀉、腹痛（10）</option><option value="severe">黃疸（20）</option></select></Field>
          <div style={S.field}><span style={S.label}>加分項目</span><label style={S.check}><input type="checkbox" checked={af} onChange={e => setAf(e.target.checked)} /> Atrial fibrillation（10）</label><label style={S.check}><input type="checkbox" checked={precipitant} onChange={e => setPrecipitant(e.target.checked)} /> 有明確誘因（10）</label></div>
        </div>
      </section>
      <section style={S.result}><div><div style={S.resultLabel}>BWPS</div><div style={S.score}>{result.total}</div></div><div><div style={S.resultTitle}>{result.label}</div><div style={S.muted}>≥45 高度支持；25-44 impending storm；&lt;25 較不支持。分數是輔助，不是 rule-in/rule-out test。</div></div></section>
      <section style={S.section}><div style={S.sectionTitle}>JTA 診斷組合</div><label style={S.check}><input type="checkbox" checked={thyrotoxicosis} onChange={e => setThyrotoxicosis(e.target.checked)} /> FT3 或 FT4 升高，已有 thyrotoxicosis</label><div style={S.jtaResult}>{result.jta}</div><p style={S.body}>JTA 以 thyrotoxicosis 為前提，再看 CNS、發燒 ≥38°C、心率 ≥130、CHF、GI/hepatic 的組合。TS1 為 CNS + 其他一項，或沒有 CNS 但其他三項；TS2 為沒有 CNS 但其他兩項。</p></section>
      <section style={S.section}><div style={S.sectionTitle}>先排除 / 同步尋找</div><MiniTable columns={["類別","要想什麼"]} rows={[["誘因","感染、停抗甲狀腺藥、手術/創傷、DKA、MI、stroke、分娩、iodine/contrast、amiodarone"],["mimics","Sepsis、惡性高熱、NMS、serotonin syndrome、抗膽鹼中毒、pheochromocytoma crisis"],["基本檢驗","CBC、CMP、Mg/P、glucose、LFT/bilirubin、ABG/VBG、lactate、FT4/FT3/TSH、ECG、CXR；依情境 cultures、troponin、echo"]]} /></section>
    </>}

    {tab === "treatment" && <>
      <section style={S.choiceBox}>
        <div style={S.choiceTitle}>PTU 還是 MMI？先看這三件事</div>
        <div style={S.choiceGrid}>
          <div style={S.choiceItem}><strong>一般 thyroid storm</strong><span style={S.choiceBody}>兩者都可。ATA 傳統偏向 PTU，因為另可抑制 T4→T3；JTA 資料未顯示兩者死亡率有明顯差異。</span></div>
          <div style={S.choiceItem}><strong>嚴重肝損傷 / acute liver failure</strong><span style={S.choiceBody}>避開 PTU，通常偏向 MMI，並及早討論 plasma exchange / surgery。</span></div>
          <div style={S.choiceItem}><strong>懷孕第一孕期</strong><span style={S.choiceBody}>通常偏向 PTU，避免 MMI embryopathy；第二孕期起可評估轉 MMI，減少 PTU 肝毒性風險。</span></div>
        </div>
      </section>
      <section style={S.sequence}><div style={S.sequenceTitle}>處置順序</div>{[
        ["1", "ABC + ICU + 誘因", "氧合/呼吸器、監測、IV access、謹慎補液、降溫、acetaminophen；感染先採檢後儘早抗生素。避免 aspirin（可能增加 free thyroid hormone）。"],
        ["2", "控制 adrenergic effect", "若血流動力穩定：propranolol 40-80 mg PO/NG q4-6h。若重症、心衰或反應難預測：偏好可快速停藥的 esmolol，loading 250-500 mcg/kg（可省略）後 50-100 mcg/kg/min titrate。"],
        ["3", "阻斷新合成：thionamide", "PTU 500-1000 mg loading，之後 250 mg q4h；或 methimazole 20 mg q4-6h（總量常 60-80 mg/day）。嚴重肝損傷偏向 MMI；妊娠第一孕期通常偏向 PTU，需立即會診。"],
        ["4", "至少 1 小時後才給 iodine", "標準 Lugol's solution 5%/10%（iodine 50 mg/mL + potassium iodide 100 mg/mL）：0.4 mL PO/NG q6h（傳統寫法 8 drops）。先以水、牛奶或果汁稀釋。各院製劑與滴管可能不同，務必核對濃度；先給 thionamide，避免 iodine 成為新合成底物。"],
        ["5", "Steroid", "Hydrocortisone 100 mg IV q8h，或 dexamethasone 2 mg IV q6h。兼顧相對腎上腺不足並降低 T4→T3 conversion。"],
        ["6", "重評與 rescue", "每小時看體溫、HR、MAP、神經與尿量；追 glucose/electrolytes/LFT。24-48 h 未改善或肝衰竭/無法用藥：內分泌、血液淨化與外科共同討論 cholestyramine、therapeutic plasma exchange 或 thyroidectomy。"],
      ].map(([n,t,b], i) => <div key={n} style={S.step}><span style={S.stepNo}>{n}</span><div><div style={S.stepTitle}>{t}</div><div style={S.body}>{b}</div></div>{i < 5 && <div style={S.arrow}>↓</div>}</div>)}</section>
      <section style={S.warning}><strong>Beta-blocker 不是每個人都能直接推：</strong>低輸出心衰、shock、重度氣喘時，長效或不可快速回頭的阻斷可能造成 collapse。先 bedside echo / perfusion assessment；需要時用 esmolol 低劑量、嚴密 titration，或在專科監督下考慮 diltiazem 控制心率。</section>
      <NoteCard title="器官問題怎麼處理" open><MiniTable columns={["問題","處置重點"]} rows={[["高熱","Cooling blanket、冰袋、acetaminophen；避免 aspirin/NSAID 作為主要退燒策略。"],["AF / tachyarrhythmia","先治 storm；不穩定依 ACLS cardioversion。Digoxin 在 hyperthyroidism 效果可能較差；amiodarone 有 iodine 與甲狀腺效應，僅在必要且已有 thionamide cover 時由專科評估。"],["心衰 / shock","分清 high-output、低 EF、RV/LV failure；補液避免固定大量。必要時 vasopressor/inotrope、機械循環支持。"],["肝衰竭","避免/停 PTU，偏向 MMI；早期討論 plasma exchange，且可能需緊急 thyroidectomy。"],["躁動 / seizure","先矯正高熱、低血糖、電解質與缺氧；短效鎮靜，癲癇依標準處置。"]]} /></NoteCard>
      <NoteCard title="PTU 與 methimazole (MMI) 比較" open><MiniTable columns={["比較","PTU","Methimazole (MMI)"]} rows={[
        ["Storm 常用劑量","500-1000 mg loading，之後 250 mg q4h","20 mg q4-6h；總量常 60-80 mg/day"],
        ["作用","抑制新合成，另抑制周邊 T4→T3","抑制新合成；不直接抑制周邊 T4→T3"],
        ["Storm 中的定位","ATA 傳統偏好；理論上較快降低 T3","JTA 可接受且日本實務常用；觀察資料未見死亡率較差"],
        ["主要嚴重風險","Fulminant hepatotoxicity / hepatic necrosis；也可 agranulocytosis","Agranulocytosis；較常 cholestatic liver injury；少見 pancreatitis"],
        ["嚴重肝損傷","避免或停用；PTU 肝毒性可能快速進展","通常較偏好，但仍需追 LFT 並判斷肝損傷是否來自 storm"],
        ["懷孕","第一孕期通常優先；之後考慮轉 MMI","第一孕期通常避免；第二、三孕期通常較偏好"],
        ["曾有 agranulocytosis","通常不可改用另一種 thionamide；storm 的極端例外需專科決策","同左；有交叉反應風險"],
        ["穩定後","因肝毒性通常不作長期首選，可轉 MMI","多數非孕成人長期治療的首選"],
      ]} /></NoteCard>
      <section style={S.danger}><strong>立刻停藥並驗 CBC：</strong>服用 PTU/MMI 後出現發燒、喉嚨痛、口腔潰瘍，要先懷疑 agranulocytosis。不要只把發燒當成 thyroid storm，也不要自行改成另一種 thionamide。</section>
    </>}

    {tab === "notes" && <>
      <NoteCard title="病因怎麼分：先判斷『過度製造』或『漏出 / 外來』" open>
        <div style={S.etiologyFlow}>
          <div style={S.etiologyStart}><strong>TSH suppressed + FT4/FT3 elevated</strong><span>先抽 TRAb、thyroglobulin + anti-Tg Ab；做 thyroid ultrasound + color Doppler。不要為了分型延誤 storm treatment。</span></div>
          <div style={S.etiologyBranches}>
            <div style={S.etiologyActive}><strong>血流增加 / TRAb positive / 有結節</strong><span>較像甲狀腺正在過度製造：Graves、toxic adenoma / multinodular goiter、AIT type 1。</span><b>PTU/MMI 有效；Lugol 通常有角色</b></div>
            <div style={S.etiologyLeak}><strong>血流低、uptake 低或近乎零</strong><span>較像 destructive thyroiditis、AIT type 2 或外源性 hormone。</span><b>Thionamide / Lugol 幫助有限；再看 Tg 與病史</b></div>
          </div>
        </div>
      </NoteCard>
      <NoteCard title="各病因 bedside 對照" open><MiniTable columns={["病因","線索","關鍵檢查","治療提示"]} rows={[
        ["Graves disease","瀰漫性 goiter、眼病變、bruit、其他 autoimmune history","TRAb/TSI positive；Doppler diffuse hypervascularity（thyroid inferno）；未受 iodine 干擾時 uptake diffuse high","PTU/MMI 有效；storm 中 Lugol 有角色"],
        ["Toxic adenoma / toxic multinodular goiter","較高齡、摸到單一或多發結節、通常無 Graves eye signs","TRAb 通常 negative；US 有結節；scan 為單一 hot nodule 或 patchy/multiple hot areas","PTU/MMI 與 Lugol 可控制急性期；穩定後常需 RAI 或手術"],
        ["Subacute destructive thyroiditis","頸部疼痛、壓痛，可能在 viral illness 後；painless/postpartum 型可不痛","ESR/CRP 常高（疼痛型）；Doppler 血流低；uptake near-zero；thyroglobulin 通常高","不是持續新合成，PTU/MMI 與 Lugol 通常無效；以 beta-blocker、NSAID/steroid 等依病型處理"],
        ["外源性 thyroid hormone","使用 levothyroxine/liothyronine、減重品或刻意/意外攝取；通常無 goiter","Uptake near-zero；thyroglobulin 低（需同時看 anti-Tg Ab，否則可能假低）；T4/T3 型態依吃的製劑","停止來源、beta-blocker；嚴重時可考慮 cholestyramine。PTU/MMI/Lugol 通常無效"],
        ["Amiodarone-induced type 1","原本有 Graves 或 nodular goiter；amiodarone iodine load 誘發過度製造","Doppler 血流增加；可能有結節或 TRAb positive；iodine-rich 地區 uptake 常仍偏低，不能單靠 uptake","高劑量 thionamide 為主；額外 iodine 的效益可能有限"],
        ["Amiodarone-induced type 2","通常原本甲狀腺正常；藥物造成 destructive thyroiditis","Doppler 無 hypervascularity；TRAb negative；後續可能 hypothyroidism","Glucocorticoid 為主；thionamide/Lugol 幫助有限"],
        ["AIT mixed / indefinite","Type 1、2 線索交錯，臨床並不少見","沒有單一 gold standard；整合 Doppler、原本腺體、TRAb 與治療反應","重症時常先合併 thionamide + glucocorticoid，儘早內分泌/心臟共同決策"],
      ]} /></NoteCard>
      <NoteCard title="檢查怎麼排、有哪些陷阱"><ul style={S.list}>
        <li><strong>TRAb/TSI：</strong>positive 很支持 Graves；negative 不能百分之百排除。</li>
        <li><strong>Color Doppler：</strong>高血流支持 active hormone synthesis；低血流支持 destructive process。在急診比 uptake scan 更容易執行。</li>
        <li><strong>Thyroglobulin：</strong>destructive thyroiditis 通常高、外源性 hormone 通常低；務必同時驗 anti-thyroglobulin antibody，否則 Tg 可能被干擾成假低。</li>
        <li><strong>RAIU / thyroid scan：</strong>Graves diffuse high、toxic nodule focal/patchy high、thyroiditis/factitious near-zero；但最近顯影劑、amiodarone 或 Lugol 都會讓 uptake 變低，急性 storm 也不應為了等 scan 延遲治療。</li>
        <li><strong>Total T3:T4 ratio：</strong>&gt;20（ng/μg）較支持 active synthesis，&lt;20 較支持 thyroiditis；只能輔助，重症、藥物與檢驗單位都會干擾。</li>
      </ul></NoteCard>
      <NoteCard title="為什麼每一類藥都要給？" open><MiniTable columns={["治療","打斷哪一步"]} rows={[["Beta-blocker","降低 catecholamine 表現；propranolol 高劑量也稍降 T4→T3。"],["PTU / MMI","抑制 thyroid peroxidase，阻斷『新的』甲狀腺素合成；PTU 另抑制周邊 T4→T3。"],["Iodine","甲狀腺內仍存有已製成、可立即釋放的 hormone。高濃度 iodine 造成急性 Wolff-Chaikoff effect，快速抑制 organification 與 hormone release；必須在 thionamide 後。"],["Steroid","降低 T4→T3，並 cover 相對 adrenal insufficiency。"],["Cholestyramine","4 g PO QID 可增加 thyroid hormone 糞便排除，作為 refractory adjunct。"]]} /></NoteCard>
      <NoteCard title="Lugol's solution：濃度、劑量與限制" open><MiniTable columns={["項目","內容"]} rows={[
        ["標準濃度","Iodine 5% w/v + potassium iodide 10% w/v = iodine 50 mg/mL + KI 100 mg/mL。"],
        ["Storm 劑量","0.4 mL PO/NG q6h（8 drops QID 是以約 0.05 mL/drop 換算）。先稀釋再給。"],
        ["給藥時序","第一劑 PTU/MMI 後至少 1 小時；穩定後儘快停用，避免 escape phenomenon。"],
        ["何時有用","Graves disease、toxic nodular goiter 等持續合成/釋放 hormone 的情境。"],
        ["何時幫助有限","Destructive thyroiditis、外源性 thyroid hormone、amiodarone-induced type 2；這些不是持續新合成為主。"],
        ["製劑警告","Lugol 有 2%、5% 等不同配方，滴管滴量也不同；若不是標準 5%/10% 製劑，不可直接套 0.4 mL。"],
      ]} /></NoteCard>
      <NoteCard title="BWPS 與 JTA 怎麼一起看"><p style={S.body}>BWPS 敏感但可能把 severe sepsis 等高熱、心搏快、譫妄患者算得很高；JTA 需要生化 thyrotoxicosis，特異性思路較強。兩者都不能取代臨床判斷。若病人像 storm，治療風險通常低於延遲治療的風險。</p></NoteCard>
      <NoteCard title="監測與停藥思路"><ul style={S.list}><li>臨床改善常比 TSH 快；早期不要用 TSH 判斷治療反應，追 FT4/FT3 趨勢。</li><li>Iodine 通常短期使用，穩定後先停；thionamide 續用並依病因規劃 definitivo therapy。</li><li>每日 CBC/LFT 視情況追蹤；發燒/喉嚨痛需想到 agranulocytosis，但 storm 本身也會發燒。</li><li>找出 Graves、toxic nodular disease、thyroiditis、外源性 hormone 等病因，因為 thyroiditis 不會從 thionamide 獲益。</li></ul></NoteCard>
      <div style={S.sources}>主要依據：2016 ATA Hyperthyroidism Guideline；2016 Japan Thyroid Association/Japan Endocrine Society Thyroid Storm Guideline。此頁供臨床決策支援，實際藥品濃度、禁忌與院內 protocol 仍需核對。</div>
    </>}
  </div>;
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 42px 22px" }, kicker: { color: ACCENT, fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }, title: { margin: "5px 0", fontSize: 30, color: "#0F172A", letterSpacing: 0 }, subtitle: { margin: 0, color: "#64748B", fontSize: 14 },
  alert: { background: "#FFF7ED", border: "1px solid #FDBA74", color: "#9A3412", padding: 14, borderRadius: 8, lineHeight: 1.65, marginBottom: 14 }, warning: { background: "#FFFBEB", border: "1px solid #FCD34D", color: "#92400E", padding: 14, borderRadius: 8, lineHeight: 1.65, marginBottom: 14 },
  danger: { background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: 14, borderRadius: 8, lineHeight: 1.65, marginBottom: 14 },
  tabs: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }, tab: { padding: "11px 8px", border: "1.5px solid #CBD5E1", borderRadius: 8, background: "#fff", color: "#64748B", fontWeight: 700, cursor: "pointer" }, tabActive: { borderColor: ACCENT, color: ACCENT, background: "#F0FDFA" },
  section: { background: "#fff", borderRadius: 8, padding: 16, marginBottom: 14, border: "1px solid #E2E8F0" }, sectionTitle: { fontSize: 14, fontWeight: 800, color: "#334155", marginBottom: 14 }, grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }, field: { minWidth: 0 }, label: { display: "block", color: "#475569", fontSize: 13, fontWeight: 700, marginBottom: 6 }, hint: { display: "block", color: "#94A3B8", fontSize: 11, marginTop: 4 }, input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid #DCE4EE", borderRadius: 8, background: "#fff", color: "#0F172A", fontSize: 15 }, check: { display: "flex", alignItems: "center", gap: 8, color: "#334155", fontSize: 14, margin: "8px 0" },
  result: { display: "grid", gridTemplateColumns: "100px 1fr", gap: 18, alignItems: "center", background: "#ECFDF5", border: "1px solid #99F6E4", borderRadius: 8, padding: 16, marginBottom: 14 }, resultLabel: { color: "#047857", fontWeight: 800, fontSize: 12 }, score: { color: "#047857", fontSize: 40, fontWeight: 900 }, resultTitle: { fontWeight: 800, color: "#065F46", marginBottom: 4 }, muted: { fontSize: 12, color: "#64748B", lineHeight: 1.55 }, jtaResult: { marginTop: 12, padding: 12, background: "#F0FDFA", borderRadius: 8, color: "#0F766E", fontWeight: 800 }, body: { margin: "6px 0", color: "#475569", fontSize: 14, lineHeight: 1.7 },
  pill: { border: "1px solid #CBD5E1", borderRadius: 8, background: "#fff", padding: "8px 10px" }, pillActive: { borderColor: ACCENT, color: ACCENT },
  sequence: { background: "#fff", padding: 16, border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 14 }, sequenceTitle: { fontWeight: 900, color: "#0F172A", fontSize: 18, marginBottom: 14 }, step: { position: "relative", display: "grid", gridTemplateColumns: "34px 1fr", gap: 10, paddingBottom: 16 }, stepNo: { display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: "50%", background: ACCENT, color: "#fff", fontWeight: 800 }, stepTitle: { color: "#0F172A", fontWeight: 800, marginTop: 4 }, arrow: { position: "absolute", left: 10, bottom: 0, color: "#94A3B8", fontWeight: 900 },
  choiceBox: { background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 8, padding: 16, marginBottom: 14 }, choiceTitle: { fontSize: 16, fontWeight: 900, color: "#0F172A", marginBottom: 12 }, choiceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }, choiceItem: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, color: "#0F172A", fontSize: 13 }, choiceBody: { display: "block", color: "#64748B", lineHeight: 1.6, marginTop: 6 },
  noteCard: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 12, overflow: "hidden" }, noteSummary: { padding: 14, fontWeight: 800, color: "#334155", cursor: "pointer" }, noteBody: { padding: "0 14px 14px" }, tableWrap: { overflowX: "auto", WebkitOverflowScrolling: "touch" }, table: { width: "100%", borderCollapse: "collapse", minWidth: 560, fontSize: 13 }, th: { textAlign: "left", padding: 10, background: "#F8FAFC", color: "#64748B", borderBottom: "1px solid #E2E8F0" }, td: { padding: 10, color: "#475569", lineHeight: 1.55, borderBottom: "1px solid #EEF2F7", verticalAlign: "top" }, tdStrong: { padding: 10, color: "#0F172A", fontWeight: 800, borderBottom: "1px solid #EEF2F7", verticalAlign: "top" }, list: { margin: "4px 0", paddingLeft: 20, color: "#475569", fontSize: 14, lineHeight: 1.75 }, sources: { color: "#94A3B8", fontSize: 11, lineHeight: 1.6, padding: "8px 4px 20px" },
  etiologyFlow: { display: "grid", gap: 10 }, etiologyStart: { display: "grid", gap: 5, padding: 12, borderRadius: 8, background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#334155", fontSize: 13, lineHeight: 1.55 }, etiologyBranches: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }, etiologyActive: { display: "grid", gap: 6, padding: 12, borderRadius: 8, background: "#ECFDF5", border: "1px solid #99F6E4", color: "#065F46", fontSize: 13, lineHeight: 1.55 }, etiologyLeak: { display: "grid", gap: 6, padding: 12, borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E3A8A", fontSize: 13, lineHeight: 1.55 },
};
