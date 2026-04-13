// ╔══════════════════════════════════════════════════════════════════╗
// ║  📦 藥物資料庫集合處                                              ║
// ║                                                                ║
// ║  🆕 要新增藥物時：                                                 ║
// ║    1. 在 drugs/ 資料夾新增一個 xxx.js 檔                          ║
// ║    2. 在下方 import 一行                                          ║
// ║    3. 在 DRUG_REGISTRY 裡加一行                                   ║
// ║  就這樣！App.jsx 不用動。                                          ║
// ║                                                                ║
// ║  命名慣例：                                                      ║
// ║  - name: 原廠商品名（如 Bactrim、Mepem、Cresemba）                ║
// ║  - subtitle: 學名（成分名）                                       ║
// ║  - searchTerms: 別名、院內品項、中文名（搜尋用）                    ║
// ╚══════════════════════════════════════════════════════════════════╝

import { bactrim } from './bactrim';
import { mepem } from './mepem';
import { cresemba } from './cresemba';
import { tygacil } from './tygacil';
import { unasyn } from './unasyn';
import { tazocin } from './tazocin';
import { brosym } from './brosym';
import { vfend } from './vfend';

export const DRUG_REGISTRY = {
  bactrim,
  mepem,
  cresemba,
  tygacil,
  unasyn,
  tazocin,
  brosym,
  vfend,
};
