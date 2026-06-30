// ==UserScript==
// @name         NS 热度火焰
// @namespace    http://stay.app/
// @version      1.1.6
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

    // 调试功能：分析 iconpark-icon 元素（带 use 子元素）
    debugIconparkIcons();
  }

  // ========== 调试功能 ==========
  function debugIconparkIcons() {
    // 精确选择：带 use 子元素的 iconpark-icon
    const icons = document.querySelectorAll('.iconpark-icon');
    const targetIcons = Array.from(icons).filter(icon => icon.querySelector('use'));

    if (targetIcons.length === 0) {
      showToast('未找到带 use 子元素的 iconpark-icon', 'warning');
      return;
    }

    // 收集信息并在页面上显示
    const infoList = targetIcons.map((icon, index) => {
      const computedStyle = window.getComputedStyle(icon);
      const useEl = icon.querySelector('use');
      const href = useEl ? useEl.getAttribute('href') : 'N/A';

      // 尝试获取实际颜色（检查 fill, stroke, color）
      const fill = computedStyle.fill !== 'none' ? computedStyle.fill : 'none';
      const stroke = computedStyle.stroke !== 'none' ? computedStyle.stroke : 'none';
      const color = computedStyle.color;

      // 高亮标记元素
      icon.style.outline = '2px solid red';
      icon.style.outlineOffset = '2px';

      return {
        index: index + 1,
        href: href,
        fill: fill,
        stroke: stroke,
        color: color,
        element: icon
      };
    });

    // 在页面上创建信息面板
    createDebugPanel(infoList);

    // 显示简要提示
    showToast(`找到 ${targetIcons.length} 个目标图标，已高亮标记`, 'info');
  }

  function createDebugPanel(infoList) {
    // 移除旧面板
    const oldPanel = document.getElementById('nsx-debug-panel');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'nsx-debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: white;
      border: 2px solid #1890ff;
      border-radius: 8px;
      padding: 16px;
      max-width: 400px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 99999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
    `;

    let html = '<h4 style="margin: 0 0 12px 0; color: #1890ff;">🔍 Iconpark 图标分析</h4>';

    infoList.forEach(info => {
      html += `
        <div style="margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 4px;">图标 ${info.index}</div>
          <div>href: <code style="color: #52c41a;">${info.href}</code></div>
          <div>fill: <span style="color: ${info.fill !== 'none' ? '#f5222d' : '#999'};">${info.fill}</span></div>
          <div>stroke: <span style="color: ${info.stroke !== 'none' ? '#f5222d' : '#999'};">${info.stroke}</span></div>
          <div>color: <span style="color: #f5222d;">${info.color}</span></div>
          <button onclick="this.parentElement.style.display='none'" style="margin-top: 4px; padding: 2px 8px; font-size: 11px;">关闭此项</button>
        </div>
      `;
    });

    html += '<button onclick="this.parentElement.remove()" style="width: 100%; padding: 8px; background: #ff4d4f; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭面板</button>';

    panel.innerHTML = html;
    document.body.appendChild(panel);
  }

  function showToast(message, type = 'info') {
    const colors = {
      info: '#1890ff',
      warning: '#faad14',
      error: '#ff4d4f'
    };

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 100000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: nsx-toast-in 0.3s ease;
    `;

    // 添加动画样式（如果不存在）
    if (!document.getElementById('nsx-toast-style')) {
      const style = document.createElement('style');
      style.id = 'nsx-toast-style';
      style.textContent = `
        @keyframes nsx-toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

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
