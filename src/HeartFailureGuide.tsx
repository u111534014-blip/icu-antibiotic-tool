import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";

type Tab = "compare" | "hfrEF" | "decomp" | "notes";

const compareRows = [
  {
    topic: "命名與分類",
    esc: "2026 ESC：HFrEF 擴大為 LVEF <50%；HFmrEF 移除；HFpEF 為 LVEF >=50%。",
    aha: "2022 AHA/ACC/HFSA：HFrEF <=40%、HFmrEF 41-49%、HFpEF >=50%，另強調 HFimpEF。",
    take: "看舊資料時最容易混亂的就是 HFmrEF：AHA 仍保留，ESC 2026 已改用 HFrEF/HFpEF 兩大治療框架。",
  },
  {
    topic: "Stage 架構",
    esc: "2026 ESC 採用 Stage A-D：從風險因子、pre-HF、symptomatic HF 到 advanced HF。",
    aha: "AHA 早已使用 Stage A-D，並把預防、早期偵測、已症狀、advanced HF 分開。",
    take: "這是 ESC 2026 明顯往 AHA 架構靠近的地方：不只治療住院病人，也要抓 Stage A/B。",
  },
  {
    topic: "HFrEF 基礎治療",
    esc: "ESC 2026 用 FMT 表示 foundational medical therapy，核心仍是 neurohormonal modulation、MRA、SGLT2-I 等早期整合。",
    aha: "AHA 2022 強調四大 GDMT：ARNI/ACE-I/ARB、evidence-based beta-blocker、MRA、SGLT2 inhibitor。",
    take: "床邊思路相同：不要只加一顆再等很久，應盡早把四大類補齊，再逐步上調至可耐受劑量。",
  },
  {
    topic: "MRA",
    esc: "ESC 2026：MRA 推到 symptomatic HF independent of LVEF；HFrEF 用 steroidal MRA，HFpEF 可考慮 steroidal 或 non-steroidal MRA。",
    aha: "AHA 2022：HFrEF 為 Class I；HFpEF/HFmrEF 則較偏選擇性使用，證據強度較低。",
    take: "這是 2026 ESC 比 AHA 2022 更新、也更積極的地方。臨床仍要先看 K、eGFR、血壓與院內品項。",
  },
  {
    topic: "SGLT2 inhibitor",
    esc: "ESC 2026：decompensated HF 初步穩定後，建議院內啟動 SGLT2-I，以改善 QoL、congestion symptoms 並降低 HF hospitalization。",
    aha: "AHA 2022：SGLT2 inhibitor 為 HFrEF 四大 GDMT 之一；HFmrEF/HFpEF 也有建議。",
    take: "ESC 2026 對住院期啟動更明確。注意 eGFR、DKA 風險、禁食/休克/重症感染時機。",
  },
  {
    topic: "急性心衰用語",
    esc: "ESC 2026 用 decompensated HF 取代 acute HF，強調 congestion、diuretic response、院內啟動治療與出院銜接。",
    aha: "AHA 2022 仍常用 hospitalized/decompensated HF 的處理框架。",
    take: "對值班最重要：先判斷 congestion vs hypoperfusion，利尿、血管擴張劑、升壓/強心、氧合支持的方向完全不同。",
  },
  {
    topic: "肥胖與 HFpEF",
    esc: "ESC 2026：symptomatic HF、LVEF >=45%、BMI >=30 時，semaglutide 或 tirzepatide should be considered 改善體重、運動能力與 QoL。",
    aha: "AHA 2022 發布時 GLP-1/GIP 在 HFpEF 肥胖族群資料尚未完整寫入。",
    take: "這是 ESC 2026 明顯納入新證據的地方，但 ICU 急性期通常不是當下啟動的重點。",
  },
  {
    topic: "Advanced HF",
    esc: "ESC 2026 強調早期轉介 advanced HF center、I NEED HELP 類警訊、durable MCS/LVAD 與 transplant 評估。",
    aha: "AHA 2022 也有 Stage D/advanced HF 架構，重點是轉介、MCS、移植與安寧共同決策。",
    take: "如果反覆住院、利尿阻抗、低血壓、腎肝惡化、藥物上不去，就不要一直只調利尿劑，該想到 advanced HF。",
  },
];

const gdmtRows = [
  {
    className: "ARNI / ACE-I / ARB",
    examples: "Sacubitril/valsartan；ACE-I 如 enalapril/lisinopril；ARB 如 valsartan/losartan/candesartan",
    role: "降低死亡與 HF hospitalization。HFrEF 通常優先 ARNI；若不能用 ARNI，可用 ACE-I/ARB。",
    watch: "血壓、Cr/eGFR、K、血管性水腫史。ACE-I 轉 ARNI 需 washout 36 hr。",
  },
  {
    className: "Evidence-based beta-blocker",
    examples: "Carvedilol、bisoprolol、metoprolol succinate",
    role: "降低死亡、猝死與住院。穩定、非急性低灌流時啟動或上調。",
    watch: "心跳慢、AV block、低血壓、低輸出、急性失代償。Carvedilol alpha-blocking 較會降 BP；metoprolol succinate/bisoprolol 較 beta-1 selective。",
  },
  {
    className: "MRA",
    examples: "Spironolactone、eplerenone；ESC 2026 HFpEF 也納入 non-steroidal MRA 概念",
    role: "HFrEF 降死亡與住院；ESC 2026 對 symptomatic HF independent of LVEF 更積極。",
    watch: "K、eGFR、Cr。高血鉀或腎功能差時最容易被卡住；spironolactone 可能 gynecomastia，eplerenone 較少。",
  },
  {
    className: "SGLT2 inhibitor",
    examples: "Dapagliflozin、empagliflozin",
    role: "降低 HF hospitalization，HFrEF/HFpEF 都有角色；ESC 2026 強調 DHF 初步穩定後可院內啟動。",
    watch: "eGFR 下限、酮酸中毒風險、禁食/手術/休克/重症感染、泌尿生殖感染。利尿效果溫和，但和 loop diuretic 併用要看 volume。",
  },
];

const sameClassRows = [
  {
    group: "RAAS / ARNI",
    drugs: "Sacubitril/valsartan vs ACE-I vs ARB",
    compare: "HFrEF 若血壓、腎功能、K 可接受，通常優先想 ARNI。ACE-I 是熟悉、便宜的選項；ACE-I 咳嗽或不耐受時可用 ARB。",
    pearls: "ACE-I 轉 ARNI 要間隔 36 hr。血管性水腫史通常避免 ARNI/ACE-I。低血壓、AKI、高血鉀時先不要硬上調。",
  },
  {
    group: "Beta-blocker",
    drugs: "Carvedilol vs bisoprolol vs metoprolol succinate",
    compare: "三者都是 HFrEF 有 outcome benefit 的 beta-blocker。Carvedilol 另有 alpha-blocking，較會降 BP；bisoprolol/metoprolol succinate 較 beta-1 selective。",
    pearls: "若血壓很邊緣，常較偏 beta-1 selective。若 HR 慢、AV block、低輸出、剛從 shock 回來，先不要急著加量。",
  },
  {
    group: "MRA",
    drugs: "Spironolactone vs eplerenone vs finerenone",
    compare: "Spironolactone 便宜常用，但 gynecomastia、乳房痛等內分泌副作用較多。Eplerenone 較 selective，內分泌副作用少。Finerenone 是 non-steroidal MRA，較常從 CKD/DM 與 HFpEF 新證據脈絡去想。",
    pearls: "同類都要看 K/eGFR/Cr。不是 eplerenone 就不會高血鉀，只是 endocrine side effect 比 spironolactone 少。",
  },
  {
    group: "SGLT2 inhibitor",
    drugs: "Dapagliflozin vs empagliflozin",
    compare: "兩者在 HF 的角色很接近，選擇常看院內品項、給付、eGFR 門檻與共病適應症。降糖不是 HF 使用的唯一理由。",
    pearls: "急性休克、禁食、手術前後、DKA/HHS 或重症感染時先停或延後。開始後可有輕微利尿與 eGFR dip，要和脫水/AKI 分開看。",
  },
  {
    group: "其他加成藥物",
    drugs: "Ivabradine、digoxin/digitoxin、hydralazine/ISDN、vericiguat",
    compare: "這些不是四大類的替代品，而是在四大類已盡量補齊、仍有特定問題時加上去。",
    pearls: "Ivabradine 只適合 sinus rhythm 且 HR 仍快的族群。Hydralazine/ISDN 是不能用 RAAS/ARNI 或特定族群加成時才想。Vericiguat 偏近期惡化或反覆住院後的選項。",
  },
];

const addOnRows = [
  {
    drug: "Hydralazine + ISDN",
    role: "動脈擴張 + 靜脈擴張。ISDN = isosorbide dinitrate，和 NTG 同屬 nitrate/NO donor 類，主要降 preload；hydralazine 主要降 afterload，合用可降低心臟負擔。",
    when: "HFrEF LVEF <=40%、已最佳 FMT 仍有症狀的 self-identified Black patients；或 symptomatic HFrEF 不能使用 ARNI/ACE-I/ARB 時可考慮。",
    dose: "固定複方起始：hydralazine 37.5 mg + ISDN 20 mg TID；目標：hydralazine 75 mg + ISDN 40 mg TID。若分開開：hydralazine 25-50 mg TID/QID + ISDN 20-30 mg TID/QID，逐步上調。",
    watch: "頭痛、暈、低血壓、反射性心搏過速、服藥次數多。Hydralazine 長期高劑量要留意 lupus-like syndrome；PDE5 inhibitor 併 nitrate 禁忌。",
  },
  {
    drug: "Ivabradine",
    role: "抑制 sinus node If current，降低心跳但不太影響血壓或收縮力；只對 sinus rhythm 有意義。",
    when: "Symptomatic HFrEF、LVEF <=35%、sinus rhythm、resting HR >70 bpm，已使用最高可耐受 beta-blocker 仍心跳快；或無法耐受 beta-blocker 時可考慮。",
    dose: "常用 5 mg BID 起；高齡或心跳偏慢可 2.5 mg BID 起；依 HR 調整，常見上限 7.5 mg BID。",
    watch: "AF、bradycardia、conduction disease、phosphenes。若不是 sinus rhythm，給了也沒有主要作用點。",
  },
  {
    drug: "Digoxin / digitoxin",
    role: "降低 HF hospitalization，也可在 AF 合併 HF 時協助 rate control；不是降死亡的四大類基礎藥。",
    when: "Symptomatic HFrEF、LVEF <=40%、已最佳 FMT 仍有症狀；或 AF rate control 在 beta-blocker 不足/不耐受時加用。",
    dose: "Digoxin 常用 0.125 mg QD；高齡、低體重、腎功能差常需 0.0625 mg QD 或 QOD。用藥後可接 Digoxin TDM 工具追濃度與毒性。",
    watch: "腎功能、K/Mg/Ca、bradycardia、AV block、噁心、視覺異常、arrhythmia。低 K/低 Mg 會增加毒性風險。",
  },
  {
    drug: "Vericiguat",
    role: "Soluble guanylate cyclase stimulator，增強 NO-sGC-cGMP pathway；定位偏反覆惡化後的風險降低。",
    when: "Symptomatic HFrEF、LVEF <45%、已最佳 FMT 但近期仍有 HF worsening / HF hospitalization 時可考慮。",
    dose: "2.5 mg QD with food 起，每約 2 週上調至 5 mg QD，再至目標 10 mg QD。",
    watch: "低血壓、貧血。PDE5 inhibitor 或 riociguat 併用需避免；SBP 很低時通常不適合啟動。",
  },
];

const therapyTermRows = [
  {
    term: "FMT",
    full: "Foundational medical therapy",
    meaning: "ESC 2026 用來指心衰竭基礎藥物治療。可以把它理解成：有 outcome benefit、應盡早補齊並 titrate 的核心藥物框架。",
    examples: "HFrEF 常會想到 ARNI/ACE-I/ARB、beta-blocker、MRA、SGLT2-I；ESC 2026 對 symptomatic HF independent of LVEF 的 SGLT2-I/MRA 也更積極。",
  },
  {
    term: "GDIT",
    full: "Guideline-directed interventional therapy",
    meaning: "不是藥物，而是 guideline 支持的介入或裝置治療。",
    examples: "依情境包含 ICD/CRT、瓣膜介入、冠脈 revascularization、消融、mechanical circulatory support、LVAD/transplant 評估等。",
  },
  {
    term: "AMT",
    full: "Advanced medical therapy",
    meaning: "ESC 2026 在 advanced HF 脈絡會和 FMT/GDIT 並列，提醒不是只看基礎藥物與裝置，也要評估更高階的醫療處置與轉介。",
    examples: "例如需要 inotrope、temporary/durable MCS、移植評估、advanced HF center 共同照護時，不要只在病房反覆加利尿劑。",
  },
];

const diureticRows = [
  {
    situation: "沒有長期使用 loop diuretic",
    start: "Furosemide 20-40 mg IV once；若 congestion 明顯或腎功能差，常從 40 mg IV 起。",
    reassess: "2-6 hr 看尿量、症狀、血壓、Cr、Na/K/Mg；反應不足可加倍。",
  },
  {
    situation: "已長期使用口服 loop diuretic",
    start: "初始 IV daily dose 約等於口服 total daily dose 的 1-2.5 倍。例：home furosemide 40 mg PO BID，可考慮 40-100 mg IV/day 分次或 continuous infusion。",
    reassess: "口服 furosemide 生體可用率變異大；DHF 腸胃水腫時 PO 吸收更不可靠，所以住院常先改 IV。",
  },
  {
    situation: "利尿反應不足",
    start: "先確認真的還有 congestion，再把 loop dose 加倍；必要時改 q8-12h 或 continuous infusion。",
    reassess: "若仍不夠，可短期加 thiazide-type diuretic 或 acetazolamide。加藥後要密集追 Na/K/Mg/Cr 與血壓。",
  },
];

function NoteCard({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} style={S.noteCard}>
      <summary style={S.noteSummary}>{title}</summary>
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

function Pill({ children }: { children: ReactNode }) {
  return <span style={S.pill}>{children}</span>;
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

export default function HeartFailureGuide() {
  const [tab, setTab] = useState<Tab>("compare");

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>HF Guidelines</div>
        <h1 style={S.title}>2026 ESC vs AHA/ACC/HFSA 心衰竭讀書筆記</h1>
        <p style={S.subtitle}>把最新 ESC 2026 的新分類與新建議，對照 AHA/ACC/HFSA 2022 的常用框架。</p>
      </header>

      <section style={S.notice}>
        <strong>最大差異：</strong>ESC 2026 把 HFrEF 擴到 LVEF &lt;50%，移除 HFmrEF，採 Stage A-D，並新增 FMT/GDIT/AMT 等治療分類。AHA 2022 則仍保留 HFmrEF 與 HFimpEF，並用四大 GDMT 當 HFrEF 核心。
      </section>

      <div style={S.tabBar}>
        {([
          ["compare", "ESC vs AHA"],
          ["hfrEF", "慢性 HF 治療"],
          ["decomp", "DHF / 急性失代償"],
          ["notes", "讀書筆記"],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...S.tabButton, ...(tab === id ? S.tabButtonActive : {}) }}>{label}</button>
        ))}
      </div>

      {tab === "compare" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>核心差異對照</div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>主題</th>
                  <th style={S.th}>ESC 2026</th>
                  <th style={S.th}>AHA/ACC/HFSA 2022</th>
                  <th style={S.th}>值班翻譯</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.topic}>
                    <td style={S.tdStrong}>{row.topic}</td>
                    <td style={S.td}>{row.esc}</td>
                    <td style={S.td}>{row.aha}</td>
                    <td style={S.td}>{row.take}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "hfrEF" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>慢性心衰治療框架</div>
          <div style={S.pillRow}>
            <Pill>ARNI / ACE-I / ARB</Pill>
            <Pill>Evidence-based beta-blocker</Pill>
            <Pill>MRA</Pill>
            <Pill>SGLT2 inhibitor</Pill>
          </div>
          <NoteCard title="1. 先補齊四大類，再慢慢上調" open>
            <p>AHA 2022 的值班版記法是四大 GDMT。ESC 2026 改用 FMT，但臨床意思很接近：若沒有禁忌，應在相對短時間內把基礎治療類別補齊，再用血壓、心率、腎功能、K、症狀去 titrate。</p>
          </NoteCard>
          <NoteCard title="2. 四大類藥物總覽" open>
            <SmallTable
              columns={["類別", "常見藥物", "主要角色", "注意事項"]}
              rows={gdmtRows.map((row) => ({
                類別: row.className,
                常見藥物: row.examples,
                主要角色: row.role,
                注意事項: row.watch,
              }))}
            />
          </NoteCard>
          <NoteCard title="3. 同一類裡面怎麼選？" open>
            <SmallTable
              columns={["類別", "藥物比較", "怎麼想", "值班提醒"]}
              rows={sameClassRows.map((row) => ({
                類別: row.group,
                藥物比較: row.drugs,
                怎麼想: row.compare,
                值班提醒: row.pearls,
              }))}
            />
          </NoteCard>
          <NoteCard title="4. 慢性 HFrEF 加成藥物">
            <SmallTable
              columns={["藥物", "角色", "什麼時候想", "常用劑量", "注意"]}
              rows={addOnRows.map((row) => ({
                藥物: row.drug,
                角色: row.role,
                什麼時候想: row.when,
                常用劑量: row.dose,
                注意: row.watch,
              }))}
            />
          </NoteCard>
          <NoteCard title="5. 不能加藥或上調時，通常卡在哪裡？">
            <Bullets items={[
              "血壓太低：不是所有低 BP 都不能加藥。先看有沒有低灌流；若只是慢性低 BP 但尿量、意識、乳酸都可以，有些 GDMT 仍能低劑量開始。",
              "心跳太慢或 AV block：beta-blocker、digoxin、amiodarone、ivabradine 都可能讓 HR 更慢，這時要先釐清哪個藥最需要調。",
              "K 太高或 eGFR 太差：MRA、ACE-I/ARB/ARNI 最常被限制。先處理高血鉀、確認腎功能是暫時 AKI 還是慢性 CKD。",
              "仍然明顯鬱血：病人還很 wet 時，利尿與去鬱血常比急著上調 beta-blocker 更優先。",
              "剛從 shock/低輸出恢復：強心劑或升壓劑剛停、乳酸/尿量還不穩時，先穩住 perfusion，再談上調。",
            ]} />
          </NoteCard>
          <NoteCard title="6. HFpEF / 2026 ESC 更新重點">
            <p>ESC 2026 對 symptomatic HF independent of LVEF 的 MRA 更積極，並把肥胖 HFpEF 的 semaglutide/tirzepatide 納入建議。這些多半不是 ICU 立即處置核心，但出院後門診銜接很重要。</p>
          </NoteCard>
        </section>
      )}

      {tab === "decomp" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>Decompensated HF 值班路徑</div>
          <NoteCard title="第一步：先分 congestion / hypoperfusion" open>
            <Bullets items={[
              "Congestion：喘、肺水腫、JVP 高、水腫、體重上升、CXR/echo/IVC 支持。主軸是 IV loop diuretic，追尿量、體重、電解質、腎功能。",
              "Hypoperfusion：冷、意識差、尿量少、乳酸高、肝腎惡化、低 pulse pressure。主軸是找 shock 原因，必要時 inotrope/vasopressor/MCS。",
              "兩者同時存在：wet and cold，是最需要早期求救與嚴密監測的類型。",
            ]} />
          </NoteCard>
          <NoteCard title="利尿反應怎麼看？">
            <SmallTable
              columns={["情境", "初始劑量", "重評重點"]}
              rows={diureticRows.map((row) => ({
                情境: row.situation,
                初始劑量: row.start,
                重評重點: row.reassess,
              }))}
            />
            <Bullets items={[
              "床邊常用目標：給 IV loop 後 2 小時尿鈉若仍低（常用 cutoff 約 <50-70 mEq/L）或前 6 小時尿量不足，代表 natriuretic/diuretic response 不佳。",
              "尿量粗抓：若沒有休克或嚴重 AKI，常期待至少約 100-150 mL/hr 的早期尿量反應；但要和 fluid intake、血壓、腎功能一起看。",
              "反應不好不要只等到隔天：ESC 2026 提到可用早期 urinary sodium guided strategy，目的就是早點加強利尿，而不是看一天 I/O 後才發現沒退水。",
              "加強方式：loop dose 加倍、增加頻率、continuous infusion、或 sequential nephron blockade。加 thiazide/acetazolamide 後特別容易低 K、低 Na、AKI。",
              "如果同時 cold / hypoperfusion，利尿劑可能打不動；這時要先處理低輸出或 shock，而不是無限加 loop。",
            ]} />
          </NoteCard>
          <NoteCard title="住院期啟動 SGLT2-I">
            <p>ESC 2026 明確建議 decompensated HF 初步穩定後院內啟動 SGLT2-I。實務上要避開休克、DKA/酮酸中毒風險、嚴重感染、禁食、手術前後或 eGFR 不符合藥品限制的情境。</p>
          </NoteCard>
          <NoteCard title="什麼時候想到 advanced HF / shock team？">
            <Bullets items={[
              "反覆 HF hospitalization、利尿阻抗、需要 inotrope/vasopressor、低血壓導致 GDMT 上不去。",
              "腎肝功能因低灌流惡化、CI 很低、乳酸升高、尿量差。",
              "疑似 MI mechanical complication、嚴重瓣膜問題、需要 temporary MCS 評估。",
            ]} />
          </NoteCard>
          <NoteCard title="Levosimendan (Simdax) 的臨床角色">
            <Bullets items={[
              "定位：不是例行利尿或慢性 GDMT，而是低心輸出、hypoperfusion、標準處置後仍不穩時的 inodilator 選項。",
              "優點：增加 contractility 的機轉不靠 beta receptor，病人已使用 beta-blocker 時仍可能有效；同時可降低 afterload/pulmonary vascular resistance。",
              "限制：會 vasodilate，低血壓或 shock 未被 norepinephrine/MCS 撐住時可能更低。通常需要 ICU/CCU 監測與心臟科共同評估。",
              "劑量概念：0.05-0.2 mcg/kg/min continuous infusion，常見 24 hr；loading 6-12 mcg/kg over 10 min 雖見於仿單，但低血壓風險高時常省略。",
            ]} />
          </NoteCard>
        </section>
      )}

      {tab === "notes" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>讀書筆記</div>
          <NoteCard title="Stage A-D 怎麼背？" open>
            <Bullets items={[
              "Stage A：有風險，還沒有結構心臟病或症狀。重點是 HTN、DM、obesity、CAD、生活型態。",
              "Stage B：pre-HF，有結構異常、LV dysfunction 或 biomarker/影像異常，但還沒症狀。",
              "Stage C：已經有 symptomatic HF 或過去有 HF 症狀。",
              "Stage D：advanced HF，反覆失代償、低輸出、利尿阻抗、需要高階治療或安寧共同決策。",
            ]} />
          </NoteCard>
          <NoteCard title="HFimpEF 是什麼？">
            <p>AHA 2022 特別強調 HFimpEF：原本 HFrEF，後來 LVEF 改善到 &gt;40%。重點是不要因為 EF 變好就直接停 GDMT，因為停藥後可能復發。ESC 2026 也強調即使 asymptomatic 或 LVEF improvement，FMT 仍建議維持在最高可耐受劑量；只有高度選擇、可逆病因完全改善者，才考慮在嚴密追蹤下逐步停藥。</p>
          </NoteCard>
          <NoteCard title="Cardiac glycoside / digoxin 在哪裡？">
            <p>ESC 2026 將 cardiac glycoside（digoxin 或 digitoxin）在 symptomatic HFrEF、LVEF &lt;=40%、已最佳 FMT 仍有症狀者，提升為 should be considered 以降低 HF hospitalization。合併 AF 且 beta-blocker 不足或不能用時，digoxin 也可作 rate control。這和你的 Digoxin TDM 工具可以接起來用。</p>
          </NoteCard>
          <NoteCard title="Hydralazine/ISDN 怎麼記？">
            <Bullets items={[
              "ISDN 是 isosorbide dinitrate。可以先把它記成 nitrate 類、概念上像 nitroglycerin (NTG)：透過 NO/cGMP 讓血管擴張，臨床上以 venodilation、降低 preload 為主。",
              "差別是 NTG 在 ICU/急診常見 IV drip 或舌下，偏急性胸痛、ACS、高血壓肺水腫；ISDN 多為口服，和 hydralazine 搭配用於 HFrEF 的長期加成或 RAAS/ARNI 不能用時。",
              "它不是 ACE-I/ARB/ARNI 的第一線替代品中最漂亮的選項，但當 RAAS/ARNI 因腎功能、高血鉀、血管性水腫或不耐受卡住時，就會變得有用。",
              "AHA 2022 對 self-identified African American、NYHA III-IV HFrEF、已最佳治療仍症狀者是 Class I；ESC 2026 對 self-identified Black patients、LVEF <=40%、optimal FMT 後仍症狀者是 IIa。",
              "若只是一般 symptomatic HFrEF、LVEF <=40%、不能用 ARNI/ACE-I/ARB，ESC 2026 與 AHA 2022 都是較弱的 may be considered/IIb。",
              "Nitrate 類要確認沒有 PDE5 inhibitor；頭痛和低血壓很常限制上調。",
            ]} />
          </NoteCard>
          <NoteCard title="FMT / GDIT / AMT 名詞速查" open>
            <SmallTable
              columns={["縮寫", "全名", "意思", "常見例子"]}
              rows={therapyTermRows.map((row) => ({
                縮寫: row.term,
                全名: row.full,
                意思: row.meaning,
                常見例子: row.examples,
              }))}
            />
          </NoteCard>
          <NoteCard title="出院前檢查清單">
            <Bullets items={[
              "還有沒有 congestion？利尿劑劑量與體重目標是否清楚？",
              "四大 GDMT/FMT 是否能啟動？不能啟動的原因有沒有寫清楚？",
              "K、Cr、血壓、心率是否有追蹤計畫？",
              "是否需要 device 評估：ICD/CRT、QRS/LBBB、EF reassessment 時間？",
              "是否需要 advanced HF、心臟復健、HF clinic、營養/衛教、疫苗、鐵劑、sleep apnea 或 amyloid workup？",
            ]} />
          </NoteCard>
          <NoteCard title="來源與版本">
            <p>ESC：2026 ESC Guidelines for the management of heart failure，官方 ESC guideline page 發布日期 2026-08-28，official slides 顯示 European Heart Journal 2026、doi: 10.1093/eurheartj/ehag100。</p>
            <p>AHA：2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure；ACC key perspectives last updated October 2023。</p>
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
  tableWrap: { overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 840 },
  th: { textAlign: "left", background: "#F8FAFC", color: "#475569", padding: "10px 12px", borderBottom: "1px solid #E2E8F0", fontSize: 13 },
  td: { verticalAlign: "top", padding: "11px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155", fontSize: 13, lineHeight: 1.6 },
  tdStrong: { verticalAlign: "top", padding: "11px 12px", borderBottom: "1px solid #E2E8F0", color: "#0F172A", fontSize: 13, fontWeight: 900, lineHeight: 1.6 },
  pillRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  pill: { display: "inline-flex", borderRadius: 999, background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#047857", padding: "6px 10px", fontSize: 12, fontWeight: 900 },
  noteCard: { border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", marginBottom: 10, background: "#FFFFFF" },
  noteSummary: { cursor: "pointer", fontSize: 15, fontWeight: 900, color: "#0F172A" },
  noteBody: { color: "#334155", fontSize: 14, lineHeight: 1.75, marginTop: 10 },
  bullets: { margin: 0, paddingLeft: 20 },
  bullet: { marginBottom: 8 },
};
