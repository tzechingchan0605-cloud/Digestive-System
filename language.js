'use strict';
// Presentation only: never write to record storage, answer values or cloud queues.
(() => {
  let current = 'zh';
  const sources = new WeakMap(), attributes = new WeakMap();
  const originalTitle = document.title;
  const ignored = 'script,style,textarea,[data-language-user]';
  const translatedAttributes = ['alt','title','aria-label','placeholder','src','srcset'];
  const images = {
    'assets/emulsification.svg':'assets/emulsification-en.svg',
    'assets/emulsification-mobile.svg':'assets/emulsification-mobile-en.svg',
    'assets/triglyceride-structure.svg':'assets/triglyceride-structure-en.svg',
    'assets/glycerol-structure.svg':'assets/glycerol-structure-en.svg',
    'assets/fatty-acids-structure.svg':'assets/fatty-acids-structure-en.svg'
  };
  function text(value) {
    const source = String(value ?? '');
    if (current === 'zh') return source;
    const [,before,content,after] = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!content) return source;
    const catalog = window.VL1_TRANSLATIONS;
    let translated = catalog.texts[content];
    if (translated === undefined) {
      for (const {regex,replace} of catalog.patterns || []) {
        regex.lastIndex = 0;
        if (regex.test(content)) {regex.lastIndex=0;translated=content.replace(regex,replace);break;}
      }
    }
    // Lists generated from canonical choices; free responses are excluded above.
    if (translated === undefined && /[、；]/.test(content)) {
      const parts = content.split(/[、；]/), rendered = parts.map(part=>text(part));
      if (parts.every((part,i)=>rendered[i]!==part)) translated=rendered.join(content.includes('；')?'; ':', ');
    }
    return before + (translated ?? content) + after;
  }
  function ignoredElement(element) {return element?.closest(ignored);}
  function translateNode(node) {
    if (ignoredElement(node.parentElement)) return;
    let item=sources.get(node);
    if (!item || node.nodeValue !== item.rendered) item={source:node.nodeValue};
    const rendered=text(item.source);
    sources.set(node,{source:item.source,rendered});
    if (node.nodeValue!==rendered) node.nodeValue=rendered;
  }
  function translateAttributes(element) {
    if (ignoredElement(element)) return;
    let entries=attributes.get(element);
    if (!entries) {entries=new Map();attributes.set(element,entries);}
    for (const name of translatedAttributes) {
      if (!element.hasAttribute(name)) continue;
      const value=element.getAttribute(name);
      let item=entries.get(name);
      if (!item || value!==item.rendered) item={source:value};
      const rendered=(name==='src'||name==='srcset')?(current==='en'?images[item.source]||item.source:item.source):text(item.source);
      entries.set(name,{source:item.source,rendered});
      if (value!==rendered) element.setAttribute(name,rendered);
    }
  }
  function refresh(root=document.body) {
    if (!root) return;
    if (root.nodeType===Node.TEXT_NODE) {translateNode(root);return;}
    if (root.nodeType!==Node.ELEMENT_NODE) return;
    if (ignoredElement(root)) return;
    translateAttributes(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
    let node;
    while ((node=walker.nextNode())) {
      if (node.nodeType===Node.TEXT_NODE) translateNode(node);
      else translateAttributes(node);
    }
  }
  function canonicalHTML(element, inner=false) {
    const clone=element.cloneNode(true);
    function restore(original,target) {
      if (original.nodeType===Node.TEXT_NODE) target.nodeValue=sources.get(original)?.source??original.nodeValue;
      else if (original.nodeType===Node.ELEMENT_NODE) {
        for (const [name,item] of attributes.get(original)||[]) target.setAttribute(name,item.source);
      }
      [...original.childNodes].forEach((child,i)=>restore(child,target.childNodes[i]));
    }
    restore(element,clone);
    return inner?clone.innerHTML:clone.outerHTML;
  }
  function canonicalOption(id,value) {
    const option=document.getElementById(id)?.querySelector(`option[value="${CSS.escape(value)}"]`);
    if (!option) return '未提供';
    return [...option.childNodes].map(node=>sources.get(node)?.source??node.textContent).join('');
  }
  const dialog=document.getElementById('languageDialog'), input=document.getElementById('languageCode');
  function open() {
    input.value='';document.getElementById('languageError').textContent='';
    refresh(dialog);dialog.showModal();input.focus();
  }
  document.querySelectorAll('[data-language-switch]').forEach(button=>button.addEventListener('click',open));
  document.getElementById('languageForm').addEventListener('submit',event=>{
    event.preventDefault();
    const code=input.value.trim();
    if (!['CMI','EMI'].includes(code)) {
      document.getElementById('languageError').textContent='語言代碼不正確，請向教師確認。';
      refresh(document.getElementById('languageError'));
      input.focus();return;
    }
    current=code==='EMI'?'en':'zh';
    document.documentElement.lang=current==='en'?'en-HK':'zh-Hant-HK';
    document.title=text(originalTitle);
    refresh();dialog.close();
    window.dispatchEvent(new CustomEvent('vl-language-changed',{detail:{language:current}}));
  });
  document.getElementById('languageCancel').addEventListener('click',()=>dialog.close());
  window.VL1Language={get current(){return current;},text,refresh,canonicalOption,canonicalHTML};
  refresh();
  new MutationObserver(changes=>{
    for (const change of changes) {
      if (change.type==='childList') change.addedNodes.forEach(node=>refresh(node));
      else if (change.type==='characterData') refresh(change.target);
      else if (change.type==='attributes') translateAttributes(change.target);
    }
  }).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:translatedAttributes});
})();
