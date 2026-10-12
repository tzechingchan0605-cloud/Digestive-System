// Paper-only instructions and translations of the shared teacher rubric.
const labels={
  names:{zh:{A:'情境與原始探究設計',B:'實驗資料、分析與結論',C:'學習重點及反思',D:'教師指引、參考答案與評分準則',all:'完整教師列印套裝'},en:{A:'Context and original design',B:'Data, analysis and conclusions',C:'Key learning points and reflection',D:'Teacher guide, answers and scoring guide',all:'Complete teacher print pack'}},
  identity:['姓名：________________　班別及學號：________________','Name: ____________________   Class and student number: ____________________'],
  answer:['在方格內選擇答案。','Mark your answer in the boxes.'],multi:['可選多於一項。','You may choose more than one.'],single:['只選一項。','Choose one.'],
  choices:['選項','Choices'],record:['你記錄的外觀','Your recorded appearance'],first:['第一次確認','First confirmed answer'],revision:['如有修訂，保留原答案並另記於此。','If you revise an answer, keep the first answer and write the change here.'],
  original:['教師保存這份原始設計後，才派發 B 冊；學生保留副本供反思參閱。','The teacher saves this original design before giving out Part B. Keep a copy to refer to during reflection.'],
  data:['觀察靜態圖，選擇並記錄外觀；圖像是本 VL 的預設結果。','Observe the static images, choose and record the appearances. The images show the preset results of this VL.'],
  cool:['煮沸的消化液先冷卻至相同的 37°C 反應溫度，再進行比較。','Cool each boiled digestive juice to the same reaction temperature of 37°C before comparing.'],
  reflect:['請參閱你在 A 冊保存的原始假說及理由；不必憑記憶重寫。','Refer to your original idea to test and reason saved in Part A. You do not need to rewrite them from memory.'],
  learning:['原探究答案提交後，才派發本冊。','Give out this part only after the original investigation answers have been submitted.'],
  teacher:['只供教師，請勿派給學生。','For teachers only. Do not give this part to students.'],
  draft:['活動 rubric 初稿，待研究者校準；不是已驗證的 SPSAI／CKT。','Draft activity scoring guide for researcher review; it is not a validated SPSAI or CKT.'],
  admin:['每週工作紙與正式 10 題 SPSAI、4 題 CKT 前後測分開。','Keep weekly worksheets separate from the formal 10-item SPSAI and 4-item CKT pre- and post-tests.'],
  guideTitle:['派發與證據保存程序','Distribution and evidence preservation'],
  steps:[
    ['紙本客觀題由教師按相同參考答案及配分批改；rubric 的「自動」指 VL Excel 功能，不代表紙本答案會自動讀取。','Teachers mark paper objective answers using the same key and weights. Automatic scoring in the shared guide refers to VL Excel; handwritten answers are not read automatically.'],
    ['兩組使用相同題目、概念、提示及可用時間。對照組用靜態圖與資料表代替互動模擬；不另進行實體實驗。','Use the same questions, concepts, hints and available time for both groups. The control group uses static images and tables instead of interactive simulations; no extra physical experiment is added.'],
    ['先派 A，保存原始假說、理由及設計後才派 B。可以拍攝或保存副本；學生保留原始假說副本。','Give out A first. Save the original prediction, reason and design before giving out B. Photograph or copy A; let students keep a copy of their original prediction.'],
    ['B 冊先處理四組基本資料及三題結論，再處理熱處理頁及延伸結論。','In B, complete the four basic sets and three conclusions before the heating page and its conclusion.'],
    ['首次確認的觀察保留原文；修訂用單線劃去並保持可讀，或另記於修訂欄，不擦除。','Keep the first confirmed observations readable. Use one line to cross out a revised answer, or write it in the revision area; do not erase it.'],
    ['固定或收取 A、B 答案後才派 C。讓學生參閱原始假說副本，完成真正的學習反思。','Save or collect A and B before giving out C. Let students refer to the saved original prediction and write their learning reflection.'],
    ['D 與完整套裝只供教師。完整套裝須按分冊頁碼分開列印、分階段派發，不可整套一次派學生。','D and the complete pack are for teachers. Print each part separately using its page range and give it out at the correct stage, rather than giving the whole pack to students at once.'],
    ['圖像以油層、明暗及紋理呈現外觀；黑白列印前請確認混濁、清澈及油層厚薄仍可辨別。','Images use oil layers, shade and texture. Before printing in black and white, check that cloudy and clear mixtures and the two oil-layer thicknesses remain distinguishable.'],
    ['紙本不產生點擊或系統用時紀錄。活動評分看答案及設計證據，不把完成率、用時或點擊直接換分。','Paper tasks do not generate clicks or system time logs. Score the answers and design evidence; do not convert completion, time or clicks into skill scores.'],
    ['合理且可測試的原始假說不因預測結果不符而扣分。開放題與反思由教師判斷，不以關鍵字計分。','Do not deduct marks from a reasonable, testable original prediction just because its result was wrong. Teachers judge written answers and reflection rather than counting keywords.']
  ],
  key:['客觀題與設計參考','Objective answers and design reference'],
  headingRubric:['類別／題目','最高分','評分方式','滿分準則','部分得分準則','零分／缺漏處理'],
  headingRubricEn:['Item','Maximum','Scoring','Full credit','Partial credit','Zero / missing evidence'],
  pending:['人工欄空白是待評，填 0 才是零分。完成反思及必要評分後才計算整體分數。','A blank teacher score means pending, while an entered 0 means zero. Calculate the overall score only after reflection and required scoring are complete.']
};
// Rows have the same six columns and order as scoringWorkbook([]).rubric.
const rubricEn=[
 ['Draft activity scoring guide: researcher review needed',32,'Research note','Six SPS areas, 4 each; four new-knowledge items, 2 each. Total 32.','Review question difficulty, opportunities and scorer agreement across VLs.','Separate from validated SPSAI / CKT; give paper students the same questions and static data.'],
 ['Initial observation',2,'Teacher','2: accurately describes visible oil/water layers and details, separating observation from guesses.','1: a specific but incomplete description.','0: no useful observation; keep missing older evidence pending rather than inventing it.'],
 ['Six appearances',2,'Answer key','All six answers confirmed; matching appearances / 6 × 2, rounded to two decimal places.','Credit in proportion to the matching appearances.','0 if all answered but none match; a missing set stays unavailable, rather than treating completion as skill.'],
 ['Independent variable',1,'Answer key','Select only the combination of digestive juices.','No partial credit.','0 for an incorrect answer; do not replace missing evidence with 0.'],
 ['Dependent variable',1,'Answer key','Select only the appearance of the mixture.','No partial credit.','0 for an incorrect answer; do not replace missing evidence with 0.'],
 ['Controlled variables',2,'Answer key','Select all five fixed conditions, with no wrong choices.','Correct controlled choices / 5 × 2; a choice from the wrong category gives 0.','Older versions had three choices; do not infer skill from missing new choices. Review cross-version comparisons.'],
 ['Original testable prediction and reason',2,'Teacher','2: conditions can be compared, prediction can be observed, and reason is reasonable.','1: testable but the reason or conditions are incomplete.','0: not testable or no useful content. A reasonable wrong prediction is not penalised. Missing original evidence stays pending.'],
 ['Conditions for a fair test',1,'Answer key','Select time, initial oil/water and total added volume, and shaking method; do not select more total liquid.','No partial credit.','0 for an incorrect set; a version without this question stays unavailable.'],
 ['Control group',1,'Teacher','1: explains its comparison purpose, proposes a setup without digestive juice, and keeps conditions the same.','Enter only 0 or 1.','0: no useful comparison explanation or an unreasonable reason; missing question stays pending.'],
 ['Setup quality',2,'Teacher','2: clear drawing/photo/text, four labelled sets and reasonable volumes.','1: workable but labels or volumes are incomplete.','0: no workable design; do not penalise a written design.'],
 ['Fixed conditions and experiment arrangement',2,'Teacher','2: fair comparison based on design/evidence; boiled liquids are cooled; only one factor changes each time.','1: generally reasonable but fixed conditions or heating arrangements are incomplete.','0: comparisons are not valid. Set completion is evidence only; time or clicks do not directly earn marks.'],
 ['Conclusions, comparisons and limits',4,'Answer key','Current three conclusions and the heating conclusion: 1 each, total 4. Older six-question weights remain 0.5, 0.5, 0.5, 0.75, 0.75, 1.','Award each question its stated answer-key credit.','Use the questions belonging to that version; do not demand deleted questions or invent missing older answers.'],
 ['Data and claims',4,'Teacher','4: organises data clearly, compares at least two sets, links a claim and explains limits.','3: clear comparison but weaker limits; 2: useful comparison but weak links; 1: one relevant description.','0: no useful communication. Use reasons, control explanation, labels, table and reflection. Judge clarity without scoring knowledge twice.'],
 ['Bile (膽汁), emulsification (乳化作用) and surface area',2,'Teacher: post-learning reflection only','2: bile (膽汁) has no digestive enzymes; emulsification (乳化作用) is physical digestion (物理消化), and small droplets increase total surface area.','1: partly correct but incomplete explanation.','0: concept unused or wrong; an unsubmitted reflection does not mean zero.'],
 ['Lipase (脂肪酶), chemical digestion (化學消化) and products',2,'Teacher: post-learning reflection only','2: lipase (脂肪酶) speeds up chemical digestion (化學消化), forming glycerol (甘油) and fatty acids (脂肪酸).','1: enzyme action or products partly correct.','0: unused or incorrect; do not score by keywords.'],
 ['High temperature and enzyme denaturation',2,'Teacher: post-learning reflection only','2: links the boiled-Y observations with protein denaturation and loss of function.','1: knows heat has an effect but does not explain how.','0: concept unused or wrong.'],
 ['Revising the original explanation using data',2,'Teacher: post-learning reflection only','2: addresses whether the original prediction is supported, makes specific comparisons and uses concepts to improve the explanation, with appearance limits.','1: comparison or revision is present but links are incomplete.','0: no useful revision or link to data.'],
 ['SPS, new knowledge and overall totals',32,'Totals','Six SPS areas = 24; four knowledge items = 8. Show overall only after reflection and all required scores are complete.','Blank means pending; 0 means zero. Teacher fields accept only whole numbers in range.','Invalid or non-whole numbers do not produce a valid total. Do not fill blanks with 0 just to complete scoring.'],
 ['Colours, records and keeping teacher scores',0,'Note','Excel uses green for full/correct, red for zero/incorrect, amber for partial; fills show categories.','Original, first and final answers and events are separate; digital time means visible activity time.','Teacher scores remain in the separately saved Excel file, and a new export does not include them. Student PDFs contain no scores.']
];
module.exports={labels,rubricEn};
