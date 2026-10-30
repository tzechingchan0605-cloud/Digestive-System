# 比較組工作紙：教師核訂完整版本

教師入口「下載工作紙與參考答案」提供五類教材，跟隨目前介面語言下載繁中或英文版本：

| 檔案 | 內容 | 頁數 |
| --- | --- | --- |
| `generated/WS1_student.pdf` | 完整學生工作紙 PDF | 4 |
| `generated/WS1_student.docx` | 完整學生工作紙 Word | 4 |
| `generated/WS1_answers.pdf` | 完整工作紙連參考答案 PDF | 4 |
| `generated/WS1_answers.docx` | 完整工作紙連參考答案 Word | 4 |
| `generated/WS1_D_teacher_guide.pdf` | D · 教師指引、配對及評分 | 6 |

`templates/WS1_reviewed.docx` 是教師最新上載的核訂原稿。建置保留全部學生文字、選項、提示、字體及五幅圖；第 8 題依教師選定 A 題更新，只縮減首頁段落的前後空白，避免 Word 轉 PDF 時第二幅圖獨佔第五頁。學生作答線另加深為 #333333、1 pt，以便列印。答案副本標示「參考答案」，以藍色粗體／底線標示正確選項，在原作答空間填寫對照組及酶變性的參考解釋。開放題接受其他科學上合理的表達；沒有增添問題或評分題。

本次核訂版本共八題：變量、實驗前提、對照組、三項基本結論、熱處理結論及「部分 3｜整合解釋」。最後一題涵蓋乳化、表面積、酶及產物、煮沸與分子結構，與現版 VL 反思一致。它取代舊 A–D 分冊及中英文十份 PDF 的下載介面；英文介面下載獨立英文檔（檔名帶 `_en`），包含英文 Word／PDF、英文圖標籤及英文 D 指引；中文介面維持繁中版本。下載區維持五項下載，三個 PDF 項目另有預覽按鈕，切換語言即選取對應語言，不會默默回退成中文。學生答案、反思、雲端及教師 Excel 不因下載空白教材而改變。

## 更新、產生及驗證

需要 Node >=20、Python 3.12、LibreOffice Writer (`soffice`)、Noto CJK 字型，以及固定版本的 Python 套件。瀏覽器測試另需 npm 依賴及 Chromium。

```bash
cd /workspace/Digestive-System
npm ci
python3 -m pip install -r paperwork/requirements.txt
# Linux 缺少轉檔程式時安裝 libreoffice-writer 及 fonts-noto-cjk。
npm run paper:build
npm run paper:check
python3 tests/paperwork_pdf.py
python3 -m http.server 8000 --bind 127.0.0.1
# 另一個終端：
node tests/paperwork.cjs http://127.0.0.1:8000
node tests/language.cjs http://127.0.0.1:8000
```

更新時以新核訂原稿替換 `templates/WS1_reviewed.docx`。若題目或選項改動，同步審閱 `build.py` 內的答案及 `tests/paperwork_pdf.py`，再建置並提交兩種語言共十份檔案與 manifest。`build.cjs` 委派 `build.py`；不再由 VL 畫面動態改寫教師核訂文件。舊 `source.js`、`curriculum.js`、`render.cjs` 保留作歷史參考，不再載入網站或用於現行建置。

`paper:check` 驗證原稿／建置程式 fingerprint、兩種語言十個檔案的大小、SHA-256、Word 容器、PDF 格式與四頁數，並核對學生文字及表格與核訂原稿完全一致。PDF 測試另核對八題、答案、原圖保留、實際 A4 頁面及無空頁。瀏覽器測試實際下載兩種語言各五檔，核對檔名及 checksum，拒絕壞 manifest／損壞或缺少的檔案，檢查手機版面及下載前後紀錄、示範與 Excel 不變。

manifest 與下載均使用 `no-store`。介面每種語言只接受五個指定檔名、MIME 及格式，不接受任意下載 URL。教師面板沿用原有教師電郵入口；靜態教材檔案本身不含學生資料，並不是額外受密碼保護的私人檔案。

## 現行評分

共同綜合解釋規準見 `rubric.json`，八個概念點各 1 分：物理乳化、脂質分子不變、表面積、酶催化化學消化、產物、蛋白質、煮沸使酶變性失活、煮沸 X 仍保留作用。不另要求觀察比較或外觀限制（第 6 題仍評限制）。WS 題 1–7 共 11，加第 8 題 8，共 19；VL SPS 24 加反思 8，共 32。兩者不直接換算。

現版標記 `integrated-concept-explanation`；先前證據綜合題 `integrated-explanation-evidence` 保留原 8 分規準；酶變性前題 `enzyme-denaturation` 保留反思 4、總分 28；無標記的原始假說舊題保留四項反思各 2、總分 32。Excel 按每列版本選取適用欄、範圍驗證、公式與顏色。歷史答案不改寫。D PDF 由 `teacher_guide.py` 及 `rubric.json` 生成，不新增學生題目。

## 英文材料來源

`english.py` 產生可編輯英文學生／答案 Word，題型及正確答案與繁中一致。`diagrams_en.py`、`render_diagrams.cjs` 重新繪製英文字體足夠大的五幅圖；`teacher_en.py` 產生英文 D。四份學生／答案 PDF 均為四頁，正文／選項至少 12 pt、提示 11 pt，姓名／班別／學號同列並保留深色作答線。

manifest v3 按 `languages.zh`／`languages.en` 各保存五個描述項。點擊時以 `VL1Language.current` 選檔，即使面板已開啟才切換語言，亦下載正確版本；兩種語言均校驗檔名、格式及 SHA-256。任一語言缺檔或損壞不會代用中文。Excel 的共用研究工作表仍維持原有中文欄名及學生原文。

## PDF 預覽

學生版、答案版及 D 的 PDF 項目均可預覽；Word 項目保留直接下載。預覽與下載共用格式／大小／checksum 驗證，只接受目前介面語言的檔案。切換語言或關閉面板會清除舊預覽並撤銷 Blob URL；語言切換期間尚未完成的預覽不會回填舊語言內容。手機若未能內嵌顯示，可直接下載 PDF。
