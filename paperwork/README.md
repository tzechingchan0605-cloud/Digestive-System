# 演繹式工作紙 deductive-5

教師面板維持五項下載：完整學生PDF／Word、完整答案PDF／Word、D教師指引PDF；中英文各五檔，三類PDF可預覽。語言切換不改動學生紀錄。

`staged.py` 產生四頁教材。第1頁課題需知直接複製使用者參考稿的原文、兩幅原圖、紅色粗體及標題樣式；原稿保存在 `templates/WS1_topic_notes_zh.docx`、`_en.docx`，不另行改寫。VL則維持最後才揭示身分。

八題依已審閱WS問法：變量4、前提1、對照長答2、X作用1、表面積1、外觀證據1、煮沸1、整合8，共19。變量表是明確授權的格式例外：完整七項選項改為逐項剔選。其他括號選項、A/B選項及提示沿用原稿；只因新實驗而更新條件描述。正文／選項12pt、提示11pt，姓名班別學號同列，作答線深灰，煮沸圖直接顯示未煮沸比較基準及兩個煮沸處理。

建置 `npm run paper:build`；核對 `npm run paper:check`、`python3 tests/paperwork_pdf.py`、`node tests/paperwork.cjs`。manifest驗證十檔的SHA-256與來源fingerprint。來源包括原稿、目前VL題目及字典。

當前VL為staged-4／uiVersion7，滿分32；WS為deductive-5，滿分19，兩者不能直接換算。歷史版本不按新規準重評。更早的模板／render模組為歷史參考，不是當前入口。
