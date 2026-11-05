/* 보고서 렌더러 */
window.FieldReport = (() => {
  const esc = x => String(x ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );

  const safePhoto = s =>
    typeof s === 'string' &&
    (
      /^assets\/scene-[1-4]\.jpg$/.test(s) ||
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)
    );

  function render(d) {
    const isFalse = d.reportType === 'false_alarm';
    const e = key => esc(d[key] || '-');
    const photos = (d.photos || []).filter(p => safePhoto(p.src));

    const pair = (label, key) =>
      `<dt>${label}</dt><dd>${e(key)}</dd>`;

    const cell = (label, key) =>
      `<div><small>${label}</small><strong>${e(key)}</strong></div>`;

    /* 발생장소 바로 다음에 표시할 지도 */
    const locationMap = d.address && d.address !== '-' ? `
      <dt>현장 위치</dt>
      <dd style="min-width:0;">
        <iframe
          title="발생 현장 위치 지도"
          src="https://maps.google.com/maps?q=${encodeURIComponent(d.address)}&output=embed"
          width="100%"
          height="260"
          style="display:block;border:1px solid var(--border);border-radius:8px;"
          loading="lazy"
          allowfullscreen>
        </iframe>
      </dd>
    ` : '';

    /* 오인신고 보고서 */
    if (isFalse) {
      return `
        <a class="skip-link" href="#main">본문 바로가기</a>

        <header>
          <div
            class="wrap"
            style="min-height:48px;padding:6px 16px;display:flex;align-items:center;justify-content:space-between;">
            <b style="font-size:16px;">${e('unit')}</b>
            <button
              onclick="window.print()"
              style="min-height:30px;padding:2px 8px;font-size:12px;">
              인쇄 / PDF
            </button>
          </div>
        </header>

        <main class="wrap" id="main" style="padding-top:12px;">
          <div class="intro" style="padding:16px 0;">
            <p class="eyebrow">
              오인출동 상황기록 · ${e('dispatch')}
            </p>

            <div class="title-row" style="margin-top:6px;">
              <h2 class="report-title" style="font-size:28px;">
                ${e('title')}
              </h2>

              <div
                class="complete"
                style="padding:6px 12px;min-width:60px;background:#2E7D32;color:#fff;">
                <small style="color:#E8F5E9;">상황</small>
                <strong style="font-size:15px;">${e('status')}</strong>
              </div>
            </div>

            <p class="subtitle" style="margin:8px 0 0;font-size:14px;">
              ${e('address')}
            </p>

            <div class="byline" style="margin-top:8px;font-size:13px;">
              <span>작성자</span>
              <strong>${e('author')}</strong>
            </div>

            <p class="source-note" style="margin-top:6px;">
              보고 기준 · ${e('updated')}
            </p>
          </div>

          <section
            class="stats"
            style="grid-template-columns:repeat(2,1fr);gap:12px;margin:16px 0 24px;">
            ${cell('출동 지령', 'dispatch')}
            ${cell('현재 상태', 'status')}
          </section>

          ${photos.length ? `
            <section
              class="gallery"
              id="galleryContainer"
              aria-label="현장기록사진"
              style="height:320px;">
              <img
                id="scene"
                src="${esc(photos[0].src)}"
                alt="${esc(photos[0].caption)}">

              <div class="photo-shade"></div>

              <div class="photo-caption" style="bottom:14px;left:14px;">
                <span style="font-size:12px;">
                  현장기록사진
                  <b id="photoCount">
                    01 / ${String(photos.length).padStart(2, '0')}
                  </b>
                </span>
                <p id="caption" style="font-size:14px;margin:4px 0 0;">
                  ${esc(photos[0].caption)}
                </p>
              </div>

              <div class="photo-controls" style="bottom:10px;right:10px;">
                <button
                  id="prev"
                  title="이전"
                  style="min-width:38px;height:38px;">◀</button>
                <button
                  id="pause"
                  title="정지/재생"
                  style="min-width:38px;height:38px;">⏸</button>
                <button
                  id="next"
                  title="다음"
                  style="min-width:38px;height:38px;">▶</button>
              </div>
            </section>
          ` : ''}

          <section
            class="panel crew-highlight-panel"
            style="margin:20px 0 24px;">
            <p class="eyebrow">01 · 출동대 현황</p>
            <h3>현장 출동대 및 인력</h3>

            <div
              style="background:var(--muted);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-top:10px;">
              <p
                style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;">${e('crew_single')}</p>
            </div>
          </section>

          <section class="panel" style="margin-bottom:24px;">
            <p class="eyebrow">02 · 대상 및 현장상황</p>
            <h3>출동 개요 및 상황</h3>

            <dl style="margin-bottom:16px;">
              ${pair('화재장소', 'address')}
              ${locationMap}
              ${pair('대상 및 상세정보', 'target_vehicle')}
            </dl>

            <div style="border-top:1px solid var(--rule);padding-top:12px;">
              <small
                style="display:block;font-size:13px;color:var(--fg2);margin-bottom:4px;font-weight:600;">
                현장상황 및 조치결과
              </small>
              <p
                class="situation"
                style="white-space:pre-wrap;font-size:15px;margin:0;">${e('situation')}</p>
            </div>
          </section>

          <footer>
            <div class="signoff" style="font-size:13px;">
              <b>${e('unit')}</b>

              <span class="author-info">
                <strong>작성자 · ${e('author')}</strong>
                <a
                  href="tel:${e('phone')}"
                  class="phone-link"
                  style="padding:2px 8px;font-size:12px;">
                  📞 ${e('phone')}
                </a>
              </span>
            </div>

            <p style="font-size:11px;margin-top:6px;">
              오인출동 현장상황보고 · 보고 기준 ${e('updated')}
            </p>
          </footer>
        </main>
      `;
    }

    /* 화재 보고서 */
    return `
      <a class="skip-link" href="#main">본문 바로가기</a>

      <header>
        <div class="wrap">
          <b>${e('unit')}</b>
          <span class="draft-label">초기 현장상황보고</span>
          <button onclick="window.print()">인쇄 / PDF</button>
        </div>
      </header>

      <main class="wrap" id="main">
        <div class="intro">
          <p class="eyebrow">화재조사 현장기록</p>

          <div class="title-row">
            <h2 class="report-title">
              ${e('title')}<br>
              <span>초기 현장상황보고.</span>
            </h2>

            <div class="complete ongoing">
              <small>현장 대응</small>
              <strong>${e('status')}</strong>
              <span>초기보고</span>
            </div>
          </div>

          <p class="subtitle">${e('address')}</p>

          <div class="byline">
            <span>작성자</span>
            <strong>${e('author')}</strong>
          </div>

          <p class="source-note">
            보고 기준 · ${e('updated')}
          </p>
        </div>

        <section
          class="stats"
          aria-label="출동 및 대응 시각 현황"
          style="grid-template-columns:repeat(4,1fr);gap:16px;margin:24px 0 32px;">
          ${cell('출동 지령', 'dispatch')}
          ${cell('선착대 도착', 'arrival')}
          ${cell('초진 시각', 'knockdown')}
          ${cell('완진 시각', 'out')}
        </section>

        ${photos.length ? `
          <section
            class="gallery"
            id="galleryContainer"
            aria-label="현장기록사진">
            <img
              id="scene"
              src="${esc(photos[0].src)}"
              alt="${esc(photos[0].caption)}">

            <div class="photo-shade"></div>

            <div class="photo-caption">
              <span>
                현장기록사진
                <b id="photoCount">
                  01 / ${String(photos.length).padStart(2, '0')}
                </b>
              </span>
              <p id="caption">${esc(photos[0].caption)}</p>
            </div>

            <div class="photo-controls">
              <button id="prev" title="이전 사진">◀</button>
              <button id="pause" title="정지/재생">⏸</button>
              <button id="next" title="다음 사진">▶</button>
            </div>
          </section>
        ` : `
          <section class="panel">현장사진 등록 전</section>
        `}

        <section
          class="panel crew-highlight-panel"
          aria-label="출동대 현황">
          <p class="eyebrow">01 · 출동대 현황</p>
          <h3>현장 출동대 및 인력</h3>

          <div class="crew-grid">
            <div class="crew-card">
              <h4>선착대</h4>
              <p>${e('first_crew')}</p>
            </div>

            <div class="crew-card">
              <h4>추가출동대</h4>
              <p>${e('extra_crew')}</p>
            </div>

            <div class="crew-card">
              <h4>타서 지원출동</h4>
              <p>${e('support_crew')}</p>
            </div>
          </div>

          ${d.agency && d.agency !== '확인 중' ? `
            <div class="agency-note">
              <strong>유관기관 공동대응</strong>
              <p>${e('agency')}</p>
            </div>
          ` : ''}
        </section>

        <div class="report-grid">
          <section class="panel">
            <p class="eyebrow">02 · 대상 상세정보</p>
            <h3>화재 대상</h3>

            <dl>
              ${pair('발생장소', 'address')}
              ${locationMap}
              ${pair('대상 및 상세정보', 'target_vehicle')}
              ${pair('유관기관', 'agency')}
            </dl>
          </section>

          <section class="panel">
            <p class="eyebrow">03 · 현장 확인</p>
            <h3>초기 현장상황</h3>
            <p
              class="situation"
              style="white-space:pre-wrap">${e('situation')}</p>
          </section>
        </div>

        <section class="panel damage-panel">
          <p class="eyebrow">피해 및 조사</p>
          <h3>피해 및 조사현황</h3>

          <div class="investigation-grid">
            ${cell('인명피해', 'injury')}
            ${cell('대상 피해', 'damage')}
            ${cell('재산피해액', 'loss')}
            ${cell('발화지점', 'origin')}
            ${cell('화재원인', 'cause')}
          </div>

          <p class="source-note" style="margin-top:12px;">
            현장 확인 및 조사 진행에 따라 보완 예정.
          </p>
        </section>

        ${photos.length > 1 ? `
          <section class="photo-strip">
            ${photos.slice(1).map(p => `
              <figure>
                <img src="${esc(p.src)}" alt="${esc(p.caption)}">
                <figcaption>${esc(p.caption)}</figcaption>
              </figure>
            `).join('')}
          </section>
        ` : ''}

        <footer>
          <div class="signoff">
            <b>${e('unit')}</b>

            <span class="author-info">
              <strong>작성자 · ${e('author')}</strong>
              <a href="tel:${e('phone')}" class="phone-link">
                📞 ${e('phone')}
              </a>
            </span>
          </div>

          <p>
            화재조사 초기 현장상황보고 · 보고 기준 ${e('updated')}
          </p>
        </footer>
      </main>
    `;
  }

  let activeTimer = null;

  function mount(d) {
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }

    document.title = (d.title || '화재') + ' 현장상황보고';
    document.getElementById('report').innerHTML = render(d);

    const photos = (d.photos || []).filter(p => safePhoto(p.src));
    if (!photos.length) return;

    let i = 0;
    let isPlaying = true;

    function show(n) {
      i = (n + photos.length) % photos.length;

      const scene = document.getElementById('scene');
      const caption = document.getElementById('caption');
      const photoCount = document.getElementById('photoCount');

      if (scene) {
        scene.src = photos[i].src;
        scene.alt = photos[i].caption;
      }

      if (caption) {
        caption.textContent = photos[i].caption;
      }

      if (photoCount) {
        photoCount.textContent =
          String(i + 1).padStart(2, '0') +
          ' / ' +
          String(photos.length).padStart(2, '0');
      }
    }

    function stopAuto() {
      if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
    }

    function startAuto() {
      stopAuto();

      if (photos.length > 1) {
        activeTimer = setInterval(() => show(i + 1), 4000);
      }
    }

    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const pauseBtn = document.getElementById('pause');
    const galleryContainer = document.getElementById('galleryContainer');

    if (prevBtn) {
      prevBtn.onclick = () => {
        show(i - 1);
        if (isPlaying) startAuto();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        show(i + 1);
        if (isPlaying) startAuto();
      };
    }

    if (pauseBtn) {
      pauseBtn.onclick = () => {
        isPlaying = !isPlaying;

        if (isPlaying) {
          pauseBtn.textContent = '⏸';
          pauseBtn.setAttribute('title', '자동 재생 일시정지');
          startAuto();
        } else {
          pauseBtn.textContent = '▶';
          pauseBtn.setAttribute('title', '자동 재생 시작');
          stopAuto();
        }
      };
    }

    if (galleryContainer) {
      galleryContainer.onmouseenter = () => {
        if (isPlaying) stopAuto();
      };

      galleryContainer.onmouseleave = () => {
        if (isPlaying) startAuto();
      };
    }

    startAuto();
  }

  return { render, mount, safePhoto };
})();
