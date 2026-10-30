# staged-1 中英文完整工作紙

教師面板維持五項：完整學生PDF／Word、完整答案PDF／Word、D教師指引PDF。兩種語言各五個真實檔案，檔名帶`_en`為英文；面板按介面語言選檔，三類PDF均有預覽，切換語言會清除舊預覽。

`staged.py` 是新版可重跑的Word、圖示及D來源；`rubric.json`為評分及整合答案來源。選項、變量候選、前提和提示讀自VL／語言字典。每種語言學生版與答案版各四頁，正文／選項12pt、提示11pt、正文19pt行距；姓名班別學號同列，作答線#333333／1pt。首次油水圖標示兩層，圖上直接標結果，不用瀏覽器截圖。八題與VL同步，X／Y身分只在最後學習重點出現。

建置：`npm run paper:build`；檢查：`npm run paper:check`及`python3 tests/paperwork_pdf.py`。需Python套件`requirements.txt`、LibreOffice Writer、Noto CJK、Playwright Chromium。`build.py`更新十份檔案及SHA-256 manifest；`tests/paperwork.cjs`實際測試下載及預覽與資料不變。

WS滿分18，VL SPS23＋整合8＝31，不能互換。D逐題配對，原水對照設計題已刪除；新增Y外觀分析。原始設計、圖像與操作只在VL問，紙本不額外加題。

`templates/WS1_reviewed.docx`、`english.py`、`teacher_guide.py`、`teacher_en.py`、`source.js`、`curriculum.js`及舊figures為歷史核訂材料，已不作新版建置入口，不能覆蓋新版來源。既有學生紀錄按原版本評分，不清除或改寫。完整教學大綱及研究安排見`../RESEARCH_ALIGNMENT.md`。
