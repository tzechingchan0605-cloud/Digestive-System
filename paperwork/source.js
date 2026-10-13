'use strict';
// Shared DOM + curriculum constants are the question source for both media.
// This module never reads form values, session state, storage or cloud queues.
(() => {
  const imageMap={
    'assets/emulsification.svg':'assets/emulsification-en.svg',
    'assets/triglyceride-structure.svg':'assets/triglyceride-structure-en.svg',
    'assets/glycerol-structure.svg?v=2':'assets/glycerol-structure-en.svg?v=4',
    'assets/fatty-acids-structure.svg?v=2':'assets/fatty-acids-structure-en.svg?v=4'
  };
  function clone(element){
    const template=document.createElement('template');
    template.innerHTML=window.VL1Language.canonicalHTML(element);
    return template.content.firstElementChild;
  }
  function fragment(element,lang){
    const root=clone(element), walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;while((node=walker.nextNode()))node.nodeValue=window.VL1Language.text(node.nodeValue,lang);
    [root,...root.querySelectorAll('*')].forEach(el=>{
      ['alt','aria-label','title'].forEach(name=>{if(el.hasAttribute(name))el.setAttribute(name,window.VL1Language.text(el.getAttribute(name),lang));});
      if(lang==='en'&&imageMap[el.getAttribute('src')])el.setAttribute('src',imageMap[el.getAttribute('src')]);
      el.removeAttribute('id');
    });
    return root;
  }
  window.getVL1PaperSource=(lang='zh')=>{
    if(!['zh','en'].includes(lang))throw new Error('Unsupported material language');
    const core=window.VL1InquiryContent(),t=value=>window.VL1Language.text(value,lang);
    const q=selector=>document.querySelector(selector);
    const tx=selector=>t(clone(q(selector)).textContent.trim());
    const html=selector=>fragment(q(selector),lang).outerHTML;
    const options=id=>[...clone(q('#'+id)).options].filter(o=>o.value).map(o=>({id:o.value,text:t(o.textContent)})).sort((a,b)=>a.id.localeCompare(b.id));
    const question=id=>{
      const select=q('#'+id),container=select.closest('.conclusion-question')||select.closest('label');
      const label=select.closest('label'),root=fragment(label,lang);
      root.querySelectorAll('select').forEach(el=>{const fill=document.createElement('span');fill.className='paper-fill';fill.textContent='__________';el.replaceWith(fill);});
      return {id,heading:container.querySelector('h4')?t(clone(container.querySelector('h4')).textContent):'',sentence:root.innerHTML,options:options(id)};
    };
    const initial=q('#initialObservation').closest('article'),control=q('#controlPlan').closest('article'),design=q('#setupCanvas').closest('article');
    const scene=fragment(q('.context-diagram'),lang);
    const titleRoot=fragment(q('.hero h1'),lang);titleRoot.querySelectorAll('br').forEach(el=>el.replaceWith(' '));
    const physical=fragment(q('.physical-diagram'),lang);physical.querySelectorAll('source').forEach(el=>el.remove());
    const chemical=fragment(q('.chemical-diagram'),lang);
    return {
      language:lang,moduleId:core.moduleId,version:core.version,questionIds:core.fields,
      title:titleRoot.textContent.trim(),
      context:scene.outerHTML,background:tx('.prompt-card > p'),taskHeading:tx('.task-label'),
      taskQuestion:tx('.prompt-card h3'),taskDescription:t(clone(q('.prompt-card')).querySelector('h3').nextElementSibling.textContent),
      initialObservation:{id:'initialObservation',heading:t(clone(initial).querySelector('label').textContent),hint:t(clone(initial).querySelector('p').textContent)},
      hypothesis:{heading:tx('.builder-card .card-kicker'),instruction:tx('.builder-card h3'),
        sentence:(()=>{const root=fragment(q('.builder-card .sentence'),lang);root.querySelectorAll('select').forEach(el=>{const fill=document.createElement('span');fill.textContent='__________';el.replaceWith(fill);});return root.innerHTML;})(),
        liquid:options('hypothesisLiquid'),outcome:options('hypothesisOutcome'),reasonLabel:t(clone(q('.builder-card .reason-label')).firstChild.textContent.trim())},
      variables:{heading:tx('.variables-card .card-kicker'),groups:core.variableGroups.map(([id,label,definition])=>({id,label:t(label),definition:t('（'+definition+'）')})),choices:core.variableNames.map(id=>({id,text:t(id)}))},
      assumptions:{heading:t(clone(q('#assumptionChoices').closest('article')).querySelector('.card-kicker').textContent),question:t(clone(q('#assumptionChoices').closest('article')).querySelector('h3').textContent),hint:t(clone(q('#assumptionChoices').closest('article')).querySelector('.section-description').textContent),reminder:tx('.assumption-reminder'),choices:core.assumptions.map(([id,text])=>({id,text:t(text)}))},
      control:{id:'controlPlan',heading:t(clone(control).querySelector('.card-kicker').textContent),question:t(clone(control).querySelector('h3').textContent),hint:t(clone(control).querySelector('.scaffold-hint').textContent)},
      design:{id:'setupDescription',heading:t(clone(design).querySelector('.card-kicker').textContent),question:t(clone(design).querySelector('h3').textContent),instruction:t(clone(design).querySelector('h3').nextElementSibling.textContent),hint:t(clone(design).querySelector('.scaffold-hint').textContent),reminder:tx('.drawing-reminder'),materials:html('.equipment-bank'),writtenLabel:t(clone(q('label[for="setupDescription"]')).textContent)},
      basic:{heading:tx('#phase-3 .phase-heading h2'),instruction:tx('#phase-3 .phase-heading p'),fair:fragment(q('.fair-note'),lang).textContent.trim(),observationPrompt:tx('#observationChoice > p'),options:[...q('#observationChoice').querySelectorAll('[data-observation]')].map(el=>({id:el.dataset.observation,text:t(clone(el).textContent)})),tableHeadings:[...clone(q('#observationTable thead')).querySelectorAll('th')].map(el=>t(el.textContent))},
      trials:core.trials.map(trial=>({...trial,label:t(trial.label)})),
      conclusions:{heading:tx('.conclusions-card .card-kicker'),instruction:tx('.conclusions-card h3'),questions:['q1','q3','limitations'].map(question)},
      extension:{heading:tx('.extension-card .card-kicker'),question:tx('.extension-card > h3'),instruction:tx('.extension-card > p:not(.card-kicker)'),options:[...q('#extensionObservation').querySelectorAll('[data-extension-observation]')].map(el=>({id:el.dataset.extensionObservation,text:t(clone(el).textContent)})),tableHeadings:[...clone(q('.extension-table thead')).querySelectorAll('th')].map(el=>t(el.textContent)),conclusion:question('q2')},
      learning:{heading:tx('#conceptReveal .card-kicker'),intro:tx('#conceptReveal h3'),points:html('.learning-points'),physical:physical.outerHTML,chemical:chemical.outerHTML,limit:t(clone(q('#conceptReveal')).querySelector('.learning-diagrams').nextElementSibling.textContent)},
      reflection:{id:'reflection',question:t(clone(q('#reflectionReveal')).querySelector('.card-kicker').nextElementSibling.textContent),heading:tx('#reflectionReveal .card-kicker')},
      reference:{variables:core.expectedVariables,assumptions:core.assumptions.filter(x=>x[2]).map(x=>x[0]),conclusions:core.conclusionAnswers,control:t(core.controlReference),design:t(core.designReference),limit:t(core.limitReference),outcomes:Object.fromEntries(Object.entries(core.outcomeLabels).map(([id,label])=>[id,t(label)])),rubric:core.rubric}
    };
  };
})();
