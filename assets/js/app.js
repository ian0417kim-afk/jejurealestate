'use strict';

const App = {
  lang: localStorage.getItem('jeju_lang') || 'ko',
  langData: {},
  config: {},
  listings: [],
  filtered: [],
  activeType: 'all',
  activeDeal: 'all',
  searchQuery: '',
  currentListing: null,
  sliderIndex: 0,
  lightboxIndex: 0,
};

// ── 초기화 ──
async function init() {
  try {
    const [langRes, configRes, listingsRes] = await Promise.all([
      fetch('data/lang.json'),
      fetch('data/config.json'),
      fetch('data/listings.json'),
    ]);
    App.langData = await langRes.json();
    App.config = await configRes.json();
    const data = await listingsRes.json();
    App.listings = data.listings;
    App.filtered = [...App.listings];
    applyLang();
    renderFilterBtns();
    renderListings();
    bindEvents();
    renderFooterBtns();
    handleHash();
  } catch (e) {
    console.error('초기화 오류:', e);
  }
}

// ── 이미지 경로 ──
// 매물 ID 폴더 기준으로 이미지 경로 생성
function imgPath(listing, filename) {
  return `images/listings/${listing.id}/${filename}`;
}

// ── 언어 ──
function t(key) {
  return (App.langData[App.lang] || App.langData['ko'])[key] || key;
}
function getTitle(l) { return l[`title_${App.lang}`] || l.title_ko; }
function getLocation(l) { return l[`location_${App.lang}`] || l.location_ko; }
function getDesc(l) { return l[`desc_${App.lang}`] || l.desc_ko; }

function applyLang() {
  const tr = App.langData[App.lang] || App.langData['ko'];
  document.querySelectorAll('[data-lang]').forEach(el => {
    const key = el.getAttribute('data-lang');
    if (tr[key] !== undefined) el.textContent = tr[key];
  });
  document.querySelectorAll('[data-lang-ph]').forEach(el => {
    const key = el.getAttribute('data-lang-ph');
    if (tr[key] !== undefined) el.placeholder = tr[key];
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === App.lang);
  });
  // 에이전시명
  const agencyEl = document.getElementById('agencyName');
  if (agencyEl && App.config.agency) {
    agencyEl.textContent = App.config.agency[App.lang] || App.config.agency.ko;
  }
  localStorage.setItem('jeju_lang', App.lang);
  if (App.listings.length) {
    renderFilterBtns();
    renderListings();
  }
  if (App.currentListing) renderDetail(App.currentListing);
}

// ── 가격 포맷 ──
function formatPrice(l) {
  if (l.deal === '월세' || l.deal === '단기') {
    const dep = l.monthly_deposit || 0;
    const rent = l.monthly_rent || 0;
    if (App.lang === 'ko') return dep > 0
      ? `보증금 ${formatKRW(dep)} / 월 ${formatKRW(rent)}`
      : `월 ${formatKRW(rent)}`;
    if (App.lang === 'en') return dep > 0
      ? `Deposit $${Math.round(dep * App.config.exchange.usd).toLocaleString()} / Mo. $${Math.round(rent * App.config.exchange.usd).toLocaleString()}`
      : `$${Math.round(rent * App.config.exchange.usd).toLocaleString()}/mo`;
    return dep > 0
      ? `押金¥${Math.round(dep * App.config.exchange.cny).toLocaleString()} / 月¥${Math.round(rent * App.config.exchange.cny).toLocaleString()}`
      : `月¥${Math.round(rent * App.config.exchange.cny).toLocaleString()}`;
  }
  const krw = l.price_krw;
  if (!krw) return '-';
  if (App.lang === 'en') return `$${Math.round(krw * App.config.exchange.usd).toLocaleString()}`;
  if (App.lang === 'zh') return `¥${Math.round(krw * App.config.exchange.cny).toLocaleString()}`;
  return formatKRW(krw);
}

function formatKRW(n) {
  if (!n) return '0원';
  if (n >= 100000000) {
    const uk = Math.floor(n / 100000000);
    const man = Math.round((n % 100000000) / 10000);
    return man > 0 ? `${uk}억 ${man.toLocaleString()}만원` : `${uk}억원`;
  }
  return `${Math.round(n / 10000).toLocaleString()}만원`;
}

function formatPriceKRW(l) {
  if (App.lang === 'ko') return '';
  const krw = l.price_krw || l.monthly_rent;
  if (!krw) return '';
  return `≈ ${formatKRW(krw)} 기준`;
}

function getDealLabel(deal) {
  return { '매매': t('deal_sale'), '전세': t('deal_jeonse'), '월세': t('deal_monthly'), '단기': t('deal_short') }[deal] || deal;
}

function getTypeLabel(type) {
  return {
    '아파트': t('filter_apt'), '원투룸': t('filter_oneroom'),
    '빌라연립': t('filter_villa'), '단독주택': t('filter_house'),
    '토지': t('filter_land'), '건물': t('filter_building'), '단기': t('filter_short'),
  }[type] || type;
}

// ── 필터 버튼 ──
function renderFilterBtns() {
  const types = [
    ['all', t('filter_all')], ['아파트', t('filter_apt')],
    ['원투룸', t('filter_oneroom')], ['빌라연립', t('filter_villa')],
    ['단독주택', t('filter_house')], ['토지', t('filter_land')],
    ['건물', t('filter_building')], ['단기', t('filter_short')],
  ];
  const tw = document.getElementById('typeBtns');
  if (tw) {
    tw.innerHTML = types.map(([v, l]) =>
      `<button class="filter-btn${App.activeType===v?' active':''}" data-type="${v}">${l}</button>`
    ).join('');
    tw.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', () => {
      App.activeType = b.dataset.type; applyFilter(); renderFilterBtns();
    }));
  }
  const deals = [
    ['all', t('filter_all')], ['매매', t('deal_sale')],
    ['전세', t('deal_jeonse')], ['월세', t('deal_monthly')], ['단기', t('deal_short')],
  ];
  const dw = document.getElementById('dealBtns');
  if (dw) {
    dw.innerHTML = deals.map(([v, l]) =>
      `<button class="deal-btn${App.activeDeal===v?' active':''}" data-deal="${v}">${l}</button>`
    ).join('');
    dw.querySelectorAll('.deal-btn').forEach(b => b.addEventListener('click', () => {
      App.activeDeal = b.dataset.deal; applyFilter(); renderFilterBtns();
    }));
  }
}

function applyFilter() {
  App.filtered = App.listings.filter(l => {
    const tm = App.activeType === 'all' || l.type === App.activeType;
    const dm = App.activeDeal === 'all' || l.deal === App.activeDeal;
    const q = App.searchQuery.toLowerCase();
    const sm = !q || getTitle(l).toLowerCase().includes(q) || getLocation(l).toLowerCase().includes(q) || l.type.includes(q);
    return tm && dm && sm;
  });
  renderListings();
}

// ── 매물 목록 렌더 ──
function renderListings() {
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;
  if (!App.filtered.length) {
    grid.innerHTML = `<div class="empty-state"><p style="font-size:2.5rem;margin-bottom:12px">🏠</p><p>${t('no_result')}</p></div>`;
    return;
  }
  grid.innerHTML = App.filtered.map(l => `
    <article class="listing-card" data-id="${l.id}" tabindex="0" role="button" aria-label="${getTitle(l)}">
      <div class="card-img-wrap">
        <img
          src="${imgPath(l, 'thumb.jpg')}"
          alt="${getTitle(l)}"
          loading="lazy"
          width="640" height="480"
          onerror="this.style.background='#e8f4f3';this.alt='사진 준비중'"
        >
        <div class="card-badges">
          <span class="badge-type">${getTypeLabel(l.type)}</span>
          <span class="badge-deal deal-${l.deal}">${getDealLabel(l.deal)}</span>
        </div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${getTitle(l)}</h3>
        <p class="card-location">📍 ${getLocation(l)}</p>
        <p class="card-price">${formatPrice(l)}</p>
        <div class="card-meta">
          ${l.area_m2 ? `<span>📐 ${l.area_m2}㎡</span>` : ''}
          ${l.floor && l.floor !== '-' ? `<span>🏢 ${l.floor}</span>` : ''}
          ${l.built_year ? `<span>🗓 ${l.built_year}</span>` : ''}
          ${l.parking ? `<span>🚗 주차</span>` : ''}
        </div>
      </div>
    </article>
  `).join('');
  grid.querySelectorAll('.listing-card').forEach(c => {
    c.addEventListener('click', () => openDetail(+c.dataset.id));
    c.addEventListener('keydown', e => { if (e.key === 'Enter') openDetail(+c.dataset.id); });
  });
}

// ── 상세 페이지 ──
function openDetail(id) {
  const l = App.listings.find(x => x.id === id);
  if (!l) return;
  App.currentListing = l;
  App.sliderIndex = 0;
  document.getElementById('listPage').style.display = 'none';
  document.getElementById('detailPage').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'instant' });
  renderDetail(l);
  history.pushState({ id }, '', `#listing-${id}`);
}

function renderDetail(l) {
  const cfg = App.config;
  // 썸네일 제외한 상세 사진 목록
  const detailImgs = l.images.filter(f => f !== 'thumb.jpg');

  document.getElementById('detailPage').innerHTML = `
    <div class="container detail-container">
      <button class="detail-back" id="backBtn">← ${t('back')}</button>

      <!-- 슬라이더 -->
      <div class="slider-wrap" id="sliderWrap">
        <div class="slider-track" id="sliderTrack">
          ${detailImgs.map((img, i) => `
            <div class="slider-slide">
              <img
                src="${imgPath(l, img)}"
                alt="${getTitle(l)} ${i+1}"
                loading="${i===0?'eager':'lazy'}"
                width="1200" height="800"
                onerror="this.parentElement.style.background='#e8f4f3'"
              >
            </div>
          `).join('')}
        </div>
        ${detailImgs.length > 1 ? `
          <button class="slider-arrow slider-prev" id="slPrev">&#8249;</button>
          <button class="slider-arrow slider-next" id="slNext">&#8250;</button>
          <div class="slider-dots" id="slDots">
            ${detailImgs.map((_,i) => `<span class="slider-dot${i===0?' active':''}"></span>`).join('')}
          </div>
          <div class="slider-count"><span id="slCur">1</span>/${detailImgs.length}</div>
        ` : ''}
      </div>

      <!-- 상세 레이아웃 -->
      <div class="detail-layout">
        <div class="detail-main">
          <div class="detail-tags">
            <span class="badge-deal deal-${l.deal}">${getDealLabel(l.deal)}</span>
            <span class="badge-type">${getTypeLabel(l.type)}</span>
          </div>
          <h1 class="detail-title">${getTitle(l)}</h1>
          <p class="detail-location">📍 ${getLocation(l)}</p>
          <p class="detail-price">${formatPrice(l)}</p>
          ${App.lang !== 'ko' ? `<p class="detail-price-sub">${formatPriceKRW(l)}</p>` : ''}

          <div class="detail-specs">
            ${l.area_m2 ? `<div class="spec-item"><div class="spec-label">${t('detail_area')}</div><div class="spec-val">${l.area_m2}㎡</div></div>` : ''}
            ${l.floor && l.floor !== '-' ? `<div class="spec-item"><div class="spec-label">${t('detail_floor')}</div><div class="spec-val">${l.floor}</div></div>` : ''}
            ${l.built_year ? `<div class="spec-item"><div class="spec-label">${t('detail_built')}</div><div class="spec-val">${l.built_year}년</div></div>` : ''}
            <div class="spec-item"><div class="spec-label">${t('detail_parking')}</div><div class="spec-val">${l.parking ? '✅ 가능' : '❌ 불가'}</div></div>
          </div>

          <h3 class="detail-desc-title">${t('detail_desc')}</h3>
          <p class="detail-desc">${getDesc(l)}</p>
        </div>

        <!-- 문의 박스 -->
        <aside class="contact-box">
          <div class="contact-box-title">📞 ${t('contact_title')}</div>
          <div class="contact-btns">
            <a href="tel:${cfg.contact.phone}" class="cbtn cbtn-phone">📞 ${t('contact_phone')}</a>
            <a href="sms:${cfg.contact.sms}" class="cbtn cbtn-sms">💬 ${t('contact_sms')}</a>
            <a href="${cfg.contact.kakao}" target="_blank" rel="noopener" class="cbtn cbtn-kakao">💛 ${t('contact_kakao')}</a>
            <button class="cbtn cbtn-wechat" onclick="alert('WeChat ID: ${cfg.contact.wechat}')">💚 ${t('contact_wechat')}</button>
          </div>
        </aside>
      </div>
    </div>
  `;

  document.getElementById('backBtn').addEventListener('click', closeDetail);

  if (detailImgs.length > 1) {
    document.getElementById('slPrev').addEventListener('click', () => moveSlider(-1, detailImgs.length));
    document.getElementById('slNext').addEventListener('click', () => moveSlider(1, detailImgs.length));
  }

  initSwipe('sliderWrap', detailImgs.length);

  document.getElementById('sliderWrap').addEventListener('click', e => {
    if (!e.target.closest('.slider-arrow')) {
      App.lightboxIndex = App.sliderIndex;
      openLightbox(detailImgs.map(f => imgPath(l, f)));
    }
  });
}

function closeDetail() {
  document.getElementById('listPage').style.display = 'block';
  document.getElementById('detailPage').style.display = 'none';
  App.currentListing = null;
  history.pushState({}, '', window.location.pathname);
  window.scrollTo({ top: 0 });
}

// ── 슬라이더 ──
function moveSlider(dir, total) {
  App.sliderIndex = (App.sliderIndex + dir + total) % total;
  const track = document.getElementById('sliderTrack');
  if (track) track.style.transform = `translateX(-${App.sliderIndex * 100}%)`;
  document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === App.sliderIndex));
  const cur = document.getElementById('slCur');
  if (cur) cur.textContent = App.sliderIndex + 1;
}

function initSwipe(id, total) {
  const el = document.getElementById(id);
  if (!el || total <= 1) return;
  let sx = 0;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    const diff = sx - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) moveSlider(diff > 0 ? 1 : -1, total);
  });
}

// ── 라이트박스 ──
function openLightbox(images) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lbImg');
  lb._images = images;
  img.src = images[App.lightboxIndex];
  lb.classList.add('active');
}

function moveLightbox(dir) {
  const lb = document.getElementById('lightbox');
  const images = lb._images || [];
  App.lightboxIndex = (App.lightboxIndex + dir + images.length) % images.length;
  document.getElementById('lbImg').src = images[App.lightboxIndex];
}

// ── 푸터 문의 버튼 ──
function renderFooterBtns() {
  const el = document.getElementById('footerBtns');
  const cfg = App.config;
  if (!el || !cfg.contact) return;
  el.innerHTML = `
    <a href="tel:${cfg.contact.phone}" class="cfb cfb-phone">📞 ${cfg.contact.phone}</a>
    <a href="sms:${cfg.contact.sms}" class="cfb cfb-sms">💬 SMS</a>
    <a href="${cfg.contact.kakao}" target="_blank" rel="noopener" class="cfb cfb-kakao">💛 KakaoTalk</a>
    <button class="cfb cfb-wechat" onclick="alert('WeChat: ${cfg.contact.wechat}')">💚 WeChat</button>
  `;
}

// ── URL 해시 ──
function handleHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#listing-')) {
    const id = parseInt(hash.replace('#listing-', ''));
    if (!isNaN(id)) openDetail(id);
  }
}

// ── 이벤트 바인딩 ──
function bindEvents() {
  // 언어
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => { App.lang = btn.dataset.lang; applyLang(); renderFooterBtns(); });
  });

  // 검색
  const si = document.getElementById('searchInput');
  if (si) {
    si.addEventListener('input', e => { App.searchQuery = e.target.value; applyFilter(); });
    si.addEventListener('keydown', e => { if (e.key === 'Enter') applyFilter(); });
  }
  document.getElementById('searchBtn')?.addEventListener('click', applyFilter);

  // 라이트박스
  document.getElementById('lbClose')?.addEventListener('click', () => document.getElementById('lightbox').classList.remove('active'));
  document.getElementById('lbPrev')?.addEventListener('click', () => moveLightbox(-1));
  document.getElementById('lbNext')?.addEventListener('click', () => moveLightbox(1));
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
  });

  // 키보드
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('lightbox')?.classList.remove('active');
      document.getElementById('mobileMenu')?.classList.remove('open');
    }
    if (document.getElementById('lightbox')?.classList.contains('active')) {
      if (e.key === 'ArrowLeft') moveLightbox(-1);
      if (e.key === 'ArrowRight') moveLightbox(1);
    }
  });

  // 모바일 메뉴
  document.getElementById('hamburger')?.addEventListener('click', () => document.getElementById('mobileMenu')?.classList.add('open'));
  document.getElementById('mobileMenuClose')?.addEventListener('click', () => document.getElementById('mobileMenu')?.classList.remove('open'));

  // 뒤로가기
  window.addEventListener('popstate', () => {
    if (!window.location.hash) closeDetail();
    else handleHash();
  });

  // 헤더 스크롤
  window.addEventListener('scroll', () => {
    document.querySelector('.header')?.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', init);
