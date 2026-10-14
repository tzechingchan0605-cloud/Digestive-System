'use strict';
// Paper comparison condition only: direct explanation, worked examples, practice.
// No student state, record, timer, cloud or scoring-workbook writes.
(() => {
  const version='VL1-WS-direct-1';
  const materialVersion=6;
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
      {id:'observation',page:1,kind:'initial',max:2,source:['initialObservation'],
        prompt:p('只描述圖中未加消化液的油水試管：你看到哪些層及分界？','Describe only the oil–water test tube before any digestive juice is added. What layers and boundary can you see?'),
        hint:p('描述可見外觀，先不要寫「已被消化」等解釋。','Describe what you can see. Keep explanations such as “digested” separate.'),
        key:p('油在上層、水在下層，兩層有清楚分界；描述與化學解釋分開。','Oil is above the water, with a clear boundary. Keep the visible description separate from a chemical explanation.'),goal:p('觀察：分辨現象與解釋。','Observation: separate what is seen from an explanation.'),rule:p('2：描述兩層、分界並分開解釋；1：一項具體外觀；0：沒有相關描述。','2: describes both layers and the boundary without claiming digestion; 1: one specific visible feature; 0: no relevant description.')},
      {id:'prediction',page:1,kind:'prediction',max:2,source:['hypothesisLiquid','hypothesisOutcome','reason'],
        prompt:p('評估給定預測及理由，不用建立「原始假說」。','Evaluate this given prediction and reason. You do not need to invent an “original hypothesis”.'),
        given:p('「保持其他條件相同，加入 2 mL Y 會把大油滴分散成小油滴，因為所有消化酶都會乳化脂質。」','“With the other conditions kept the same, adding 2 mL Y will spread large oil droplets into small droplets, because all digestive enzymes emulsify lipids (乳化脂質).”'),
        hint:p('先分開判斷「能否用觀察檢驗」和「理由是否符合概念」，再指出理由的問題。','Judge separately whether observations can test the prediction and whether the reason fits the concepts. Then explain the problem with the reason.'),
        key:p('這是可檢驗的預測，但理由不正確：Y 是脂肪酶，催化水解；乳化是膽汁的作用。可測試不等同已證實。','The prediction can be tested, but the reason is wrong. Y is lipase (脂肪酶), which speeds up hydrolysis. Bile (膽汁) causes emulsification (乳化作用). Testable does not mean already proved.'),goal:p('設計探究：評估可測試性及理由。','Inquiry design: judge whether a prediction is testable and whether its reason is sound.'),rule:p('2：可檢驗與理由不正確均分辨清楚並說明酶／乳化差異；1：只分辨或解釋其中一項；0：沒有相關判斷。','2: separates testability from the wrong reason and explains enzyme action versus emulsification (乳化作用); 1: one useful judgement or explanation; 0: neither.')},
      {id:'variables',page:1,kind:'variables',max:4,source:['variables'],
        prompt:p('本次主比較只改變消化液組合。把因素分為獨立、因及控制變量。','The main comparison changes the combination of digestive juices. Classify the factors as independent, dependent or controlled variables.'),hint:p('參考 A 的分類方法；每類可選多於一項。','Use the method in A. More than one factor may belong to a group.'),
        key:p('獨立：消化液組合。因：混合物外觀。控制：起始油水量、反應溫度、時間、加液總量、搖勻方式。','Independent: combination of juices. Dependent: appearance. Controlled: starting oil/water volume, temperature, time, total added volume and shaking method.'),goal:p('分類：辨識三類變量。','Classification: identify the three kinds of variables.'),rule:p('獨立 1、因 1；五項控制每項 0.4，共 2。每類若選入其他類因素，該類 0 分。','Independent 1, dependent 1; five controlled factors at 0.4 each, total 2. A factor from a wrong category gives 0 for that category.')},
      {id:'assumptions',page:1,kind:'assumptions',max:1,source:['assumptions'],
        prompt:p('選出公平比較所需的實驗前提，可選多於一項。','Choose all the conditions needed for a fair comparison.'),hint:p('假設是暫視為成立、用於解釋結果的條件；實際程序也要按已指定的固定條件執行。','An assumption is a condition taken as true when explaining results. The procedure must also follow the fixed conditions provided.'),
        key:p('選相同時間、相同起始油水量及加液總量、相同搖勻方式；不選 X＋Y 可加較多總液量。','Choose equal time, equal starting and total added volumes, and equal shaking; do not choose extra total liquid for X + Y.'),goal:p('設計及進行實驗：辨識合理固定條件。','Inquiry design and experimental reasoning: identify sound fixed conditions.'),rule:p('選齊三項且無錯選為 1；其他已作答組合為 0。','1 for all three correct conditions with no wrong choice; 0 for another attempted set.')},
      {id:'control',page:2,kind:'open',max:2,source:['controlPlan'],
        prompt:p('要比較「加入消化液」與「只加水」，四組中哪一組是比較基準？為甚麼要加入相同總液量？','To compare adding digestive juice with adding only water, which of the four sets is the baseline? Why keep the total volume added the same?'),hint:p('對照按這個具體比較問題選擇；不能把其他條件的差異誤當成試劑的作用。','Choose the control for this specific question. A change in another condition must not be mistaken for the effect of the juice.'),
        key:p('2 mL 水組是這個問題的基準；相同加液總量避免總體積或稀釋程度成為另一個差異。','The 2 mL water set is the baseline for this question. Equal added volume avoids a difference in total volume or dilution.'),goal:p('設計探究：理解對照的比較功能。','Inquiry design: explain the purpose of a control.'),rule:p('基準 1、固定總液量的合理理由 1。','1 for the baseline, 1 for a sound reason to keep total volume fixed.')},
      {id:'labels',page:2,kind:'labels',max:2,source:['setupDescription','setupCanvas','setupPhoto'],
        prompt:p('四個基本裝置已指定。依 A 的配方在圖下補全組名及加液量，不需自行重新設計。','The four basic setups are already specified. Use the recipes in A to complete each label and added volume; no new apparatus design is needed.'),hint:p('每個裝置均加入 2 mL 總液量；各有相同起始油水量。','Each setup receives 2 mL in total and starts with the same amounts of oil and water.'),
        key:p('依序：水對照 2 mL 水；X 2 mL；Y 2 mL；X＋Y 各 1 mL。','In order: water control, 2 mL water; X, 2 mL; Y, 2 mL; X + Y, 1 mL each.'),goal:p('進行實驗及溝通：讀懂、補全裝置與量。','Experimental reasoning and communication: read and label setups and volumes.'),rule:p('四個組名及量均完整為 2；每個完整裝置 0.5。','2 for all four correct setup/volume labels; 0.5 per complete label.')},
      {id:'fairness',page:2,kind:'open',max:3,source:['setupDescription','controlPlan'],
        prompt:p('某人讓水組加 2 mL 水，X＋Y 組卻加 2 mL X 及 2 mL Y，其餘條件相同。這是否公平？指出問題、修正兩種消化液的量，並說明理由。','Someone adds 2 mL water to the control but 2 mL X and 2 mL Y to the combined set, with other conditions equal. Is this fair? Identify the problem, fix the two volumes and explain why.'),hint:p('先計每組的加液總量；再判斷是否只改了一項因素。','First find the total volume added to each set. Then check whether only one factor changed.'),
        key:p('不公平：2 mL 對 4 mL。改為 X、Y 各 1 mL，保持總量 2 mL，排除總體積／稀釋差異。','Unfair: 2 mL versus 4 mL. Use 1 mL of each juice, keeping the total at 2 mL to avoid a volume/dilution difference.'),goal:p('設計及進行實驗：評估並修正不公平程序。','Inquiry design and experimental reasoning: evaluate and correct an unfair procedure.'),rule:p('問題 1、正確改量 1、因果／公平理由 1。','1 for the flaw, 1 for corrected volumes, 1 for the fairness explanation.')},
      {id:'mainObservations',page:3,kind:'observations',max:4,source:['basicObservations'],
        prompt:p('獨立應用：觀察四組靜態圖，自行記錄外觀。','Independent application: observe the four static images and record their appearances.'),hint:p('A 可繼續參閱；現在不要索取答案。外觀圖是教學模型的資料，不是直接產物檢測。','You may keep using A. Do not request the answer key yet. The images are model data, not direct product tests.'),
        key:p('水：分層；X：混濁；Y：油層變薄但仍分層；X＋Y：清澈。','Water: separated layers; X: cloudy; Y: thinner oil layer, still separated; X + Y: clear.'),goal:p('觀察及溝通：保留四種外觀的區別。','Observation and communication: distinguish the four appearances.'),rule:p('每組正確判讀 1 分，共 4。','1 per correctly described set, total 4.')},
      {id:'xConclusion',page:3,kind:'conclusion',vlQuestion:'q1',max:2,source:['q1'],
        prompt:p('X 的作用：完成括號選擇，再用乳化概念解釋外觀。','X: choose the appearance, then explain it using emulsification (乳化作用).'),
        key:p('混濁乳狀液；X 的乳化使油滴分散，屬物理消化，脂質分子結構不變。','Cloudy emulsion (乳狀液). X disperses oil droplets by emulsification (乳化作用), a form of physical digestion (物理消化), without changing the lipid molecules.'),goal:p('推論：連結外觀與乳化概念。','Inference: link an appearance with emulsification (乳化作用).'),rule:p('外觀 1；乳化及分子不變的合理解釋 1。','1 for the appearance; 1 for a sound explanation of emulsification (乳化作用) without molecular change.')},
      {id:'surface',page:3,kind:'conclusion',vlQuestion:'q3',max:2,source:['q3'],
        prompt:p('油滴變小後的總表面積：完成選擇並說明如何有助 Y 作用。','Total surface area after droplets become smaller: choose the answer and explain how this helps Y act.'),
        key:p('增加；在同一總脂質量下，分散成小油滴增加脂肪酶可作用的表面。這不是速度量度。','Increases. For the same total amount of lipid, small droplets provide more surface for lipase (脂肪酶) to act on. This is not a measurement of speed.'),goal:p('推論：以概念解釋表面積，避免冒充速率資料。','Inference: explain surface area without inventing speed data.'),rule:p('增加 1；有效表面與酶作用的解釋 1。','1 for increase, 1 for explaining the available surface and enzyme action.')},
      {id:'limits',page:4,kind:'conclusion',vlQuestion:'limitations',max:2,source:['limitations'],
        prompt:p('外觀證據的限制：選出最恰當的說法，再寫出需要的另一類證據。','Limits of appearance evidence: choose the best statement, then name another kind of evidence needed.'),
        key:p('選「外觀提供線索，但不能單獨證明甘油及脂肪酸已產生」；需要其他消化產物化學檢測及重複測試。','Choose the statement that appearance gives clues but does not prove glycerol (甘油) and fatty acids (脂肪酸) formed. Other chemical product tests and repeated tests are needed.'),goal:p('推論及溝通：區分線索、直接證據與限制。','Inference and communication: distinguish clues, direct evidence and limits.'),rule:p('恰當說法 1；合理的額外檢測／重複證據 1。','1 for the sound statement, 1 for a useful additional test or repeated evidence.')},
      {id:'heatControl',page:4,kind:'open',max:2,source:['controlPlan','heatComparison'],
        prompt:p('要研究煮沸某一消化液的影響，應以哪一組作比較基準？比較前要怎樣處理煮沸的液體？','To study boiling one digestive juice, which set should be the baseline? What must happen to the boiled liquid before comparison?'),
        key:p('未煮沸 X＋Y 各 1 mL 組；煮沸後冷卻至共同 37°C，其餘條件相同。這個對照含 X 與 Y。','The unboiled X + Y set, 1 mL each; cool the boiled juice to the common 37°C and keep the other conditions equal. This control contains X and Y.'),goal:p('設計及進行實驗：按問題選對照並控制反應溫度。','Inquiry design and experimental reasoning: choose the control for the question and control reaction temperature.'),rule:p('未煮沸組 1；冷卻至共同溫度及公平比較 1。','1 for the unboiled baseline, 1 for cooling to the common temperature for a fair comparison.')},
      {id:'heatObservations',page:4,kind:'heatObservations',max:2,source:['extensionObservations'],
        prompt:p('觀察兩組煮沸後冷卻的圖，記錄外觀；與未煮沸 X＋Y 組比較。','Record the appearances of the two boiled-and-cooled sets and compare them with unboiled X + Y.'),
        key:p('煮沸 X＋未煮沸 Y：清澈；未煮沸 X＋煮沸 Y：混濁。','Boiled X + unboiled Y: clear; unboiled X + boiled Y: cloudy.'),goal:p('觀察：比較熱處理與基準。','Observation: compare heating treatments with a baseline.'),rule:p('兩組各 1 分。','1 for each set.')},
      {id:'heatConclusion',page:4,kind:'conclusion',vlQuestion:'q2',max:2,source:['q2'],
        prompt:p('受熱後失去作用的消化液：完成選擇，並解釋冷卻後仍失去作用的原因。','Juice that loses its action after heating: choose the answer and explain why cooling does not restore its action.'),
        key:p('Y；脂肪酶是蛋白質，煮沸使酶變性而失去功能，本模型中冷卻後也不恢復。','Y. Lipase (脂肪酶) is a protein; boiling causes denaturation and loss of function. Cooling does not restore it in this model.'),goal:p('推論及內容知識：用酶變性解釋熱處理。','Inference and content knowledge: explain heat treatment using enzyme denaturation.'),rule:p('Y 1；蛋白質酶變性及不能單靠冷卻復原 1。','1 for Y, 1 for protein-enzyme denaturation and why cooling alone does not restore it.')},
      {id:'application',page:4,kind:'open',max:4,source:['reflection'],
        prompt:p('引用至少一組主實驗比較及一組熱處理比較，解釋乳化、酶作用及變性。寫明你比較的組別；不要聲稱定量證明協同作用或速度增加。','Use at least one main-set comparison and one heating comparison to explain emulsification (乳化作用), enzyme action and denaturation. Name the sets. Do not claim a measured combined effect or increase in speed.'),
        key:p('例如水與 X 比較連結乳化；未煮沸 X＋Y 與煮沸 Y 組比較連結酶失去作用。合理說明膽汁分散油滴、脂肪酶水解及熱變性；外觀與不同個別試劑量限制定量推論。其他正確具體比較亦可。','For example, compare water with X for emulsification (乳化作用), and unboiled X + Y with boiled Y for enzyme loss. Explain bile (膽汁), lipase (脂肪酶) hydrolysis and heat denaturation. Appearance and different individual juice amounts limit measured claims. Other sound specific comparisons are accepted.'),goal:p('溝通及內容知識：用具體組間比較整合概念。','Communication and content knowledge: explain concepts using named comparisons.'),rule:p('乳化 1、水解酶作用 1、變性 1；主實驗及熱處理的具體比較與清楚表達 1。不以關鍵字計分。','1 each for emulsification (乳化作用), enzyme hydrolysis and denaturation; 1 for clear main/heating comparisons. Judge explanations, not keywords.')}
    ];
    const content={
      version,materialVersion,approach:'explanation-example-guided-independent-check',title:p('脂質的消化與公平比較','Digestion of lipids and fair comparisons'),
      names:{A:p('自學概念、圖像及示例','Self-study concepts, diagrams and examples'),B:p('有提示練習及獨立應用','Guided practice and independent application'),C:p('核對答案及修正','Answer check and corrections'),D:p('教師指引、配對及評分','Teacher guide, mapping and feedback'),all:p('完整教師列印套裝','Complete teacher print pack')},
      labels:{identity:p('姓名：________________　班別及學號：________________','Name: ____________________   Class and student number: ____________________'),
        start:p('A 從開始即可閱讀，全程可參閱。先看解說及示例，再完成 B；完成 B 後才取得 C。','Read A from the start and keep it available. Study the explanations and examples, complete B, then receive C.'),
        teacher:p('只供教師，請勿派給學生。','For teachers only. Do not give this part to students.'),
        circles:p('圈選括號內每組一項；多選題用方格。文字回答各提供兩行。','Circle one answer in each set of brackets; use boxes for multiple choices. Each written answer has two lines.'),
        first:p('先完成並保留 B 的首次答案；取得 C 後用另一顏色修正，不擦除原文。','Complete and keep the first answers in B. After receiving C, correct in another colour without erasing the original.'),
        data:p('圖像是目前教學模型的靜態資料，沒有預填外觀答案；不是直接檢測消化產物的結果。','These images are static data from the current teaching model. Appearance answers are not filled in. They are not direct product-test results.'),
        reply:p('簡短理由／解釋：','Brief reason / explanation:'),
        studentTiming:p('活動總時間為 15–20 分鐘，依老師指定的時限完成閱讀、練習及核對修正。','The total activity time is 15–20 minutes. Follow the teacher’s time limit for reading, practice, checking and correcting.'),
        matching:p('本組不操作 VL，沒有課前講授；依工作紙自學。兩組的活動總時間均為 15–20 分鐘；同一班次採相同的 T，全程包括自學、練習與核對修正。','This group uses the worksheet without operating the VL or receiving a lesson beforehand. Both groups have 15–20 minutes in total. Use the same T for both groups in each session, including self-study, practice and checking.'),
        limits:p('外觀只能作教學線索；清澈不能單獨證明已產生甘油和脂肪酸，也不能量化速度。X＋Y 各 1 mL，而單獨組各加 2 mL；個別試劑量不同，不能據此定量證明協同作用或速率增加。','Appearance is a teaching clue: clarity alone does not prove glycerol (甘油) and fatty acids (脂肪酸) formed or measure speed. X + Y uses 1 mL each, while a single-juice set uses 2 mL. The different individual amounts cannot prove a measured combined effect or faster rate.'),
        check:p('完成 B 後才派發 C。現在可核對答案、保留原答並修正；不要虛構原始假說。','Give out C only after B is completed. Check, keep the first answers and correct them. Do not invent an original hypothesis.'),
        draft:p('紙本練習回饋初稿；不等同 VL 活動分數、SPSAI 或 CKT。研究成效以另行共同測驗評估。','Draft worksheet feedback guide. These marks are not equivalent to VL activity marks, SPSAI or CKT. Use separate common tests to assess research outcomes.')},
      concepts:[
        {heading:p('X：膽汁與物理消化','X: bile (膽汁) and physical digestion (物理消化)'),body:p('X 是膽汁，由肝臟製造、儲存在膽囊，不含消化酶。乳化把大油滴分散成小油滴，脂質分子結構不變；同一總脂質量分散後，總表面積增加，讓脂肪酶更容易作用。','X is bile (膽汁), made in the liver and stored in the gall bladder (膽囊). It contains no digestive enzymes. Emulsification (乳化作用) spreads large oil droplets into small droplets without changing lipid molecules. For the same total amount of lipid, total surface area increases, giving lipase (脂肪酶) more surface to act on.')},
        {heading:p('Y：脂肪酶與化學消化','Y: lipase (脂肪酶) and chemical digestion (化學消化)'),body:p('Y 是脂肪酶，催化脂質水解，改變化學鍵。本課採完全水解簡化模型：甘油三酯＋3H₂O→甘油＋3個脂肪酸。酶是催化劑，不在反應中被消耗。','Y is lipase (脂肪酶), which speeds up lipid hydrolysis and changes chemical bonds. This course uses a complete-hydrolysis model: triglyceride (甘油三酯) + 3H₂O → glycerol (甘油) + 3 fatty acids (脂肪酸). The enzyme is a catalyst and is not used up.')},
        {heading:p('高溫、變性與公平比較','High temperature, denaturation and fair comparison'),body:p('脂肪酶是蛋白質；煮沸可使酶變性、失去功能。本模型中，冷卻後不會恢復作用。煮沸後先冷卻至與其他組相同的 37°C，才比較；否則反應溫度也不同，不能只歸因於煮沸處理。','Lipase (脂肪酶) is a protein. Boiling can cause denaturation and loss of function; cooling does not restore its action in this model. Cool boiled liquids to the common 37°C before comparison, so reaction temperature does not become another difference.')},
        {heading:p('外觀與產物證據不同','Appearance and product evidence are different'),body:p('油層、混濁及清澈是預設教學線索。它們不能單獨證明甘油或脂肪酸已形成，也不能量化消化速度；實際實驗仍需化學檢測與重複測試。','Oil layers, cloudiness and clarity are set teaching clues. They alone cannot prove glycerol (甘油) or fatty acids (脂肪酸) formed, or measure digestion speed. Real experiments need chemical tests and repeated tests.')}
      ],
      conditions:p('四組均有相同起始油水量；加入總液量 2 mL，於 37°C 反應，使用相同觀察時間及搖勻方式。配方：水對照加 2 mL 水；X 組加 2 mL X；Y 組加 2 mL Y；X＋Y 組加各 1 mL。觀察時間、起始量及搖勻細節採研究者的共同安排，不捏造本模型未提供的數值。','Each set starts with the same amounts of oil and water, receives 2 mL in total, reacts at 37°C, and uses equal observation time and shaking. Recipes: control, 2 mL water; X, 2 mL X; Y, 2 mL Y; X + Y, 1 mL each. Use the researcher’s common starting amounts, timing and shaking details; do not invent values missing from the model.'),
      methods:[
        {heading:p('變量分類方法','How to classify variables'),body:p('獨立變量是有意改變的因素；因變量是觀察或量度的結果；控制變量是保持相同的條件。先找比較問題，再找只改變的一項因素。','The independent variable is the factor changed on purpose; the dependent variable is the result seen or measured; controlled variables are kept the same. Start with the comparison question, then find the one factor that changes.')},
        {heading:p('對照按問題選擇','Choose the control for the question'),body:p('對照是比較基準，用來排除其他因素的干擾。它不一定「完全沒有自變量」或沒有試劑；必須看這次要比較的是加液、加熱還是其他處理。','A control is a baseline that helps rule out other causes. It need not be free of every factor or reagent. Choose it for the actual question: adding liquid, heating, or another treatment.')}
      ],
      examples:[
        {heading:p('已解說示例：可測試假說','Worked example: a testable prediction'),body:p('「其他條件相同時，加入 2 mL X 會使大油滴分散成小油滴。」理由：X 是膽汁，能乳化脂質。可比較水組與 X 組並觀察外觀。這是已解說的示例，不是你的原始假說。可觀察、可比較的預測可以檢驗；是否得到資料支持是另一項判斷。','“With other conditions equal, adding 2 mL X will spread large oil droplets into small droplets.” Reason: X is bile (膽汁), which can emulsify lipids (乳化脂質). Compare water with X and observe appearances. This is a worked example, not your original hypothesis. A prediction that can be observed and compared is testable; whether data support it is a separate judgement.')},
        {heading:p('已解說示例：分類與觀察','Worked example: classification and observation'),body:p('若比較搖勻方式，獨立變量是搖勻方式，觀察結果是因變量，消化液組合及其他條件要相同。這是分類方法示例，不是 B 的主比較答案。描述「杯底有顆粒」是觀察；「顆粒已化學分解」是需要其他證據的解釋。','If the question compares shaking methods, shaking is independent, the observed result is dependent, and the juice combination and other conditions stay the same. This teaches the method; it is not B’s main-comparison answer. “Particles are at the bottom” is an observation; “they have chemically broken down” needs other evidence.')}
      ],
      timePlan:[
        {stage:p('A：解說及示例','A: explanations and examples'),fraction:0.30},
        {stage:p('B1–B2：有提示練習','B1–B2: guided practice'),fraction:0.35},
        {stage:p('B3–B4：獨立應用','B3–B4: independent application'),fraction:0.25},
        {stage:p('C：核對修正','C: check and correct'),fraction:0.10}
      ],
      questions,
      corrections:[
        p('在 B 找一項需要修正的答案，寫出題號、正確解釋及錯因。若全部正確，選一題補充證據及限制；不要捏造錯誤。','Choose an answer in B to correct. Write its ID, the sound explanation and why it was wrong. If all are correct, add evidence and a limit to one answer; do not invent a mistake.'),
        p('以一項具體組間比較，寫出你現在能解釋的乳化、酶作用或變性概念。','Use one named comparison to explain emulsification (乳化作用), enzyme action or denaturation in your own words.')
      ]
    };
    const result=resolve(content,lang);
    const originalFor=id=>({initialObservation:vl.initialObservation.heading+'：'+vl.initialObservation.hint,
      hypothesisLiquid:vl.hypothesis.instruction,hypothesisOutcome:vl.hypothesis.sentence,reason:vl.hypothesis.reasonLabel,
      variables:vl.variables.heading+'：'+vl.variables.groups.map(g=>g.label+' '+g.definition).join(' / '),assumptions:vl.assumptions.question,controlPlan:vl.control.question,
      setupDescription:vl.design.writtenLabel,setupCanvas:vl.design.question,setupPhoto:vl.design.instruction,
      basicObservations:vl.basic.observationPrompt,extensionObservations:vl.extension.instruction,
      heatComparison:vl.extension.question,reflection:vl.reflection.question,
      ...Object.fromEntries([...vl.conclusions.questions,vl.extension.conclusion].map(q=>[q.id,(q.heading?q.heading+'：':'')+q.sentence]))}[id]);
    result.questions.forEach((q,i)=>q.number='B'+q.page+'.'+result.questions.filter((other,j)=>j<=i&&other.page===q.page).length);
    result.mapping=result.questions.map(q=>({id:q.id,original:q.source.map(originalFor).join(' / '),
      treatment:resolve(q.kind==='observations'||q.kind==='heatObservations'?p('靜態化', 'Static data'):['initial','variables','assumptions','conclusion'].includes(q.kind)?p('保留／等值改寫','Retained / equivalent rewrite'):p('改寫','Rewritten'),lang),
      revised:q.prompt,goal:q.goal,reason:resolve(q.source.includes('reflection')?p('已先教概念；改為證據運用，不捏造原始假說。','Concepts are taught first; assess their use with evidence rather than inventing an original hypothesis.'):
        q.kind==='labels'?p('補全及評估給定程序，保留裝置與公平比較技能。','Label and evaluate a given procedure while practising apparatus and fair-comparison skills.'):
        q.kind==='prediction'?p('以示例教方法，再評析另一預測與理由。','Teach the method with an example, then evaluate another prediction and reason.'):
        p('保留共同內容／技能，以自學或靜態資料提供相應練習。','Keep the common content and skills, practised through self-study or static data.'),lang)}));
    result.practiceMaximum=result.questions.reduce((sum,q)=>sum+q.max,0);
    return result;
  }
  window.VL1ComparisonWorksheet={version,materialVersion,expectedOutcomes,create};
})();
