// ==UserScript==
// @name         NS 热度火焰
// @namespace    http://stay.app/
// @version      1.1.0
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
    // 防止重复添加样式
    if (document.getElementById('nsx-flame-style')) return;

    const style = document.createElement('style');
    style.id = 'nsx-flame-style';
    style.textContent = `
      @keyframes nsx-flame-bounce {
        0% { transform: translateY(0) scale(1) rotate(0deg); }
        25% { transform: translateY(-3px) scale(1.15) rotate(-5deg); }
        50% { transform: translateY(-1px) scale(1.05) rotate(3deg); }
        75% { transform: translateY(-4px) scale(1.2) rotate(-3deg); }
        100% { transform: translateY(0) scale(1) rotate(0deg); }
      }
      /* 尊重用户的动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .nsx-hot-flame {
          animation: none;
        }
      }
      .nsx-hot-flame {
        display: inline-block;
        margin-left: 4px;
        font-size: 1em;
        transform: scale(0.5);
        transform-origin: left center;
        animation: nsx-flame-bounce 2s ease-in-out infinite;
        cursor: default;
        vertical-align: middle;
        will-change: transform;
      }
      .nsx-hot-flame-l2 {
        transform: scale(0.65);
        transform-origin: left center;
        animation-duration: 1.6s;
      }
      .nsx-hot-flame-l3 {
        transform: scale(0.8);
        transform-origin: left center;
        animation-duration: 1.2s;
      }
    `;
    document.head.appendChild(style);

    function addFlames() {
      // 只选择未处理的帖子，提升性能
      const posts = $$('li.post-list-item:not([data-flame-added="1"])');
      posts.forEach(post => {
        const commentSpan = post.querySelector('span.info-comments-count > span');
        const count = commentSpan ? parseInt(commentSpan.textContent) || 0 : 0;
        if (count >= 10) {
          const titleLink = post.querySelector('div.post-title > a');
          if (titleLink && !titleLink.querySelector('.nsx-hot-flame')) {
            const flame = document.createElement('span');
            const level = count >= 50 ? 3 : count >= 30 ? 2 : 1;
            flame.className = 'nsx-hot-flame' + (level > 1 ? ` nsx-hot-flame-l${level}` : '');
            flame.textContent = '🔥'.repeat(level);
            flame.title = `${count} 条评论`;
            titleLink.appendChild(flame);
          }
        }
        post.dataset.flameAdded = '1';
      });
    }

    // 静态页面只需执行一次
    addFlames();
  }

  // ========== 启动 ==========
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        requestAnimationFrame(() => {
          hotPostFlame();
          console.log('[Nodeseek 热度火焰] 功能已启动');
        });
      });
    } else {
      requestAnimationFrame(() => {
        hotPostFlame();
        console.log('[Nodeseek 热度火焰] 功能已启动');
      });
    }
  }

  init();
})();
