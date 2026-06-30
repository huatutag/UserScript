// ==UserScript==
// @name         iOS Safari 元素审查器 (Edge F12 风格)
// @namespace    https://nodeseek-pro/ios-inspector
// @version      1.0.0
// @description  在 iOS Safari 上实现类似 Edge/Chrome F12 审查元素的功能：触摸高亮、节点信息、计算样式、HTML 预览、DOM 家谱导航、一键复制，界面针对手机端优化。
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
      max-height:72vh;
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

    .${P}grip{ flex:0 0 auto; width:100%; padding:8px 0 4px; display:flex; justify-content:center; }
    .${P}grip::after{ content:''; width:38px; height:5px; border-radius:3px; background:rgba(235,235,245,.3); }

    .${P}head{
      flex:0 0 auto; padding:4px 16px 10px;
      display:flex; align-items:center; gap:8px;
      border-bottom:1px solid rgba(255,255,255,.06);
    }
    .${P}tag{
      font:600 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
      padding:3px 8px; border-radius:6px;
      background:rgba(255,119,130,.16); color:#ff7782;
    }
    .${P}title{
      font-size:13px; font-weight:600; color:#f5f5f7;
      flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    }
    .${P}iconbtn{
      flex:0 0 auto; width:32px; height:32px; border-radius:8px; border:none;
      background:rgba(255,255,255,.08); color:#e5e5ea; font-size:16px; font-weight:700;
      display:flex; align-items:center; justify-content:center;
    }
    .${P}iconbtn:active{ background:rgba(255,255,255,.16); }
    .${P}iconbtn[disabled]{ opacity:.35; }

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
    .${P}sec-sub{ font:600 11px/1 -apple-system,system-ui,sans-serif; color:#6b6b70; margin:10px 0 6px; }

    .${P}kv{
      display:grid; grid-template-columns:96px 1fr; gap:4px 10px;
      font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
    }
    .${P}k{ color:#98989f; }
    .${P}v{ color:#e5e5ea; word-break:break-all; }

    .${P}code{
      font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
      background:rgba(0,0,0,.3); border-radius:8px; padding:10px 12px;
      color:#d7d7de; white-space:pre-wrap; word-break:break-all;
      max-height:200px; overflow:auto; -webkit-overflow-scrolling:touch;
    }

    .${P}node{
      display:flex; align-items:center; gap:6px; flex-wrap:wrap;
      padding:8px 10px; background:rgba(255,255,255,.05);
      border-radius:8px; margin:4px 0;
      font:12px/1.4 ui-monospace,Menlo,monospace; color:#e5e5ea;
    }
    .${P}node:active{ background:rgba(10,132,255,.2); }
    .${P}node .${P}tag{ background:rgba(120,120,128,.2); color:#d7d7de; }
    .${P}node-id{ color:#ff7782; }
    .${P}node-cls{ color:#d2a8ff; }
    .${P}node-meta{ color:#8e8e93; margin-left:auto; font-size:11px; }

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
    .${P}btn.danger{ background:rgba(255,59,48,.16); color:#ff453a; border-color:transparent; }

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

  function truncate(s, n) { return s.length > n ? s.slice(0, n) + ' …' : s; }

  function toast(msg) {
    let t = document.querySelector('.' + P + 'toast');
    if (!t) { t = h('div', { class: P + 'toast' }); document.documentElement.appendChild(t); }
    t.textContent = msg;
    t.classList.add(P + 'show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove(P + 'show'), 1500);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) { return false; }
  }

  function nodeTypeStr(n) {
    return ({ 1: '元素 ELEMENT_NODE', 3: '文本 TEXT_NODE', 8: '注释 COMMENT_NODE', 9: '文档 DOCUMENT_NODE', 11: '文档片段 DOCUMENT_FRAGMENT_NODE' })[n] || ('#' + n);
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

  function describeVisibility(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return 'display:none (隐藏)';
    if (cs.visibility !== 'visible') return 'visibility:' + cs.visibility;
    if (parseFloat(cs.opacity) === 0) return 'opacity:0 (透明)';
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return '0 尺寸 (不可见)';
    return '可见';
  }

  function buildSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    const esc = (s) => { try { return CSS.escape(s); } catch (_) { return s; } };
    if (el.id) return '#' + esc(el.id);
    const parts = [];
    let cur = el, depth = 0;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) { parts.unshift('#' + esc(cur.id)); break; }
      if (typeof cur.className === 'string' && cur.className.trim()) {
        const cls = cur.className.trim().split(/\s+/).filter(Boolean);
        if (cls.length) part += '.' + cls.map(esc).join('.');
      }
      const parent = cur.parentElement;
      if (parent) {
        const sibs = Array.from(parent.children).filter(n => n.tagName === cur.tagName);
        if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
      }
      parts.unshift(part);
      cur = cur.parentElement;
      if (++depth > 12) break;
    }
    return parts.join(' > ');
  }

  /* ============================= 状态 ============================= */
  const state = {
    inspecting: false,
    target: null,
    fab: null, hl: null, tip: null, panel: null,
    body: null, tagChip: null, titleEl: null, upBtn: null,
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

  function pickAt(x, y) {
    if (state.hl) state.hl.box.style.display = 'none';
    let el = document.elementFromPoint(x, y);
    if (state.hl) state.hl.box.style.display = '';
    while (el && isOurUI(el)) el = el.parentElement;
    return el;
  }

  function onTouchStart(e) {
    if (!state.inspecting) return;
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
    e.preventDefault(); e.stopPropagation();
    const t = e.touches[0]; if (!t) return;
    if (Math.hypot(t.clientX - state.startX, t.clientY - state.startY) > 10) state.moved = true;
    const el = pickAt(t.clientX, t.clientY);
    highlightElement(el);
  }

  function onTouchEnd(e) {
    if (!state.inspecting) return;
    e.preventDefault(); e.stopPropagation();
    if (state.moved) return;
    const t = e.changedTouches[0];
    let el = state.startTarget;
    if (t) el = pickAt(t.clientX, t.clientY);
    if (el && el.nodeType === 1) selectElement(el);
  }

  function onClickGuard(e) {
    if (state.inspecting) { e.preventDefault(); e.stopPropagation(); }
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

  function selectParent() {
    if (!state.target) return;
    const p = state.target.parentElement;
    if (!p || p === document.documentElement) { toast('已到根元素'); return; }
    selectElement(p);
  }

  /* ============================= 面板构建 ============================= */
  const STYLE_PROPS = [
    'display', 'visibility', 'opacity', 'position', 'z-index',
    'top', 'left', 'right', 'bottom', 'float',
    'width', 'height', 'min-width', 'max-width', 'box-sizing',
    'margin', 'padding', 'border', 'border-radius',
    'color', 'background-color', 'background-image',
    'font-size', 'font-weight', 'font-family', 'line-height', 'text-align', 'text-decoration',
    'overflow', 'overflow-x', 'overflow-y',
    'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'gap',
    'transform', 'transition', 'animation', 'cursor', 'pointer-events', 'user-select', 'white-space'
  ];

  function ensurePanel() {
    if (state.panel) return state.panel;
    const body = h('div', { class: P + 'body' });
    const tagChip = h('span', { class: P + 'tag' });
    const titleEl = h('div', { class: P + 'title' });
    const upBtn = h('button', { class: P + 'iconbtn', title: '选择父元素', onclick: selectParent }, '↑');
    const closeBtn = h('button', { class: P + 'iconbtn', title: '关闭面板', onclick: () => { hidePanel(); highlightElement(null); } }, '×');
    const head = h('div', { class: P + 'head' }, [tagChip, titleEl, upBtn, closeBtn]);
    const grip = h('div', { class: P + 'grip' });

    const copySel = h('button', { class: P + 'btn', onclick: async () => {
      const s = state.target ? buildSelector(state.target) : '';
      (await copyText(s)) ? toast('选择器已复制') : toast('复制失败');
    } }, '复制选择器');
    const copyHtml = h('button', { class: P + 'btn', onclick: async () => {
      const s = state.target ? state.target.outerHTML : '';
      (await copyText(s)) ? toast('HTML 已复制') : toast('复制失败');
    } }, '复制 HTML');
    const copyAll = h('button', { class: P + 'btn primary', onclick: copyAllInfo }, '复制全部');
    const stopBtn = h('button', { class: P + 'btn danger', onclick: () => { stopInspecting(); hidePanel(); } }, '退出检查');
    const acts = h('div', { class: P + 'acts' }, [copySel, copyHtml, copyAll, stopBtn]);

    const panel = h('div', { class: P + 'panel' }, [grip, head, body, acts]);
    document.documentElement.appendChild(panel);

    state.panel = panel;
    state.body = body;
    state.tagChip = tagChip;
    state.titleEl = titleEl;
    state.upBtn = upBtn;
    return panel;
  }

  function showPanel() { ensurePanel(); requestAnimationFrame(() => state.panel.classList.add(P + 'show')); }
  function hidePanel() { if (state.panel) state.panel.classList.remove(P + 'show'); }

  /* ---------- 面板内容片段 ---------- */
  function section(title, content) {
    return h('div', { class: P + 'sec' }, [h('div', { class: P + 'sec-h', text: title }), content]);
  }

  function kv(pairs) {
    const items = [];
    pairs.forEach(([k, v]) => {
      items.push(h('div', { class: P + 'k', text: k }));
      items.push(h('div', { class: P + 'v', text: String(v) }));
    });
    return h('div', { class: P + 'kv' }, items);
  }

  function codeBox(text) {
    const box = h('div', { class: P + 'code' });
    box.textContent = text;
    return box;
  }

  function attrsBox(tagName, attrs) {
    const lines = ['<' + tagName];
    attrs.forEach(([n, v]) => { lines.push('  ' + n + (v !== '' ? '="' + v + '"' : '')); });
    lines.push('>');
    return codeBox(lines.join('\n'));
  }

  function computedBox(el) {
    const cs = getComputedStyle(el);
    const pairs = [];
    STYLE_PROPS.forEach(p => {
      const v = cs.getPropertyValue(p);
      if (v !== '' && v !== 'auto' && v !== 'normal' && v !== 'none' && v !== '0s') pairs.push([p, v]);
      else if (v !== '' && (p === 'display' || p === 'position' || p === 'overflow' || p === 'box-sizing' || p === 'text-align')) pairs.push([p, v]);
    });
    if (!pairs.length) return h('div', { class: P + 'v', text: '（无）' });
    return kv(pairs);
  }

  function nodeRow(node, onclick) {
    const tag = h('span', { class: P + 'tag', text: node.tagName.toLowerCase() });
    const row = h('div', { class: P + 'node', onclick }, [tag]);
    if (node.id) row.appendChild(h('span', { class: P + 'node-id', text: '#' + node.id }));
    if (typeof node.className === 'string' && node.className.trim()) {
      node.className.trim().split(/\s+/).slice(0, 3).forEach(c => {
        if (c) row.appendChild(h('span', { class: P + 'node-cls', text: '.' + c }));
      });
    }
    const r = node.getBoundingClientRect();
    row.appendChild(h('span', { class: P + 'node-meta', text: Math.round(r.width) + '×' + Math.round(r.height) }));
    return row;
  }

  function familyBox(el) {
    const wrap = h('div', { class: P + 'sec' });
    wrap.appendChild(h('div', { class: P + 'sec-h', text: 'DOM 家谱' }));

    const parent = el.parentElement;
    if (parent && parent !== document.documentElement) {
      wrap.appendChild(h('div', { class: P + 'sec-sub', text: '父节点（点击切换）' }));
      wrap.appendChild(nodeRow(parent, () => selectElement(parent)));
    } else {
      wrap.appendChild(h('div', { class: P + 'sec-sub', text: '父节点：无（已是根）' }));
    }

    const kids = Array.from(el.children);
    const show = kids.slice(0, 5);
    wrap.appendChild(h('div', { class: P + 'sec-sub', text: '子元素（' + kids.length + (kids.length > 5 ? '，显示前 5' : '') + '）' }));
    if (show.length) show.forEach(k => wrap.appendChild(nodeRow(k, () => selectElement(k))));
    else wrap.appendChild(h('div', { class: P + 'v', text: '（无子元素）' }));

    if (parent) {
      const sibs = Array.from(parent.children).filter(n => n !== el);
      wrap.appendChild(h('div', { class: P + 'sec-sub', text: '兄弟元素：' + sibs.length + ' 个' }));
    }
    return wrap;
  }

  function renderPanel(el) {
    ensurePanel();
    const body = state.body;
    body.innerHTML = '';
    if (!el || el.nodeType !== 1) return;

    state.tagChip.textContent = el.tagName.toLowerCase();
    state.titleEl.textContent = buildSelector(el);
    state.upBtn.disabled = (!el.parentElement || el.parentElement === document.documentElement);

    const r = el.getBoundingClientRect();

    body.appendChild(section('概要', kv([
      ['选择器', buildSelector(el)],
      ['节点类型', nodeTypeStr(el.nodeType)],
      ['可见性', describeVisibility(el)],
      ['inner文本', truncate((el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(), 60) || '（空）'],
    ])));

    body.appendChild(section('尺寸与位置', kv([
      ['offset', (el.offsetWidth || 0) + ' × ' + (el.offsetHeight || 0) + ' px'],
      ['client', (el.clientWidth || 0) + ' × ' + (el.clientHeight || 0) + ' px'],
      ['scroll', (el.scrollWidth || 0) + ' × ' + (el.scrollHeight || 0) + ' px'],
      ['scrollTop/L', (el.scrollTop || 0) + ' / ' + (el.scrollLeft || 0)],
      ['x / y', r.x.toFixed(1) + ' / ' + r.y.toFixed(1)],
      ['width / height', r.width.toFixed(1) + ' / ' + r.height.toFixed(1)],
      ['top / left', r.top.toFixed(1) + ' / ' + r.left.toFixed(1)],
      ['right / bottom', r.right.toFixed(1) + ' / ' + r.bottom.toFixed(1)],
    ])));

    const attrs = [];
    for (const a of el.attributes) attrs.push([a.name, a.value]);
    if (attrs.length) body.appendChild(section('属性（' + attrs.length + '）', attrsBox(el.tagName.toLowerCase(), attrs)));

    body.appendChild(section('计算样式', computedBox(el)));

    body.appendChild(section('outerHTML（截断 800 字符）', codeBox(truncate(el.outerHTML, 800))));

    body.appendChild(familyBox(el));
  }

  function copyAllInfo() {
    if (!state.target) return;
    const el = state.target;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const L = [];
    L.push('=== iOS Safari 元素审查信息 ===');
    L.push('时间: ' + new Date().toLocaleString());
    L.push('URL: ' + location.href);
    L.push('选择器: ' + buildSelector(el));
    L.push('标签: ' + el.tagName.toLowerCase());
    L.push('节点类型: ' + nodeTypeStr(el.nodeType));
    L.push('可见性: ' + describeVisibility(el));
    L.push('');
    L.push('--- 尺寸与位置 ---');
    L.push('offset: ' + el.offsetWidth + ' x ' + el.offsetHeight);
    L.push('client: ' + el.clientWidth + ' x ' + el.clientHeight);
    L.push('scroll: ' + el.scrollWidth + ' x ' + el.scrollHeight + ' (scrollTop=' + el.scrollTop + ', scrollLeft=' + el.scrollLeft + ')');
    L.push('rect: x=' + r.x.toFixed(1) + ' y=' + r.y.toFixed(1) + ' w=' + r.width.toFixed(1) + ' h=' + r.height.toFixed(1));
    L.push('rect: top=' + r.top.toFixed(1) + ' right=' + r.right.toFixed(1) + ' bottom=' + r.bottom.toFixed(1) + ' left=' + r.left.toFixed(1));
    L.push('');
    L.push('--- 属性 ---');
    for (const a of el.attributes) L.push(a.name + '="' + a.value + '"');
    L.push('');
    L.push('--- 计算样式 ---');
    STYLE_PROPS.forEach(p => { const v = cs.getPropertyValue(p); if (v !== '') L.push(p + ': ' + v + ';'); });
    L.push('');
    L.push('--- outerHTML ---');
    L.push(el.outerHTML);
    L.push('');
    L.push('--- 家谱 ---');
    if (el.parentElement && el.parentElement !== document.documentElement) L.push('父: ' + describe(el.parentElement));
    L.push('子元素数: ' + el.children.length);
    copyText(L.join('\n')).then(ok => ok ? toast('完整信息已复制') : toast('复制失败'));
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
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });

})();
