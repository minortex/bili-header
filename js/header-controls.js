(function () {
  'use strict';

  function bind(buttonId, feature, visibleText, hiddenText) {
    var button = document.getElementById(buttonId);
    if (!button || !window.header) return;
    button.addEventListener('click', function () {
      var enabled = window.header.toggleFeature(feature);
      button.textContent = enabled ? hiddenText : visibleText;
    });
  }

  function sync() {
    if (!window.header) return;
    var logo = document.getElementById('toggle-logo');
    var shadow = document.getElementById('toggle-shadow');
    if (logo) logo.textContent = window.header.config.showLogo ? '隐藏 Logo' : '显示 Logo';
    if (shadow) shadow.textContent = window.header.config.showShadow ? '隐藏阴影' : '显示阴影';
  }

  window.addEventListener('load', function () {
    bind('toggle-logo', 'logo', '显示 Logo', '隐藏 Logo');
    bind('toggle-shadow', 'shadow', '显示阴影', '隐藏阴影');
    sync();
    document.querySelectorAll('[data-header-season]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.header.load(button.dataset.headerSeason).then(function () {
          document.querySelectorAll('[data-header-season]').forEach(function (item) { item.classList.remove('is-active'); });
          button.classList.add('is-active');
        });
      });
    });
  });
}());
