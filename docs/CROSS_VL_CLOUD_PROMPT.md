完整提示詞已嵌入最新 Apps Script。可搭配同目錄的 [VL_cloud_sync_reference.zip](VL_cloud_sync_reference.zip)，包內含前端連線、同步、接線範例與測試。

請直接修正這個虛擬實驗室（VL）的「學生使用不同瀏覽器／手機作答，教師無法在同一份全班 Excel 看到紀錄」問題。請先檢查現有程式並完成實作、測試及說明，保留本 VL 的題目、活動流程、視覺風格、反思、PDF 和教師評分功能。

目標：不同裝置的學生答案集中保存，教師 tzechingchan0605@gmail.com 在任何瀏覽器登入教師版後，可以查看所有已成功上傳的紀錄，並重新下載包含它們的全班 Excel。Google 試算表集中保存原始紀錄；網站重新生成 Excel，不會修改教師電腦上先前下載的檔案。人工評分仍依現有功能另行保存，不因重新匯出而覆寫。

請參考附件的 VL1 最新程式，尤其是 Apps Script、cloud-bridge.js、cloud-sync.js 及 app.js 的儲存、教師讀取與 Excel 接線。附件 app.js 是接線範例，不要整份替代這個 VL 的活動程式。以下要求必須同時處理前端及收集端：

1. 檢查現有儲存格式、模組 ID、登入／示範模式、舊紀錄、匯出程式及後端。每個 VL 使用自己的 Apps Script 專案、/exec 網址及工作表名稱；可以用同一教師帳戶，也可使用同一私人試算表內的不同工作表。VL1 收集端只接受消化系統的 MODULE，請為本 VL 調整識別值並建立本 VL 的收集端，保持 VL1 紀錄完整。

2. localStorage 保留為備份及持久待傳佇列，加上集中儲存。各 VL 的本機儲存鍵、待傳權限及同步確認資料使用各自命名空間。保留及遷移原有資料，讀取損壞時保留原值並提示，不用空陣列覆寫。適配本 VL 原有資料格式，完整保存答案、圖片、原始快照、首次確認及最後答案、反思、實驗／修訂事件、原始時間戳及用時，不能捏造缺失欄位。

3. 每次探究使用獨立 ID；同一電郵再次登入也是新探究。同一探究按 ID 更新較新版本，保護已有較新紀錄，不能用「電郵＋模組」覆蓋多次探究。學生寫入使用每份探究獨立 token，伺服器驗證其雜湊及紀錄所有權。重試具冪等性，不新增重複列、不清空本機、不開始新探究、不隱藏其他探究。

4. 參考最新版 Apps Script 嵌入頁＋google.script.run＋postMessage 連線，處理之前直接跨網站 fetch 出現 Failed to fetch 的問題。前端限制訊息來源、使用不可猜測的隨機通道及請求 ID，正確處理 Google 巢狀 iframe。兩端訊息協定必須一致。只在收到收集端確認 {ok:true,id:正確探究ID} 後標示已同步；不能把 no-cors 的不可讀回應當作已保存，也不能在沒有待傳資料／未完成請求時顯示成功。

5. 作答後先保存本機，再自動上傳並適度合併連續更新。離線、逾時、權限或收集端錯誤時保留待傳資料；提供「重試同步／重試同步舊紀錄」、重新連線及定期重試。重新整理仍依本 VL 原有登入規則處理，舊資料可在原瀏覽器重新開頁後補傳。離頁傳送不能保證成功，保留未確認的本機資料。

6. 登入頁及探究頁清楚顯示「未設定雲端」、「已設定但尚未確認連線／保存」、「等待同步」、「已確認儲存」、「同步失敗」。原 /exec 網址顯示 ok:true 或版本號，只證明可取得該回應，不能當成學生儲存或教師讀取已成功的證據。

7. 教師全班讀取由後端驗證獨立密碼；只輸入教師電郵不算授權。密碼只留在當前頁面記憶體，不寫入 GitHub、公開設定或 localStorage。列出紀錄必須受保護。教師示範在前端儲存及後端收集層均排除，不能進入學生紀錄、操作事件、全班 Excel 或評分。保持個別報告唯讀。

8. 教師列表、個別報告及 Excel 匯出必須讀取本 VL 雲端的全部分頁，再按 ID／版本與本機資料合併。提供「重新載入紀錄」，匯出前重新讀取。讀取失敗時明確提示並阻止把部分本機資料當作完整全班資料匯出。保留既有 Excel 工作表、圖片、配色、評分欄、公式及驗證。

9. 初始化請使用附件最新 setupCollector，支援獨立及綁定 Apps Script 專案，完全不使用 SpreadsheetApp.getUi()、prompt 或 alert。私人 Script Properties 設定 SPREADSHEET_ID（接受完整 Google Sheet 網址或 ID）及 SETUP_TEACHER_PASSWORD（至少 12 字元）。只在工作表成功準備後保存正規化 ID／密碼雜湊，成功後刪除暫存密碼。再次執行保留現有學生列，未提供新密碼時沿用已有雜湊。記錄及錯誤訊息不顯示密碼或雜湊。

10. 大紀錄及圖片採分段保存，明確限制尺寸並提示，不能靜默截斷。試算表文字防公式注入；並行寫入使用鎖。讀取分段須能完整還原原文。學生自填電郵是識別欄，不宣稱它已驗證 Google 身分。

11. 附中英文 Google 設定步驟：Project Settings／專案設定 → Script Properties／指令碼屬性 → Add script property／新增指令碼屬性 → Save script properties／儲存指令碼屬性；Editor／編輯器選 setupCollector → Run／執行。部署執行身分為自己，存取權為所有人，使用 /exec。更新已部署程式時：Deploy／部署 → Manage deployments／管理部署 → Edit／編輯 → New version／新版本 → Deploy／部署。初始化設定成功應在 Execution log／執行記錄顯示；不能要求我分享密碼或 GitHub token。

12. 做有意義的驗證：兩個獨立學生瀏覽器（其中一個手機尺寸）及第三個教師瀏覽器；同電郵多次探究；舊版本不覆蓋新版本；圖片、原始／最後答案及完整事件；斷線、重新整理、重試補傳；錯誤密碼不能列出紀錄；教師示範前後學生紀錄／Excel 不變；實際 Excel 包含各瀏覽器紀錄且保留評分功能。模擬測試使用獨立資料，避免污染正式學生紀錄。區分模擬測試、實際 Google 部署及真實跨裝置讀寫；不能把僅有健康回應或本機模擬測試說成正式收集成功。

完成程式及測試後，按這個聊天的 GitHub 授權更新本 VL 儲存庫。如果缺少 Google 部署權限／公開網址，先完成所有可獨立進行的程式與測試，給我清楚的帳戶設定步驟；取得本 VL 的 /exec 網址後再接入及驗證。請最後簡述修改、測試結果、仍待完成的部署項目。不要只停在建議清單。

參考程式目前包含 VL1 的模組／標籤及資料欄位。請按這個 VL 的實際結構適配 MODULE、工作表／服務名稱、學生篩選、本機儲存鍵及介面文字；如果變更訊息協定前綴，必須同步修改前後端。

## 最新參考來源（固定版本）

- cloud/Code.gs: https://github.com/tzechingchan0605-cloud/Digestive-System/blob/efdc7f75f62c4f28e2178d6fefe71b8b708e55d5/cloud/Code.gs
- cloud-bridge.js: https://github.com/tzechingchan0605-cloud/Digestive-System/blob/efdc7f75f62c4f28e2178d6fefe71b8b708e55d5/cloud-bridge.js
- cloud-sync.js: https://github.com/tzechingchan0605-cloud/Digestive-System/blob/efdc7f75f62c4f28e2178d6fefe71b8b708e55d5/cloud-sync.js
- app.js: https://github.com/tzechingchan0605-cloud/Digestive-System/blob/efdc7f75f62c4f28e2178d6fefe71b8b708e55d5/app.js
- cloud/SETUP.md: https://github.com/tzechingchan0605-cloud/Digestive-System/blob/efdc7f75f62c4f28e2178d6fefe71b8b708e55d5/cloud/SETUP.md
- tests/cloud_setup.cjs: https://github.com/tzechingchan0605-cloud/Digestive-System/blob/efdc7f75f62c4f28e2178d6fefe71b8b708e55d5/tests/cloud_setup.cjs
- tests/cloud.cjs: https://github.com/tzechingchan0605-cloud/Digestive-System/blob/efdc7f75f62c4f28e2178d6fefe71b8b708e55d5/tests/cloud.cjs

## 附錄：VL1 最新 Apps Script（實際參考版本）

此程式仍使用 VL1 的 MODULE 與工作表名稱，請依提示適配本 VL。前端橋接及同步程式已收錄於參考包，必須一併整合。

```javascript
/** Google Apps Script collector for VL1 (bound or standalone). Deploy as owner, accessible to anyone.
 * Teacher reads require a private password; students can only write their own IDs.
 * No endpoint can list records without the password. Never expose Script Properties.
 */
const MODULE = 'VL_BIO_DIGESTION_OPTION_A';
const TEACHER = 'tzechingchan0605@gmail.com';
const SHEET = 'VL1雲端紀錄';
const CHUNK = 40000;
const MAX_CHUNKS = 24;

function setupCollector() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== TEACHER) throw Error('請以 tzechingchan0605@gmail.com 執行設定');
  const properties = PropertiesService.getScriptProperties();
  let source = String(properties.getProperty('SPREADSHEET_ID') || '').trim();
  if (!source) {
    // A bound script may supply its sheet. Standalone projects use a private property.
    let active = null;
    try {active = SpreadsheetApp.getActiveSpreadsheet();} catch (error) {}
    if (active) source = active.getId();
  }
  if (!source) throw Error('請在 Project Settings → Script Properties 加入 SPREADSHEET_ID，值可填 Google Sheet 完整網址，再按 Run 執行 setupCollector');
  const match = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:[/?#]|$)/.exec(source);
  const bookId = match ? match[1] : source;
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(bookId)) throw Error('SPREADSHEET_ID 無效，請填 Google Sheet 完整網址或試算表 ID');
  const password = properties.getProperty('SETUP_TEACHER_PASSWORD');
  let passwordHash = properties.getProperty('TEACHER_PASSWORD_HASH');
  if (password !== null) {
    if (typeof password !== 'string' || password.length < 12) throw Error('SETUP_TEACHER_PASSWORD 須至少 12 字元；請使用獨立密碼，勿使用 Google 帳戶密碼');
    passwordHash = digest(password);
  } else if (!/^[0-9a-f]{64}$/.test(passwordHash || '')) {
    throw Error('請在 Project Settings → Script Properties 加入 SETUP_TEACHER_PASSWORD，值為至少 12 字元的獨立教師密碼，再執行 setupCollector');
  }
  const book = SpreadsheetApp.openById(bookId);
  const sheet = book.getSheetByName(SHEET) || book.insertSheet(SHEET);
  if (sheet.getMaxColumns() < MAX_CHUNKS + 4) sheet.insertColumnsAfter(sheet.getMaxColumns(), MAX_CHUNKS + 4 - sheet.getMaxColumns());
  if (!sheet.getLastRow()) sheet.appendRow(['探究識別碼', '寫入權限雜湊', '版本時間', '分段數', ...Array.from({length: MAX_CHUNKS}, (_, i) => '原始紀錄分段' + (i + 1))]);
  // Keep existing working configuration until the new sheet is ready. No UI APIs.
  properties.setProperties({SPREADSHEET_ID: bookId, TEACHER_PASSWORD_HASH: passwordHash});
  if (password !== null) properties.deleteProperty('SETUP_TEACHER_PASSWORD');
  const message = '設定完成：已連結試算表並建立／保留 VL1雲端紀錄。請返回實驗室按重試同步。';
  Logger.log(message);
  return {ok: true, message};
}
function digest(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}
function equalHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
function output(value) {return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function doGet(event) {
  if (event?.parameter?.view === 'bridge') return bridgePage_(event.parameter);
  return output({ok: true, service: 'VL1集中紀錄', version: 2});
}
// The embedded page uses Google's own RPC transport instead of cross-origin fetch.
function bridgePage_(parameters) {
  if (!/^[0-9a-f-]{36}$/i.test(parameters.channel || '') || !/^https?:\/\/[^\/\s?#]+$/.test(parameters.parentOrigin || '')) throw Error('連線參數無效');
  const safe = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
    const channel = ${safe(parameters.channel)}, parentOrigin = ${safe(parameters.parentOrigin)};
    const topWindow = window.top;
    function announce() {topWindow.postMessage({type:'vl1-ready',channel},parentOrigin);}
    const readyTimer = setInterval(announce,500);
    window.addEventListener('message',function(event) {
      if(event.source !== topWindow || event.origin !== parentOrigin || !event.data || event.data.channel !== channel) return;
      const message=event.data;
      if(message.type==='vl1-connected') {clearInterval(readyTimer);return;}
      if(message.type!=='vl1-request' || typeof message.id!=='string') return;
      const respond=reply=>topWindow.postMessage(Object.assign({type:'vl1-response',channel,id:message.id},reply),parentOrigin);
      google.script.run.withSuccessHandler(result=>respond({result}))
        .withFailureHandler(error=>respond({error:error.message||'雲端執行失敗'})).collectorBridge(message.payload);
    });
    announce();
  </script></body></html>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function collectorBridge(data) {
  return JSON.parse(doPost({postData:{contents:JSON.stringify(data)}}).getContent());
}
function doPost(event) {
  let lock;
  try {
    const raw = event?.postData?.contents;
    if (!raw || raw.length > 1000000) throw Error('請求過大或沒有內容');
    const data = JSON.parse(raw), properties = PropertiesService.getScriptProperties();
    const bookId = properties.getProperty('SPREADSHEET_ID');
    if (!bookId) throw Error('教師尚未完成收集端設定');
    if (!['save', 'list'].includes(data.action)) throw Error('不支援的操作');
    if (data.action === 'list' && (data.teacherEmail !== TEACHER || typeof data.password !== 'string' || !equalHash(digest(data.password), properties.getProperty('TEACHER_PASSWORD_HASH')))) throw Error('教師密碼不正確');
    const sheet = SpreadsheetApp.openById(bookId).getSheetByName(SHEET);
    if (!sheet) throw Error('找不到收集工作表');
    lock = LockService.getScriptLock(); lock.waitLock(20000);
    if (data.action === 'list') {
      const cursor = data.cursor ?? 0;
      if (!Number.isInteger(cursor) || cursor < 0) throw Error('分頁位置無效');
      const total = Math.max(0, sheet.getLastRow() - 1), count = Math.min(5, Math.max(0, total - cursor));
      const rows = count ? sheet.getRange(cursor + 2, 1, count, MAX_CHUNKS + 4).getValues() : [];
      const records = rows.map(row => JSON.parse(row.slice(4, 4 + Number(row[3])).map(chunk => String(chunk).slice(5)).join('')));
      return output({ok: true, records, nextCursor: cursor + count < total ? cursor + count : null});
    }
    const r = data.record;
    if (!r || r.moduleId !== MODULE || typeof r.id !== 'string' || (!r.id.length || r.id.length > 200 || /[\u0000-\u001f]/.test(r.id)) || !r.profile || typeof r.profile.email !== 'string' || r.profile.email.toLowerCase() === TEACHER || !r.profile.email.includes('@')) throw Error('不是有效的學生探究紀錄');
    if (typeof data.token !== 'string' || data.token.length < 64 || data.token.length > 128) throw Error('寫入權限無效');
    if (typeof r.savedAt !== 'string' || !Number.isFinite(Date.parse(r.savedAt))) throw Error('版本時間無效');
    const json = JSON.stringify(r), chunks = [];
    for (let i = 0; i < json.length; i += CHUNK) chunks.push('json:' + json.slice(i, i + CHUNK));
    if (chunks.length > MAX_CHUNKS) throw Error('紀錄過大，請減小裝置相片');
    const last = sheet.getLastRow(), tokenHash = digest(data.token);
    const meta = last > 1 ? sheet.getRange(2, 1, last - 1, 3).getValues() : [];
    const index = meta.findIndex(row => row[0] === 'record:' + r.id);
    if (index >= 0 && !equalHash(meta[index][1], tokenHash)) throw Error('無權更新這份探究紀錄');
    if (index >= 0 && Date.parse(meta[index][2]) >= Date.parse(r.savedAt)) return output({ok: true, id: r.id});
    const row = ['record:' + r.id, tokenHash, r.savedAt, chunks.length, ...chunks, ...Array(MAX_CHUNKS - chunks.length).fill('')];
    const range = sheet.getRange(index < 0 ? last + 1 : index + 2, 1, 1, row.length);
    // Every chunk has a literal json: prefix so no student text becomes a formula.
    range.setNumberFormat('@'); range.setValues([row]);
    return output({ok: true, id: r.id});
  } catch (e) {return output({ok: false, error: e.message || '收集端錯誤'});}
  finally {if (lock && lock.hasLock()) lock.releaseLock();}
}
```
