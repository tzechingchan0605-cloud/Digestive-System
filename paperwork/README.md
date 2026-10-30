# staged-1 中英文完整工作紙

教師面板維持五項：完整學生PDF／Word、完整答案PDF／Word、D教師指引PDF。兩種語言各五個真實檔案，檔名帶`_en`為英文；面板按介面語言選檔，三類PDF均有預覽，切換語言會清除舊預覽。

`staged.py` 是新版可重跑的Word、圖示及D來源；`rubric.json`為評分及整合答案來源。選項、變量候選、前提和提示讀自VL／語言字典。每種語言學生版與答案版各四頁，正文／選項12pt、提示11pt、正文19pt行距；姓名班別學號同列，作答線#333333／1pt。首次油水圖標示兩層，圖上直接標結果，不用瀏覽器截圖。六題均有VL對應，WS採演繹式：第1頁先提供課題需知及X／Y身分，再分析情境與三部分實驗；VL仍在最後揭示身分。

建置：`npm run paper:build`；檢查：`npm run paper:check`及`python3 tests/paperwork_pdf.py`。需Python套件`requirements.txt`、LibreOffice Writer、Noto CJK、Playwright Chromium。`build.py`更新十份檔案及SHA-256 manifest；`tests/paperwork.cjs`實際測試下載及預覽與資料不變。

WS滿分16，VL SPS23＋整合8＝31，不能互換。D逐題配對，原水對照設計題已刪除；X／Y主要外觀已由圖提供，WS不重複設題；VL保留觀察及分析活動。原始設計、圖像與操作只在VL問，紙本不額外加題。

`templates/WS1_reviewed.docx`、`english.py`、`teacher_guide.py`、`teacher_en.py`、`source.js`、`curriculum.js`及舊figures為歷史核訂材料，已不作新版建置入口，不能覆蓋新版來源。既有學生紀錄按原版本評分，不清除或改寫。完整教學大綱及研究安排見`../RESEARCH_ALIGNMENT.md`。

課題需知按使用者上載的 `WS1_student.pdf` 原樣還原，完整原文、紅色粗體及兩幅圖分別保存在 `templates/WS1_topic_notes_zh.docx`／`_en.docx`。建置直接複製段落與圖像，不另行改寫或簡化。PDF測試核對原文、逐run格式及原圖bytes。

目前紙本版本為 `deductive-2`，不可使用前版八題／18分規準評分。
