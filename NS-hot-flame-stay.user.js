// ==UserScript==
// @name         NS 热度火焰
// @namespace    http://stay.app/
// @version      1.3.0
// @description  Nodeseek 帖子热度火焰指示器 + 提醒图标闪烁效果
// @author       You
// @match        https://www.nodeseek.com/*
// @icon         https://www.nodeseek.com/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ========== 帖子热度火焰指示器 ==========
  function hotPostFlame() {
    // 防止重复添加样式
    if (document.getElementById('nsx-flame-style')) return;

    const style = document.createElement('style');
    style.id = 'nsx-flame-style';
    style.textContent = `
      @keyframes nsx-flame-bounce {
        0% { transform: translateY(0) scale(var(--flame-scale, 0.5)) rotate(0deg); }
        25% { transform: translateY(-3px) scale(calc(var(--flame-scale, 0.5) * 1.15)) rotate(-5deg); }
        50% { transform: translateY(-1px) scale(calc(var(--flame-scale, 0.5) * 1.05)) rotate(3deg); }
        75% { transform: translateY(-4px) scale(calc(var(--flame-scale, 0.5) * 1.2)) rotate(-3deg); }
        100% { transform: translateY(0) scale(var(--flame-scale, 0.5)) rotate(0deg); }
      }
      /* 尊重用户的动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .nsx-hot-flame {
          animation: none;
        }
      }
      .nsx-hot-flame {
        --flame-scale: 1.0;
        display: inline-block;
        margin-left: 4px;
        font-size: 1em;
        transform: scale(var(--flame-scale));
        transform-origin: left center;
        animation: nsx-flame-bounce 2s ease-in-out infinite;
        cursor: default;
        vertical-align: middle;
        will-change: transform;
      }
      .nsx-hot-flame-l2 {
        animation-duration: 1.6s;
      }
      .nsx-hot-flame-l3 {
        animation-duration: 1.2s;
      }

      /* 提醒图标闪烁动画 - 更明显的效果 */
      @keyframes nsx-remind-blink {
        0%, 100% {
          opacity: 1;
          filter: brightness(1) drop-shadow(0 0 0 transparent);
          transform: scale(1);
        }
        25% {
          opacity: 0.8;
          filter: brightness(1.3) drop-shadow(0 0 3px rgba(243, 17, 17, 0.7));
          transform: scale(1.05);
        }
        50% {
          opacity: 0.9;
          filter: brightness(1.6) drop-shadow(0 0 6px rgba(243, 17, 17, 0.9));
          transform: scale(1.1);
        }
        75% {
          opacity: 0.8;
          filter: brightness(1.3) drop-shadow(0 0 3px rgba(243, 17, 17, 0.7));
          transform: scale(1.05);
        }
      }

      .nsx-remind-blink {
        animation: nsx-remind-blink 1.2s ease-in-out infinite;
        will-change: opacity, filter, transform;
        transform-origin: center center;
      }

      /* 尊重用户的动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .nsx-remind-blink {
          animation: none;
        }
      }
    `;
    document.head.appendChild(style);

    // 用于暂停不可见火焰动画的 IntersectionObserver
    const flameObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
      });
    }, { threshold: 0 });

    function addFlames() {
      // 只选择未处理的帖子，提升性能
      const posts = document.querySelectorAll('li.post-list-item:not([data-flame-added="1"])');
      posts.forEach(post => {
        try {
          const commentSpan = post.querySelector('span.info-comments-count > span');
          const count = commentSpan ? parseInt(commentSpan.textContent) || 0 : 0;
          if (count >= 10) {
            const titleLink = post.querySelector('div.post-title > a');
            if (titleLink && !titleLink.querySelector('.nsx-hot-flame')) {
              const flame = document.createElement('span');
              const level = count >= 30 ? 3 : count >= 20 ? 2 : 1;
              flame.className = 'nsx-hot-flame' + (level > 1 ? ` nsx-hot-flame-l${level}` : '');
              flame.textContent = '🔥'.repeat(level);
              flame.title = `${count} 条评论`;
              titleLink.appendChild(flame);

              // 立即观察新创建的火焰
              flameObserver.observe(flame);
            }
          }
        } catch (e) {
          // 静默处理错误
        }
        post.dataset.flameAdded = '1';
      });
    }

    // 静态页面只需执行一次
    addFlames();

    // 处理提醒图标的闪烁效果
    addRemindBlink();
  }

  // ========== 提醒图标闪烁效果 ==========
  function addRemindBlink() {
    // 防止重复添加 - 使用标记属性
    if (document.body.dataset.nsxRemindProcessed) return;
    document.body.dataset.nsxRemindProcessed = '1';

    // 查找所有 .iconpark-icon 元素
    const icons = document.querySelectorAll('.iconpark-icon');

    icons.forEach(icon => {
      try {
        const computedStyle = window.getComputedStyle(icon);
        const color = computedStyle.color;

        // 检查颜色是否为 rgb(243, 17, 17) 或类似红色
        if (color === 'rgb(243, 17, 17)' || color === 'rgb(255, 0, 0)' || icon.style.color === 'rgb(243, 17, 17)') {
          // 避免重复添加动画
          if (!icon.classList.contains('nsx-remind-blink')) {
            icon.classList.add('nsx-remind-blink');

            // 使用 IntersectionObserver 暂停不可见元素的动画
            flameObserver.observe(icon);
          }
        }
      } catch (e) {
        // 静默处理错误
      }
    });
  }

  // ========== 启动 ==========
  function init() {
    const run = () => {
      hotPostFlame();
      console.log('[Nodeseek 热度火焰] 功能已启动');
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(run));
    } else {
      requestAnimationFrame(run);
    }
  }

  init();
})();
