/* 2022 summer interactive banner extension. */
(function (global) {
  'use strict';

  var ROOT = 'seasons/2022-summer/banner/summer-game/';
  var GAME = ROOT + 'game.js';
  var mounted = null;

  function installStyles() {
    if (document.getElementById('local-bili-header-summer2022-style')) return;
    var style = document.createElement('style');
    style.id = 'local-bili-header-summer2022-style';
    style.textContent = [
      '.local-bili-header--summer2022{overflow:hidden;transition:height .6s linear}',
      '.local-bili-header--summer2022 .summer-banner{position:absolute;top:80%;left:50%;z-index:3;width:100%;min-width:1654px;transform:translate(-50%,-50%);transition:top .6s linear;height:calc(max(100vw, 1654px) * .1875)}',
      '.local-bili-header--summer2022 .summer-banner canvas{display:block;width:100%;height:100%;position:absolute;top:0;left:0}',
      '.local-bili-header--summer2022 .local-bili-header__static{z-index:0}',
      '.local-bili-header--summer2022 .local-bili-header__logo-link{z-index:5}',
      '.local-bili-header--summer2022>div[style*="top: 24px"][style*="right: 24px"]{z-index:10!important}',
      '.local-bili-header--summer2022>div[style*="top: 24px"][style*="right: 24px"] img{z-index:11!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function loadScript() {
    if (global.summer2022) return Promise.resolve();
    var existing = document.querySelector('script[data-local-summer2022-game]');
    if (existing) return new Promise(function (resolve, reject) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
    var script = document.createElement('script');
    script.src = GAME;
    script.dataset.localSummer2022Game = 'true';
    document.head.appendChild(script);
    return new Promise(function (resolve, reject) {
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
    });
  }

  function installSummer2022(banner, source, options, assetUrl, refs) {
    if (mounted === banner || !banner) return;
    mounted = banner;
    installStyles();
    banner.classList.add('local-bili-header--summer2022');
    var originalHeight = 155;
    var staticImage = refs.staticImage;
    var logo = refs.logoLink;
    var shadow = refs.shadow;
    var scene = document.createElement('div');
    scene.className = 'summer-banner';
    scene.style.display = '';
    scene.style.top = '80%';
    banner.appendChild(scene);
    banner.style.height = originalHeight + 'px';
    banner.style.maxHeight = '240px';
    var expanded = false;
    var activity = null;
    var resizeTimer = 0;
    var exitObserver = null;

    function closeSummer() {
      expanded = false;
      clearTimeout(resizeTimer);
      if (activity && activity.toggleExtend) activity.toggleExtend(false);
      scene.style.top = '80%';
      banner.style.height = originalHeight + 'px';
      banner.style.maxHeight = '240px';
      if (staticImage) staticImage.style.display = '';
      if (logo) logo.style.display = '';
      if (shadow) shadow.style.display = '';
    }

    function raiseExitControl() {
      Array.prototype.forEach.call(banner.children, function (node) {
        var style = node && node.style;
        if (style && style.top === '24px' && style.right === '24px') {
          style.zIndex = '20';
          if (node.firstElementChild) node.firstElementChild.style.zIndex = '21';
          if (node.dataset.localSummerExitBound !== 'true') {
            node.addEventListener('click', function (event) {
              event.preventDefault();
              event.stopPropagation();
              closeSummer();
            }, true);
            node.dataset.localSummerExitBound = 'true';
          }
        }
      });
    }

    function restore() {
      if (!expanded) return;
      closeSummer();
    }

    function setInitialState() {
      expanded = false;
      banner.style.height = originalHeight + 'px';
      banner.style.maxHeight = '240px';
      scene.style.top = '80%';
      if (staticImage) staticImage.style.display = '';
      if (logo) logo.style.display = '';
      if (shadow) shadow.style.display = '';
    }

    function expand() {
      if (expanded) return;
      expanded = true;
      var height = Math.max(155, banner.clientWidth * 3 / 16);
      if (staticImage) staticImage.style.display = 'none';
      if (logo) logo.style.display = 'none';
      if (shadow) shadow.style.display = 'none';
      scene.style.display = '';
      scene.style.top = '50%';
      banner.style.height = height + 'px';
      banner.style.maxHeight = height + 'px';
      // Let the banner finish its height/top transition before creating the
      // renderer. The official scene is sized from a stable 1920x360 surface.
      if (activity && activity.toggleExtend) {
        activity.toggleExtend(true);
        raiseExitControl();
      }
    }

    banner.addEventListener('click', function (event) {
      if (expanded || event.composedPath().some(function (node) {
        return node && node.classList && node.classList.contains('local-bili-header__logo-link');
      })) return;
      // The official Canvas owns the controls after expansion. Before that, any
      // click on the visible banner is the activity entry.
      expand();
    });
    banner._summer2022Restore = restore;

    loadScript().then(function () {
      if (!global.summer2022) throw new Error('summer2022 activity entry was not found');
      return global.summer2022(scene);
    }).then(function (result) {
      activity = result;
      if (activity) {
        activity.onExit = restore;
        // The activity creates its hit areas hidden. Apply the current shell
        // state exactly once after its async media setup has completed.
        activity.toggleExtend(Boolean(expanded));
        if (expanded) raiseExitControl();
        else setInitialState();
      }
    }).catch(function (error) {
      if (global.console) console.error('[BiliHeader] summer activity failed', error);
      scene.style.display = 'none';
    });
    exitObserver = new MutationObserver(raiseExitControl);
    exitObserver.observe(banner, { childList: true });
  }

  function watch() {
    var target = document.getElementById('biliMainHeader');
    if (!target) return;
    var mount = function () {
      var banner = target.querySelector('.local-bili-header');
      if (!banner || !banner.querySelector('img[src*="2022-summer"]')) return;
      installSummer2022(banner, null, { assetBase: 'seasons/2022-summer' }, function (source) { return source; }, {
        staticImage: banner.querySelector('.local-bili-header__static'),
        logoLink: banner.querySelector('.local-bili-header__logo-link'),
        shadow: banner.querySelector('.local-bili-header__shadow')
      });
    };
    new MutationObserver(mount).observe(target, { childList: true, subtree: true });
    mount();
  }

  global.BiliHeaderExtensions = global.BiliHeaderExtensions || {};
  global.BiliHeaderExtensions.summer2022 = installSummer2022;
  global.addEventListener('DOMContentLoaded', watch);
}(window));
