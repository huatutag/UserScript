// ==UserScript==
// @name         iOS Safari 元素审查器 (Edge F12 风格)
// @namespace    https://nodeseek-pro/ios-inspector
// @version      1.1.0
// @description  在 iOS Safari 上实现类似 Edge/Chrome F12 审查元素的功能：触摸高亮选中元素、展示 outerHTML、拖动调整面板高度、一键复制，界面针对手机端优化。
// @author       You
// @match        *://*/*
// @exclude      *://*.google.com/maps*
// @grant        none
// @run-at       document-idle
// @noframes
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='7' height='7'/%3E%3Crect x='14' y='3' width='7' height='7'/%3E%3Crect x='3' y='14' width='7' height='7'/%3E%3Cpath d='M17.5 14.5l3 3-3 3'/%3E%3Cpath d='M14 17.5h6.5'/%3E%3C/svg%3E
// ==/UserScript==

(function () {
  'use strict';

  /*  防止重复注入  */
  if (window.__iosEdgeInspector) return;
  window.__iosEdgeInspector = true;

  const P = '__ie__'; // 样式前缀，避免与页面冲突

  /* ============================= 样式 ============================= */
  const cssText = `
    .${P}fab{
      position:fixed; z-index:2147483647;
      right:16px; bottom:calc(16px + env(safe-area-inset-bottom,0px));
      width:52px; height:52px; border-radius:50%;
      background:linear-gradient(135deg,#0a84ff,#0058d0);
      box-shadow:0 6px 18px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08) inset;
      display:flex; align-items:center; justify-content:center; color:#fff;
      touch-action:none; user-select:none; -webkit-user-select:none; cursor:pointer;
      transition:transform .15s ease, background .2s ease;
      font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
    }
    .${P}fab:active{ transform:scale(.92); }
    .${P}fab.${P}active{ background:linear-gradient(135deg,#ff3b30,#c5180f); }
    .${P}fab svg{ width:24px; height:24px; pointer-events:none; }

    .${P}hl{
      position:fixed; z-index:2147483646; pointer-events:none;
      border:2px solid #0a84ff; background:rgba(10,132,255,.18);
      border-radius:2px; transition:all .06s ease-out;
    }
    .${P}hl-badge{
      position:absolute; top:-22px; left:-2px;
      background:#0a84ff; color:#fff;
      font:600 11px/1.4 -apple-system,system-ui,sans-serif;
      padding:2px 6px; border-radius:4px; white-space:nowrap;
      max-width:240px; overflow:hidden; text-overflow:ellipsis;
    }

    .${P}tip{
      position:fixed; top:calc(8px + env(safe-area-inset-top,0px));
      left:50%; transform:translateX(-50%);
      background:rgba(20,20,22,.92); color:#e5e5ea;
      font:600 13px/1 -apple-system,system-ui,sans-serif;
      padding:10px 16px; border-radius:999px;
      box-shadow:0 4px 14px rgba(0,0,0,.4);
      z-index:2147483645; pointer-events:none;
      backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
      white-space:nowrap; max-width:90vw; overflow:hidden; text-overflow:ellipsis;
    }

    .${P}panel{
      position:fixed; left:0; right:0; bottom:0; z-index:2147483646;
      max-height:55vh;
      background:rgba(28,28,30,.96);
      backdrop-filter:blur(20px) saturate(180%);
      -webkit-backdrop-filter:blur(20px) saturate(180%);
      border-top:1px solid rgba(255,255,255,.08);
      border-radius:16px 16px 0 0;
      box-shadow:0 -10px 40px rgba(0,0,0,.5);
      color:#e5e5ea;
      font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
      display:flex; flex-direction:column;
      transform:translateY(110%);
      transition:transform .28s cubic-bezier(.32,.72,0,1);
      padding-bottom:env(safe-area-inset-bottom,0px);
    }
    .${P}panel.${P}show{ transform:translateY(0); }

    .${P}grip{ flex:0 0 auto; width:100%; padding:10px 0 6px; display:flex; justify-content:center; touch-action:none; cursor:ns-resize; }
    .${P}grip::after{ content:''; width:42px; height:5px; border-radius:3px; background:rgba(235,235,245,.35); }

    .${P}body{
      overflow-y:auto; -webkit-overflow-scrolling:touch;
      padding:6px 16px 16px; flex:1 1 auto;
    }
    .${P}sec{ margin:12px 0; }
    .${P}sec-h{
      font:600 11px/1 -apple-system,system-ui,sans-serif;
      color:#8e8e93; text-transform:uppercase; letter-spacing:.06em;
      margin:0 0 8px;
    }

    .${P}code{
      font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
      background:rgba(0,0,0,.3); border-radius:8px; padding:10px 12px;
      color:#d7d7de; white-space:pre-wrap; word-break:break-all;
      max-height:200px; overflow:auto; -webkit-overflow-scrolling:touch;
    }

    .${P}acts{
      display:flex; gap:8px; flex-wrap:wrap;
      padding:12px 16px 4px;
      border-top:1px solid rgba(255,255,255,.06);
      flex:0 0 auto;
    }
    .${P}btn{
      flex:1 1 auto; min-width:88px;
      padding:11px 12px; border-radius:10px;
      border:1px solid rgba(255,255,255,.1);
      background:rgba(255,255,255,.06); color:#e5e5ea;
      font:600 13px/1 -apple-system,system-ui,sans-serif;
      display:flex; align-items:center; justify-content:center; gap:6px;
    }
    .${P}btn:active{ background:rgba(255,255,255,.12); }
    .${P}btn.primary{ background:#0a84ff; border-color:transparent; color:#fff; }

    .${P}toast{
      position:fixed; left:50%; top:50%;
      transform:translate(-50%,-50%) scale(.9);
      background:rgba(20,20,22,.95); color:#fff;
      padding:12px 20px; border-radius:12px;
      font:600 14px/1.3 -apple-system,system-ui,sans-serif;
      z-index:2147483647; opacity:0; pointer-events:none;
      transition:opacity .2s, transform .2s;
      box-shadow:0 8px 30px rgba(0,0,0,.5);
      max-width:80vw; text-align:center;
    }
    .${P}toast.${P}show{ opacity:1; transform:translate(-50%,-50%) scale(1); }
  `;

  const styleEl = document.createElement('style');
  styleEl.id = P + 'style';
  styleEl.textContent = cssText;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ============================= 工具函数 ============================= */
  const SVGNS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs, children) {
    const e = document.createElementNS(SVGNS, name);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (children) children.forEach(c => e.appendChild(c));
    return e;
  }

  function h(tag, props, children) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null) continue;
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    if (children != null) (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return e;
  }

  function toast(msg) {
    let t = document.querySelector('.' + P + 'toast');
    if (!t) { t = h('div', { class: P + 'toast' }); document.documentElement.appendChild(t); }
    t.textContent = msg;
    t.classList.add(P + 'show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove(P + 'show'), 1500);
  }

  /* iOS Safari 同步复制：textarea 必须保持可编辑状态，否则 execCommand 返回 true 但不实际复制 */
  function copyTextSync(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;font-size:16px;border:none;padding:0;';
    document.body.appendChild(ta);

    ta.contentEditable = 'true';
    ta.readOnly = false;

    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0, text.length);

    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }

    sel.removeAllRanges();
    document.body.removeChild(ta);
    return ok;
  }

  function describe(el) {
    if (!el || el.nodeType !== 1) return '';
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (typeof el.className === 'string' && el.className.trim()) {
      const cls = el.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (cls) s += '.' + cls;
    }
    return s;
  }

  /* ============================= 状态 ============================= */
  const state = {
    inspecting: false,
    target: null,
    fab: null, hl: null, tip: null, panel: null, body: null,
    moved: false, startX: 0, startY: 0, startTarget: null,
  };

  /* ============================= 高亮 ============================= */
  function createHighlight() {
    const badge = h('div', { class: P + 'hl-badge' });
    const box = h('div', { class: P + 'hl' }, [badge]);
    box.style.display = 'none';
    document.documentElement.appendChild(box);
    return { box, badge };
  }

  function highlightElement(el) {
    const { box, badge } = state.hl;
    if (!el || el.nodeType !== 1) { box.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.style.top = r.top + 'px';
    box.style.left = r.left + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';
    badge.textContent = describe(el);
  }

  /* ============================= 拾取 ============================= */
  function isOurUI(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      if (n === state.fab || n === (state.hl && state.hl.box) || n === state.panel || n === state.tip) return true;
      const cls = n.className;
      if (typeof cls === 'string' && cls.indexOf(P) >= 0) return true;
      n = n.parentElement;
    }
    return false;
  }

  function isPanelOrFab(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      if (n === state.panel || n === state.fab) return true;
      n = n.parentElement;
    }
    return false;
  }

  function pickAt(x, y) {
    if (state.hl) state.hl.box.style.display = 'none';
    let el = document.elementFromPoint(x, y);
    if (state.hl) state.hl.box.style.display = '';
    while (el && isOurUI(el)) el = el.parentElement;
    return el;
  }

  function onTouchStart(e) {
    if (!state.inspecting) return;
    if (isPanelOrFab(e.target)) return; /* 放行面板/按钮内触摸，保证 click 能触发 */
    e.preventDefault(); e.stopPropagation();
    const t = e.touches[0]; if (!t) return;
    state.moved = false;
    state.startX = t.clientX; state.startY = t.clientY;
    const el = pickAt(t.clientX, t.clientY);
    state.startTarget = el;
    highlightElement(el);
  }

  function onTouchMove(e) {
    if (!state.inspecting) return;
    if (isPanelOrFab(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    const t = e.touches[0]; if (!t) return;
    if (Math.hypot(t.clientX - state.startX, t.clientY - state.startY) > 10) state.moved = true;
    const el = pickAt(t.clientX, t.clientY);
    highlightElement(el);
  }

  function onTouchEnd(e) {
    if (!state.inspecting) return;
    if (isPanelOrFab(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    if (state.moved) return;
    const t = e.changedTouches[0];
    let el = state.startTarget;
    if (t) el = pickAt(t.clientX, t.clientY);
    if (el && el.nodeType === 1) selectElement(el);
  }

  function onClickGuard(e) {
    if (!state.inspecting) return;
    if (isPanelOrFab(e.target)) return; /* 放行面板内点击 */
    e.preventDefault(); e.stopPropagation();
  }

  /* ============================= 检查模式开关 ============================= */
  function startInspecting() {
    if (state.inspecting) return;
    state.inspecting = true;
    state.fab.classList.add(P + 'active');
    state.tip = h('div', { class: P + 'tip', text: '检查模式：触摸页面任意元素查看节点信息' });
    document.documentElement.appendChild(state.tip);

    document.addEventListener('touchstart', onTouchStart, { capture: true, passive: false });
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    document.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
    document.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: false });
    document.addEventListener('click', onClickGuard, true);
    document.addEventListener('dblclick', onClickGuard, true);
    toast('已开启元素检查');
  }

  function stopInspecting() {
    if (!state.inspecting) return;
    state.inspecting = false;
    state.fab.classList.remove(P + 'active');
    if (state.tip) { state.tip.remove(); state.tip = null; }

    document.removeEventListener('touchstart', onTouchStart, { capture: true });
    document.removeEventListener('touchmove', onTouchMove, { capture: true });
    document.removeEventListener('touchend', onTouchEnd, { capture: true });
    document.removeEventListener('touchcancel', onTouchEnd, { capture: true });
    document.removeEventListener('click', onClickGuard, true);
    document.removeEventListener('dblclick', onClickGuard, true);
    highlightElement(null);
  }

  function toggleInspect() {
    if (state.inspecting) { stopInspecting(); hidePanel(); }
    else { startInspecting(); }
  }

  /* ============================= 选中元素 ============================= */
  function selectElement(el) {
    state.target = el;
    highlightElement(el);
    renderPanel(el);
    showPanel();
  }

  /* ============================= 面板构建 ============================= */
  function ensurePanel() {
    if (state.panel) return state.panel;
    const body = h('div', { class: P + 'body' });
    const grip = h('div', { class: P + 'grip' });

    const copyBtn = h('button', { class: P + 'btn primary', onclick: () => {
      const s = state.target ? state.target.outerHTML : '';
      let done = false;
      /* 优先同步调用 Clipboard API（保持在用户手势上下文） */
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(s).then(
          () => toast('outerHTML 已复制'),
          () => { copyTextSync(s) ? toast('outerHTML 已复制') : toast('复制失败'); }
        );
        done = true;
      }
      if (!done) {
        copyTextSync(s) ? toast('outerHTML 已复制') : toast('复制失败');
      }
    } }, '复制 outerHTML');
    const acts = h('div', { class: P + 'acts' }, [copyBtn]);

    const panel = h('div', { class: P + 'panel' }, [grip, body, acts]);
    document.documentElement.appendChild(panel);

    state.panel = panel;
    state.body = body;

    /* grip 拖动调整面板高度 */
    let dragging = false, startY = 0, startH = 0;
    grip.addEventListener('pointerdown', (e) => {
      dragging = true;
      startY = e.clientY;
      startH = panel.getBoundingClientRect().height;
      try { grip.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    grip.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      let h = startH - dy;
      const maxH = window.innerHeight * 0.85;
      const minH = 120;
      h = Math.max(minH, Math.min(maxH, h));
      panel.style.height = h + 'px';
      panel.style.maxHeight = 'none';
      e.preventDefault();
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      try { grip.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    grip.addEventListener('pointerup', endDrag);
    grip.addEventListener('pointercancel', endDrag);

    return panel;
  }

  function showPanel() { ensurePanel(); requestAnimationFrame(() => state.panel.classList.add(P + 'show')); }
  function hidePanel() { if (state.panel) state.panel.classList.remove(P + 'show'); }

  /* ---------- 面板内容片段 ---------- */
  function section(title, content) {
    return h('div', { class: P + 'sec' }, [h('div', { class: P + 'sec-h', text: title }), content]);
  }

  function codeBox(text) {
    const box = h('div', { class: P + 'code' });
    box.textContent = text;
    return box;
  }

  function renderPanel(el) {
    ensurePanel();
    const body = state.body;
    body.innerHTML = '';
    if (!el || el.nodeType !== 1) return;
    body.appendChild(section('outerHTML', codeBox(el.outerHTML)));
  }

  /* ============================= 悬浮按钮 + 拖动 ============================= */
  function createFab() {
    const ic = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      svgEl('rect', { x: '3', y: '3', width: '7', height: '7', rx: '1' }),
      svgEl('rect', { x: '14', y: '3', width: '7', height: '7', rx: '1' }),
      svgEl('rect', { x: '3', y: '14', width: '7', height: '7', rx: '1' }),
      svgEl('path', { d: 'M17.5 14.5l3 3-3 3' }),
      svgEl('path', { d: 'M14 17.5h6.5' }),
    ]);
    const fab = h('div', { class: P + 'fab', title: '元素审查 (Edge F12)' }, [ic]);
    document.documentElement.appendChild(fab);

    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;

    fab.addEventListener('pointerdown', (e) => {
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      const rect = fab.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      try { fab.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });

    fab.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 6) moved = true;
      if (moved) {
        let x = e.clientX - ox;
        let y = e.clientY - oy;
        const w = fab.offsetWidth, h = fab.offsetHeight;
        x = Math.max(4, Math.min(window.innerWidth - w - 4, x));
        y = Math.max(4, Math.min(window.innerHeight - h - 4, y));
        fab.style.left = x + 'px';
        fab.style.top = y + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
      }
    });

    function end(e) {
      if (!dragging) return;
      dragging = false;
      try { fab.releasePointerCapture(e.pointerId); } catch (_) {}
      if (!moved) toggleInspect();
    }
    fab.addEventListener('pointerup', end);
    fab.addEventListener('pointercancel', end);

    return fab;
  }

  /* ============================= 启动 ============================= */
  function init() {
    state.fab = createFab();
    state.hl = createHighlight();

    /* 窗口尺寸变化（旋转/缩放）时约束面板高度，防止拖动后溢出视窗 */
    window.addEventListener('resize', () => {
      if (!state.panel) return;
      const maxH = window.innerHeight * 0.85;
      const cur = state.panel.getBoundingClientRect().height;
      if (cur > maxH) {
        state.panel.style.height = maxH + 'px';
      }
    });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });

})();
