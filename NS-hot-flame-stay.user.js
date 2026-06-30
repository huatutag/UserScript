// ==UserScript==
// @name         NS 热度火焰
// @namespace    http://stay.app/
// @version      1.0.0
// @description  Nodeseek 帖子热度火焰指示器 - Stay for Safari iOS 版
// @author       You
// @match        https://www.nodeseek.com/*
// @icon         https://www.nodeseek.com/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[Nodeseek 热度火焰] 脚本已加载');

  // ========== 工具函数 ==========
  const $ = (s, r = document) => r?.querySelector(s);
  const $$ = (s, r = document) => [...(r?.querySelectorAll(s) || [])];

  // ========== 帖子热度火焰指示器 ==========
  function hotPostFlame() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes nsx-flame-bounce {
        0% { transform: translateY(0) scale(1) rotate(0deg); }
        25% { transform: translateY(-3px) scale(1.15) rotate(-5deg); }
        50% { transform: translateY(-1px) scale(1.05) rotate(3deg); }
        75% { transform: translateY(-4px) scale(1.2) rotate(-3deg); }
        100% { transform: translateY(0) scale(1) rotate(0deg); }
      }
      @keyframes nsx-flame-glow {
        0%, 100% { text-shadow: 0 0 4px #ff4500, 0 0 8px #ff6347, 0 0 12px #ff8c00; }
        50% { text-shadow: 0 0 8px #ff4500, 0 0 16px #ff6347, 0 0 24px #ff8c00, 0 0 32px #ffd700; }
      }
      @keyframes nsx-flame-flicker {
        0%, 100% { opacity: 1; filter: brightness(1); }
        10% { opacity: 0.85; filter: brightness(1.3); }
        20% { opacity: 1; filter: brightness(1); }
        30% { opacity: 0.9; filter: brightness(1.2); }
        40% { opacity: 1; filter: brightness(0.9); }
        50% { opacity: 0.95; filter: brightness(1.4); }
        60% { opacity: 1; filter: brightness(1); }
        70% { opacity: 0.88; filter: brightness(1.1); }
        80% { opacity: 1; filter: brightness(1.3); }
        90% { opacity: 0.92; filter: brightness(1); }
      }
      .nsx-hot-flame {
        display: inline-block;
        margin-left: 4px;
        font-size: 1em;
        transform: scale(0.7);
        transform-origin: left center;
        animation: nsx-flame-bounce 2.4s ease-in-out infinite, nsx-flame-glow 3s ease-in-out infinite, nsx-flame-flicker 1.6s ease-in-out infinite;
        cursor: default;
        vertical-align: middle;
      }
      .nsx-hot-flame-l2 {
        transform: scale(0.85);
        transform-origin: left center;
        animation-duration: 1.8s, 2.4s, 1.2s;
      }
      .nsx-hot-flame-l3 {
        transform: scale(1);
        transform-origin: left center;
        animation-duration: 1.4s, 2s, 1s;
      }
    `;
    document.head.appendChild(style);

    function addFlames() {
      const posts = $$('li.post-list-item');
      posts.forEach(post => {
        if (post.dataset.flameAdded) return;
        const commentSpan = post.querySelector('span.info-comments-count > span');
        const count = commentSpan ? parseInt(commentSpan.textContent) || 0 : 0;
        if (count >= 10) {
          const titleLink = post.querySelector('div.post-title > a');
          if (titleLink && !titleLink.querySelector('.nsx-hot-flame')) {
            const flame = document.createElement('span');
            const level = count >= 50 ? 3 : count >= 30 ? 2 : 1;
            flame.className = 'nsx-hot-flame' + (level > 1 ? ` nsx-hot-flame-l${level}` : '');
            flame.textContent = '🔥'.repeat(level);
            titleLink.appendChild(flame);
          }
        }
        post.dataset.flameAdded = '1';
      });
    }

    setInterval(addFlames, 3000);
    addFlames();
  }

  // ========== 启动 ==========
  function init() {
    hotPostFlame();
    console.log('[Nodeseek 热度火焰] 功能已启动');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
