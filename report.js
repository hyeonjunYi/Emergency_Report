/* 보고서 렌더러 (실화재/오인신고 대응 및 시각 서식 통일) */
window.FieldReport = (() => {
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const safePhoto = s => typeof s === 'string' && (
    /^(assets\/scene-[1-4]\.jpg)$/.test(s) || 
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)
  );

  function render(d) {
    const isFalseAlarm = (d.reportType === 'false_alarm') || (d.kind && d.kind.includes('오인'));
    const e = k => esc(d[k] || '-');
    const photos = (d.photos || []).filter(p => safePhoto(p.src));
    const pair = (label, key) => `<dt>${label}</dt><dd>${e(key)}</dd>`;
    const cell = (label, key) => `<div><small>${label}</small><strong>${e(key)}</strong></div>`;

    return `
      <a class="skip-link" href="#main">본문 바로가기</a>
      <header>
        <div class="wrap" style="min-height:50px; padding:8px 16px; display:flex; align-items:center; justify-content:space-between;">
          <b style="font-size:17px;">${e('unit')}</b>
          <button onclick="window.print()" style="min-height:32px; padding:4px 10px; font-size:13px;">인쇄 / PDF</button>
        </div>
      </header>
      <main class="wrap" id="main" style="padding-top:16px;">
        <div class="intro" style="padding:16px 0 20px;">
          <p class="eyebrow">${isFalseAlarm ? '오인출동 상황기록' : '화재조사 현장기록'} · ${e('date')}</p>
          <div class="title-row" style="margin-top:6px;">
            <h2 class="report-title" style="font-size:32px;">${e('title')}</h2>
            <div class="complete ongoing" style="padding:8px 14px; min-width:70px;">
              <small>현장 대응</small>
              <strong>${e('status')}</strong>
            </div>
          </div>
          <p class="subtitle" style="margin:12px 0 0;">${e('address')} ｜ ${e('kind')}</p>
          <div class="byline" style="margin-top:8px;"><span>작성자</span><strong>${e('author')}</strong></div>
          <p class="source-note" style="margin-top:8px;">보고 기준 · ${e('updated')}</p>
        </div>

        <section class="stats" aria-label="핵심 출동 현황">
          ${cell('신고 접수', 'received')}
          ${cell('출동 지령', 'dispatch')}
          ${cell('현장 도착', 'arrival')}
          ${!isFalseAlarm ? cell('인명피해', 'injury') : cell('조치 결과', 'status')}
        </section>

        ${photos.length ? `
          <section class="gallery" id="galleryContainer" aria-label="현장기록사진" style="height:320px;">
            <img id="scene" src="${esc(photos[0].src)}" alt="${esc(photos[0].caption)}">
            <div class="photo-shade"></div>
            <div class="photo-caption" style="bottom:16px; left:16px;">
              <span style="font-size:12px;">현장기록사진 <b id="photoCount">01 / ${String(photos.length).padStart(2, '0')}</b></span>
              <p id="caption" style="font-size:14px; margin:4px 0 0;">${esc(photos[0].caption)}</p>
            </div>
            <div class="photo-controls" style="bottom:12px; right:12px;">
              <button id="prev" title="이전" style="min-width:38px; height:38px;">◀</button>
              <button id="pause" title="정지/재생" style="min-width:38px; height:38px;">⏸</button>
              <button id="next" title="다음" style="min-width:38px; height:38px;">▶</button>
            </div>
          </section>
        ` : ''}

        <!-- 출동대 현황 (오인신고 시 축소 레이아웃) -->
        <section class="panel crew-highlight-panel">
          <p class="eyebrow">01 · 출동대 현황</p>
          <h3>현장 출동대 및 인력</h3>
          <div class="crew-grid" style="grid-template-columns: ${isFalseAlarm ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))'};">
            <div class="crew-card"><h4>선착대</h4><p>${e('first_crew')}</p></div>
            ${!isFalseAlarm ? `<div class="crew-card"><h4>추가출동대</h4><p>${e('extra_crew')}</p></div>` : ''}
            ${!isFalseAlarm ? `<div class="crew-card"><h4>타서 지원출동</h4><p>${e('support_crew')}</p></div>` : ''}
          </div>
          ${d.agency && d.agency !== '-' ? `<div class="agency-note"><strong>유관기관</strong><p>${e('agency')}</p></div>` : ''}
        </section>

        <div class="report-grid">
          <section class="panel">
            <p class="eyebrow">02 · 대상 상세정보</p>
            <h3>사건 개요</h3>
            <dl>
              ${pair('발생장소', 'address')}
              ${pair('대상물', 'target')}
              ${!isFalseAlarm && d.vehicle ? pair('대상정보', 'vehicle') : ''}
              ${pair('사건분류', 'kind')}
            </dl>
          </section>

          <section class="panel">
            <p class="eyebrow">03 · 현장 확인</p>
            <h3>${isFalseAlarm ? '현장 조치사항' : '초기 현장상황'}</h3>
            <p class="situation" style="white-space:pre-wrap">${e('situation')}</p>
            ${!isFalseAlarm && d.checks ? `<div class="check-note"><strong>추가 확인사항</strong><p style="white-space:pre-wrap">${e('checks')}</p></div>` : ''}
          </section>
        </div>

        <!-- 피해 및 경과는 실화재일 때만 크게 표시 -->
        ${!isFalseAlarm ? `
          <section class="panel damage-panel">
            <p class="eyebrow">피해 및 조사</p>
            <h3>피해 및 조사현황</h3>
            <div class="investigation-grid">
              ${cell('인명피해', 'injury')}
              ${cell('대상 피해', 'damage')}
              ${cell('재산피해액', 'loss')}
              ${cell('발화지점', 'origin')}
              ${cell('화재원인', 'cause')}
              <div><small>초진 / 완진</small><strong>${e('knockdown')} / ${e('out')}</strong></div>
            </div>
          </section>

          <section class="panel timeline-panel">
            <p class="eyebrow">04 · 대응 경과</p>
            <h3>상황 경과</h3>
            <ol class="timeline">
              ${[
                ['received', '신고 접수'],
                ['dispatch', '출동 지령'],
                ['arrival', '선착대 도착'],
                ['commander_arrival', '지휘팀 도착'],
                ['knockdown', '초진'],
                ['out', '완진']
              ].map(([k, t]) => `<li><time style="font-size:13px;">${e(k)}</time><strong>${t}</strong></li>`).join('')}
            </ol>
          </section>
        ` : `
          <section class="panel">
            <p class="eyebrow">04 · 오인 원인</p>
            <h3>오인 원인 및 결과</h3>
            <p style="font-size:15px; margin:0;">${e('cause')}</p>
          </section>
        `}

        <footer>
          <div class="signoff" style="font-size:14px;">
            <b>${e('unit')}</b>
            <span class="author-info">
              <strong>작성자 · ${e('author')}</strong> 
              <a href="tel:${e('phone')}" class="phone-link" style="padding:2px 8px; font-size:13px;">📞 ${e('phone')}</a>
            </span>
          </div>
          <p style="font-size:12px; margin-top:8px;">보고 기준 ${e('updated')}</p>
        </footer>
      </main>
    `;
  }

  function mount(d) {
    document.title = (d.title || '현장상황보고');
    document.getElementById('report').innerHTML = render(d);

    const photos = (d.photos || []).filter(p => safePhoto(p.src));
    if (!photos.length) return;

    let i = 0, isPlaying = true, timer = null;
    function show(n) {
      i = (n + photos.length) % photos.length;
      const scene = document.getElementById('scene');
      const caption = document.getElementById('caption');
      const photoCount = document.getElementById('photoCount');
      if (scene) { scene.src = photos[i].src; scene.alt = photos[i].caption; }
      if (caption) caption.textContent = photos[i].caption;
      if (photoCount) photoCount.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(photos.length).padStart(2, '0');
    }

    function startAuto() { stopAuto(); timer = setInterval(() => { show(i + 1); }, 4000); }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const pauseBtn = document.getElementById('pause');
    const container = document.getElementById('galleryContainer');

    if (prevBtn) prevBtn.onclick = () => { show(i - 1); if (isPlaying) startAuto(); };
    if (nextBtn) nextBtn.onclick = () => { show(i + 1); if (isPlaying) startAuto(); };
    if (pauseBtn) {
      pauseBtn.onclick = () => {
        isPlaying = !isPlaying;
        pauseBtn.textContent = isPlaying ? '⏸' : '▶';
        if (isPlaying) startAuto(); else stopAuto();
      };
    }
    if (container) {
      container.onmouseenter = () => { if (isPlaying) stopAuto(); };
      container.onmouseleave = () => { if (isPlaying) startAuto(); };
    }
    startAuto();
  }

  return { render, mount, safePhoto };
})();
