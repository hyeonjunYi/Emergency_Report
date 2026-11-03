(async()=>{
'use strict';
const $=id=>document.getElementById(id),key='gyeryong-field-text-v2:'+location.pathname.replace(/[^/]*$/,'');
const ghKey='gyeryong-gh-config-v1';

function openGhModal(){
  const saved=JSON.parse(localStorage.getItem(ghKey)||'{}');
  $('ghRepo').value=saved.repo||'hyeonjunyi/Emergency_Report';
  $('ghBranch').value=saved.branch||'main';
  $('ghToken').value=saved.token||'';
  const m=$('ghModal');
  if(m)m.style.display='flex';
}
function closeGhModal(){
  const m=$('ghModal');
  if(m)m.style.display='none';
}

if($('ghConfigBtn'))$('ghConfigBtn').onclick=openGhModal;
if($('ghCloseBtn'))$('ghCloseBtn').onclick=closeGhModal;
if($('ghSaveBtn'))$('ghSaveBtn').onclick=()=>{
  const conf={
    repo:$('ghRepo').value.trim(),
    branch:$('ghBranch').value.trim()||'main',
    token:$('ghToken').value.trim()
  };
  localStorage.setItem(ghKey,JSON.stringify(conf));
  closeGhModal();
  msg('GitHub 연동 정보가 저장되었습니다. 이제 [GitHub 즉시 배포]를 누르면 자동 반영됩니다.');
};

const groups=[
  ['01 · 기본정보 및 상단 핵심현황',[
    ['title','보고서 제목'],
    ['date','발생시각'],
    ['received','신고 접수시각 (상단 헤더 표시)'],
    ['dispatch','출동 지령시각'],
    ['arrival','선착대 도착시각'],
    ['injury','인명피해 현황'],
    ['status','현재 대응상태 (예: 진압 중, 완진 등)'],
    ['updated','보고 기준시각 (자동 작성)'],
    ['unit','소속 기관'],
    ['author','작성자 성명/직급'],
    ['phone','작성자 연락처']
  ]],
  ['02 · 출동대 현황 (선착대 / 추가출동대 / 타서 지원출동)',[
    ['first_crew','선착대 현황','textarea'],
    ['extra_crew','추가출동대 현황','textarea'],
    ['support_crew','타서 지원출동 현황','textarea'],
    ['agency','유관기관 공동대응 현황','textarea']
  ]],
  ['03 · 대상 상세 및 초기 현장상황',[
    ['address','발생장소'],
    ['kind','화재 분류'],
    ['target','화재대상'],
    ['vehicle','대상 상세정보 (차종·연료·건물구조 등)','textarea'],
    ['situation','초기 현장 확인사항 및 진압 활동','textarea'],
    ['checks','추가 확인사항 (인명검색, 연소확대 방지 등)','textarea']
  ]],
  ['04 · 대응 경과(타임라인) 및 피해조사',[
    ['commander_arrival','지휘팀 현장도착 시각'],
    ['knockdown','초진 시각'],
    ['out','완진 시각'],
    ['damage','대상 피해내역'],
    ['loss','재산피해 추정액'],
    ['origin','발화지점'],
    ['cause','화재원인']
  ]]
];

const names=groups.flatMap(g=>g[1].map(f=>f[0]));let photos=[],sample,css,reportCode,busy=false;
const msg=t=>$('message').textContent=t;

function now(){
  return new Intl.DateTimeFormat('sv-SE',{
    timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
  }).format(new Date());
}

function changed(){
  $('reviewed').checked=false;
  // Automatically update updated time to current time on any change
  if($('f-updated')) $('f-updated').value = now();
  const d=collect();
  if($('topReceived') && d.received) $('topReceived').textContent = d.received;
  delete d.photos;
  try{localStorage.setItem(key,JSON.stringify(d));}catch{msg('임시 저장 공간이 부족합니다. 초안 백업을 저장하세요.');}
}

function collect(){
  return Object.fromEntries([
    ...names.map(k=>[k,$('f-'+k)?$('f-'+k).value:'']),
    ['photos',photos.map(p=>({...p}))]
  ]);
}

function fill(d){
  names.forEach(k=>{
    if($('f-'+k)){
      // If loading or fresh, auto-update updated time to current time
      if(k === 'updated') {
        $('f-'+k).value = now();
      } else {
        $('f-'+k).value = typeof d[k]==='string'?d[k]:(sample&&sample[k]?sample[k]:'');
      }
    }
  });
  if($('topReceived') && d.received) $('topReceived').textContent = d.received;
  photos=Array.isArray(d.photos)
    ?d.photos.filter(p=>p&&typeof p.caption==='string'&&FieldReport.safePhoto(p.src)).slice(0,8)
    :[];
  draw();
  changed();
}

function fresh(){
  const d={
    title:'화재 초기 현장상황보고',
    unit:'계룡소방서 현장대응단',
    author:'현장대응단 소방장 이현준',
    phone:'010-4200-9870',
    date:now(),
    updated:now(),
    status:'진압 중',
    photos:[]
  };
  ['injury','arrival','commander_arrival','received','dispatch','damage','first_crew','extra_crew','support_crew','agency','target','knockdown','out','checks','address','kind','vehicle','situation'].forEach(k=>d[k]='확인 중');
  ['cause','origin'].forEach(k=>d[k]='조사 중');
  d.loss='산정 중';
  fill(d);
}

function draw(){
  const root=$('photos');
  root.replaceChildren();
  photos.forEach((p,i)=>{
    const row=document.createElement('div');
    row.className='photo';
    const img=document.createElement('img');
    img.src=p.src;
    img.alt='현장사진 '+(i+1);
    const area=document.createElement('div');
    const label=document.createElement('label');
    label.textContent=`사진 ${i+1} 설명${i===0?' · 상단 대표사진':''}`;
    const input=document.createElement('input');
    input.value=p.caption;
    input.setAttribute('aria-label',`사진 ${i+1} 설명`);
    input.oninput=()=>{p.caption=input.value;changed();};
    label.append(input);
    area.append(label);
    for(const [text,fn] of [['앞으로',()=>{if(i){[photos[i-1],photos[i]]=[photos[i],photos[i-1]];draw();changed();}}],['삭제',()=>{photos.splice(i,1);draw();changed();}]]){
      const b=document.createElement('button');
      b.type='button';
      b.textContent=text;
      b.onclick=fn;
      area.append(b);
    }
    row.append(img,area);
    root.append(row);
  });
}

function download(content,type,name){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  a.textContent=name+' 다시 저장';
  a.className='button';
  a.style.margin='8px';
  $('downloads').append(a);
  a.click();
}

const readData=file=>new Promise((resolve,reject)=>{
  const r=new FileReader();
  r.onload=()=>resolve(r.result);
  r.onerror=reject;
  r.readAsDataURL(file);
});

async function compress(file){
  if(file.size>30*1024*1024)throw Error('사진 한 장은 30MB 이하로 선택해 주세요.');
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    img.src=url;
    await img.decode();
    const scale=Math.min(1,1600/Math.max(img.width,img.height));
    const c=document.createElement('canvas');
    c.width=Math.round(img.width*scale);
    c.height=Math.round(img.height*scale);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.8);
  }finally{
    URL.revokeObjectURL(url);
  }
}

async function embedded(d){
  return {
    ...d,
    photos:await Promise.all(d.photos.map(async p=>({
      ...p,
      src:p.src.startsWith('data:')?p.src:await readData(await (await fetch(p.src)).blob())
    })))
  };
}

function html(d){
  // Ensure updated time is fresh when exporting/previewing
  d.updated = now();
  const json=JSON.stringify(d).replace(/</g,'\\u003c');
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+(d.title||'화재')+' 초기 현장상황보고</title><style>'+css+'</style></head><body><div id="report"></div><script>'+reportCode+'\nFieldReport.mount('+json+');<\/script></body></html>';
}

function requireTitle(){
  if(!$('f-title').value.trim()||!$('f-address').value.trim())throw Error('보고서 제목과 발생장소를 입력해 주세요.');
}

async function run(fn){
  if(busy)return;
  busy=true;
  ['preview','publishGh','export','backup','new','sample'].forEach(k=>{if($(k))$(k).disabled=true;});
  try{await fn();}catch(e){msg(e.message||'처리하지 못했습니다. 다시 시도해 주세요.');}finally{
    busy=false;
    ['preview','publishGh','export','backup','new','sample'].forEach(k=>{if($(k))$(k).disabled=false;});
  }
}

async function publishToGitHub(docHtml){
  const confStr=localStorage.getItem(ghKey);
  if(!confStr){
    openGhModal();
    throw Error('GitHub 연동 설정이 필요합니다. 저장소 및 토큰 정보를 입력해 주세요.');
  }
  const conf=JSON.parse(confStr);
  if(!conf.repo||!conf.token){
    openGhModal();
    throw Error('GitHub 저장소명과 Token이 입력되지 않았습니다.');
  }
  msg('GitHub 저장소와 통신 중입니다. 기존 파일 확인 중...');

  const cleanRepo=conf.repo.trim().replace(/^https?:\/\/github\.com\//,'').replace(/\/$/,'');
  const branch=(conf.branch||'main').trim();
  const filePath='index.html';
  const apiUrl=`https://api.github.com/repos/${cleanRepo}/contents/${filePath}?ref=${branch}`;

  let sha=null;
  try{
    const checkRes=await fetch(apiUrl,{
      headers:{
        'Authorization':`Bearer ${conf.token}`,
        'Accept':'application/vnd.github.v3+json'
      }
    });
    if(checkRes.ok){
      const checkData=await checkRes.json();
      sha=checkData.sha;
    }
  }catch(e){console.warn('File existence check failed',e);}

  msg('GitHub에 최신 보고서 업로드 중...');

  const bytes=new TextEncoder().encode(docHtml);
  let bin='';
  const len=bytes.byteLength;
  for(let i=0;i<len;i++){bin+=String.fromCharCode(bytes[i]);}
  const b64Content=btoa(bin);

  const payload={
    message:`화재 현장보고 실시간 갱신 (${$('f-title').value||'현장보고'})`,
    content:b64Content,
    branch:branch
  };
  if(sha)payload.sha=sha;

  const putUrl=`https://api.github.com/repos/${cleanRepo}/contents/${filePath}`;
  const res=await fetch(putUrl,{
    method:'PUT',
    headers:{
      'Authorization':`Bearer ${conf.token}`,
      'Accept':'application/vnd.github.v3+json',
      'Content-Type':'application/json'
    },
    body:JSON.stringify(payload)
  });

  if(!res.ok){
    const errData=await res.json().catch(()=>({}));
    throw Error('GitHub 업로드 실패: '+(errData.message||res.statusText));
  }

  msg('🎉 GitHub 저장소에 성공적으로 배포되었습니다! 약 1분 후 GitHub Pages에서 최신 보고서를 확인하세요.');
}

try{
  [sample,css,reportCode]=await Promise.all(['default.json','style.css','report.js'].map(async(u,i)=>{
    const r=await fetch(u);
    if(!r.ok)throw Error('작성 화면 리소스를 불러오지 못했습니다. 새로고침해 주세요.');
    return i===0?r.json():r.text();
  }));
}catch(e){msg(e.message);return;}

FieldReport.setupContrast();
const root=$('fields');
groups.forEach(([title,fields])=>{
  const sec=document.createElement('section');
  const h=document.createElement('h3');
  h.textContent=title;
  const grid=document.createElement('div');
  grid.className='grid';
  fields.forEach(([name,label,type])=>{
    const l=document.createElement('label');
    l.className='field'+(type==='textarea'?' wide':'');
    l.textContent=label;
    const input=document.createElement(type==='textarea'?'textarea':'input');
    input.id='f-'+name;
    if(type==='date')input.type='date';
    input.oninput=changed;
    l.append(input);
    grid.append(l);
  });
  sec.append(h,grid);
  root.append(sec);
});

let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{};
if(saved&&typeof saved==='object'){
  fill(saved);
  msg('임시 저장된 내용을 불러왔습니다.');
}else fill(sample);

// Ensure updated is current time on start
if($('f-updated')) $('f-updated').value = now();

$('new').onclick=()=>{
  if(confirm('현재 입력 내용을 비우고 새 사건을 시작할까요? 필요한 초안은 먼저 백업하세요.')){
    fresh();
    msg('새 사건 서식입니다. 출동 및 현장 조사 내용을 입력하세요.');
  }
};

$('sample').onclick=()=>{
  if(confirm('현재 내용을 기본 샘플 보고서로 복원할까요?')){
    fill(sample);
    msg('기본 서식을 불러왔습니다.');
  }
};

$('photoInput').onchange=()=>run(async()=>{
  const files=Array.from($('photoInput').files);
  if(photos.length+files.length>8)throw Error('사진은 최대 8장입니다. 기존 사진을 정리한 뒤 선택하세요.');
  const added=[];
  for(const f of files){
    if(!/^image\/(jpeg|png|webp)$/.test(f.type))throw Error('JPEG, PNG, WebP 사진을 선택해 주세요.');
    added.push({src:await compress(f),caption:'현장기록사진 '+(photos.length+added.length+1)});
  }
  photos.push(...added);
  draw();
  changed();
  $('photoInput').value='';
  msg('사진을 추가했습니다. 순서와 설명을 확인하세요.');
});

$('preview').onclick=()=>run(async()=>{
  requireTitle();
  $('previewFrame').srcdoc=html(collect());
  $('previewArea').hidden=false;
  $('previewArea').scrollIntoView({behavior:'smooth'});
  msg('아래에서 자동 롤링(◀ ⏸ ▶)과 신규 타임라인을 확인하세요.');
});

$('close').onclick=()=>{$('previewArea').hidden=true;};

$('export').onclick=()=>run(async()=>{
  requireTitle();
  if(!$('reviewed').checked)throw Error('게시 전 확인란에 체크해 주세요.');
  const doc=html(await embedded(collect()));
  if(new Blob([doc]).size>20*1024*1024)throw Error('게시 파일이 20MB를 초과합니다. 사진 수를 조정해 주세요.');
  download(doc,'text/html;charset=utf-8','index.html');
  msg('index.html을 저장했습니다. 저장소의 index.html을 교체하여 푸시하세요.');
});

$('publishGh').onclick=()=>run(async()=>{
  requireTitle();
  if(!$('reviewed').checked)throw Error('게시 전 확인란에 체크해 주세요.');
  const doc=html(await embedded(collect()));
  if(new Blob([doc]).size>20*1024*1024)throw Error('게시 파일이 20MB를 초과합니다. 사진 수를 조정해 주세요.');
  await publishToGitHub(doc);
});

$('backup').onclick=()=>run(async()=>{
  download(JSON.stringify(await embedded(collect()),null,2),'application/json','fire-draft-'+(collect().date||'undated')+'.json');
  msg('전체 초안 백업(.json)을 저장했습니다.');
});

$('restore').onchange=()=>run(async()=>{
  const f=$('restore').files[0];
  if(!f)return;
  if(f.size>25*1024*1024)throw Error('초안 파일은 25MB 이하만 지원합니다.');
  const d=JSON.parse(await f.text());
  if(!d||typeof d.title!=='string')throw Error('올바른 초안 백업 파일이 아닙니다.');
  if(confirm('현재 입력 내용을 불러온 초안으로 대체할까요?')){
    fill(d);
    msg('초안 데이터와 사진을 복원했습니다.');
  }
  $('restore').value='';
});

$('form').onsubmit=e=>e.preventDefault();
})();
