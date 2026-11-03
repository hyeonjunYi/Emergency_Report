(async()=>{
'use strict';
const $=id=>document.getElementById(id),key='gyeryong-field-text-v1:'+location.pathname.replace(/[^/]*$/,'');
const groups=[
  ['01 · 기본정보',[
    ['title','보고서 제목'],
    ['date','발생일','date'],
    ['address','발생장소'],
    ['kind','화재 분류'],
    ['status','현재 상태 (예: 진압 중, 완진 등)'],
    ['updated','보고 기준시각 (한국시간)'],
    ['unit','소속'],
    ['author','작성자']
  ]],
  ['02 · 출동대 현황 및 신고개요',[
    ['crew','출동대·대원 현황 (사진 하단 강조)'],
    ['target','화재대상'],
    ['cooperation','공동대응 요청기관'],
    ['call','신고접수 내용','textarea'],
    ['vehicle','대상 상세정보 (차종·연료·건물구조 등)','textarea']
  ]],
  ['03 · 초기 현장상황',[
    ['situation','현장 확인사항 및 진압 활동','textarea'],
    ['checks','추가 확인사항 (인명검색, 연소확대 등)','textarea']
  ]],
  ['04 · 대응 경과(타임라인) 및 피해조사',[
    ['received','신고 접수시각'],
    ['dispatch','출동 지령시각'],
    ['arrival','선착대 도착시각'],
    ['commander_arrival','지휘팀 도착시각'],
    ['knockdown','초진시각'],
    ['out','완진시각'],
    ['injury','인명피해 현황'],
    ['damage','대상 피해내역'],
    ['loss','재산피해 추정액'],
    ['origin','발화지점'],
    ['cause','화재원인']
  ]]
];
const names=groups.flatMap(g=>g[1].map(f=>f[0]));let photos=[],sample,css,reportCode,busy=false;
const msg=t=>$('message').textContent=t;
function now(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())}
function changed(){ $('reviewed').checked=false;const d=collect();delete d.photos;try{localStorage.setItem(key,JSON.stringify(d))}catch{msg('임시 저장 공간이 부족합니다. 초안 백업을 저장하세요.')}}
function collect(){return Object.fromEntries([...names.map(k=>[k,$('f-'+k).value]),['photos',photos.map(p=>({...p}))]])}
function fill(d){names.forEach(k=>$('f-'+k).value=typeof d[k]==='string'?d[k]:'');photos=Array.isArray(d.photos)?d.photos.filter(p=>p&&typeof p.caption==='string'&&FieldReport.safePhoto(p.src)).slice(0,8):[];draw();changed()}
function fresh(){const d={unit:'계룡소방서 현장대응단',author:'현장대응단 소방장 이현준',date:now().slice(0,10),updated:now(),status:'진압 중',photos:[]};['injury','arrival','commander_arrival','received','dispatch','damage','crew','knockdown','out','checks'].forEach(k=>d[k]='확인 중');['cause','origin'].forEach(k=>d[k]='조사 중');d.loss='산정 중';fill(d)}
function draw(){const root=$('photos');root.replaceChildren();photos.forEach((p,i)=>{const row=document.createElement('div');row.className='photo';const img=document.createElement('img');img.src=p.src;img.alt='현장사진 '+(i+1);const area=document.createElement('div');const label=document.createElement('label');label.textContent=`사진 ${i+1} 설명${i===0?' · 상단 대표사진':''}`;const input=document.createElement('input');input.value=p.caption;input.setAttribute('aria-label',`사진 ${i+1} 설명`);input.oninput=()=>{p.caption=input.value;changed()};label.append(input);area.append(label);for(const [text,fn] of [['앞으로',()=>{if(i){[photos[i-1],photos[i]]=[photos[i],photos[i-1]];draw();changed()}}],['삭제',()=>{photos.splice(i,1);draw();changed()}]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;area.append(b)}row.append(img,area);root.append(row)})}
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.textContent=name+' 다시 저장';a.className='button';a.style.margin='8px';$('downloads').append(a);a.click()}
const readData=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
async function compress(file){if(file.size>30*1024*1024)throw Error('사진 한 장은 30MB 이하로 선택해 주세요.');const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1600/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.8)}finally{URL.revokeObjectURL(url)}}
async function embedded(d){return {...d,photos:await Promise.all(d.photos.map(async p=>({...p,src:p.src.startsWith('data:')?p.src:await readData(await (await fetch(p.src)).blob())})))}}
function html(d){const json=JSON.stringify(d).replace(/</g,'\\u003c');return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+(d.title||'화재')+' 초기 현장상황보고</title><style>'+css+'</style></head><body><div id="report"></div><script>'+reportCode+'\nFieldReport.mount('+json+');<\/script></body></html>'}
function requireTitle(){if(!$('f-title').value.trim()||!$('f-address').value.trim())throw Error('보고서 제목과 발생장소를 입력해 주세요.')}
async function run(fn){if(busy)return;busy=true;['preview','export','backup','new','sample'].forEach(k=>$(k).disabled=true);try{await fn()}catch(e){msg(e.message||'처리하지 못했습니다. 다시 시도해 주세요.')}finally{busy=false;['preview','export','backup','new','sample'].forEach(k=>$(k).disabled=false)}}
try{[sample,css,reportCode]=await Promise.all(['default.json','style.css','report.js'].map(async(u,i)=>{const r=await fetch(u);if(!r.ok)throw Error('작성 화면 리소스를 불러오지 못했습니다. 새로고침해 주세요.');return i===0?r.json():r.text()}));}catch(e){msg(e.message);return}
FieldReport.setupContrast();const root=$('fields');groups.forEach(([title,fields])=>{const sec=document.createElement('section');const h=document.createElement('h3');h.textContent=title;const grid=document.createElement('div');grid.className='grid';fields.forEach(([name,label,type])=>{const l=document.createElement('label');l.className='field'+(type==='textarea'?' wide':'');l.textContent=label;const input=document.createElement(type==='textarea'?'textarea':'input');input.id='f-'+name;if(type==='date')input.type='date';input.oninput=changed;l.append(input);grid.append(l)});sec.append(h,grid);root.append(sec)});
let saved;try{saved=JSON.parse(localStorage.getItem(key))}catch{};if(saved&&typeof saved==='object'){fill(saved);msg('이 브라우저에 임시 저장된 내용을 복원했습니다.')}else fill(sample);
$('new').onclick=()=>{if(confirm('현재 입력 내용을 비우고 새 사건을 시작할까요? 필요한 초안은 먼저 백업하세요.')){fresh();msg('새 사건 서식입니다. 출동 및 현장 조사 내용을 입력하세요.')}};
$('sample').onclick=()=>{if(confirm('현재 내용을 기본 샘플 보고서로 바꿀까요?')){fill(sample);msg('샘플 보고서를 불러왔습니다.')}};
$('photoInput').onchange=()=>run(async()=>{const files=Array.from($('photoInput').files);if(photos.length+files.length>8)throw Error('사진은 최대 8장입니다. 기존 사진을 정리한 뒤 선택하세요.');const added=[];for(const f of files){if(!/^image\/(jpeg|png|webp)$/.test(f.type))throw Error('JPEG, PNG, WebP 사진을 선택해 주세요.');added.push({src:await compress(f),caption:'현장기록사진 '+(photos.length+added.length+1)})}photos.push(...added);draw();changed();$('photoInput').value='';msg('사진을 추가했습니다. 순서와 설명을 확인하세요.')});
$('preview').onclick=()=>run(async()=>{requireTitle();$('previewFrame').srcdoc=html(collect());$('previewArea').hidden=false;$('previewArea').scrollIntoView({behavior:'smooth'});msg('아래에서 자동 로테이션과 대응 경과 타임라인을 확인하세요.')});
$('close').onclick=()=>{$('previewArea').hidden=true};
$('export').onclick=()=>run(async()=>{requireTitle();if(!$('reviewed').checked)throw Error('게시 전 확인란에 체크해 주세요.');const doc=html(await embedded(collect()));if(new Blob([doc]).size>20*1024*1024)throw Error('게시 파일이 20MB를 초과합니다. 사진 수를 조정해 주세요.');download(doc,'text/html;charset=utf-8','index.html');msg('index.html을 저장했습니다. GitHub 저장소의 index.html을 교체하여 푸시하세요.')});
$('backup').onclick=()=>run(async()=>{download(JSON.stringify(await embedded(collect()),null,2),'application/json','fire-draft-'+(collect().date||'undated')+'.json');msg('사진을 포함한 전체 초안 백업(.json)을 저장했습니다.')});
$('restore').onchange=()=>run(async()=>{const f=$('restore').files[0];if(!f)return;if(f.size>25*1024*1024)throw Error('초안 파일은 25MB 이하만 지원합니다.');const d=JSON.parse(await f.text());if(!d||typeof d.title!=='string')throw Error('올바른 초안 백업 파일이 아닙니다.');if(confirm('현재 입력 내용을 불러온 초안으로 대체할까요?')){fill(d);msg('초안 데이터와 사진을 복원했습니다.')} $('restore').value=''});
$('form').onsubmit=e=>e.preventDefault();
})();
