(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'gyeryong-field-v3:' + location.pathname.replace(/[^/]*$/, '');
  const ghKey = 'gyeryong-gh-config-v1';

  function openGhModal() {
    const saved = JSON.parse(localStorage.getItem(ghKey) || '{}');
    $('ghRepo').value = saved.repo || 'hyeonjunyi/Emergency_Report';
    $('ghBranch').value = saved.branch || 'main';
    $('ghToken').value = saved.token || '';
    const m = $('ghModal');
    if (m) m.style.display = 'flex';
  }
  function closeGhModal() {
    const m = $('ghModal');
    if (m) m.style.display = 'none';
  }

  if ($('ghConfigBtn')) $('ghConfigBtn').onclick = openGhModal;
  if ($('ghCloseBtn')) $('ghCloseBtn').onclick = closeGhModal;
  if ($('ghSaveBtn')) $('ghSaveBtn').onclick = () => {
    const conf = {
      repo: $('ghRepo').value.trim(),
      branch: $('ghBranch').value.trim() || 'main',
      token: $('ghToken').value.trim()
    };
    localStorage.setItem(ghKey, JSON.stringify(conf));
    closeGhModal();
    msg('GitHub 연동 정보가 저장되었습니다.');
  };

  // 'yyyy.mm.dd. hh:mm' 서식 생성 함수
  function formatKST(dateObj = new Date()) {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(dateObj);
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return `${p.year}.${p.month}.${p.day}. ${p.hour}:${p.minute}`;
  }

  // 필드 정의 및 실화재/오인신고 분기 설정 (onlyFire: true 이면 오인신고 시 숨김)
  const groups = [
    ['01 · 기본정보', [
      ['title', '보고서 제목'],
      ['date', '발생시각'],
      ['received', '신고 접수시각'],
      ['dispatch', '출동 지령시각'],
      ['arrival', '선착대 도착시각'],
      ['injury', '인명피해 현황', 'text', true],
      ['status', '현재 상태 (예: 완진, 현장조치 완료 등)'],
      ['updated', '보고 기준시각'],
      ['unit', '소속 기관'],
      ['author', '작성자'],
      ['phone', '작성자 연락처']
    ]],
    ['02 · 출동대 현황', [
      ['first_crew', '선착대 현황', 'textarea'],
      ['extra_crew', '추가출동대 현황', 'textarea', true],
      ['support_crew', '타서 지원출동 현황', 'textarea', true],
      ['agency', '유관기관 공동대응', 'textarea']
    ]],
    ['03 · 대상 및 현장상황', [
      ['address', '발생장소'],
      ['kind', '사건 분류 (예: 오인신고, 차량화재 등)'],
      ['target', '대상물 (예: 연기발생지, 차량 등)'],
      ['vehicle', '대상 상세정보', 'textarea', true],
      ['situation', '현장 확인 및 조치사항', 'textarea'],
      ['checks', '추가 확인사항', 'textarea', true]
    ]],
    ['04 · 대응 경과 및 피해조사', [
      ['commander_arrival', '지휘팀 도착시각', 'text', true],
      ['knockdown', '초진 시각', 'text', true],
      ['out', '완진 시각', 'text', true],
      ['damage', '대상 피해내역', 'text', true],
      ['loss', '재산피해액', 'text', true],
      ['origin', '발화지점', 'text', true],
      ['cause', '발화/오인 원인', 'text']
    ]]
  ];

  const names = groups.flatMap(g => g[1].map(f => f[0]));
  let photos = [], sample, css, reportCode, busy = false;
  const msg = t => $('message').textContent = t;

  // 보고 구분 변경 시 폼 필드 동적 숨김/표시
  function applyReportType(type) {
    const isFalseAlarm = (type === 'false_alarm');
    groups.forEach(([_, fields]) => {
      fields.forEach(([fName, _, __, onlyFire]) => {
        const fieldEl = document.getElementById('field-wrap-' + fName);
        if (fieldEl && onlyFire) {
          fieldEl.classList.toggle('hidden-field', isFalseAlarm);
        }
      });
    });
  }

  document.querySelectorAll('input[name="reportType"]').forEach(r => {
    r.onchange = () => {
      applyReportType(r.value);
      changed();
    };
  });

  function changed() {
    $('reviewed').checked = false;
    if ($('f-updated')) $('f-updated').value = formatKST();
    const d = collect();
    delete d.photos;
    try { localStorage.setItem(key, JSON.stringify(d)); } catch {}
  }

  function collect() {
    const selectedType = document.querySelector('input[name="reportType"]:checked')?.value || 'fire';
    return Object.fromEntries([
      ['reportType', selectedType],
      ...names.map(k => [k, $('f-' + k) ? $('f-' + k).value : '']),
      ['photos', photos.map(p => ({ ...p }))]
    ]);
  }

  function fill(d) {
    const type = d.reportType || (d.kind && d.kind.includes('오인') ? 'false_alarm' : 'fire');
    const radio = document.querySelector(`input[name="reportType"][value="${type}"]`);
    if (radio) radio.checked = true;

    names.forEach(k => {
      if ($('f-' + k)) {
        $('f-' + k).value = typeof d[k] === 'string' ? d[k] : '';
      }
    });
    photos = Array.isArray(d.photos)
      ? d.photos.filter(p => p && typeof p.caption === 'string' && FieldReport.safePhoto(p.src)).slice(0, 8)
      : [];
    applyReportType(type);
    draw();
    changed();
  }

  // 2. 새 사건 시작: 시각은 현재시각, 서술/현황 란은 공란("")
  function fresh() {
    const currentTime = formatKST();
    const selectedType = document.querySelector('input[name="reportType"]:checked')?.value || 'fire';
    const isFalse = (selectedType === 'false_alarm');

    const d = {
      reportType: selectedType,
      title: isFalse ? '오인출동 현장상황보고' : '화재 초기 현장상황보고',
      date: currentTime,
      received: currentTime,
      dispatch: currentTime,
      arrival: currentTime,
      commander_arrival: currentTime,
      knockdown: isFalse ? '-' : currentTime,
      out: isFalse ? '-' : currentTime,
      updated: currentTime,
      unit: '계룡소방서 현장대응단',
      author: '현장대응단 소방장 이현준',
      phone: '010-4200-9870',
      status: isFalse ? '현장조치 완료' : '진압 중',
      kind: isFalse ? '오인신고(연기오인 등)' : '',
      address: '',
      target: '',
      first_crew: '',
      extra_crew: '',
      support_crew: '',
      agency: '',
      vehicle: '',
      situation: '',
      checks: '',
      injury: isFalse ? '없음' : '확인 중',
      damage: isFalse ? '없음' : '확인 중',
      loss: isFalse ? '0원' : '산정 중',
      origin: isFalse ? '-' : '조사 중',
      cause: isFalse ? '오인신고 원인 확인' : '조사 중',
      photos: []
    };
    fill(d);
  }

  function draw() {
    const root = $('photos');
    root.replaceChildren();
    photos.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'photo';
      const img = document.createElement('img');
      img.src = p.src;
      img.alt = '현장사진 ' + (i + 1);
      const area = document.createElement('div');
      const label = document.createElement('label');
      label.textContent = `사진 ${i + 1} 설명${i === 0 ? ' (대표)' : ''}`;
      const input = document.createElement('input');
      input.value = p.caption;
      input.oninput = () => { p.caption = input.value; changed(); };
      label.append(input);
      area.append(label);
      for (const [text, fn] of [['앞으로', () => { if (i) { [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]]; draw(); changed(); } }], ['삭제', () => { photos.splice(i, 1); draw(); changed(); }]]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-sm';
        b.textContent = text;
        b.onclick = fn;
        area.append(b);
      }
      row.append(img, area);
      root.append(row);
    });
  }

  function download(content, type, name) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.textContent = name + ' 다운로드';
    a.className = 'button btn-sm';
    a.style.margin = '4px';
    $('downloads').append(a);
    a.click();
  }

  const readData = file => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  async function compress(file) {
    if (file.size > 30 * 1024 * 1024) throw Error('사진은 30MB 이하로 선택해 주세요.');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.8);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function embedded(d) {
    return {
      ...d,
      photos: await Promise.all(d.photos.map(async p => ({
        ...p,
        src: p.src.startsWith('data:') ? p.src : await readData(await (await fetch(p.src)).blob())
      })))
    };
  }

  function html(d) {
    d.updated = formatKST();
    const json = JSON.stringify(d).replace(/</g, '\\u003c');
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + (d.title || '현장상황보고') + '</title><style>' + css + '</style></head><body><div id="report"></div><script>' + reportCode + '\nFieldReport.mount(' + json + ');<\/script></body></html>';
  }

  function requireTitle() {
    if (!$('f-title').value.trim() || !$('f-address').value.trim()) throw Error('제목과 발생장소를 입력해 주세요.');
  }

  async function run(fn) {
    if (busy) return;
    busy = true;
    ['preview', 'publishGh', 'export', 'backup', 'new', 'sample'].forEach(k => { if ($(k)) $(k).disabled = true; });
    try { await fn(); } catch (e) { msg(e.message || '오류가 발생했습니다.'); } finally {
      busy = false;
      ['preview', 'publishGh', 'export', 'backup', 'new', 'sample'].forEach(k => { if ($(k)) $(k).disabled = false; });
    }
  }

  async function publishToGitHub(docHtml) {
    const confStr = localStorage.getItem(ghKey);
    if (!confStr) {
      openGhModal();
      throw Error('GitHub 연동 정보를 입력해 주세요.');
    }
    const conf = JSON.parse(confStr);
    if (!conf.repo || !conf.token) {
      openGhModal();
      throw Error('저장소 이름과 Token을 확인해 주세요.');
    }
    msg('GitHub 확인 중...');

    const cleanRepo = conf.repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    const branch = (conf.branch || 'main').trim();
    const filePath = 'index.html';
    const apiUrl = `https://api.github.com/repos/${cleanRepo}/contents/${filePath}?ref=${branch}`;

    let sha = null;
    try {
      const checkRes = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${conf.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        sha = checkData.sha;
      }
    } catch (e) {}

    msg('GitHub 업로드 중...');

    const bytes = new TextEncoder().encode(docHtml);
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) { bin += String.fromCharCode(bytes[i]); }
    const b64Content = btoa(bin);

    const payload = {
      message: `현장보고 배포 (${$('f-title').value || '상황보고'})`,
      content: b64Content,
      branch: branch
    };
    if (sha) payload.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${conf.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Error('GitHub 배포 실패: ' + (err.message || res.statusText));
    }
    msg('🎉 GitHub Pages 배포 완료! 1분 내 사이트에 반영됩니다.');
  }

  try {
    [sample, css, reportCode] = await Promise.all(['default.json', 'style.css', 'report.js'].map(async (u, i) => {
      const r = await fetch(u);
      if (!r.ok) throw Error('리소스를 불러오지 못했습니다.');
      return i === 0 ? r.json() : r.text();
    }));
  } catch (e) { msg(e.message); return; }

  const root = $('fields');
  groups.forEach(([title, fields]) => {
    const sec = document.createElement('section');
    sec.style.cssText = 'margin: 16px 0; padding: 16px;';
    const h = document.createElement('h3');
    h.textContent = title;
    h.style.cssText = 'font-size: 16px; margin: 0 0 10px;';
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 10px;';
    
    fields.forEach(([name, label, type]) => {
      const l = document.createElement('label');
      l.id = 'field-wrap-' + name;
      l.style.cssText = 'display: block; font-size: 13px; font-weight: 500;';
      l.textContent = label;
      const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
      input.id = 'f-' + name;
      input.style.cssText = 'width: 100%; min-height: ' + (type === 'textarea' ? '60px' : '36px') + '; margin-top: 4px; padding: 6px 10px; font-size: 14px;';
      input.oninput = changed;
      l.append(input);
      grid.append(l);
    });
    sec.append(h, grid);
    root.append(sec);
  });

  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch {}
  if (saved && typeof saved === 'object') {
    fill(saved);
  } else {
    fill(sample);
  }

  $('new').onclick = () => {
    if (confirm('현재 내용을 비우고 새 사건을 시작할까요?')) {
      fresh();
      msg('새 사건 서식으로 초기화되었습니다.');
    }
  };

  $('sample').onclick = () => {
    if (confirm('샘플 보고서로 복원할까요?')) {
      fill(sample);
      msg('샘플 서식을 불러왔습니다.');
    }
  };

  $('photoInput').onchange = () => run(async () => {
    const files = Array.from($('photoInput').files);
    if (photos.length + files.length > 8) throw Error('사진은 최대 8장입니다.');
    for (const f of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw Error('JPEG/PNG/WebP 이미지만 가능합니다.');
      photos.push({ src: await compress(f), caption: '현장사진 ' + (photos.length + 1) });
    }
    draw();
    changed();
    $('photoInput').value = '';
    msg('사진이 추가되었습니다.');
  });

  $('preview').onclick = () => run(async () => {
    requireTitle();
    $('previewFrame').srcdoc = html(collect());
    $('previewArea').hidden = false;
    $('previewArea').scrollIntoView({ behavior: 'smooth' });
    msg('미리보기를 확인하세요.');
  });

  $('close').onclick = () => { $('previewArea').hidden = true; };

  $('export').onclick = () => run(async () => {
    requireTitle();
    if (!$('reviewed').checked) throw Error('확인란에 체크해 주세요.');
    const doc = html(await embedded(collect()));
    download(doc, 'text/html;charset=utf-8', 'index.html');
    msg('index.html 파일이 저장되었습니다.');
  });

  $('publishGh').onclick = () => run(async () => {
    requireTitle();
    if (!$('reviewed').checked) throw Error('확인란에 체크해 주세요.');
    const doc = html(await embedded(collect()));
    await publishToGitHub(doc);
  });

  $('backup').onclick = () => run(async () => {
    download(JSON.stringify(await embedded(collect()), null, 2), 'application/json', 'fire-draft.json');
    msg('초안 백업이 저장되었습니다.');
  });

  $('restore').onchange = () => run(async () => {
    const f = $('restore').files[0];
    if (!f) return;
    const d = JSON.parse(await f.text());
    fill(d);
    $('restore').value = '';
    msg('초안을 불러왔습니다.');
  });

  $('form').onsubmit = e => e.preventDefault();
})();
