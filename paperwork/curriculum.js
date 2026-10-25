'use strict';
// Paper comparison condition only: direct explanation, worked examples, practice.
// No student state, record, timer, cloud or scoring-workbook writes.
(() => {
  const version='VL1-WS-direct-3';
  const materialVersion=8;
  const expectedOutcomes={'none-none':'separated','X-none':'cloudy','Y-none':'thin-oil','XY-none':'clear','XY-X':'clear','XY-Y':'cloudy'};
  const p=(zh,en)=>({zh,en});
  const resolve=(value,lang)=>Array.isArray(value)?value.map(v=>resolve(v,lang)):value&&typeof value==='object'?
    (Object.keys(value).length===2&&'zh' in value&&'en' in value?value[lang]:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolve(v,lang)]))):value;
  function create(vl,lang){
    if(!['zh','en'].includes(lang))throw new Error('Unsupported worksheet language');
    if(Object.entries({q1:'cloudy',q3:'increase',limitations:'indirect',q2:'Y'}).some(([key,value])=>vl.reference.conclusions[key]!==value)||Object.keys(vl.reference.conclusions).length!==4)throw new Error('VL reference answers changed. Review the worksheet before rebuilding.');
    if(vl.trials.some(t=>!t.label.replace(/\s/g,'').includes(t.key.startsWith('XY-')?'1mL':'2mL')))throw new Error('VL recipe volumes changed. Review the worksheet before rebuilding.');
    if(vl.trials.length!==6||vl.trials.some(t=>expectedOutcomes[t.key]!==t.outcome))throw new Error('The six VL model outcomes changed. Review the paper explanation, answer key and mapping before rebuilding.');
    const questions=[
      {id:'prediction',page:1,kind:'prediction',max:2,source:['hypothesisLiquid','hypothesisOutcome','reason'],
        prompt:p('在相同油水混合物中加入 2 mL 膽汁並搖勻，預測一項可觀察的外觀變化，並寫出理由。','Add 2 mL bile (膽汁) to the same oil–water mixture and shake it. Write one observable prediction and give your reason.'),
        info:{heading:p('作答資料','Information for this question'),body:p('膽汁可把大油滴乳化成小油滴，脂質分子不變。預測須說明可觀察的變化；理由須連結這項作用。','Bile (膽汁) emulsifies lipids (乳化脂質) into smaller droplets without changing the lipid molecules. Predict a visible change and link your reason to this action.')},
        key:p('例：油滴較小、較分散，外觀可能較混濁；理由連結膽汁乳化。接受其他合理、可觀察及有依據的預測，不因未猜中參考外觀而扣探究能力分。','For example: smaller, more dispersed oil droplets; the mixture may look cloudier, because bile (膽汁) causes emulsification (乳化作用). Accept other reasoned, observable predictions; do not deduct inquiry marks just for not matching a reference appearance.'),
        goal:p('設計探究：根據已提供的概念，寫出可測試預測及理由。','Inquiry design: apply a supplied concept to write a testable prediction and reason.'),
        rule:p('可觀察且條件明確的預測 1；連結乳化概念的合理理由 1。不以猜中結果計分。','1 for an observable prediction with a clear treatment; 1 for a sound reason linked to emulsification (乳化作用). Do not score by guessing the result.')},
      {id:'variables',page:1,kind:'variables',max:4,source:['variables'],
        prompt:p('本次主比較只改變消化液組合。把因素分為獨立、因及控制變量。','The main comparison changes the combination of digestive juices. Classify the factors as independent, dependent or controlled variables.'),info:{heading:p('變量提示','Variable reminder'),body:p('示例：只改搖勻方式並觀察外觀，搖勻方式是獨立變量，外觀是因變量；其餘條件保持相同。','Example: change only the shaking method and observe the appearance. Shaking is the independent variable; appearance is the dependent variable. Keep other conditions the same.')},
        key:p('獨立：消化液組合。因：混合物外觀。控制：起始油水量、反應溫度、時間、加液總量、搖勻方式。','Independent: combination of juices. Dependent: appearance. Controlled: starting oil/water volume, temperature, time, total added volume and shaking method.'),goal:p('分類：辨識三類變量。','Classification: identify the three kinds of variables.'),rule:p('獨立 1、因 1；五項控制每項 0.4，共 2。每類若選入其他類因素，該類 0 分。','Independent 1, dependent 1; five controlled factors at 0.4 each, total 2. A factor from a wrong category gives 0 for that category.')},
      {id:'assumptions',page:1,kind:'assumptions',max:1,source:['assumptions'],
        prompt:p('選出公平比較所需的實驗前提，可選多於一項。','Choose all the conditions needed for a fair comparison.'),info:{heading:p('實驗前提','Conditions for a fair test'),body:p('公平比較只改變測試因素，其餘條件相同；以下選項中有不合理的安排。','Change only the factor being tested and keep the other conditions equal. Some options below describe an unfair arrangement.')},
        key:p('選相同時間、相同起始油水量及加液總量、相同搖勻方式；不選 X＋Y 可加較多總液量。','Choose equal time, equal starting and total added volumes, and equal shaking; do not choose extra total liquid for X + Y.'),goal:p('設計及進行實驗：辨識合理固定條件。','Inquiry design and experimental reasoning: identify sound fixed conditions.'),rule:p('選齊三項且無錯選為 1；其他已作答組合為 0。','1 for all three correct conditions with no wrong choice; 0 for another attempted set.')},
      {id:'control',page:2,kind:'open',max:2,source:['controlPlan'],
        prompt:p('要比較「加入消化液」與「只加水」，四組中哪一組是對照組？為甚麼要加入相同總液量？','To compare adding digestive juice with adding only water, which of the four sets is the control group? Why keep the total volume added the same?'),info:{heading:p('對照組','Control group'),body:p('對照組與實驗組比較，用來判斷測試處理的影響；其餘條件應相同。','Compare the experimental group with a control group to judge the treatment’s effect. Keep other conditions the same.')},
        key:p('2 mL 水組是這個問題的對照組；相同加液總量避免總體積或稀釋程度成為另一個差異。','The 2 mL water set is the control group for this question. Equal added volume avoids a difference in total volume or dilution.'),goal:p('設計探究：理解對照的比較功能。','Inquiry design: explain the purpose of a control.'),rule:p('對照組 1、固定總液量的合理理由 1。','1 for the control group, 1 for a sound reason to keep total volume fixed.')},
      {id:'labels',page:2,kind:'labels',max:2,source:['setupDescription','setupCanvas','setupPhoto'],
        prompt:p('依以下配方，在圖下補全四組名稱及加液量。','Use the following recipes to complete the four setup labels and added volumes.'),hint:p('配方：水 2 mL；X 2 mL；Y 2 mL；X＋Y 各 1 mL。起始油水量相同。','Recipes: water, 2 mL; X, 2 mL; Y, 2 mL; X + Y, 1 mL each. All start with the same amounts of oil and water.'),
        key:p('依序：水對照 2 mL 水；X 2 mL；Y 2 mL；X＋Y 各 1 mL。','In order: water control, 2 mL water; X, 2 mL; Y, 2 mL; X + Y, 1 mL each.'),goal:p('進行實驗及溝通：讀懂、補全裝置與量。','Experimental reasoning and communication: read and label setups and volumes.'),rule:p('四個組名及量均完整為 2；每個完整裝置 0.5。','2 for all four correct setup/volume labels; 0.5 per complete label.')},
      {id:'fairness',page:2,kind:'open',max:3,source:['setupDescription','controlPlan'],
        prompt:p('某人讓水組加 2 mL 水，X＋Y 組卻加 2 mL X 及 2 mL Y，其餘條件相同。這是否公平？指出問題、修正兩種消化液的量，並說明理由。','Someone adds 2 mL water to the control but 2 mL X and 2 mL Y to the combined set, with other conditions equal. Is this fair? Identify the problem, fix the two volumes and explain why.'),hint:p('先計每組的加液總量；再判斷是否只改了一項因素。','First find the total volume added to each set. Then check whether only one factor changed.'),
        key:p('不公平：2 mL 對 4 mL。改為 X、Y 各 1 mL，保持總量 2 mL，排除總體積／稀釋差異。','Unfair: 2 mL versus 4 mL. Use 1 mL of each juice, keeping the total at 2 mL to avoid a volume/dilution difference.'),goal:p('設計及進行實驗：評估並修正不公平程序。','Inquiry design and experimental reasoning: evaluate and correct an unfair procedure.'),rule:p('問題 1、正確改量 1、因果／公平理由 1。','1 for the flaw, 1 for corrected volumes, 1 for the fairness explanation.')},
      {id:'mainObservations',page:3,kind:'observations',max:4,source:['initialObservation','basicObservations'],
        prompt:p('觀察圖 1，記錄四組的外觀。','Observe Figure 1 and record the four appearances.'),info:{heading:p('觀察提示','Observation reminder'),body:p('留意有否分層、油層厚薄及混濁程度；先描述外觀，再解釋原因。','Look for layers, oil-layer thickness and cloudiness. Describe what you see before explaining why.')},
        key:p('水：分層；X：混濁；Y：油層變薄但仍分層；X＋Y：清澈。','Water: separated layers; X: cloudy; Y: thinner oil layer, still separated; X + Y: clear.'),goal:p('觀察及溝通：保留四種外觀的區別。','Observation and communication: distinguish the four appearances.'),rule:p('每組正確判讀 1 分，共 4。','1 per correctly described set, total 4.')},
      {id:'xConclusion',page:3,kind:'conclusion',vlQuestion:'q1',max:2,source:['q1'],
        info:{heading:p('乳化提示','Emulsification (乳化作用) reminder'),body:p('乳化把大油滴分散成小油滴，脂質分子結構不變。','Emulsification (乳化作用) makes smaller oil droplets without changing the lipid molecules.')},
        prompt:p('X 的作用：完成括號選擇，再用乳化概念解釋外觀。','X: choose the appearance, then explain it using emulsification (乳化作用).'),
        key:p('混濁乳狀液；X 的乳化使油滴分散，屬物理消化，脂質分子結構不變。','Cloudy emulsion (乳狀液). X disperses oil droplets by emulsification (乳化作用), a form of physical digestion (物理消化), without changing the lipid molecules.'),goal:p('推論：連結外觀與乳化概念。','Inference: link an appearance with emulsification (乳化作用).'),rule:p('外觀 1；乳化及分子不變的合理解釋 1。','1 for the appearance; 1 for a sound explanation of emulsification (乳化作用) without molecular change.')},
      {id:'surface',page:3,kind:'conclusion',vlQuestion:'q3',max:2,source:['q3'],
        info:{heading:p('表面積提示','Surface-area reminder'),body:p('同量脂質分散成小油滴，可讓脂肪酶接觸更多表面；這不是速度量度。','Spreading the same amount of lipid into smaller droplets lets lipase (脂肪酶) contact more surface. This is not a speed measurement.')},
        prompt:p('油滴變小後的總表面積：完成選擇並說明如何有助 Y 作用。','Total surface area after droplets become smaller: choose the answer and explain how this helps Y act.'),
        key:p('增加；在同一總脂質量下，分散成小油滴增加脂肪酶可作用的表面。這不是速度量度。','Increases. For the same total amount of lipid, small droplets provide more surface for lipase (脂肪酶) to act on. This is not a measurement of speed.'),goal:p('推論：以概念解釋表面積，避免冒充速率資料。','Inference: explain surface area without inventing speed data.'),rule:p('增加 1；有效表面與酶作用的解釋 1。','1 for increase, 1 for explaining the available surface and enzyme action.')},
      {id:'limits',page:2,kind:'conclusion',vlQuestion:'limitations',max:2,source:['limitations'],
        info:{heading:p('證據提示','Evidence reminder'),body:p('外觀是線索，不能代替消化產物的化學檢測；仍需其他檢測及重複測試。','Appearance gives clues but cannot replace chemical product tests. Other tests and repeated tests are needed.')},
        sentence:p('本實驗只記錄油層及混濁／清澈外觀，沒有直接檢測消化產物。最恰當的說法是：__________','This experiment records the oil layer and cloudiness/clarity, without directly testing for digestion products. Which statement fits best? __________'),
        prompt:p('外觀證據的限制：選出最恰當的說法，再寫出需要的另一類證據。','Limits of appearance evidence: choose the best statement, then name another kind of evidence needed.'),
        key:p('選「外觀提供線索，但不能單獨證明甘油及脂肪酸已產生」；需要其他消化產物化學檢測及重複測試。','Choose the statement that appearance gives clues but does not prove glycerol (甘油) and fatty acids (脂肪酸) formed. Other chemical product tests and repeated tests are needed.'),goal:p('推論及溝通：區分線索、直接證據與限制。','Inference and communication: distinguish clues, direct evidence and limits.'),rule:p('恰當說法 1；合理的額外檢測／重複證據 1。','1 for the sound statement, 1 for a useful additional test or repeated evidence.')},
      {id:'heatControl',page:4,kind:'open',max:2,source:['controlPlan','heatComparison'],
        info:{heading:p('熱處理資料','Information for the heating tests'),body:p('脂肪酶是蛋白質；高溫可改變其形狀，使酶變性失活。本模型中冷卻後不恢復作用。煮沸的液體須先冷卻至共同 37°C，才作公平比較。','Lipase (脂肪酶) is a protein. High heat can change its shape and stop it working (denaturation); cooling does not restore its action in this model. Cool boiled liquids to the common 37°C before a fair comparison.')},
        prompt:p('要研究煮沸某一消化液的影響，應以哪一組作對照組？比較前要怎樣處理煮沸的液體？','To study boiling one digestive juice, which set should be the control group? What must happen to the boiled liquid before comparison?'),
        key:p('未煮沸 X＋Y 各 1 mL 組；煮沸後冷卻至共同 37°C，其餘條件相同。這個對照含 X 與 Y。','The unboiled X + Y set, 1 mL each; cool the boiled juice to the common 37°C and keep the other conditions equal. This control contains X and Y.'),goal:p('設計及進行實驗：按問題選對照並控制反應溫度。','Inquiry design and experimental reasoning: choose the control for the question and control reaction temperature.'),rule:p('未煮沸組 1；冷卻至共同溫度及公平比較 1。','1 for the unboiled control group, 1 for cooling to the common temperature for a fair comparison.')},
      {id:'heatObservations',page:4,kind:'heatObservations',max:2,source:['extensionObservations'],
        prompt:p('觀察圖 2，記錄兩組熱處理外觀，與未煮沸 X＋Y 對照組比較。','Observe Figure 2, record the heated sets and compare them with the unboiled X + Y control group.'),
        key:p('煮沸 X＋未煮沸 Y：清澈；未煮沸 X＋煮沸 Y：混濁。','Boiled X + unboiled Y: clear; unboiled X + boiled Y: cloudy.'),goal:p('觀察：比較熱處理與對照組。','Observation: compare heating treatments with a control group.'),rule:p('兩組各 1 分。','1 for each set.')},
      {id:'heatConclusion',page:4,kind:'conclusion',vlQuestion:'q2',max:2,source:['q2'],
        prompt:p('受熱後失去作用的消化液：完成選擇，並解釋冷卻後仍失去作用的原因。','Juice that loses its action after heating: choose the answer and explain why cooling does not restore its action.'),
        key:p('Y；脂肪酶是蛋白質，煮沸使酶變性而失去功能，本模型中冷卻後也不恢復。','Y. Lipase (脂肪酶) is a protein; boiling causes denaturation and loss of function. Cooling does not restore it in this model.'),goal:p('推論及內容知識：用酶變性解釋熱處理。','Inference and content knowledge: explain heat treatment using enzyme denaturation.'),rule:p('Y 1；蛋白質酶變性及不能單靠冷卻復原 1。','1 for Y, 1 for protein-enzyme denaturation and why cooling alone does not restore it.')},
      {id:'application',page:4,kind:'open',max:4,source:['reflection'],
        info:{heading:p('資料限制','Limits of these data'),body:p('脂肪酶水解脂質，形成甘油及脂肪酸。圖示沒有量度速度；X＋Y 各 1 mL，單獨組各 2 mL，不能定量證明協同作用或速率增加。解釋時寫出組名及觀察差異。','Lipase (脂肪酶) hydrolyses lipids into glycerol (甘油) and fatty acids (脂肪酸). No speed was measured. X + Y uses 1 mL each; single-juice sets use 2 mL. This cannot prove a measured combined effect or faster rate. Name the compared sets and differences.')},
        prompt:p('引用至少一組主實驗比較及一組熱處理比較，解釋乳化、酶作用及變性。寫明你比較的組別；不要聲稱定量證明協同作用或速度增加。','Use at least one main-set comparison and one heating comparison to explain emulsification (乳化作用), enzyme action and denaturation. Name the sets. Do not claim a measured combined effect or increase in speed.'),
        key:p('例如水與 X 比較連結乳化；未煮沸 X＋Y 與煮沸 Y 組比較連結酶失去作用。合理說明膽汁分散油滴、脂肪酶水解及熱變性；外觀與不同個別試劑量限制定量推論。其他正確具體比較亦可。','For example, compare water with X for emulsification (乳化作用), and unboiled X + Y with boiled Y for enzyme loss. Explain bile (膽汁), lipase (脂肪酶) hydrolysis and heat denaturation. Appearance and different individual juice amounts limit measured claims. Other sound specific comparisons are accepted.'),goal:p('溝通及內容知識：用具體組間比較整合概念。','Communication and content knowledge: explain concepts using named comparisons.'),rule:p('乳化 1、水解酶作用 1、變性 1；主實驗及熱處理的具體比較與清楚表達 1。不以關鍵字計分。','1 each for emulsification (乳化作用), enzyme hydrolysis and denaturation; 1 for clear main/heating comparisons. Judge explanations, not keywords.')}
    ];
    const content={
      version,materialVersion,approach:'explanation-example-guided-independent-check',title:p('脂質的消化與公平比較','Digestion of lipids and fair comparisons'),
      names:{A:p('情境與補充資料','Context and supporting notes'),B:p('有提示練習及獨立應用','Guided practice and independent application'),C:p('核對答案及修正','Answer check and corrections'),D:p('教師指引、配對及評分','Teacher guide, mapping and feedback'),all:p('完整教師列印套裝','Complete teacher print pack')},
      introLines:[
        p('食物中的脂質須先消化成較小分子，才能被吸收。','Lipids in food must be digested into small molecules before absorption.'),
        p('本題比較在油水混合物加入 X、Y 或兩者後的外觀。','Four sets compare adding X, Y or both to an oil–water mixture.'),
        p('四個裝置加入相同總量的液體，於相同條件下觀察。','The four setups receive equal total added volumes and use the same conditions.'),
        p('參閱下列補充資料及圖示完成 B，再用 C 核對修正；A 可隨時參閱。','Use the notes and figures to complete B, then check with C. Keep A available.')
      ],
      diagramCaptions:{
        physical:p('乳化前後脂質分子相同；圖示不按實際比例。','Lipid molecules stay the same during emulsification (乳化作用). Not to scale.'),
        chemical:p('完全水解簡化模型。R₁–R₃ 是脂肪酸烴鏈；橙線是水解位置。','Complete-hydrolysis model. R₁–R₃ are fatty acid (脂肪酸) chains; orange bonds show where hydrolysis occurs.')
      },
      labels:{identity:p('姓名：________________　班別及學號：________________','Name: ____________________   Class and student number: ____________________'),
        start:p('A 從開始即可閱讀，全程可參閱。先看補充資料，再完成 B；完成 B 後才取得 C。','Read A from the start and keep it available. Read the supporting notes, complete B, then receive C.'),
        teacher:p('只供教師，請勿派給學生。','For teachers only. Do not give this part to students.'),
        circles:p('圈選括號內每組一項；多選題用方格。文字回答各提供兩行。','Circle one answer in each set of brackets; use boxes for multiple choices. Each written answer has two lines.'),
        first:p('先完成並保留 B 的首次答案；取得 C 後用另一顏色修正，不擦除原文。','Complete and keep the first answers in B. After receiving C, correct in another colour without erasing the original.'),
        data:p('圖像是目前教學模型的靜態資料，沒有預填外觀答案；不是直接檢測消化產物的結果。','These images are static data from the current teaching model. Appearance answers are not filled in. They are not direct product-test results.'),
        reply:p('簡短理由／解釋：','Brief reason / explanation:'),
        studentTiming:p('活動總時間為 15–20 分鐘，依老師指定的時限完成閱讀、練習及核對修正。','The total activity time is 15–20 minutes. Follow the teacher’s time limit for reading, practice, checking and correcting.'),
        matching:p('本組不操作 VL，沒有課前講授；依工作紙自學。兩組的活動總時間均為 15–20 分鐘；同一班次採相同的 T，全程包括自學、練習與核對修正。','This group uses the worksheet without operating the VL or receiving a lesson beforehand. Both groups have 15–20 minutes in total. Use the same T for both groups in each session, including self-study, practice and checking.'),
        limits:p('外觀只能作教學線索；清澈不能單獨證明已產生甘油和脂肪酸，也不能量化速度。X＋Y 各 1 mL，而單獨組各加 2 mL；個別試劑量不同，不能據此定量證明協同作用或速率增加。','Appearance is a teaching clue: clarity alone does not prove glycerol (甘油) and fatty acids (脂肪酸) formed or measure speed. X + Y uses 1 mL each, while a single-juice set uses 2 mL. The different individual amounts cannot prove a measured combined effect or faster rate.'),
        check:p('完成 B 後才派發 C，核對答案、保留原答並修正。','Give out C only after B is completed. Check, keep the first answers and correct them.'),
        draft:p('紙本練習回饋初稿；不等同 VL 活動分數、SPSAI 或 CKT。研究成效以另行共同測驗評估。','Draft worksheet feedback guide. These marks are not equivalent to VL activity marks, SPSAI or CKT. Use separate common tests to assess research outcomes.')},
      concepts:[
        {heading:p('01 · 物理消化','01 · Physical digestion (物理消化)'),body:p('膽汁由肝臟製造、膽囊儲存，不含消化酶；把大油滴乳化成小油滴，總表面積增加，脂質分子不變。','Bile (膽汁), made in the liver and stored in the gall bladder (膽囊), has no digestive enzymes. Emulsification (乳化作用) makes smaller droplets with more total surface area; lipid molecules stay unchanged.')},
        {heading:p('02 · 化學消化','02 · Chemical digestion (化學消化)'),body:p('脂肪酶催化脂質水解，改變化學鍵，形成甘油及脂肪酸；酶不被消耗。本課使用完全水解簡化模型。','Lipase (脂肪酶) catalyses hydrolysis, changing chemical bonds to form glycerol (甘油) and fatty acids (脂肪酸). The enzyme is not used up. This course uses a simplified complete-hydrolysis model.')}
      ],
      wordEquations:{physical:p('脂質（大油滴） → 脂質（小油滴）','Lipids (large oil droplets) → Lipids (small oil droplets)'),chemical:p('甘油三酯 + 3H₂O（水） → 甘油 + 3 個脂肪酸','Triglyceride (甘油三酯) + 3H₂O (water) → glycerol (甘油) + 3 fatty acids (脂肪酸)')},
      conditions:p('各組起始油水量、加液總量（2 mL）、37°C、觀察時間及搖勻方式相同。配方見圖。','Keep starting oil/water amounts, total added volume (2 mL), 37°C, observation time and shaking the same. Added liquids are shown in the figure.'),
      timePlan:[
        {stage:p('A：情境及補充概念圖','A: context and supporting concept diagrams'),fraction:0.30},
        {stage:p('B1–B2：有提示練習','B1–B2: guided practice'),fraction:0.35},
        {stage:p('B3–B4：獨立應用','B3–B4: independent application'),fraction:0.25},
        {stage:p('C：核對修正','C: check and correct'),fraction:0.10}
      ],
      modelIdentity:p('核對說明：本教學模型設定 X 為膽汁、Y 為脂肪酶；這是模型設定，不能只靠外觀確證試劑身分。','Check note: this teaching model assigns X to bile (膽汁) and Y to lipase (脂肪酶). These are model settings, not identities proved by appearance alone.'),
      questions,
      corrections:[
        p('在 B 找一項需要修正的答案，寫出題號、正確解釋及錯因。若全部正確，選一題補充證據及限制；不要捏造錯誤。','Choose an answer in B to correct. Write its ID, the sound explanation and why it was wrong. If all are correct, add evidence and a limit to one answer; do not invent a mistake.'),
        p('以一項具體組間比較，寫出你現在能解釋的乳化、酶作用或變性概念。','Use one named comparison to explain emulsification (乳化作用), enzyme action or denaturation in your own words.')
      ]
    };
    const result=resolve(content,lang);
    result.questions.sort((a,b)=>a.page-b.page);
    const originalFor=id=>({initialObservation:vl.initialObservation.heading+'：'+vl.initialObservation.hint,
      hypothesisLiquid:vl.hypothesis.instruction,hypothesisOutcome:vl.hypothesis.sentence,reason:vl.hypothesis.reasonLabel,
      variables:vl.variables.heading+'：'+vl.variables.groups.map(g=>g.label+' '+g.definition).join(' / '),assumptions:vl.assumptions.question,controlPlan:vl.control.question,
      setupDescription:vl.design.writtenLabel,setupCanvas:vl.design.question,setupPhoto:vl.design.instruction,
      basicObservations:vl.basic.observationPrompt,extensionObservations:vl.extension.heading+'：'+vl.extension.question,
      heatComparison:vl.extension.question,reflection:vl.reflection.question,
      ...Object.fromEntries([...vl.conclusions.questions,vl.extension.conclusion].map(q=>[q.id,(q.heading?q.heading+'：':'')+q.sentence]))}[id]);
    result.questions.forEach((q,i)=>q.number='B'+q.page+'.'+result.questions.filter((other,j)=>j<=i&&other.page===q.page).length);
    result.mapping=result.questions.map(q=>({id:q.id,original:q.source.map(originalFor).join(' / '),
      treatment:resolve(q.id==='mainObservations'?p('合併／靜態化','Merged / static data'):q.kind==='heatObservations'?p('靜態化', 'Static data'):['initial','variables','assumptions','conclusion'].includes(q.kind)?p('保留／等值改寫','Retained / equivalent rewrite'):p('改寫','Rewritten'),lang),
      revised:q.prompt,goal:q.goal,reason:resolve(q.id==='mainObservations'?p('取消獨立初步觀察題，觀察證據保留於四組主實驗及兩組熱處理記錄。','Remove the separate initial-observation item; retain observation evidence in the four main and two heating records.'):q.source.includes('reflection')?p('已先教概念；改為證據運用，不捏造原始假說。','Concepts are taught first; assess their use with evidence rather than inventing an original hypothesis.'):
        q.kind==='labels'?p('補全及評估給定程序，保留裝置與公平比較技能。','Label and evaluate a given procedure while practising apparatus and fair-comparison skills.'):
        q.kind==='prediction'?p('根據已提供的膽汁乳化知識自行作預測，不假裝是課前原始猜想。','Write a prediction using supplied knowledge of bile (膽汁) and emulsification (乳化作用); do not present it as a pre-learning original guess.'):
        p('保留共同內容／技能，以自學或靜態資料提供相應練習。','Keep the common content and skills, practised through self-study or static data.'),lang)}));
    result.practiceMaximum=result.questions.reduce((sum,q)=>sum+q.max,0);
    return result;
  }
  window.VL1ComparisonWorksheet={version,materialVersion,expectedOutcomes,create};
})();
