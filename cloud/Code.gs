/** Bound Google Apps Script collector for VL1. Deploy as owner, accessible to anyone.
 * Teacher reads require a private password; students can only write their own IDs.
 * No endpoint can list records without the password. Never expose Script Properties.
 */
const MODULE = 'VL_BIO_DIGESTION_OPTION_A';
const TEACHER = 'tzechingchan0605@gmail.com';
const SHEET = 'VL1雲端紀錄';
const CHUNK = 40000;
const MAX_CHUNKS = 24;

function setupCollector() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== TEACHER) throw Error('請以指定教師 Google 帳戶進行設定');
  const ui = SpreadsheetApp.getUi();
  const answer = ui.prompt('設定教師雲端密碼', '請輸入至少 12 字元的獨立密碼，勿使用 Google 帳戶密碼。密碼只用來讀取全班紀錄。', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  const password = answer.getResponseText();
  if (password.length < 12) throw Error('密碼須至少 12 字元');
  const book = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperties({SPREADSHEET_ID: book.getId(), TEACHER_PASSWORD_HASH: digest(password)});
  const sheet = book.getSheetByName(SHEET) || book.insertSheet(SHEET);
  if (sheet.getMaxColumns() < MAX_CHUNKS + 4) sheet.insertColumnsAfter(sheet.getMaxColumns(), MAX_CHUNKS + 4 - sheet.getMaxColumns());
  if (!sheet.getLastRow()) sheet.appendRow(['探究識別碼', '寫入權限雜湊', '版本時間', '分段數', ...Array.from({length: MAX_CHUNKS}, (_, i) => '原始紀錄分段' + (i + 1))]);
  ui.alert('設定完成。部署為網頁應用程式，執行身分選自己，存取權選所有人。把 /exec 網址填入網站 cloud-config.js。請勿公開這份試算表。');
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
function doGet() {return output({ok: true, service: 'VL1集中紀錄', version: 1});}
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
