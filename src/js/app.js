import {
  parseInput,
  fisherYates,
  countSortedConsecutive,
  pickMinimalSortedConsecutive,
  remainderAfterPick,
} from './shuffle.js';
// ===== State =====
let items = [];
let shuffled = [];
let result = [];
let remaining = [];
let history = [];
try{
  const raw = localStorage.getItem('rh_history');
  history = raw ? JSON.parse(raw) : [];
  if(!Array.isArray(history)) history = [];
}catch(e){ history = []; }
let dark = localStorage.getItem('rh_theme') !== 'light';
let previewData = [];
let previewCopyMsg = '';

// ===== DOM =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const inputText = $('#inputText');
const itemCount = $('#itemCount');
const itemCountBadge = $('#itemCountBadge');
const resultCount = $('#resultCount');
const resultCountBadge = $('#resultCountBadge');
const pickCount = $('#pickCount');
const resultDisplay = $('#resultDisplay');
const remainingCount = $('#remainingCount');
const remainingCountBadge = $('#remainingCountBadge');
const remainingDisplay = $('#remainingDisplay');
const remainingBlock = $('#remainingBlock');
const resultCard = $('#resultCard');
const btnPreviewItems = $('#btnPreviewItems');
const btnCopyItems = $('#btnCopyItems');
const btnViewPool = $('#btnViewPool');
const previewModal = $('#previewModal');
const previewTitle = $('#previewTitle');
const previewCount = $('#previewCount');
const previewCountBadge = $('#previewCountBadge');
const previewDisplay = $('#previewDisplay');
const settingsModal = $('#settingsModal');
const copyModal = $('#copyModal');
const copyFallbackText = $('#copyFallbackText');
const historyList = $('#historyList');
const historyCard = $('#historyCard');
const toast = $('#toast');
const btnClear = $('#btnClear');
const btnTheme = $('#btnTheme');
const pageNav = $('#pageNav');
const navPicked = $('#navPicked');
const navRemaining = $('#navRemaining');
const btnBackTop = $('#btnBackTop');

// ===== Init =====
applyTheme();
renderHistory();
pickCount.value = localStorage.getItem('rh_pick_count') || '1';
updatePreviewBtns();
initPageNav();

// ===== Pick count =====
function savePickCount(){
  const raw = pickCount.value.trim();
  let n = parseInt(raw, 10);
  if(raw === '' || isNaN(n) || n < 1) n = 1;
  if(n > 999) n = 999;
  pickCount.value = n;
  localStorage.setItem('rh_pick_count', n);
  return n;
}

function applyPickCount({ notify = false, highlight = false } = {}){
  savePickCount();
  return pickFromShuffled({ notify, highlight });
}

function pickFromShuffled({ notify = false, highlight = false } = {}){
  if(shuffled.length === 0) return 0;
  let n = parseInt(pickCount.value, 10);
  if(isNaN(n) || n < 1) n = 1;
  if(n > shuffled.length) n = shuffled.length;
  pickCount.value = n;
  result = pickMinimalSortedConsecutive(shuffled, n);
  remaining = remainderAfterPick(shuffled, result);
  updateCountBadge(resultCountBadge, resultCount, n);
  updateCountBadge(remainingCountBadge, remainingCount, remaining.length);
  showResult(result);
  showRemaining(remaining);
  resultCard.style.display = 'block';
  updatePageNav();
  if(notify){
    triggerHaptic();
    highlightResultCard();
    requestAnimationFrame(() => resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  } else if(highlight){
    highlightResultCard();
  }
  return n;
}

function onInput(){
  const raw = inputText.value;
  items = parseInput(raw);
  updateCountBadge(itemCountBadge, itemCount, items.length);
  updateClearBtn();
  updatePreviewBtns();
  if(shuffled.length || result.length){
    shuffled = [];
    result = [];
    remaining = [];
    hidePoolBtn();
    resultCard.style.display = 'none';
    updateCountBadge(resultCountBadge, resultCount, 0);
    updateCountBadge(remainingCountBadge, remainingCount, 0);
    remainingBlock.style.display = 'none';
  }
  updatePageNav();
}
inputText.addEventListener('input', onInput);
inputText.addEventListener('keydown', e => {
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    inputText.blur();
    shuffleAndPick();
  }
});

pickCount.addEventListener('input', () => {
  pickCount.value = pickCount.value.replace(/\D/g, '');
});

function adjustPick(delta){
  let n = parseInt(pickCount.value, 10);
  if(pickCount.value.trim() === '' || isNaN(n)) n = 0;
  n = Math.max(1, Math.min(999, n + delta));
  pickCount.value = n;
}

function renderNumDisplay(el, list){
  el.textContent = list.join(' ');
}

function updateCountBadge(badge, numEl, count){
  if(!badge || !numEl) return;
  if(count <= 0){
    badge.hidden = true;
    numEl.textContent = '0';
    return;
  }
  badge.hidden = false;
  numEl.textContent = count;
}

function showResult(selected){
  resultDisplay.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'num-display num-display--result';
  renderNumDisplay(div, selected);
  resultDisplay.appendChild(div);
}

function showRemaining(list){
  if(!list.length){
    remainingBlock.style.display = 'none';
    remainingDisplay.innerHTML = '';
    updatePageNav();
    return;
  }
  remainingBlock.style.display = 'block';
  remainingDisplay.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'num-display num-display--remaining';
  renderNumDisplay(div, list);
  remainingDisplay.appendChild(div);
  updatePageNav();
}

function highlightResultCard(){
  resultCard.classList.remove('result-area--breathing');
  void resultCard.offsetWidth;
  resultCard.classList.add('result-area--breathing');
  resultCard.addEventListener('animationend', () => {
    resultCard.classList.remove('result-area--breathing');
  }, { once: true });
}

// ===== Main: Shuffle + Pick in one =====
function shuffleAndPick(){
  if(items.length === 0){
    showToast('请先输入号码');
    inputText.style.animation = 'none';
    inputText.offsetHeight;
    inputText.style.animation = 'shake .4s var(--ease)';
    return;
  }
  shuffled = fisherYates([...items]);
  showPool();
  pickFromShuffled({ notify: true });
  updateClearBtn();
}

function showPool(){
  btnViewPool.style.display = 'block';
}

function hidePoolBtn(){
  btnViewPool.style.display = 'none';
  closePreview();
}

function openPreview(title, list, { copyMsg = '', variant = 'list' } = {}){
  if(!list.length){
    showToast('暂无数据可预览');
    return;
  }
  previewData = list;
  previewCopyMsg = copyMsg || `✓ 已复制 ${list.length} 个号码`;
  previewTitle.textContent = title;
  updateCountBadge(previewCountBadge, previewCount, list.length);
  previewDisplay.className = 'num-display' + (variant !== 'list' ? ' num-display--' + variant : '');
  renderNumDisplay(previewDisplay, list);
  previewModal.classList.add('show');
  previewModal.querySelector('.preview-body').scrollTop = 0;
  updateBodyScroll();
}

function closePreview(){
  previewModal.classList.remove('show');
  updateBodyScroll();
}

function previewCopy(){
  if(!previewData.length) return;
  doCopy(previewData.join(' '), previewCopyMsg);
}

function previewItems(){
  openPreview('📋 号码池', items, { copyMsg: `✓ 已复制 ${items.length} 个号码` });
}

function previewResult(){
  openPreview('🎯 已抽号', result, { variant: 'result', copyMsg: `✓ 已复制 ${result.length} 个号码` });
}

function previewRemaining(){
  openPreview('📦 剩余号', remaining, { variant: 'remaining', copyMsg: `✓ 已复制 ${remaining.length} 个号码` });
}

function previewPool(){
  openPreview('🃏 乱序池', shuffled, { variant: 'pool', copyMsg: `✓ 已复制 ${shuffled.length} 个号码` });
}

function updatePreviewBtns(){
  const show = items.length > 0 ? 'flex' : 'none';
  if(btnPreviewItems) btnPreviewItems.style.display = show;
  if(btnCopyItems) btnCopyItems.style.display = show;
}

function openSettingsModal(){
  settingsModal.classList.add('show');
  updateBodyScroll();
}

function closeSettingsModal(){
  settingsModal.classList.remove('show');
  updateBodyScroll();
  if(shuffled.length){
    applyPickCount({ highlight: true });
    requestAnimationFrame(() => resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  } else {
    savePickCount();
  }
}

function onSettingsModalClick(e){
  if(e.target === settingsModal) closeSettingsModal();
}

function updateBodyScroll(){
  const locked = settingsModal.classList.contains('show')
    || copyModal.classList.contains('show')
    || previewModal.classList.contains('show');
  document.body.style.overflow = locked ? 'hidden' : '';
}

// ===== Clipboard =====
function isAndroid(){
  return /android/i.test(navigator.userAgent);
}

function copyResult(){
  if(result.length === 0){ showToast('没有结果可复制'); return; }
  doCopy(result.join(' '), `✓ 已复制 ${result.length} 个号码`);
}

function copyItems(){
  if(items.length === 0){ showToast('号码池为空'); return; }
  doCopy(items.join(' '), `✓ 已复制 ${items.length} 个号码`);
}

function copyRemaining(){
  if(remaining.length === 0){ showToast('没有剩余号可复制'); return; }
  doCopy(remaining.join(' '), `✓ 已复制 ${remaining.length} 个号码`);
}

function doCopy(text, okMsg){
  if(copyViaCopyEvent(text)){
    showToast(okMsg);
    return;
  }
  if(!isAndroid() && copyTextLegacy(text)){
    showToast(okMsg);
    return;
  }
  if(navigator.clipboard?.writeText && window.isSecureContext){
    navigator.clipboard.writeText(text)
      .then(() => showToast(okMsg))
      .catch(() => showCopyFallback(text));
    return;
  }
  showCopyFallback(text);
}

function copyViaCopyEvent(text){
  let copied = false;
  const handler = (e) => {
    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
    copied = true;
  };
  document.addEventListener('copy', handler);
  try{ document.execCommand('copy'); }catch(e){}
  document.removeEventListener('copy', handler);
  if(copied) return true;

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:none;outline:none;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  copied = false;
  document.addEventListener('copy', handler);
  try{ document.execCommand('copy'); }catch(e){}
  document.removeEventListener('copy', handler);
  document.body.removeChild(ta);
  return copied;
}

function copyWithClipboardApi(text){
  if(!navigator.clipboard?.writeText || !window.isSecureContext) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}

function copyTextLegacy(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:none;outline:none;opacity:0;';
  document.body.appendChild(ta);
  if(/ipad|iphone|ipod/i.test(navigator.userAgent)){
    ta.contentEditable = true;
    ta.readOnly = false;
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0, text.length);
  } else {
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
  }
  let ok = false;
  try{ ok = document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
  return ok;
}

function showCopyFallback(text){
  copyFallbackText.value = text;
  copyModal.classList.add('show');
  updateBodyScroll();
  setTimeout(() => {
    copyFallbackText.focus();
    copyFallbackText.select();
    copyFallbackText.setSelectionRange(0, text.length);
  }, 150);
  showToast('请手动复制内容');
}

function retryCopyFromModal(){
  const text = copyFallbackText.value;
  copyFallbackText.focus();
  copyFallbackText.select();
  copyFallbackText.setSelectionRange(0, text.length);
  if(copyViaCopyEvent(text)){
    closeCopyModal();
    showToast('✓ 已复制');
    return;
  }
  copyWithClipboardApi(text).then(success => {
    if(success){
      closeCopyModal();
      showToast('✓ 已复制');
    } else {
      showToast('请长按文本手动复制');
    }
  });
}

function closeCopyModal(){
  copyModal.classList.remove('show');
  updateBodyScroll();
}

function updateClearBtn(){
  btnClear.disabled = items.length === 0 && shuffled.length === 0 && result.length === 0 && remaining.length === 0;
}

function onCopyModalClick(e){
  if(e.target === copyModal) closeCopyModal();
}

// ===== History =====
function renderHistory(){
  historyList.innerHTML = '';
  if(history.length === 0){ historyCard.style.display = 'none'; return; }
  historyCard.style.display = 'block';
  history.forEach((h, i)=>{
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="h-time">${h.time}</span>
      <div class="h-nums">${h.nums.map(v => `<span>${escHtml(v)}</span>`).join('')}</div>
      <button class="h-del" data-idx="${i}" aria-label="删除">✕</button>`;
    div.querySelector('.h-del').onclick = (e) => {
      e.stopPropagation();
      history.splice(i, 1);
      localStorage.setItem('rh_history', JSON.stringify(history));
      renderHistory();
      showToast('已删除');
    };
    div.onclick = (e) => {
      if(e.target.closest('.h-del')) return;
      inputText.value = h.nums.join(' ');
      onInput();
      showToast('已载入号码');
    };
    historyList.appendChild(div);
  });
}

function clearHistory(){
  if(!history.length) return;
  history = [];
  localStorage.setItem('rh_history', JSON.stringify(history));
  renderHistory();
  showToast('记录已清空');
}

// ===== Clear =====
function clearAll(){
  if(items.length === 0 && shuffled.length === 0 && result.length === 0 && remaining.length === 0) return;
  inputText.value = '';
  items = []; shuffled = []; result = []; remaining = [];
  updateCountBadge(itemCountBadge, itemCount, 0);
  updateCountBadge(resultCountBadge, resultCount, 0);
  updateCountBadge(remainingCountBadge, remainingCount, 0);
  btnClear.disabled = true;
  resultCard.style.display = 'none';
  remainingBlock.style.display = 'none';
  hidePoolBtn();
  updatePreviewBtns();
  updatePageNav();
  showToast('已清空');
}

// ===== Page nav & back to top =====
function getScrollAnchorOffset(){
  const navVisible = pageNav && !pageNav.hidden;
  return (navVisible ? 56 + 44 : 56) + 16;
}

function scrollToAnchor(id){
  const el = document.getElementById(id);
  if(!el) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

function scrollToTop(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

function updatePageNav(){
  if(!pageNav) return;
  const hasResultArea = result.length > 0 && getComputedStyle(resultCard).display !== 'none';
  const hasPicked = hasResultArea;
  const hasRemaining = remaining.length > 0 && getComputedStyle(remainingBlock).display !== 'none';
  if(navPicked) navPicked.hidden = !hasPicked;
  if(navRemaining) navRemaining.hidden = !hasRemaining;
  pageNav.hidden = !hasResultArea;
  document.body.classList.toggle('has-page-nav', hasResultArea);
  updateActiveNav();
  updateBackTop();
}

function updateActiveNav(){
  if(!pageNav || pageNav.hidden) return;
  const offset = getScrollAnchorOffset();
  const targets = [...pageNav.querySelectorAll('.page-nav-btn:not([hidden])')]
    .map(btn => ({ btn, el: document.getElementById(btn.dataset.target) }))
    .filter(x => x.el);
  if(!targets.length) return;
  let active = targets[0];
  for(const t of targets){
    if(t.el.getBoundingClientRect().top <= offset + 24) active = t;
  }
  targets.forEach(t => t.btn.classList.toggle('is-active', t === active));
}

function updateBackTop(){
  if(!btnBackTop) return;
  btnBackTop.classList.toggle('is-visible', window.scrollY > 120);
}

function initPageNav(){
  if(!pageNav) return;
  pageNav.addEventListener('click', e => {
    const btn = e.target.closest('.page-nav-btn');
    if(!btn || btn.hidden) return;
    scrollToAnchor(btn.dataset.target);
  });
  let scrollTick = false;
  window.addEventListener('scroll', () => {
    if(scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      updateActiveNav();
      updateBackTop();
      scrollTick = false;
    });
  }, { passive: true });
  updatePageNav();
}

// ===== Theme =====
function toggleTheme(){
  dark = !dark;
  localStorage.setItem('rh_theme', dark ? 'dark' : 'light');
  applyTheme();
}
function applyTheme(){
  const root = document.documentElement;
  if(dark){
    root.style.setProperty('--bg', '#0f0f1a');
    root.style.setProperty('--surface', 'rgba(255,255,255,.06)');
    root.style.setProperty('--surface-hover', 'rgba(255,255,255,.10)');
    root.style.setProperty('--surface-active', 'rgba(255,255,255,.14)');
    root.style.setProperty('--border', 'rgba(255,255,255,.08)');
    root.style.setProperty('--text', '#e8e8f0');
    root.style.setProperty('--text2', '#9898b8');
    root.style.setProperty('--dock-bg', 'rgba(15,15,26,.92)');
    root.style.setProperty('--header-bg', 'rgba(15,15,26,.92)');
    if(btnTheme) btnTheme.textContent = '☀️ 切换浅色';
  } else {
    root.style.setProperty('--bg', '#f5f3ff');
    root.style.setProperty('--surface', 'rgba(255,255,255,.8)');
    root.style.setProperty('--surface-hover', 'rgba(255,255,255,.9)');
    root.style.setProperty('--surface-active', 'rgba(255,255,255,1)');
    root.style.setProperty('--border', 'rgba(0,0,0,.08)');
    root.style.setProperty('--text', '#1a1a2e');
    root.style.setProperty('--text2', '#6a6a8a');
    root.style.setProperty('--dock-bg', 'rgba(245,243,255,.92)');
    root.style.setProperty('--header-bg', 'rgba(245,243,255,.92)');
    if(btnTheme) btnTheme.textContent = '🌙 切换暗色';
  }
  document.querySelector('meta[name=theme-color]').content = dark ? '#0f0f1a' : '#f5f3ff';
}

// ===== Toast =====
let toastTimer;
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ===== Haptic =====
function triggerHaptic(){
  if(navigator.vibrate) navigator.vibrate(10);
}

// ===== Utils =====
function escHtml(s){
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

// ===== Keyboard shortcut =====
document.addEventListener('keydown', e => {
  if(e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if(e.key === 'Enter'){ e.preventDefault(); shuffleAndPick(); }
});
Object.assign(window, {
  openSettingsModal,
  closeSettingsModal,
  onSettingsModalClick,
  clearAll,
  previewItems,
  copyItems,
  previewPool,
  previewResult,
  previewRemaining,
  previewCopy,
  closePreview,
  copyResult,
  copyRemaining,
  clearHistory,
  shuffleAndPick,
  adjustPick,
  toggleTheme,
  onCopyModalClick,
  closeCopyModal,
  retryCopyFromModal,
  scrollToTop,
});
