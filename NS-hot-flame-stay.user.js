// ==UserScript==
// @name         NS 热度火焰
// @namespace    http://stay.app/
// @version      1.3.5
// @description  Nodeseek 帖子热度火焰指示器 + 提醒图标闪烁效果
// @author       You
// @match        https://www.nodeseek.com/*
// @icon         https://www.nodeseek.com/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ========== 将 Observer 提升到外部作用域 ==========
  let flameObserver = null;

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

      /* 提醒图标闪烁动画 */
      @keyframes nsx-remind-blink {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.6;
          transform: scale(1.15);
        }
      }

      .nsx-remind-blink {
        animation: nsx-remind-blink 1.2s ease-in-out infinite;
        will-change: transform, opacity;
        transform-origin: center center;
      }

      /* 尊重用户的动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .nsx-remind-blink {
          animation: none;
        }
      }

      /* 礼品图标闪烁动画 - 更显眼 */
      @keyframes nsx-gift-blink {
        0%, 100% {
          opacity: 1;
          transform: scale(1.3) rotate(0deg);
          filter: brightness(1);
        }
        25% {
          opacity: 0.9;
          transform: scale(1.4) rotate(-5deg);
          filter: brightness(1.2);
        }
        50% {
          opacity: 0.8;
          transform: scale(1.5) rotate(5deg);
          filter: brightness(1.3);
        }
        75% {
          opacity: 0.9;
          transform: scale(1.4) rotate(-3deg);
          filter: brightness(1.2);
        }
      }

      .nsx-gift-icon {
        --gift-scale: 1.3;
        display: inline-block;
        margin-left: 4px;
        margin-right: 2px;
        font-size: 1.2em;
        transform: scale(var(--gift-scale));
        transform-origin: left center;
        animation: nsx-gift-blink 1.2s ease-in-out infinite;
        cursor: default;
        vertical-align: middle;
        will-change: transform, opacity, filter;
        position: relative;
        z-index: 10;
      }

      /* 尊重用户的动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .nsx-gift-icon {
          animation: none;
          transform: scale(1.2);
        }
      }
    `;
    document.head.appendChild(style);

    // 用于暂停不可见火焰动画的 IntersectionObserver
    flameObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
      });
    }, { threshold: 0 });

    function addFlames() {
      // 只选择未处理的帖子，提升性能
      const posts = document.querySelectorAll('li.post-list-item:not([data-flame-added="1"])');
      posts.forEach(post => {
        try {
          const titleLink = post.querySelector('div.post-title > a');
          if (!titleLink) return;

          const titleText = titleLink.textContent || '';

          // 检查标题是否包含"抽"或"奖"关键字
          const hasGiftKeyword = /[抽奖]/.test(titleText);

          // 先添加礼品图标（永远在火焰之前）
          if (hasGiftKeyword && !titleLink.querySelector('.nsx-gift-icon')) {
            const giftIcon = document.createElement('span');
            giftIcon.className = 'nsx-gift-icon';
            giftIcon.textContent = '🎁';
            giftIcon.title = '含有抽奖关键字';

            // 在火焰图标之前插入礼品图标
            const existingFlame = titleLink.querySelector('.nsx-hot-flame');
            if (existingFlame) {
              titleLink.insertBefore(giftIcon, existingFlame);
            } else {
              titleLink.appendChild(giftIcon);
            }

            // 观察礼品图标
            if (flameObserver) {
              flameObserver.observe(giftIcon);
            }
          }

          // 后添加火焰图标（永远在礼品之后）
          const commentSpan = post.querySelector('span.info-comments-count > span');
          const count = commentSpan ? parseInt(commentSpan.textContent) || 0 : 0;
          if (count >= 10) {
            if (!titleLink.querySelector('.nsx-hot-flame')) {
              const flame = document.createElement('span');
              const level = count >= 30 ? 3 : count >= 20 ? 2 : 1;
              flame.className = 'nsx-hot-flame' + (level > 1 ? ` nsx-hot-flame-l${level}` : '');
              flame.textContent = '🔥'.repeat(level);
              flame.title = `${count} 条评论`;

              // 在礼品图标之后插入火焰图标（确保礼品在前）
              const existingGift = titleLink.querySelector('.nsx-gift-icon');
              if (existingGift) {
                // 如果礼品图标存在，在礼品图标后面插入火焰
                if (existingGift.nextSibling) {
                  titleLink.insertBefore(flame, existingGift.nextSibling);
                } else {
                  titleLink.appendChild(flame);
                }
              } else {
                // 如果没有礼品图标，直接追加到末尾
                titleLink.appendChild(flame);
              }

              // 立即观察新创建的火焰
              if (flameObserver) {
                flameObserver.observe(flame);
              }
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
            if (flameObserver) {
              flameObserver.observe(icon);
            }
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
