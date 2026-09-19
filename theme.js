(function () {
  const storageKey = 'lynkedge-theme';
  const glossyTheme = 'glossy';

  function applyTheme(theme) {
    const nextTheme = theme === glossyTheme ? glossyTheme : 'default';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(storageKey, nextTheme);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const isGlossy = nextTheme === glossyTheme;
      button.textContent = isGlossy ? 'Original theme' : 'Glossy theme';
      button.setAttribute('aria-pressed', String(isGlossy));
      button.setAttribute('aria-label', isGlossy ? 'Switch to original theme' : 'Switch to glossy theme');
    });
  }

  function initTheme() {
    applyTheme(localStorage.getItem(storageKey));
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        applyTheme(document.documentElement.dataset.theme === glossyTheme ? 'default' : glossyTheme);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
