// ==UserScript==
// @name         NS 热度火焰
// @namespace    http://stay.app/
// @version      1.1.4
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
          console.warn('[Nodeseek 热度火焰] 处理帖子时出错:', e);
        }
        post.dataset.flameAdded = '1';
      });
    }

    // 静态页面只需执行一次
    addFlames();

    // 调试功能：输出 iconpark-icon 元素的颜色信息
    debugIconparkIcons();
  }

  // ========== 调试功能 ==========
  function debugIconparkIcons() {
    const icons = document.querySelectorAll('.iconpark-icon');
    if (icons.length === 0) {
      console.log('[Nodeseek 热度火焰] 未找到 iconpark-icon 元素');
      return;
    }

    console.group(`[Nodeseek 热度火焰] 找到 ${icons.length} 个 iconpark-icon 元素：`);
    
    icons.forEach((icon, index) => {
      const computedStyle = window.getComputedStyle(icon);
      const info = {
        元素: icon,
        索引: index,
        color: computedStyle.color,
        fill: computedStyle.fill,
        stroke: computedStyle.stroke,
        backgroundColor: computedStyle.backgroundColor,
        opacity: computedStyle.opacity,
        className: icon.className,
        innerHTML: icon.innerHTML.substring(0, 100) + (icon.innerHTML.length > 100 ? '...' : '')
      };
      
      console.log(`%c图标 ${index + 1}`, 'font-weight: bold; color: #1890ff;');
      console.log('详细信息:', info);
      
      // 如果是 SVG 元素，还输出 SVG 相关的属性
      if (icon.tagName.toLowerCase() === 'svg' || icon.querySelector('svg')) {
        const svg = icon.tagName.toLowerCase() === 'svg' ? icon : icon.querySelector('svg');
        console.log('SVG 信息:', {
          width: svg.getAttribute('width'),
          height: svg.getAttribute('height'),
          viewBox: svg.getAttribute('viewBox'),
          fill: svg.getAttribute('fill'),
          stroke: svg.getAttribute('stroke')
        });
      }
    });
    
    console.groupEnd();

    // 在页面上显示提示
    showToast(`找到 ${icons.length} 个 iconpark-icon 元素，详细信息请查看控制台`);
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1890ff;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: nsx-toast-in 0.3s ease;
    `;
    
    // 添加入场动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes nsx-toast-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    // 3秒后自动移除
    setTimeout(() => {
      toast.style.animation = 'nsx-toast-in 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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
