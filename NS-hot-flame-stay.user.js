// ==UserScript==
// @name         NS 热度火焰
// @namespace    http://stay.app/
// @version      1.2.0
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
          console.warn('[Nodeseek 热度火焰] 处理帖子时出错:', e);
        }
        post.dataset.flameAdded = '1';
      });
    }

    // 静态页面只需执行一次
    addFlames();

    // 处理提醒图标的闪烁效果
    addRemindBlink();

    // 调试功能：分析 iconpark-icon 元素（带 use 子元素）
    debugIconparkIcons();
  }

  // ========== 提醒图标闪烁效果 ==========
  function addRemindBlink() {
    // 防止重复添加
    if (document.getElementById('nsx-remind-processed')) return;
    document.getElementById('nsx-flame-style').setAttribute('data-remind', '1');

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
        console.warn('[Nodeseek 热度火焰] 处理提醒图标时出错:', e);
      }
    });
  }

  // ========== 工具函数 ==========
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== 调试功能 ==========
  function debugIconparkIcons() {
    // 精确选择：带 use 子元素且 href 包含 #remind 的 iconpark-icon
    const icons = document.querySelectorAll('.iconpark-icon');
    const targetIcons = Array.from(icons).filter(icon => {
      const useEl = icon.querySelector('use');
      if (!useEl) return false;
      const href = useEl.getAttribute('href');
      return href && href.includes('#remind');
    });

    if (targetIcons.length === 0) {
      showToast('未找到 href 包含 #remind 的 iconpark-icon', 'warning');
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

      // 获取元素及其子元素的 HTML 源代码
      const outerHTML = icon.outerHTML;
      const innerHTML = icon.innerHTML;

      // 高亮标记元素
      icon.style.outline = '2px solid red';
      icon.style.outlineOffset = '2px';

      return {
        index: index + 1,
        href: href,
        fill: fill,
        stroke: stroke,
        color: color,
        outerHTML: outerHTML,
        innerHTML: innerHTML,
        element: icon
      };
    });

    // 在页面上创建信息面板
    createDebugPanel(infoList);

    // 显示简要提示
    showToast(`找到 ${targetIcons.length} 个 #remind 图标，已高亮标记`, 'info');
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

    let html = '<h4 style="margin: 0 0 12px 0; color: #1890ff;">🔍 Iconpark 图标分析（点击某项可定位元素）</h4>';

    infoList.forEach((info, idx) => {
      html += `
        <div class="nsx-debug-item" data-index="${idx}" style="margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#e6f7ff'" onmouseout="this.style.background='#f5f5f5'">
          <div style="font-weight: bold; margin-bottom: 4px;">图标 ${info.index}（点击定位）</div>
          <div>href: <code style="color: #52c41a;">${info.href}</code></div>
          <div>fill: <span style="color: ${info.fill !== 'none' ? '#f5222d' : '#999'};">${info.fill}</span></div>
          <div>stroke: <span style="color: ${info.stroke !== 'none' ? '#f5222d' : '#999'};">${info.stroke}</span></div>
          <div>color: <span style="color: #f5222d;">${info.color}</span></div>

          <details style="margin-top: 8px; font-size: 11px;">
            <summary style="cursor: pointer; color: #1890ff;">查看 HTML 源代码</summary>
            <div style="margin-top: 4px;">
              <div style="font-weight: bold; margin-top: 4px;">outerHTML:</div>
              <pre style="background: #fff; padding: 4px; border-radius: 2px; overflow-x: auto; font-size: 10px; max-height: 100px; overflow-y: auto;">${escapeHtml(info.outerHTML)}</pre>

              <div style="font-weight: bold; margin-top: 4px;">innerHTML:</div>
              <pre style="background: #fff; padding: 4px; border-radius: 2px; overflow-x: auto; font-size: 10px; max-height: 100px; overflow-y: auto;">${escapeHtml(info.innerHTML)}</pre>
            </div>
          </details>

          <button onclick="event.stopPropagation(); this.parentElement.style.display='none'" style="margin-top: 4px; padding: 2px 8px; font-size: 11px;">关闭此项</button>
        </div>
      `;
    });

    html += '<button onclick="this.parentElement.remove()" style="width: 100%; padding: 8px; background: #ff4d4f; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭面板</button>';

    panel.innerHTML = html;
    document.body.appendChild(panel);

    // 添加点击事件：点击某项时闪烁对应元素
    panel.querySelectorAll('.nsx-debug-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return; // 忽略关闭按钮的点击

        const idx = parseInt(item.dataset.index);
        const targetElement = infoList[idx].element;

        if (targetElement) {
          // 滚动到元素位置
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // 闪烁动画
          flashElement(targetElement);
        }
      });
    });
  }

  function flashElement(element) {
    // 保存原始样式
    const originalOutline = element.style.outline;
    const originalOutlineOffset = element.style.outlineOffset;

    // 定义闪烁样式
    let flashCount = 0;
    const maxFlashes = 6; // 闪烁 3 次（每次包含开和关）

    const flashInterval = setInterval(() => {
      if (flashCount >= maxFlashes) {
        // 恢复原始样式
        element.style.outline = originalOutline;
        element.style.outlineOffset = originalOutlineOffset;
        clearInterval(flashInterval);
        return;
      }

      if (flashCount % 2 === 0) {
        // 闪烁开启：红色粗边框
        element.style.outline = '4px solid red';
        element.style.outlineOffset = '4px';
      } else {
        // 闪烁关闭：透明边框
        element.style.outline = '4px solid transparent';
        element.style.outlineOffset = '4px';
      }

      flashCount++;
    }, 300); // 每 300ms 切换一次
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
