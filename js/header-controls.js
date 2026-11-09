(function () {
  'use strict';

  var CONFIG_URL = 'config/seasons.json';

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

  function renderTimeControls(container) {
    if (!container || !window.header || !window.header.banner || !window.header.banner._timeOptions) {
      if (container) { container.hidden = true; container.replaceChildren(); }
      return;
    }
    container.hidden = false;
    container.replaceChildren();
    var active = window.header.banner._activeTime;
    window.header.banner._timeOptions.forEach(function (time) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = time.label;
      button.dataset.headerTime = String(time.index);
      if (time.index === active) button.classList.add('is-active');
      button.addEventListener('click', function () {
        window.header.setTime(time.index);
        container.querySelectorAll('button').forEach(function (item) { item.classList.remove('is-active'); });
        button.classList.add('is-active');
      });
      container.appendChild(button);
    });
  }

  window.addEventListener('load', function () {
    bind('toggle-logo', 'logo', '显示 Logo', '隐藏 Logo');
    bind('toggle-shadow', 'shadow', '显示阴影', '隐藏阴影');
    sync();
    fetch(CONFIG_URL, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('Unable to load season config (' + response.status + ')');
      return response.json();
    }).then(function (config) {
      var container = document.getElementById('header-seasons');
      if (!container || !window.header || !Array.isArray(config.seasons)) return;
      var byId = {};
      config.seasons.forEach(function (season) {
        if (!season || !season.id || !season.dataUrl) return;
        byId[season.id] = season;
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = season.label || season.id;
        button.dataset.headerSeason = season.id;
        button.addEventListener('click', function () {
          window.header.load(season).then(function () {
            container.querySelectorAll('button').forEach(function (item) { item.classList.remove('is-active'); });
            button.classList.add('is-active');
            renderTimeControls(document.getElementById('header-times'));
          });
        });
        container.appendChild(button);
      });
      var initial = byId[config.default] || config.seasons[0];
      if (initial) {
        var initialButton = Array.prototype.slice.call(container.querySelectorAll('button')).find(function (button) { return button.dataset.headerSeason === initial.id; });
        window.header.load(initial).then(function () { if (initialButton) initialButton.classList.add('is-active'); renderTimeControls(document.getElementById('header-times')); });
      }
    }).catch(function (error) {
      if (window.console) console.error('[HeaderControls]', error);
    });
  });
}());
