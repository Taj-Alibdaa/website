// ══════════════════════════════════════════════════════════════
//  projects.js — تاج الإبداع | صفحة الأعمال
//  الإصلاحات:
//  1. إزالة orderBy (كانت تُخفي المشاريع القديمة بدون createdAt)
//  2. قراءة p.title || p.name (توحيد أسماء الحقول)
//  3. قراءة imageUrl || coverUrl || images[0] (توحيد مصدر الصورة)
//  4. تحويل روابط Google Drive تلقائياً
// ══════════════════════════════════════════════════════════════

// ── FIREBASE CONFIG ──────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAaqn0emE1XRE1r95jzz6zOyHJpYhG6PDE",
  authDomain:        "taj-alibdaa.firebaseapp.com",
  projectId:         "taj-alibdaa",
  storageBucket:     "taj-alibdaa.firebasestorage.app",
  messagingSenderId: "822530121102",
  appId:             "1:822530121102:web:4f105f37c9b7a31e9298df",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── STATE ─────────────────────────────────────────────────────
let allProjects = [];
let currentCat  = 'all';
let pdIndex     = 0;
let pdImages    = [];

// ── UTILITY: Convert Google Drive share-link → direct image URL ──
function toDirect(url) {
  if (!url) return '';
  // Already a direct/embed link
  if (url.includes('uc?export=view') || url.includes('drive.google.com/uc')) return url;
  // /file/d/FILE_ID/view  →  /uc?export=view&id=FILE_ID
  const m = url.match(/\/file\/d\/([^/?\s]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  // /open?id=FILE_ID
  const m2 = url.match(/[?&]id=([^&\s]+)/);
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
  return url;
}

// ── UTILITY: Get best image URL for a project ─────────────────
function getCover(p) {
  const raw =
    p.imageUrl                          ||   // admin saves converted URL
    p.coverUrl                          ||   // raw Drive link from admin
    (p.images && p.images[0])           ||   // legacy images array
    '';
  return toDirect(raw);
}

// ── UTILITY: Get project name ─────────────────────────────────
function getName(p) {
  return p.title || p.name || 'بدون عنوان';
}

// ── FIREBASE STATUS ───────────────────────────────────────────
function setStatus(state, txt) {
  const el = document.getElementById('fbStatus');
  if (!el) return;
  el.className = 'fb-status ' + state;
  document.getElementById('fbStatusText').textContent = txt;
}

// ── REAL-TIME LISTENER (no orderBy — avoids missing docs bug) ─
db.collection('projects')
  .onSnapshot(snapshot => {
    // Sort client-side: newest first (falls back to name if no date)
    allProjects = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;   // newest first
      });

    setStatus('connected', 'متصل بـ Firebase ✓');
    removeSkeleton();
    buildFilterChips();
    applyFilters();
  }, err => {
    setStatus('error', 'تعذّر الاتصال');
    console.error('Firestore error:', err);
    removeSkeleton();
    // Fallback: localStorage cache
    try {
      const local = localStorage.getItem('taj_projects');
      if (local) {
        allProjects = JSON.parse(local);
        buildFilterChips();
        applyFilters();
      } else {
        renderEmpty();
      }
    } catch (e) {
      renderEmpty();
    }
  });

// ── REMOVE SKELETON PLACEHOLDERS ─────────────────────────────
function removeSkeleton() {
  ['sk1','sk2','sk3','sk4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

// ── BUILD FILTER CHIPS ────────────────────────────────────────
function buildFilterChips() {
  const cats = ['all', ...new Set(allProjects.map(p => p.category || '').filter(Boolean))];
  const wrap = document.getElementById('filterChips');
  if (!wrap) return;
  wrap.innerHTML = cats.map(c => `
    <button class="chip${c === currentCat ? ' active' : ''}"
      data-cat="${c}" onclick="selectCat(this)">
      ${c === 'all' ? 'الكل' : c}
    </button>
  `).join('');
}

window.selectCat = function(btn) {
  currentCat = btn.dataset.cat;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
};

// ── FILTER + SEARCH ───────────────────────────────────────────
window.applyFilters = function() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const filtered = allProjects.filter(p => {
    const matchCat = currentCat === 'all' || (p.category || '') === currentCat;
    const name     = getName(p).toLowerCase();
    const matchQ   = !q ||
      name.includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  const rc = document.getElementById('resultsCount');
  if (rc) rc.textContent = filtered.length ? `${filtered.length} مشروع` : '';
  renderGrid(filtered);
};

// ── RENDER GRID ───────────────────────────────────────────────
function renderGrid(projects) {
  const grid = document.getElementById('masonryGrid');
  if (!grid) return;
  if (!projects.length) { renderEmpty(); return; }

  grid.innerHTML = projects.map((p, i) => {
    const cover   = getCover(p) || `https://via.placeholder.com/400x280/f8f8f8/981B1E?text=${encodeURIComponent(getName(p))}`;
    const imgCnt  = (p.images || []).length;
    const hasVid  = !!p.video;
    const dateStr = p.createdAt
      ? new Date(p.createdAt).toLocaleDateString('ar-SA')
      : '';

    return `
    <div class="masonry-item" style="animation-delay:${i * 0.06}s" onclick="openDetail('${p.id}')">
      <div class="proj-card">
        <div class="proj-card-img">
          <img src="${cover}"
               alt="${getName(p)}"
               loading="lazy"
               onerror="this.src='https://via.placeholder.com/400x280/f8f8f8/981B1E?text=صورة'"/>
          <div class="proj-card-overlay">
            <div class="overlay-view-btn">عرض المشروع</div>
            ${imgCnt > 1 ? `<div class="overlay-imgs-count">📷 ${imgCnt} صور</div>` : ''}
          </div>
        </div>
        <div class="proj-card-body">
          ${p.category ? `<div class="proj-card-cat">${p.category}</div>` : ''}
          <div class="proj-card-title">${getName(p)}</div>
          ${p.description ? `<div class="proj-card-desc">${p.description}</div>` : ''}
          <div class="proj-card-footer">
            <span class="proj-card-date">${dateStr}</span>
            ${hasVid ? '<span class="proj-card-has-video">▶ فيديو</span>' : ''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderEmpty() {
  const grid = document.getElementById('masonryGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="empty-state">
      <div class="es-icon">🏛</div>
      <h3>لا توجد مشاريع</h3>
      <p>لم يتم إضافة أي مشروع بعد. ابدأ الإضافة من لوحة الإدارة.</p>
    </div>`;
}

// ── PROJECT DETAIL ────────────────────────────────────────────
window.openDetail = function(id) {
  const p = allProjects.find(x => x.id === id);
  if (!p) return;

  document.getElementById('pdHeaderTitle').textContent = getName(p);
  document.getElementById('pdHeaderCat').textContent   = p.category || 'مشروع';
  document.getElementById('pdTitle').textContent       = getName(p);
  document.getElementById('pdDesc').textContent        = p.description || 'لا يوجد وصف لهذا المشروع.';
  document.getElementById('pdMetaCat').textContent     = p.category || '—';

  // Build images list — prefer images[], fallback to single imageUrl/coverUrl
  const rawImgs = (p.images && p.images.length)
    ? p.images
    : [p.imageUrl || p.coverUrl].filter(Boolean);

  pdImages = rawImgs.map(toDirect).filter(Boolean);
  if (!pdImages.length) {
    pdImages = [`https://via.placeholder.com/800x480/f8f8f8/981B1E?text=${encodeURIComponent(getName(p))}`];
  }

  document.getElementById('pdMetaImgs').textContent = rawImgs.length + ' صورة';

  // Date
  const dateStr = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' })
    : '—';
  document.getElementById('pdMetaDate').textContent = dateStr;

  // Video
  const vidRow   = document.getElementById('pdMetaVideoRow');
  const vidSec   = document.getElementById('pdVideoSection');
  const vidFrame = document.getElementById('pdVideoFrame');
  if (vidRow) vidRow.style.display = p.video ? '' : 'none';
  if (vidSec && vidFrame) {
    if (p.video) {
      vidSec.style.display = '';
      vidFrame.src = p.video;
    } else {
      vidSec.style.display = 'none';
      vidFrame.src = '';
    }
  }

  // PDF
  const pdfSec   = document.getElementById('pdPdfSection');
  const pdfFrame = document.getElementById('pdPdfFrame');
  if (pdfSec && pdfFrame) {
    if (p.pdfEmbed || p.pdfUrl) {
      pdfSec.style.display = '';
      const embed = p.pdfEmbed || p.pdfUrl.replace('/view', '/preview');
      pdfFrame.src = embed;
    } else {
      pdfSec.style.display = 'none';
      pdfFrame.src = '';
    }
  }

  pdIndex = 0;
  buildPdSlider();

  document.getElementById('projectDetail').classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeDetail = function() {
  document.getElementById('projectDetail').classList.remove('open');
  document.body.style.overflow = '';
  const vidFrame = document.getElementById('pdVideoFrame');
  if (vidFrame) vidFrame.src = '';
};

function buildPdSlider() {
  const wrap = document.getElementById('pdSlider');
  if (!wrap) return;
  wrap.innerHTML = pdImages.map((src, i) => `
    <div class="pd-slide${i === pdIndex ? ' active' : ''}">
      <img src="${src}" alt=""
           onerror="this.src='https://via.placeholder.com/800x480/f8f8f8/981B1E?text=صورة'"/>
    </div>`).join('');

  const dots = document.getElementById('pdDots');
  if (dots) {
    dots.innerHTML = pdImages.length > 1
      ? pdImages.map((_, i) =>
          `<span class="pd-dot${i === pdIndex ? ' active' : ''}" onclick="goSlide(${i})"></span>`
        ).join('')
      : '';
  }
}

window.goSlide = function(idx) {
  pdIndex = (idx + pdImages.length) % pdImages.length;
  buildPdSlider();
};

window.prevSlide = function() { goSlide(pdIndex - 1); };
window.nextSlide = function() { goSlide(pdIndex + 1); };

// Close on backdrop click
document.addEventListener('click', e => {
  if (e.target.id === 'projectDetail') closeDetail();
});

// Keyboard navigation
document.addEventListener('keydown', e => {
  const det = document.getElementById('projectDetail');
  if (!det?.classList.contains('open')) return;
  if (e.key === 'Escape')      closeDetail();
  if (e.key === 'ArrowRight')  prevSlide();
  if (e.key === 'ArrowLeft')   nextSlide();
});

// ── NAV: LANG + HAMBURGER ─────────────────────────────────────
let lang = 'ar';
window.toggleLang = function() {
  lang = lang === 'ar' ? 'en' : 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('langBtn').textContent = lang === 'ar' ? 'EN' : 'AR';
  document.querySelectorAll('[data-ar]').forEach(el => {
    el.textContent = lang === 'ar' ? el.dataset.ar : el.dataset.en;
  });
};

window.toggleMenu = function() {
  document.getElementById('navLinks').classList.toggle('open');
};
