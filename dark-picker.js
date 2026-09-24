/**
 * Dark theme Date & Time picker for LynkEdge.
 * Provides a custom dark-theme popup matching the confirmation dialog
 * strictly when html[data-theme="dark"] is active.
 * Glossy and Original themes remain 100% untouched.
 */
(function () {
  let popup = null;
  let activeInput = null;
  let isDateTime = false;

  let viewYear = 2026;
  let viewMonth = 8; // 0-indexed (8 = September)

  let selYear = 2026;
  let selMonth = 8;
  let selDay = 22;
  let selHour = 12;
  let selMinute = 0;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function isDarkTheme() {
    return document.documentElement.dataset.theme === 'dark';
  }

  function createPopup() {
    popup = document.createElement('div');
    popup.id = 'darkDateTimePicker';
    popup.className = 'dark-picker-popup hidden';
    document.body.appendChild(popup);

    // Prevent clicks inside popup from bubbling to document (which closes it)
    popup.addEventListener('click', (e) => e.stopPropagation());
    popup.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  function parseInputValue(val) {
    const now = new Date();
    if (!val) {
      selYear = now.getFullYear();
      selMonth = now.getMonth();
      selDay = now.getDate();
      selHour = now.getHours();
      selMinute = now.getMinutes();
      viewYear = selYear;
      viewMonth = selMonth;
      return;
    }

    if (isDateTime && val.includes('T')) {
      const [dPart, tPart] = val.split('T');
      const [y, m, d] = dPart.split('-').map(Number);
      const [h, min] = tPart.split(':').map(Number);
      if (y && m && d) {
        selYear = y;
        selMonth = m - 1;
        selDay = d;
        selHour = isNaN(h) ? 0 : h;
        selMinute = isNaN(min) ? 0 : min;
        viewYear = selYear;
        viewMonth = selMonth;
        return;
      }
    } else if (val.includes('-')) {
      const [y, m, d] = val.split('-').map(Number);
      if (y && m && d) {
        selYear = y;
        selMonth = m - 1;
        selDay = d;
        selHour = now.getHours();
        selMinute = now.getMinutes();
        viewYear = selYear;
        viewMonth = selMonth;
        return;
      }
    }

    selYear = now.getFullYear();
    selMonth = now.getMonth();
    selDay = now.getDate();
    selHour = now.getHours();
    selMinute = now.getMinutes();
    viewYear = selYear;
    viewMonth = selMonth;
  }

  function syncInputValue() {
    if (!activeInput) return;
    const dateStr = `${selYear}-${pad(selMonth + 1)}-${pad(selDay)}`;
    if (isDateTime) {
      activeInput.value = `${dateStr}T${pad(selHour)}:${pad(selMinute)}`;
    } else {
      activeInput.value = dateStr;
    }
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    activeInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function renderPicker() {
    if (!popup) return;
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    // Build Month & Year options
    let monthOpts = '';
    monthNames.forEach((name, idx) => {
      monthOpts += `<option value="${idx}" ${idx === viewMonth ? 'selected' : ''}>${name}</option>`;
    });

    let yearOpts = '';
    const currentY = now.getFullYear();
    for (let y = currentY - 15; y <= currentY + 15; y++) {
      yearOpts += `<option value="${y}" ${y === viewYear ? 'selected' : ''}>${y}</option>`;
    }

    // Build Days
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    let daysHtml = '';

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevD = daysInPrevMonth - i;
      daysHtml += `<button type="button" class="dark-picker-day other-month" data-prev-day="${prevD}">${prevD}</button>`;
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = (viewYear === selYear && viewMonth === selMonth && d === selDay);
      const isToday = (viewYear === todayY && viewMonth === todayM && d === todayD);
      let cls = 'dark-picker-day';
      if (isSelected) cls += ' selected';
      if (isToday) cls += ' today';
      daysHtml += `<button type="button" class="${cls}" data-day="${d}">${d}</button>`;
    }

    // Trailing days from next month
    const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;
    const trailingCount = totalCells - (firstDayIndex + daysInMonth);
    for (let nextD = 1; nextD <= trailingCount; nextD++) {
      daysHtml += `<button type="button" class="dark-picker-day other-month" data-next-day="${nextD}">${nextD}</button>`;
    }

    // Time Section HTML (only if datetime-local)
    let timeHtml = '';
    if (isDateTime) {
      let hourOpts = '';
      for (let h = 0; h < 24; h++) {
        hourOpts += `<option value="${h}" ${h === selHour ? 'selected' : ''}>${pad(h)}</option>`;
      }
      let minOpts = '';
      for (let m = 0; m < 60; m++) {
        minOpts += `<option value="${m}" ${m === selMinute ? 'selected' : ''}>${pad(m)}</option>`;
      }

      timeHtml = `
        <div class="dark-picker-time-section">
          <span class="dark-picker-time-label">Time</span>
          <div class="dark-picker-time-controls">
            <select class="dark-picker-select dark-picker-hour" aria-label="Hour">${hourOpts}</select>
            <span class="dark-picker-time-separator">:</span>
            <select class="dark-picker-select dark-picker-minute" aria-label="Minute">${minOpts}</select>
          </div>
        </div>
      `;
    }

    popup.innerHTML = `
      <div class="dark-picker-header">
        <button type="button" class="dark-picker-nav" id="darkPickerPrevMonth" aria-label="Previous month">‹</button>
        <div class="dark-picker-select-group">
          <select class="dark-picker-select dark-picker-month" aria-label="Month">${monthOpts}</select>
          <select class="dark-picker-select dark-picker-year" aria-label="Year">${yearOpts}</select>
        </div>
        <button type="button" class="dark-picker-nav" id="darkPickerNextMonth" aria-label="Next month">›</button>
      </div>

      <div class="dark-picker-weekdays">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>

      <div class="dark-picker-days">
        ${daysHtml}
      </div>

      ${timeHtml}

      <div class="dark-picker-footer">
        <button type="button" class="dark-picker-btn dark-picker-btn-now">Now</button>
        <button type="button" class="dark-picker-btn dark-picker-btn-clear">Clear</button>
        <button type="button" class="dark-picker-btn dark-picker-btn-done">Done</button>
      </div>
    `;

    // Attach event listeners
    popup.querySelector('#darkPickerPrevMonth').addEventListener('click', () => {
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
      renderPicker();
    });

    popup.querySelector('#darkPickerNextMonth').addEventListener('click', () => {
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
      renderPicker();
    });

    popup.querySelector('.dark-picker-month').addEventListener('change', (e) => {
      viewMonth = Number(e.target.value);
      renderPicker();
    });

    popup.querySelector('.dark-picker-year').addEventListener('change', (e) => {
      viewYear = Number(e.target.value);
      renderPicker();
    });

    popup.querySelectorAll('.dark-picker-day').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.day) {
          selYear = viewYear;
          selMonth = viewMonth;
          selDay = Number(btn.dataset.day);
          syncInputValue();
          renderPicker();
        } else if (btn.dataset.prevDay) {
          viewMonth--;
          if (viewMonth < 0) {
            viewMonth = 11;
            viewYear--;
          }
          selYear = viewYear;
          selMonth = viewMonth;
          selDay = Number(btn.dataset.prevDay);
          syncInputValue();
          renderPicker();
        } else if (btn.dataset.nextDay) {
          viewMonth++;
          if (viewMonth > 11) {
            viewMonth = 0;
            viewYear++;
          }
          selYear = viewYear;
          selMonth = viewMonth;
          selDay = Number(btn.dataset.nextDay);
          syncInputValue();
          renderPicker();
        }
      });
    });

    if (isDateTime) {
      const hourSelect = popup.querySelector('.dark-picker-hour');
      const minSelect = popup.querySelector('.dark-picker-minute');
      if (hourSelect) {
        hourSelect.addEventListener('change', (e) => {
          selHour = Number(e.target.value);
          syncInputValue();
        });
      }
      if (minSelect) {
        minSelect.addEventListener('change', (e) => {
          selMinute = Number(e.target.value);
          syncInputValue();
        });
      }
    }

    popup.querySelector('.dark-picker-btn-now').addEventListener('click', () => {
      const current = new Date();
      selYear = current.getFullYear();
      selMonth = current.getMonth();
      selDay = current.getDate();
      selHour = current.getHours();
      selMinute = current.getMinutes();
      viewYear = selYear;
      viewMonth = selMonth;
      syncInputValue();
      renderPicker();
    });

    popup.querySelector('.dark-picker-btn-clear').addEventListener('click', () => {
      if (activeInput) {
        activeInput.value = '';
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        activeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closeDarkPicker();
    });

    popup.querySelector('.dark-picker-btn-done').addEventListener('click', () => {
      syncInputValue();
      closeDarkPicker();
    });
  }

  function positionPopup() {
    if (!popup || !activeInput) return;
    const rect = activeInput.getBoundingClientRect();
    const pickerWidth = 320;
    const pickerHeight = isDateTime ? 385 : 325;

    let left = rect.left + window.scrollX;
    if (left + pickerWidth > window.innerWidth - 12) {
      left = Math.max(10, window.innerWidth - pickerWidth - 12);
    }

    let top = rect.bottom + window.scrollY + 6;
    if (rect.bottom + pickerHeight > window.innerHeight && rect.top > pickerHeight + 20) {
      top = rect.top + window.scrollY - pickerHeight - 6;
    }

    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;
  }

  function openDarkPicker(input) {
    if (!isDarkTheme()) return;
    activeInput = input;
    isDateTime = input.type === 'datetime-local';

    if (!popup) createPopup();

    parseInputValue(input.value);
    renderPicker();
    positionPopup();
    popup.classList.remove('hidden');
  }

  function closeDarkPicker() {
    if (popup && !popup.classList.contains('hidden')) {
      popup.classList.add('hidden');
      activeInput = null;
    }
  }

  // Intercept clicks on date/datetime inputs when in Dark theme
  function initListeners() {
    document.addEventListener('click', (e) => {
      if (!isDarkTheme()) return;

      const dateInput = e.target.closest('input[type="date"], input[type="datetime-local"]');
      if (dateInput) {
        e.preventDefault();
        e.stopPropagation();
        openDarkPicker(dateInput);
        return;
      }

      // Close when clicking outside
      if (popup && !popup.classList.contains('hidden')) {
        closeDarkPicker();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDarkPicker();
      }
    });

    window.addEventListener('resize', () => {
      if (popup && !popup.classList.contains('hidden')) {
        positionPopup();
      }
    });

    window.addEventListener('scroll', () => {
      if (popup && !popup.classList.contains('hidden')) {
        positionPopup();
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initListeners);
  } else {
    initListeners();
  }
})();
