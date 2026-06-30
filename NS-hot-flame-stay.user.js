// ==UserScript==
// @name         NS 热度火焰
// @namespace    http://stay.app/
// @version      1.3.2
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

  // ========== 访问历史记录功能 ==========
  const VISITED_KEY = 'nsx-visited-posts';
  const MAX_HISTORY = 20;

  // 获取已访问帖子列表
  function getVisitedPosts() {
    try {
      return JSON.parse(localStorage.getItem(VISITED_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  // 记录访问的帖子
  function recordVisit(postId) {
    if (!postId) return;

    let visited = getVisitedPosts();

    // 去重：移除已存在的 ID
    visited = visited.filter(id => id !== postId);

    // 将新访问的帖子添加到开头
    visited.unshift(postId);

    // 保持最多 20 条记录
    if (visited.length > MAX_HISTORY) {
      visited = visited.slice(0, MAX_HISTORY);
    }

    try {
      localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
    } catch (e) {
      // localStorage 可能已满，清除旧数据
      try {
        localStorage.removeItem(VISITED_KEY);
        localStorage.setItem(VISITED_KEY, JSON.stringify(visited.slice(0, 10)));
      } catch (e2) {
        // 静默处理
      }
    }
  }

  // 标记已访问的帖子
  function markVisitedPosts() {
    const visited = getVisitedPosts();
    if (visited.length === 0) return;

    // 只选择未处理的帖子
    const posts = document.querySelectorAll('li.post-list-item:not([data-visited-checked="1"])');

    posts.forEach(post => {
      try {
        const titleLink = post.querySelector('div.post-title > a');
        if (titleLink) {
          const match = titleLink.href.match(/\/post\/(\d+)/);
          if (match && visited.includes(match[1])) {
            // 添加置灰效果
            post.style.opacity = '0.55';
            post.style.filter = 'grayscale(0.6)';
            post.style.transition = 'opacity 0.3s, filter 0.3s';
            post.title = (post.title || '') + ' [已访问]';

            // 在标题前添加已读标记
            if (!titleLink.querySelector('.nsx-visited-mark')) {
              const mark = document.createElement('span');
              mark.className = 'nsx-visited-mark';
              mark.textContent = '✓ ';
              mark.style.cssText = 'color: #999; font-size: 0.9em; margin-right: 2px;';
              titleLink.insertBefore(mark, titleLink.firstChild);
            }
          }
        }
      } catch (e) {
        // 静默处理错误
      }

      // 标记为已检查
      post.dataset.visitedChecked = '1';
    });
  }

  // 监听帖子点击事件，记录访问
  function setupVisitTracker() {
    // 使用事件委托，提升性能
    document.addEventListener('click', (e) => {
      try {
        // 查找最近的帖子链接
        const link = e.target.closest('a[href*="/post/"]');
        if (link) {
          const match = link.href.match(/\/post\/(\d+)/);
          if (match) {
            recordVisit(match[1]);
          }
        }
      } catch (e) {
        // 静默处理错误
      }
    }, true); // 使用捕获阶段，确保在页面跳转前执行
  }

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

      /* 提醒图标闪烁动画 - 性能优化版 */
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

    // 标记已访问的帖子
    markVisitedPosts();

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

    // 启动访问跟踪
    setupVisitTracker();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(run));
    } else {
      requestAnimationFrame(run);
    }
  }

  init();
})();
