(function () {
  const storageKey = 'lynkedge-theme';
  const nextThemeMap = {
    default: 'glossy',
    glossy: 'dark',
    dark: 'default'
  };
  const buttonLabelMap = {
    default: 'Glossy theme',
    glossy: 'Dark theme',
    dark: 'Original theme'
  };

  function normalizeTheme(theme) {
    if (theme === 'glossy') return 'glossy';
    if (theme === 'dark') return 'dark';
    return 'default';
  }

  function applyTheme(theme) {
    const nextTheme = normalizeTheme(theme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(storageKey, nextTheme);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.textContent = buttonLabelMap[nextTheme];
      button.setAttribute('aria-pressed', String(nextTheme !== 'default'));
      button.setAttribute('aria-label', `Switch to ${nextThemeMap[nextTheme] === 'default' ? 'original' : nextThemeMap[nextTheme]} theme`);
    });
  }

  function initTheme() {
    applyTheme(localStorage.getItem(storageKey));
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const current = normalizeTheme(document.documentElement.dataset.theme);
        applyTheme(nextThemeMap[current] || 'default');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
