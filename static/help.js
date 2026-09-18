// Local help book. No external libraries, services or device requests.
const guideChapterIds = ['start', 'devices', 'firmware', 'data', 'service', 'migration', 'settings', 'troubleshooting'];
const guideBooks = new Map();
let guideChapter = 'start';
let guideLoadEpoch = 0;
let guideReturnFocus = null;
let guideBound = false;
const guideText = (de, en) => currentLang === 'de' ? de : en;
const guideEscape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guideSlug = value => value.toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu, '').replace(/ /g, '-');

function guideInline(value) {
  return guideEscape(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(#([\p{L}\p{N}-]+)\)/gu, (all, label, slug) => {
      const book = guideBooks.get(currentLang === 'de' ? 'de' : 'en') || [];
      const id = book.find(chapter => guideSlug(chapter.title) === slug)?.id || slug;
      return guideChapterIds.includes(id) ? `<a href="#${slug}" data-guide-chapter="${id}">${label}</a>` : all;
    });
}

function guideMarkdown(markdown) {
  const out = []; let list = ''; let details = false;
  const closeList = () => { if (list) out.push(`</${list}>`); list = ''; };
  // Join soft line breaks before rendering paragraphs and list items.
  const lines = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const previous = lines.at(-1) || '';
    const block = /^(?:#{1,6} |:::|- |\d+\. )/;
    if (raw.trim() && !block.test(raw.trim()) && previous && !/^(?:#{1,6} |:::)/.test(previous)) {
      lines[lines.length - 1] += ` ${raw.trim()}`;
    } else lines.push(raw.trim());
  }
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    const item = line.match(/^(?:([-])|\d+\.)\s+(.+)$/);
    if (item) {
      const type = item[1] ? 'ul' : 'ol';
      if (list !== type) { closeList(); list = type; out.push(`<${list}>`); }
      out.push(`<li>${guideInline(item[2])}</li>`); continue;
    }
    closeList();
    if (line.startsWith(':::details ')) {
      if (details) out.push('</details>');
      out.push(`<details><summary>${guideInline(line.slice(11))}</summary>`); details = true;
    } else if (line === ':::' && details) { out.push('</details>'); details = false;
    } else if (/^#{2,4} /.test(line)) {
      const level = line.indexOf(' ');
      out.push(`<h${level}>${guideInline(line.slice(level + 1))}</h${level}>`);
    } else out.push(`<p>${guideInline(line)}</p>`);
  }
  closeList(); if (details) out.push('</details>');
  return out.join('');
}

function parseGuideBook(markdown) {
  const document = markdown.replace(/^\uFEFF/, '').replace(/^# [^\r\n]+\r?\n/, '');
  const parts = document.split(/^## /m).filter(part => part.trim());
  if (parts.length !== guideChapterIds.length) throw new Error('Invalid help book');
  return parts.map((part, index) => {
    const newline = part.indexOf('\n');
    return {id:guideChapterIds[index], title:part.slice(0, newline).trim(), body:part.slice(newline + 1)};
  });
}

function renderGuideBook() {
  const book = guideBooks.get(currentLang === 'de' ? 'de' : 'en');
  if (!book) return;
  const query = document.getElementById('guideSearch').value.trim().toLocaleLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  const matches = book.filter(chapter => words.every(word => `${chapter.title} ${chapter.body}`.toLocaleLowerCase().includes(word)));
  const nav = document.getElementById('guideChapters'); nav.replaceChildren();
  for (const chapter of matches) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = chapter.title;
    if (chapter.id === guideChapter) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', () => selectGuideChapter(chapter.id)); nav.appendChild(button);
  }
  document.getElementById('guideSearchStatus').textContent = query
    ? `${matches.length} ${guideText('Kapitel gefunden', 'chapters found')}` : '';
  const selected = book.find(chapter => chapter.id === guideChapter) || book[0];
  document.getElementById('guideContent').innerHTML = `<h2>${guideEscape(selected.title)}</h2>${guideMarkdown(selected.body)}`;
  const pages = document.getElementById('guidePagination'); pages.replaceChildren();
  const index = book.indexOf(selected);
  for (const offset of [-1, 1]) {
    const chapter = book[index + offset]; if (!chapter) continue;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost';
    button.textContent = offset < 0 ? `← ${chapter.title}` : `${chapter.title} →`;
    button.addEventListener('click', () => selectGuideChapter(chapter.id)); pages.appendChild(button);
  }
}

function selectGuideChapter(id) {
  if (!guideChapterIds.includes(id)) return;
  guideChapter = id; renderGuideBook();
  const content = document.getElementById('guideContent'); content.focus({preventScroll:true});
  document.querySelector('.guide-reading').scrollTop = 0;
}

async function loadGuideBook() {
  const epoch = ++guideLoadEpoch;
  const language = currentLang === 'de' ? 'de' : 'en';
  document.getElementById('guideSearchLabel').textContent = guideText('Hilfe durchsuchen', 'Search help');
  document.getElementById('guideChapters').setAttribute('aria-label', guideText('Kapitel', 'Chapters'));
  document.getElementById('guidePagination').setAttribute('aria-label', guideText('Kapitel wechseln', 'Change chapter'));
  document.getElementById('closeGuide').setAttribute('aria-label', guideText('Hilfe schließen', 'Close help'));
  const content = document.getElementById('guideContent');
  if (!guideBooks.has(language)) {
    content.textContent = guideText('Hilfe wird geladen …', 'Loading help …');
    document.getElementById('guideChapters').replaceChildren();
    document.getElementById('guidePagination').replaceChildren();
    try {
      const response = await fetch(`/help/${language}.md`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const book = parseGuideBook(await response.text()); guideBooks.set(language, book);
    } catch (_) {
      if (epoch !== guideLoadEpoch) return;
      content.textContent = guideText('Die lokale Hilfe konnte nicht geladen werden. Bitte erneut versuchen.', 'The local help could not be loaded. Please try again.');
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = guideText('Erneut laden', 'Retry');
      retry.addEventListener('click', loadGuideBook); content.appendChild(retry); return;
    }
  }
  if (epoch === guideLoadEpoch) renderGuideBook();
}

function openGuideBook() {
  const context = {connection:'devices', install:'firmware', management:'data', backup:'data', logging:'service', telegraf:'service', maintenance:'service', migration:'migration', testrunner:'service', settings:'settings'};
  guideChapter = context[typeof workspaceView === 'string' ? workspaceView : ''] || 'start';
  guideReturnFocus = document.getElementById('workspaceMenuToggle') || document.activeElement;
  const modal = document.getElementById('guideModal');
  modal.classList.remove('hidden-panel');
  document.getElementById('guideSearch').value = '';
  if (!guideBound) {
    guideBound = true;
    document.getElementById('guideSearch').addEventListener('input', renderGuideBook);
    document.getElementById('guideContent').addEventListener('click', event => {
      const link = event.target.closest('[data-guide-chapter]');
      if (link) { event.preventDefault(); selectGuideChapter(link.dataset.guideChapter); }
    });
    modal.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...modal.querySelectorAll('button:not(:disabled),input,a[href],summary')].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement.id === 'guideContent')) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  }
  loadGuideBook(); document.getElementById('guideSearch').focus();
  document.querySelector('.guide-reading').scrollTop = 0;
}

function closeGuideBook() {
  document.getElementById('guideModal').classList.add('hidden-panel');
  guideReturnFocus?.focus();
}
