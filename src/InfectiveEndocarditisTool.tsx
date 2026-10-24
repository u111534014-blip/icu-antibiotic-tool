import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0F766E";
type Tab = "workflow" | "therapy" | "notes";
type ValveType = "native" | "prosthetic" | "cied";
type Severity = "stable" | "unstable";
type Organism = "pending" | "vgs" | "mssa" | "mrsa" | "efaecalis" | "hacek" | "negative" | "fungal";

const organismOptions: Array<{ id: Organism; label: string }> = [
  { id: "pending", label: "尚未鑑定 / culture pending" },
  { id: "vgs", label: "VGS / S. gallolyticus" },
  { id: "mssa", label: "MSSA / methicillin-susceptible staphylococci" },
  { id: "mrsa", label: "MRSA / methicillin-resistant staphylococci" },
  { id: "efaecalis", label: "Enterococcus faecalis" },
  { id: "hacek", label: "HACEK" },
  { id: "negative", label: "Blood culture-negative" },
  { id: "fungal", label: "Candida / Aspergillus suspected" },
];

const targetedTherapy = [
  {
    organism: "VGS / S. gallolyticus, penicillin-susceptible",
    native: "Penicillin G 12-18 million units/day IV continuous or divided q4h, OR ceftriaxone 2 g IV q24h x 4 weeks",
    prosthetic: "同類藥物通常 x 6 weeks",
    pearl: "選定單純 NVE 才考慮 2-week beta-lactam + gentamicin；腎功能差、聽毒性風險、膿瘍或複雜感染不適合短療程。",
  },
  {
    organism: "MSSA / methicillin-susceptible staphylococci",
    native: "Oxacillin/nafcillin 2 g IV q4h, OR cefazolin 2 g IV q8h; generally 6 weeks",
    prosthetic: "Beta-lactam backbone, usually >=6 weeks; rifampin 是否加入由 Endocarditis Team 決定",
    pearl: "2026 AHA 不建議 staphylococcal PVE 常規加 gentamicin，風險大於可能效益；CNS infection 時 cefazolin 穿透需另評估。",
  },
  {
    organism: "MRSA / methicillin-resistant staphylococci",
    native: "Vancomycin AUC-guided (AUC24/MIC 400-600 when MIC=1), OR daptomycin 8-10 mg/kg IV q24h; generally 6 weeks",
    prosthetic: ">=6 weeks；早期外科評估；rifampin 無 2026 AHA 共識，個案討論",
    pearl: "Daptomycin 監測 CK/肌病；vancomycin 依 AUC、腎功能與 MIC 調整。持續菌血症要找 abscess、metastatic focus 與 source control。",
  },
  {
    organism: "Enterococcus faecalis, beta-lactam susceptible",
    native: "Ampicillin 2 g IV q4h + ceftriaxone 2 g IV q12h, usually 6 weeks",
    prosthetic: "Ampicillin + ceftriaxone x 6 weeks",
    pearl: "雙 beta-lactam 常優先，尤其高齡、腎功能差或 high-level aminoglycoside resistance；不要把 ceftriaxone 當單藥。",
  },
  {
    organism: "HACEK",
    native: "Ceftriaxone 2 g IV q24h x 4 weeks",
    prosthetic: "Ceftriaxone 2 g IV q24h x 6 weeks",
    pearl: "若嚴重 beta-lactam allergy，可依藥敏與感染科評估 fluoroquinolone。",
  },
  {
    organism: "Candida / Aspergillus",
    native: "Liposomal amphotericin B-based or high-dose echinocandin-based therapy, plus early surgical evaluation",
    prosthetic: "同上；常需長期甚至終身 azole suppression",
    pearl: "血液培養對 Aspergillus 敏感度低；需整合 beta-D-glucan/antigen、影像、組織與分子檢驗。",
  },
];

const preventionRows = [
  ["人工瓣膜或修補材料", "含 transcatheter prosthesis、annuloplasty ring/chord/clip 等"],
  ["曾有 infective endocarditis", "終生屬高風險"],
  ["特定 congenital heart disease", "未修補 cyanotic CHD；或修補後仍有 residual shunt/regurgitation adjacent to prosthetic material"],
  ["心臟移植後出現結構異常瓣膜逆流", "依 AHA 高風險條件評估"],
];

function Panel({ title, children, tone = "plain" }: { title: string; children: ReactNode; tone?: "plain" | "warning" | "danger" }) {
  return (
    <section style={{ ...S.panel, ...(tone === "warning" ? S.warningPanel : tone === "danger" ? S.dangerPanel : {}) }}>
      <div style={S.panelTitle}>{title}</div>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return <ul style={S.list}>{items.map((item) => <li key={item} style={S.listItem}>{item}</li>)}</ul>;
}

function Source({ children }: { children: ReactNode }) {
  return <div style={S.source}>來源：{children}</div>;
}

function WorkflowView() {
  const [valve, setValve] = useState<ValveType>("native");
  const [severity, setSeverity] = useState<Severity>("stable");
  const [organism, setOrganism] = useState<Organism>("pending");
  const [major, setMajor] = useState(0);
  const [minor, setMinor] = useState(0);
  const [surgeryFlag, setSurgeryFlag] = useState(false);

  const duke = major >= 2 || (major >= 1 && minor >= 3) || minor >= 5
    ? "Definite IE（臨床標準）"
    : (major >= 1 && minor >= 1) || minor >= 3
      ? "Possible IE"
      : "目前未達 Possible IE；若臨床懷疑高，仍需繼續 cultures / imaging，不可只靠分數排除。";

  const organismPlan = useMemo(() => {
    const valveText = valve === "native" ? "native valve" : valve === "prosthetic" ? "prosthetic valve" : "CIED / lead-associated";
    const plans: Record<Organism, string> = {
      pending: severity === "unstable"
        ? `抽完 cultures 後立即開始經驗治療；${valveText} 的處方需依 healthcare exposure、MRSA 與 non-HACEK GNB 風險及院內 antibiogram 決定。`
        : "先完整抽 blood cultures，再由感染科依 native/prosthetic、取得感染場域、既往抗生素與過敏史決定經驗治療。",
      vgs: valve === "native" ? "Penicillin-susceptible 時常用 penicillin G 或 ceftriaxone 2 g IV q24h，通常 4 weeks。" : "人工瓣膜通常延長至 6 weeks，並依 MIC 決定是否需要 synergy。",
      mssa: valve === "native" ? "優先 anti-staphylococcal beta-lactam；常用 cefazolin 2 g IV q8h 或 oxacillin/nafcillin 2 g IV q4h。" : "使用有效 beta-lactam 並及早外科評估；2026 AHA 不建議常規 gentamicin，rifampin 無共識。",
      mrsa: "Vancomycin AUC-guided 或 daptomycin 8-10 mg/kg IV q24h；人工瓣膜、持續菌血症或 perivalvular extension 要提早 Endocarditis Team / surgery review。",
      efaecalis: "常用 ampicillin 2 g IV q4h + ceftriaxone 2 g IV q12h；多數情境 6 weeks，並確認 high-level aminoglycoside resistance。",
      hacek: valve === "native" ? "Ceftriaxone 2 g IV q24h x 4 weeks。" : "Ceftriaxone 2 g IV q24h x 6 weeks。",
      negative: "先追問先前抗生素；送 Coxiella/Bartonella serology 或 PCR，依暴露評估 Brucella/T. whipplei/fungi；若有手術組織，送 culture、histology、16S/18S PCR 或 mNGS。",
      fungal: "立即感染科、心外科與 microbiology 共同處理；通常需 antifungal + surgery，人工瓣膜或無法手術者常需長期 suppression。",
    };
    return plans[organism];
  }, [organism, severity, valve]);

  return (
    <div>
      <div style={S.sectionHead}>
        <div style={S.sectionTitle}>互動式起始流程</div>
        <div style={S.sectionSubtitle}>把當下最需要做的事排順序，不用等所有結果到齊才開始想。</div>
      </div>

      <div style={S.flow}>
        <div style={S.flowStep}><span style={S.stepNo}>1</span><div><b>先判斷是否危急</b><div style={S.flowText}>Sepsis/shock、急性 pulmonary edema、new severe HF 或 major embolic complication，抽完 cultures 後不要延誤抗生素與外科會診。</div></div></div>
        <div style={S.connector}>↓</div>
        <div style={S.flowStep}><span style={S.stepNo}>2</span><div><b>抗生素前抽血培養</b><div style={S.flowText}>至少 3 sets（最低 2 sets），不同周邊穿刺處；每 set 含 aerobic + anaerobic bottle，不必等發燒尖峰，也沒有固定間隔要求。</div></div></div>
        <div style={S.connector}>↓</div>
        <div style={S.flowStep}><span style={S.stepNo}>3</span><div><b>TTE 起手，該做 TEE 就往下做</b><div style={S.flowText}>TTE negative 但高度懷疑、影像不佳、人工瓣膜或 CIED 時做 TEE；首輪陰性但仍高度懷疑，3-7 天後重做。</div></div></div>
        <div style={S.connector}>↓</div>
        <div style={S.flowStep}><span style={S.stepNo}>4</span><div><b>同時找病原、感染範圍與手術指標</b><div style={S.flowText}>每天追 cultures 至陰性；評估 valve dysfunction、abscess、conduction block、emboli、metastatic infection 與 source control。</div></div></div>
      </div>

      <Panel title="把個案帶進流程">
        <div style={S.formGrid}>
          <label style={S.label}>感染位置
            <select style={S.control} value={valve} onChange={(e) => setValve(e.target.value as ValveType)}>
              <option value="native">Native valve</option>
              <option value="prosthetic">Prosthetic valve / repair material</option>
              <option value="cied">CIED / lead-associated</option>
            </select>
          </label>
          <label style={S.label}>目前狀態
            <select style={S.control} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              <option value="stable">Hemodynamically stable</option>
              <option value="unstable">Sepsis/shock 或 acute HF</option>
            </select>
          </label>
          <label style={S.label}>病原
            <select style={S.control} value={organism} onChange={(e) => setOrganism(e.target.value as Organism)}>
              {organismOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label style={S.check}><input type="checkbox" checked={surgeryFlag} onChange={(e) => setSurgeryFlag(e.target.checked)} />有 severe valve dysfunction、abscess/AV block、persistent bacteremia、recurrent emboli 或 large mobile vegetation</label>
        </div>
        <div style={{ ...S.result, ...(severity === "unstable" || surgeryFlag ? S.resultUrgent : {}) }}>
          <div style={S.resultTitle}>{severity === "unstable" || surgeryFlag ? "立即啟動 Endocarditis Team / 心外科評估" : "診斷與治療同步推進"}</div>
          <div>{organismPlan}</div>
          {valve === "cied" && <div style={S.resultExtra}>CIED infection 的原則是抗生素加完整移除 generator 與 leads；只換 generator 或只拔部分 lead 不算完整 source control。</div>}
        </div>
      </Panel>

      <Panel title="2023 Duke-ISCVID 臨床分類小工具">
        <div style={S.dukeGrid}>
          <label style={S.label}>Major criteria 數量
            <select style={S.control} value={major} onChange={(e) => setMajor(Number(e.target.value))}>{[0, 1, 2].map((n) => <option key={n}>{n}</option>)}</select>
          </label>
          <label style={S.label}>Minor criteria 數量
            <select style={S.control} value={minor} onChange={(e) => setMinor(Number(e.target.value))}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
          </label>
        </div>
        <div style={S.dukeResult}>{duke}</div>
        <Bullets items={[
          "Major：符合條件的 microbiology；echo/cardiac CT 顯示 vegetation、perforation、aneurysm、abscess、fistula、新瓣膜逆流或 prosthetic dehiscence；特定 PET/CT；或手術直接看見 IE。",
          "Minor：predisposition、fever >38 C、vascular phenomena、immunologic phenomena、未達 major 的 microbiology、特定 PET/CT 或新瓣膜逆流但未達 major。",
          "Definite：2 major，或 1 major + 3 minor，或 5 minor。Possible：1 major + 1 minor，或 3 minor。",
        ]} />
      </Panel>
      <Source>AHA 2026 Scientific Statement；2023 Duke-ISCVID criteria；JCS 2026 guideline</Source>
    </div>
  );
}

function TherapyView() {
  return (
    <div>
      <div style={S.sectionHead}><div style={S.sectionTitle}>病原導向治療</div><div style={S.sectionSubtitle}>成人一般腎功能的常用起點。實際處方要依 MIC、瓣膜種類、CNS 併發症、腎功能、過敏與手術結果調整。</div></div>
      <Panel title="治療前與治療中共同原則" tone="warning">
        <Bullets items={[
          "能安全等待時，先抽足 blood cultures 再給抗生素；sepsis/shock 或 acute HF 不應為了湊間隔而延誤。",
          "培養陽性後改成最窄、可殺菌且足量的 definitive regimen；每天或每 24-48 小時重抽 cultures，直到 clearance。",
          "療程通常從第一天有效治療/血培陰性及 source control 綜合計算；手術後不一定自動重新從 0 算，交由 Endocarditis Team 決定。",
          "Vancomycin 用 AUC-guided TDM；gentamicin 需要腎功能、濃度與耳毒性監測。",
        ]} />
      </Panel>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>病原</th><th style={S.th}>Native valve</th><th style={S.th}>Prosthetic valve / material</th><th style={S.th}>重點</th></tr></thead>
          <tbody>{targetedTherapy.map((row) => <tr key={row.organism}><td style={S.tdStrong}>{row.organism}</td><td style={S.td}>{row.native}</td><td style={S.td}>{row.prosthetic}</td><td style={S.td}>{row.pearl}</td></tr>)}</tbody>
        </table>
      </div>
      <Panel title="Culture-negative 怎麼拆">
        <Bullets items={[
          "最常見不是神祕病原，而是先前已使用抗生素。先確認用過什麼、多久、最後一劑時間，並與 microbiology 討論培養策略。",
          "真正 fastidious/intracellular pathogens：Coxiella burnetii、Bartonella spp.、Brucella spp.、Tropheryma whipplei；依動物、旅遊、居住與職業暴露選 serology/PCR。",
          "手術瓣膜/栓塞組織要送 bacterial/fungal culture、histopathology、16S/18S PCR；需要時 mNGS。",
          "若炎症證據弱，也要考慮 NBTE、Libman-Sacks、腫瘤或其他非感染性贅生物。",
        ]} />
      </Panel>
      <Panel title="2026 AHA 對口服與長效治療的態度">
        <Bullets items={[
          "Partial oral therapy 不是一確診就改口服，只限急性期已控制、病原與口服組合可行、沒有未處理 abscess/手術指標、能可靠服藥與密集追蹤的選定病人。",
          "應由 Endocarditis Team 決定，不能只因住院不便就自行替換；POET 的證據族群也不能任意外推到所有病原與人工瓣膜。",
          "Dalbavancin/oritavancin 可是少數選定病人的替代策略，不是常規標準；未手術的 prosthetic E. faecalis IE 有 relapse 顧慮。",
        ]} />
      </Panel>
      <Source>AHA 2026 Scientific Statement；JCS 2026 Tables 22、24-31。院內 antibiogram 與感染科建議優先於此速查。</Source>
    </div>
  );
}

function NotesView() {
  return (
    <div>
      <div style={S.sectionHead}><div style={S.sectionTitle}>診斷、影像、手術與預防筆記</div><div style={S.sectionSubtitle}>把常見「下一步為什麼」集中在這裡。</div></div>
      <Panel title="何時高度懷疑 IE">
        <Bullets items={[
          "不明原因持續菌血症，尤其 S. aureus、E. faecalis、VGS、S. gallolyticus、HACEK 或 Candida。",
          "發燒合併新 murmur、prosthetic valve/repair material、CIED、既往 IE、注射藥物、近期 bacteremia 或 embolic phenomena。",
          "Stroke/splenic infarct/renal infarct/septic pulmonary emboli、脊椎炎、周邊膿瘍或 glomerulonephritis 找不到來源。",
          "新 PR prolongation/AV block 可能提示 perivalvular abscess，不能只當一般傳導異常。",
        ]} />
      </Panel>
      <Panel title="影像怎麼往下走">
        <div style={S.noteGrid}>
          <div style={S.noteItem}><b>TTE</b><span>所有疑似 IE 的第一線；看 vegetation、regurgitation、ventricular function 與 hemodynamic effect。</span></div>
          <div style={S.noteItem}><b>TEE</b><span>TTE 陰性但懷疑高、影像差、prosthetic valve、CIED、S. aureus bacteremia 或要找 abscess/perforation 時。</span></div>
          <div style={S.noteItem}><b>Repeat echo</b><span>首輪陰性但臨床仍高度懷疑，3-7 天後重做；出現新 HF、embolism、AV block 或 persistent bacteremia 也要重評。</span></div>
          <div style={S.noteItem}><b>Cardiac CT / FDG PET-CT</b><span>prosthetic/TAVR/CIED 或 echo 不確定時特別有價值；也可找 extracardiac emboli 與 metastatic infection。</span></div>
        </div>
      </Panel>
      <Panel title="外科警訊：不要等抗生素療程走完" tone="danger">
        <Bullets items={[
          "Heart failure：acute severe valve dysfunction、cardiogenic shock、pulmonary edema 或 refractory HF。",
          "Uncontrolled infection：annular/myocardial abscess、pseudoaneurysm、fistula、new conduction block、感染灶持續擴大。",
          "適當治療後約 3-5 天仍持續 bacteremia/fever，且排除其他感染來源。",
          "Fungi、MRSA/VRE、non-HACEK Gram-negative PVE 等難治病原。",
          "治療後仍 embolize，且 vegetation 持續 >10 mm 或增大；或 >10 mm mobile vegetation 合併 progressive valve dysfunction。",
          "Neurologic event 不等於一律不能手術；缺血性 stroke 與 intracranial hemorrhage 的時機不同，需心外科、神經科/神外共同決定。",
        ]} />
      </Panel>
      <Panel title="牙科預防：只有高風險心臟狀況 + 高風險牙科處置">
        <div style={S.tableWrap}><table style={S.table}><thead><tr><th style={S.th}>高風險心臟狀況</th><th style={S.th}>說明</th></tr></thead><tbody>{preventionRows.map((row) => <tr key={row[0]}><td style={S.tdStrong}>{row[0]}</td><td style={S.td}>{row[1]}</td></tr>)}</tbody></table></div>
        <Bullets items={[
          "需要操作 gingival tissue、牙根尖區或會穿破 oral mucosa 的牙科處置才考慮 prophylaxis。",
          "成人常用 amoxicillin 2 g PO，在處置前 30-60 分鐘單次。無法口服可用 ampicillin 2 g IM/IV 或 cefazolin/ceftriaxone 1 g IM/IV。",
          "Penicillin/ampicillin allergy 可用 cephalexin 2 g、azithromycin/clarithromycin 500 mg 或 doxycycline 100 mg；有 anaphylaxis/angioedema/urticaria 病史避免 cephalosporin。",
          "Clindamycin 已不再建議做牙科 IE prophylaxis。沒有活動性感染時，TEE、EGD、colonoscopy、cystoscopy 不常規給 IE prophylaxis。",
        ]} />
      </Panel>
      <Panel title="2026 更新要記什麼">
        <Bullets items={[
          "這次是 AHA Scientific Statement，不是新的 ACC/AHA clinical practice guideline；它更新 2015 AHA statement。",
          "採 2023 Duke-ISCVID：molecular pathogen testing、cardiac CT、FDG PET/CT 與手術直接所見進入現代診斷框架。",
          "更強調 multidisciplinary Endocarditis Team、較早的 procedural/surgical decision，而不是先把 6 週抗生素打完再說。",
          "Selected patients 可考慮 partial oral therapy 或 long-acting lipoglycopeptide，但需要嚴格選人與追蹤。",
          "Staphylococcal PVE 不再常規加 gentamicin；rifampin 沒有達成一致共識。",
          "右心 IE 在適當抗生素仍 uncontrolled infection、又屬高外科風險時，可在選定中心評估 percutaneous mechanical aspiration。",
        ]} />
      </Panel>
      <Source>AHA 2026 Scientific Statement and Professional Heart Daily summary；JCS 2026 guideline；AHA IE prophylaxis wallet card</Source>
    </div>
  );
}

export default function InfectiveEndocarditisTool() {
  const [tab, setTab] = useState<Tab>("workflow");
  const tabs: Array<{ id: Tab; label: string; short: string }> = [
    { id: "workflow", label: "臨床流程", short: "互動判斷" },
    { id: "therapy", label: "抗菌治療", short: "病原導向" },
    { id: "notes", label: "讀書筆記", short: "診斷/手術/預防" },
  ];
  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>AHA / JCS 2026</div>
        <h1 style={S.title}>感染性心內膜炎</h1>
        <div style={S.subtitle}>Infective Endocarditis Clinical Guide</div>
      </header>
      <div style={S.notice}><b>高風險疾病，流程要並行：</b> cultures、echo、有效抗生素、source control 與手術評估不是依序等候。此頁供速查與學習，實際治療需感染科、心臟科、心外科、影像與 microbiology 組成 Endocarditis Team。</div>
      <nav style={S.tabs} aria-label="Infective endocarditis sections">
        {tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} style={{ ...S.tab, ...(tab === item.id ? S.tabActive : {}) }}><span style={S.tabLabel}>{item.label}</span><span style={S.tabShort}>{item.short}</span></button>)}
      </nav>
      {tab === "workflow" ? <WorkflowView /> : tab === "therapy" ? <TherapyView /> : <NotesView />}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 18px" },
  kicker: { color: ACCENT, fontSize: 12, fontWeight: 850, textTransform: "uppercase", marginBottom: 5 },
  title: { margin: 0, color: "#0F172A", fontSize: 27, lineHeight: 1.2, fontWeight: 900, letterSpacing: 0 },
  subtitle: { color: "#64748B", fontSize: 14, marginTop: 4 },
  notice: { padding: 13, border: "1px solid #99F6E4", borderRadius: 8, background: "#F0FDFA", color: "#115E59", fontSize: 13, lineHeight: 1.6, marginBottom: 14 },
  tabs: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 16 },
  tab: { minWidth: 0, padding: "10px 8px", borderRadius: 8, border: "1.5px solid #DDE7EE", background: "#fff", color: "#475569", cursor: "pointer", textAlign: "left" },
  tabActive: { borderColor: ACCENT, background: "#F0FDFA", color: ACCENT },
  tabLabel: { display: "block", fontSize: 13, fontWeight: 850 },
  tabShort: { display: "block", color: "#94A3B8", fontSize: 10, marginTop: 2 },
  sectionHead: { margin: "8px 0 13px" },
  sectionTitle: { fontSize: 19, lineHeight: 1.3, color: "#0F172A", fontWeight: 900 },
  sectionSubtitle: { fontSize: 13, color: "#64748B", lineHeight: 1.55, marginTop: 4 },
  panel: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 12 },
  warningPanel: { background: "#FFFBEB", borderColor: "#FDE68A" },
  dangerPanel: { background: "#FFF7ED", borderColor: "#FDBA74" },
  panelTitle: { color: "#0F172A", fontSize: 15, fontWeight: 900, lineHeight: 1.35, marginBottom: 8 },
  list: { margin: "7px 0 0", paddingLeft: 19, color: "#334155", fontSize: 13, lineHeight: 1.6 },
  listItem: { marginBottom: 5 },
  source: { color: "#94A3B8", fontSize: 11, lineHeight: 1.5, margin: "8px 2px 14px" },
  flow: { border: "1px solid #CCFBF1", background: "#F8FFFE", borderRadius: 8, padding: 12, marginBottom: 14 },
  flowStep: { display: "grid", gridTemplateColumns: "30px minmax(0, 1fr)", gap: 9, alignItems: "start", color: "#134E4A", fontSize: 14, lineHeight: 1.45 },
  stepNo: { width: 28, height: 28, borderRadius: 999, background: ACCENT, color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900 },
  flowText: { color: "#475569", fontSize: 12, lineHeight: 1.55, marginTop: 3 },
  connector: { marginLeft: 13, color: "#5EEAD4", fontWeight: 900, lineHeight: 1.2, padding: "3px 0" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 },
  dukeGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  label: { display: "grid", gap: 5, color: "#475569", fontSize: 12, fontWeight: 850 },
  control: { width: "100%", minHeight: 42, padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, background: "#fff", color: "#0F172A", fontSize: 13, boxSizing: "border-box" },
  check: { display: "flex", alignItems: "center", gap: 8, minHeight: 42, padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, color: "#334155", fontSize: 12, lineHeight: 1.45, fontWeight: 750 },
  result: { marginTop: 12, border: "1px solid #99F6E4", background: "#F0FDFA", color: "#115E59", borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 1.6 },
  resultUrgent: { borderColor: "#FCA5A5", background: "#FEF2F2", color: "#991B1B" },
  resultTitle: { fontWeight: 900, marginBottom: 3 },
  resultExtra: { marginTop: 7, paddingTop: 7, borderTop: "1px solid currentColor" },
  dukeResult: { marginTop: 10, borderRadius: 8, padding: 11, background: "#F1F5F9", color: "#0F172A", fontWeight: 850, fontSize: 13, lineHeight: 1.5 },
  tableWrap: { overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff", marginBottom: 12 },
  table: { width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", padding: "10px 9px", borderBottom: "2px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontWeight: 900, verticalAlign: "bottom" },
  td: { minWidth: 170, padding: "10px 9px", borderBottom: "1px solid #F1F5F9", color: "#334155", lineHeight: 1.55, verticalAlign: "top" },
  tdStrong: { minWidth: 150, padding: "10px 9px", borderBottom: "1px solid #F1F5F9", color: "#0F172A", fontWeight: 850, lineHeight: 1.5, verticalAlign: "top" },
  noteGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 },
  noteItem: { display: "grid", gap: 4, padding: 10, border: "1px solid #E2E8F0", borderRadius: 8, background: "#F8FAFC", color: "#334155", fontSize: 12, lineHeight: 1.55 },
};
