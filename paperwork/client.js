'use strict';
// Read-only access to the four worksheets and revised teacher guide in the teacher panel.
(() => {
  const specs={
    'student-pdf':['WS1_student.pdf','application/pdf'],
    'student-word':['WS1_student.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'answers-pdf':['WS1_answers.pdf','application/pdf'],
    'answers-word':['WS1_answers.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'teacher-guide':['WS1_D_teacher_guide.pdf','application/pdf']
  };
  let manifest=null,request=0;
  const byId=id=>document.getElementById(id);
  const authorised=()=>isTeacher();
  const buttons=()=>byId('paperPanel').querySelectorAll('[data-paper-download]');
  const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const status=text=>{byId('paperStatus').textContent=text;window.VL1Language?.refresh(byId('paperStatus'));};
  function close(){request++;manifest=null;byId('paperPanel').hidden=true;buttons().forEach(b=>b.disabled=true);}
  async function open(){
    if(!authorised())return false;
    const token=++request;manifest=null;byId('paperPanel').hidden=false;buttons().forEach(b=>b.disabled=true);
    status('正在準備工作紙……');
    try{
      const response=await fetch('paperwork/generated/manifest.json',{cache:'no-store'});
      if(!response.ok)throw new Error('manifest');
      const data=await response.json();
      if(data.format!=='VL1-reviewed-worksheet-v3'||data.version!==3||!data.languages)throw new Error('format');
      for(const lang of ['zh','en']){
        const files=data.languages[lang]?.files;
        if(!Array.isArray(files)||files.length!==5)throw new Error('language files');
        for(const [id,[base,mime]] of Object.entries(specs)){
          const name=lang==='zh'?base:base.replace(/(\.[^.]+)$/,'_en$1');
          const matches=files.filter(f=>f.id===id),file=matches[0];
          if(matches.length!==1||file.path!=='paperwork/generated/'+name||file.name!==name||file.mime!==mime||!Number.isInteger(file.bytes)||file.bytes<1||!Number.isInteger(file.pages)||file.pages<1||!/^[a-f0-9]{64}$/.test(file.sha256))throw new Error('file metadata');
        }
      }
      if(token!==request||!authorised())return false;
      manifest=data;buttons().forEach(b=>b.disabled=false);status('工作紙已準備好。');return true;
    }catch{
      if(token===request&&authorised())status('工作紙未能載入，請重新載入網站後重試。');return false;
    }
  }
  async function downloadFile(id){
    if(!authorised()||!manifest||!Object.hasOwn(specs,id))return false;
    const lang=window.VL1Language?.current==='en'?'en':'zh';
    const token=request,file=manifest.languages[lang].files.find(f=>f.id===id);
    try{
      const response=await fetch(file.path,{cache:'no-store'});if(!response.ok)throw new Error('file');
      const bytes=await response.arrayBuffer(),head=new Uint8Array(bytes.slice(0,5));
      const valid=file.mime==='application/pdf'?new TextDecoder().decode(head)==='%PDF-':head[0]===0x50&&head[1]===0x4b&&head[2]===3&&head[3]===4;
      if(!valid||bytes.byteLength!==file.bytes||await digest(bytes)!==file.sha256)throw new Error('checksum');
      if(token!==request||!authorised())return false;
      download(new Blob([bytes],{type:file.mime}),file.name);status('檔案已下載。');return true;
    }catch{
      if(token===request&&authorised())status('檔案下載失敗，請重試。');return false;
    }
  }
  byId('openPaperwork').addEventListener('click',open);byId('closePaperwork').addEventListener('click',close);
  buttons().forEach(button=>button.addEventListener('click',()=>downloadFile(button.dataset.paperDownload)));
  window.VL1Paperwork={open,close,download:downloadFile};
})();
