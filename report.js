/* 화재조사 초기 현장상황보고 및 오인출동 뷰어 렌더러 */
window.FieldReport=(()=>{
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePhoto=s=>typeof s==='string'&&(/^(assets\/scene-[1-4]\.jpg)$/.test(s)||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s));

function render(d){
const isFalse = (d.reportType === 'false_alarm') || (d.kind && d.kind.includes('오인'));
const e=k=>esc(d[k]||'-');
const photos=(d.photos||[]).filter(p=>safePhoto(p.src));
const pair=(label,key)=>`<dt>${label}</dt><dd>${e(key)}</dd>`;
const cell=(label,key)=>`<div><small>${label}</small><strong>${e(key)}</strong></div>`;

if(isFalse){
  /* === 오인신고 레이아웃 === */
  return `
    <a class="skip-link" href="#main">본문 바로가기</a>
    <header>
      <div class="wrap" style="min-height:48px;padding:6px 16px;display:flex;align-items:center;justify-content:space-between;">
        <b style="font-size:16px;">${e('unit')}</b>
        <button onclick="window.print()" style="min-height:30px;padding:2px 8px;font-size:12px;">인쇄 / PDF</button>
      </div>
    </header>
    <main class="wrap" id="main" style="padding-top:12px;">
      <div class="intro" style="padding:16px 0 16px;">
        <p class="eyebrow">오인출동 상황기록 · ${e('dispatch')}</p>
        <div class="title-row" style="margin-top:6px;">
          <h2 class="report-title" style="font-size:28px;">${e('title')}</h2>
          <div class="complete" style="padding:6px 12px;min-width:60px;background:#2E7D32;color:#fff;">
            <small style="color:#E8F5E9;">상황</small>
            <strong style="font-size:15px;">${e('status')}</strong>
          </div>
        </div>
        <p class="subtitle" style
