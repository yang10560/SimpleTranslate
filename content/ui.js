/**
 * SimpleTranslate - UI Module
 * Handles sidebar, settings panel, toast notifications, and UI interactions.
 * Replaces GM_addStyle and jQuery with vanilla DOM.
 */

// ==================== Toast ====================
const Toast = (() => {
  let container = null;

  function getContainer() {
    if (!container || !document.body.contains(container)) {
      container = document.createElement('div');
      container.className = 'custom-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(type, msg) {
    try {
      const el = document.createElement('div');
      el.className = `custom-toast custom-toast-${type}`;
      el.textContent = msg || '';
      getContainer().appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => {
        el.classList.remove('show');
        el.classList.add('hide');
        setTimeout(() => el.remove(), 400);
      }, 3000);
    } catch (e) {
      console.error('Toast error:', e);
    }
  }

  return {
    success: (msg) => showToast('success', msg),
    error: (msg) => showToast('error', msg),
    info: (msg) => showToast('info', msg),
    warn: (msg) => showToast('warning', msg),
    warning: (msg) => showToast('warning', msg),
  };
})();

// ==================== Sidebar HTML ====================
const SIDEBAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" stroke="currentColor" fill="currentColor">
  <path d="m575.73-226.04-37.924 100.231q-3.23 8-10.173 12.865-6.942 4.866-15.749 4.866-14.385 0-22.5-11.846t-2.846-25.73l155.154-400.731q3.346-8.115 10.5-12.884t15.577-4.769h21.499q8.423 0 15.576 4.923 7.154 4.922 10.693 13.038l154.961 400.23q5.769 13.769-2.692 25.769-8.461 12-22.845 12-9.116 0-16.154-4.866-7.038-4.865-10.384-13.48l-37.731-99.616H575.73ZM359.307-417.193 179.846-237.962q-7.808 8.192-18.961 8.499-11.154.308-19.961-8.499-8.5-8.5-8.5-19.615 0-11.115 8.5-19.807l179.154-179.847q-35.923-36.731-68.077-86.115-32.154-49.385-49.885-95.539h60.383q15.5 34.692 41.923 73.924 26.424 39.231 54.885 68.808 45.847-46.039 82.232-104.732 36.385-58.692 53.385-115.077H103.847q-11.653 0-19.864-8.211-8.212-8.211-8.212-19.865 0-11.461 8.212-19.672 8.21-8.212 19.864-8.212h228.269v-36.73q0-11.461 8.115-19.673 8.115-8.211 19.769-8.211 11.654 0 19.865 8.211 8.211 8.212 8.211 19.673v36.73h228.269q11.461 0 19.673 8.212 8.211 8.211 8.211 19.672 0 11.654-8.211 19.865-8.212 8.211-19.673 8.211h-63.076q-20.77 69.5-61.577 138.558-40.808 69.057-92.962 121.096l92.538 94.924-21.384 57.575-110.577-113.384Zm235.153 140h167.309l-83.655-220.962-83.654 220.962Z"/>
</svg>`;

function createSidebar() {
  const wrapper = document.createElement('div');
  wrapper.className = 'translate-main';
  wrapper.innerHTML = `
    <div class="translate-main-fold">${SIDEBAR_SVG}</div>
    <div class="translate-main-body">
      <div class="translate-main-header">
        ${SIDEBAR_SVG}
        <span>中外互译</span>
        <span class="translate-arrow">&gt;</span>
      </div>
      <div class="translate-main-body">
        <ul>
          <li><a id="en2zh" href="javascript:void(0)"><span>转中文</span></a></li>
          <li><a id="zh2en" href="javascript:void(0)"><span>转外文</span></a></li>
          <li style="display:flex;justify-content:center">
            <a id="doubleShow" href="javascript:void(0)"><span>双显</span></a>
            <a id="highlightTranslateText" href="javascript:void(0)"><span>高亮</span></a>
          </li>
          <li style="display:flex;justify-content:center">
            <a id="autoTranslateSwitch" href="javascript:void(0)"><span>自动</span></a>
            <a id="changeSelectLang" href="javascript:void(0)"><span>语言</span></a>
          </li>
          <li style="display:flex;justify-content:center">
            <a id="rightSelectMode" href="javascript:void(0)"><span>右击</span></a>
            <a id="updateScript" href="javascript:void(0)"><span>更新</span></a>
          </li>
          <li style="display:flex;justify-content:center">
            <a id="leftSelectMode" href="javascript:void(0)"><span>选词</span></a>
            <a id="switchAPI" href="javascript:void(0)"><span>引擎</span></a>
          </li>
          <li><a id="sourceText" href="javascript:void(0)"><span>原文</span></a></li>
        </ul>
      </div>
    </div>
  `;
  return wrapper;
}

// ==================== Settings Panel ====================

function createSettingsPanel(config) {
  const { engineList, currentAPI, highlightColor, isMobile } = config;

  function getCurrentEngineIndex() {
    const idx = engineList.findIndex(e => e.api.name === currentAPI.name);
    return idx >= 0 ? idx : 0;
  }

  const panel = document.createElement('div');
  panel.className = 'MyColorSelector';
  panel.id = 'MyColorSelector';

  const engineCardsHtml = engineList.map((e, i) => {
    const isCurrent = e.api.name === currentAPI.name;
    const bgColor = isCurrent ? '#e8f5e9' : '#fff';
    const borderColor = isCurrent ? '#4caf50' : '#e0e0e0';
    const shadow = isCurrent ? '0 0 0 1px #4caf50' : 'none';
    const tagHtml = e.tag ? `<span style="display:inline-block;font-size:10px;padding:1px 5px;border-radius:3px;color:white;background:${e.tagColor};margin-top:3px;">${e.tag}</span>` : '';
    const checkMark = isCurrent ? '<span style="color:#4caf50;font-size:11px;">✓ </span>' : '';
    return `<div class="engine-card" data-engine-index="${i}" style="cursor:pointer;padding:10px 6px;border-radius:8px;text-align:center;border:1.5px solid ${borderColor};background:${bgColor};box-shadow:${shadow};user-select:none;">
      <div style="font-size:13px;line-height:1.4;color:#333;">${checkMark}${e.name}</div>
      ${tagHtml}
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:16px;font-weight:bold;color:#333;margin-bottom:12px;">译文高亮颜色</div>
      <div style="display:inline-flex;align-items:center;gap:12px;">
        <input type="color" id="nativeColorPicker" value="${highlightColor || '#d8551f'}" style="width:48px;height:48px;border:none;border-radius:8px;cursor:pointer;padding:0;background:none;">
        <div style="text-align:left;">
          <div id="colorDisplay" style="width:80px;height:32px;border-radius:6px;border:1px solid #eee;margin-bottom:4px;"></div>
          <div id="colorHex" style="font-size:12px;color:#888;font-family:monospace;"></div>
        </div>
      </div>
      <div id="colorPreview" style="font-size:22px;margin-top:10px;font-weight:500;">译文预览效果</div>
    </div>

    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
      <button id="selectColorBtn" style="cursor:pointer;color:#fff;border:none;outline:none;background:#4caf50;padding:8px 20px;border-radius:6px;font-size:13px;">保存</button>
      <button id="scrollBtn" style="cursor:pointer;color:#fff;border:none;outline:none;background:#2196f3;padding:8px 20px;border-radius:6px;font-size:13px;">滚动翻译</button>
      <button id="selectColorCancelBtn" style="cursor:pointer;color:#666;border:none;outline:none;background:#f0f0f0;padding:8px 20px;border-radius:6px;font-size:13px;">关闭</button>
    </div>

    <div style="background:#fffde7;border-radius:6px;padding:8px 10px;font-size:12px;color:#666;margin-bottom:16px;">
      💡 提示：输入框中连按三下空格可翻译内容
    </div>

    <div style="border-top:1px solid #eee;padding-top:14px;margin-bottom:14px;">
      <div style="font-weight:bold;margin-bottom:10px;font-size:15px;color:#333;">翻译引擎</div>
      <div id="engineGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        ${engineCardsHtml}
      </div>
    </div>

    <div style="border-top:1px solid #eee;padding-top:14px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:14px;color:#333;">外语语言：</span>
        <select id="selectForeign" style="flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;outline:none;">
          <option value="en">英语 (en)</option>
          <option value="ja">日语 (ja)</option>
          <option value="ko">韩语 (ko)</option>
          <option value="ru">俄语 (ru)</option>
          <option value="de">德语 (de)</option>
          <option value="fr">法语 (fr)</option>
          <option value="th">泰语 (th)</option>
          <option value="hi">印地语 (hi)</option>
          <option value="it">意大利语 (it)</option>
          <option value="pt">葡萄牙语 (pt)</option>
          <option value="ar">阿拉伯语 (ar)</option>
          <option value="vi">越南语 (vi)</option>
          <option value="tr">土耳其语 (tr)</option>
          <option value="id">印尼语 (id)</option>
          <option value="zh">中文 (zh)</option>
          <option value="zh-Hans">中文简体 (zh-Hans)</option>
          <option value="zh-TW">中文繁体 (zh-TW)</option>
        </select>
        <button id="selectForeignBtn" style="cursor:pointer;color:#fff;border:none;outline:none;background:#4caf50;padding:7px 14px;border-radius:6px;font-size:13px;white-space:nowrap;">应用</button>
      </div>
      <div style="font-size:11px;color:#999;">仅部分引擎支持外语切换</div>
    </div>
  `;

  return panel;
}

// ==================== Engine Quick Picker ====================

function showEngineQuickPicker(config) {
  const { engineList, currentAPI, switchAPI } = config;
  const existing = document.getElementById('engineQuickPicker');
  if (existing) { existing.remove(); return; }

  const currentIdx = engineList.findIndex(e => e.api.name === currentAPI.name);

  const picker = document.createElement('div');
  picker.id = 'engineQuickPicker';

  const card = document.createElement('div');
  card.style.cssText = 'background:white;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,0.3);padding:16px;max-height:70vh;overflow-y:auto;width:300px;';

  const gridHtml = engineList.map((e, i) => {
    const isCurrent = i === currentIdx;
    const bgColor = isCurrent ? '#e8f5e9' : '#f5f5f5';
    const borderColor = isCurrent ? '#4caf50' : '#ddd';
    const tagHtml = e.tag ? `<span style="display:block;font-size:9px;color:${e.tagColor};margin-top:2px;">${e.tag}</span>` : '';
    return `<div class="engine-qcard" data-idx="${i}" style="cursor:pointer;padding:8px 4px;border-radius:6px;text-align:center;border:1.5px solid ${borderColor};background:${bgColor};transition:all 0.15s;">
      <div style="font-size:13px;line-height:1.3;color:#333;">${e.name}</div>
      ${tagHtml}
    </div>`;
  }).join('');

  card.innerHTML = `
    <div style="font-weight:bold;font-size:14px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #eee;color:#333;">选择翻译引擎</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">${gridHtml}</div>
  `;

  picker.addEventListener('click', (ev) => {
    if (ev.target === picker) { picker.remove(); return; }
    const engineCard = ev.target.closest('.engine-qcard');
    if (!engineCard) return;
    const idx = parseInt(engineCard.dataset.idx);
    switchAPI(true, idx);
    picker.remove();
  });

  picker.appendChild(card);
  document.body.appendChild(picker);
}
