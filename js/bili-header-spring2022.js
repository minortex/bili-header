/* 2022 spring banner game: 叶间穿行. */
(function (global) {
  'use strict';

  var ROOT = 'seasons/2022-spring/banner/spring-game/';
  var GAME = ROOT + 'game.js';
  var ENTRY_VIDEO = 'seasons/2022-spring/banner/data/spring-game-entry.mp4';
  var PRELUDE_VIDEO = 'seasons/2022-spring/banner/data/spring-prelude.mp4';
  var mounted = null;

  function installStyle() {
    if (document.getElementById('local-bili-header-spring2022-style')) return;
    var style = document.createElement('style');
    style.id = 'local-bili-header-spring2022-style';
    style.textContent = [
      '.local-bili-header--spring2022{transition:height 1s;overflow:hidden}',
      '.local-bili-header--spring2022 .local-bili-header__spring-entry{position:absolute;top:40%;left:0;width:100%;height:auto;transform:translateY(-50%);object-fit:cover;object-position:center;image-rendering:pixelated;transition:top 1s;z-index:2;pointer-events:none}',
      '.local-bili-header--spring2022 .local-bili-header__logo-link{z-index:4}',
      '.local-bili-header--spring2022 .banner-game{position:absolute;top:0;left:0;z-index:5;width:100%;user-select:none}',
      '.local-bili-header--spring2022 .spring-prelude{z-index:6}'
    ].join('');
    document.head.appendChild(style);
  }

  function loadGameScript() {
    if (global.BannerGameSpring2022) return Promise.resolve();
    var existing = document.querySelector('script[data-local-spring2022-game]');
    if (existing) return new Promise(function (resolve, reject) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
    var script = document.createElement('script');
    script.src = GAME;
    script.crossOrigin = 'anonymous';
    script.dataset.localSpring2022Game = 'true';
    document.body.appendChild(script);
    return new Promise(function (resolve, reject) {
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
    });
  }

  function createVideo(src) {
    var video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.disablePictureInPicture = true;
    video.disableremoteplayback = true;
    video.src = src;
    return video;
  }

  function preventGameKeys(event) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'z'].indexOf(event.key) >= 0) event.preventDefault();
  }

  function install(banner) {
    if (mounted === banner || !banner || banner.dataset.spring2022Ready === 'true') return;
    mounted = banner;
    banner.dataset.spring2022Ready = 'true';
    installStyle();
    banner.classList.add('local-bili-header--spring2022');

    var logo = banner.querySelector('.local-bili-header__logo-link');
    if (logo) logo.classList.add('inner-logo');
    var taper = document.createElement('div');
    taper.className = 'taper-line';
    banner.appendChild(taper);

    banner.querySelectorAll('.local-bili-header__layer').forEach(function (node) {
      if (node.tagName === 'VIDEO') node.remove();
    });
    var entry = createVideo(ENTRY_VIDEO);
    entry.className = 'local-bili-header__spring-entry';
    entry.loop = true;
    entry.autoplay = true;
    entry.preload = 'auto';
    banner.insertBefore(entry, logo || taper);
    entry.play().catch(function () {});

    var originalHeight = banner.clientHeight;
    var expanded = false;
    var activity = null;
    var timeout = 0;
    var inactivityTimer = 0;
    function isStartSignClick(event) {
      var rect = entry.getBoundingClientRect();
      var scale = rect.width / 1920;
      var sign = {
        left: rect.left + 1120 * scale,
        right: rect.left + 1340 * scale,
        top: rect.top + 155 * scale,
        bottom: rect.top + 345 * scale
      };
      return event.clientX >= sign.left && event.clientX <= sign.right &&
        event.clientY >= sign.top && event.clientY <= sign.bottom;
    }
    var restore = function () {
      if (!expanded) return;
      expanded = false;
      clearTimeout(timeout);
      clearInterval(inactivityTimer);
      banner.style.height = originalHeight + 'px';
      banner.style.maxHeight = '240px';
      entry.style.top = '40%';
      entry.play().catch(function () {});
      setTimeout(function () {
        if (logo) logo.style.removeProperty('display');
        taper.style.removeProperty('display');
      }, 1000);
    };

    banner.addEventListener('click', function (event) {
      if (expanded || event.composedPath().some(function (node) {
        var classes = node && node.classList;
        return classes && (classes.contains('banner-game') || classes.contains('inner-logo'));
      }) || !isStartSignClick(event)) return;

      expanded = true;
      originalHeight = banner.clientHeight;
      if (logo) logo.style.display = 'none';
      taper.style.display = 'none';
      entry.style.top = '50%';
      entry.pause();
      var height = banner.clientWidth / (16 / 3);
      banner.style.height = height + 'px';
      banner.style.maxHeight = height + 'px';

      var prelude = createVideo(PRELUDE_VIDEO);
      prelude.className = 'spring-prelude';
      prelude.style.cssText = 'position:absolute;bottom:0;left:0;width:0;height:0;object-fit:cover;object-position:center;image-rendering:pixelated';
      document.body.appendChild(prelude);
      timeout = setTimeout(function () {
        loadGameScript().then(function () {
          prelude.style.width = '100%';
          prelude.style.height = '100%';
          banner.appendChild(prelude);
          activity = new global.BannerGameSpring2022(banner);
          var ended = new Promise(function (resolve) { prelude.onended = resolve; });
          prelude.play().catch(function () {});
          return Promise.all([ended, activity.init()]);
        }).then(function () {
          if (prelude.parentNode) prelude.parentNode.removeChild(prelude);
          window.removeEventListener('keydown', preventGameKeys);
          if (localStorage.getItem('banner_game_2022_spring')) {
            activity.gameContainer.focus();
            activity.start();
          } else {
            localStorage.setItem('banner_game_2022_spring', '1');
            activity.showGuide();
            activity.renderFirstFrame();
          }
          activity.onExit = restore;
          inactivityTimer = setInterval(function () {
            if (performance.now() - activity.lastActive > 300000) {
              restore();
              if (activity && activity.destroy) activity.destroy();
            }
          }, 30000);
        }).catch(function (error) {
          if (global.console) console.error('[spring2022]', error);
          if (prelude.parentNode) prelude.parentNode.removeChild(prelude);
          restore();
        });
      }, 1000);
      window.addEventListener('keydown', preventGameKeys);
    });
    banner._spring2022Restore = restore;
  }

  function watch() {
    var target = document.getElementById('biliMainHeader');
    if (!target) return;
    var observer = new MutationObserver(function () {
      var banner = target.querySelector('.local-bili-header');
      if (banner && banner.querySelector('img[src*="2022-spring"]')) install(banner);
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  global.addEventListener('DOMContentLoaded', watch);
}(window));
