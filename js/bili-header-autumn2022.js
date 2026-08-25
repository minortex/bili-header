/* 2022 autumn interactive banner extension. */
(function (global) {
  'use strict';

  var STYLE_ID = 'local-bili-header-autumn2022-style';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.local-bili-header--autumn2022{transition:height .72s cubic-bezier(.22,.61,.36,1);max-height:240px}',
      '.local-bili-header__autumn-video{position:absolute;left:0;top:0;z-index:1;width:100%;height:auto;aspect-ratio:16 / 3;object-fit:cover;object-position:center;transform:translateY(-4%);pointer-events:none}',
      '.local-bili-header__autumn-hitarea{position:absolute;top:36%;left:15%;z-index:4;width:85%;height:64%;cursor:pointer}',
      '.local-bili-header__autumn-scene{position:absolute;top:50%;left:50%;z-index:1;width:100%;height:100%;transform:translate(-50%,-50%);overflow:hidden;pointer-events:auto}',
      '.local-bili-header__autumn-scene canvas{display:block;width:100%;height:100%;pointer-events:auto}'
    ].join('');
    document.head.appendChild(style);
  }

  function installAutumn2022(banner, autumnSource, options, assetUrl, refs) {
    installStyles();
    var staticImage = refs.staticImage;
    var logoLink = refs.logoLink;
    var shadow = refs.shadow;
    if (autumnSource) {
          banner.classList.add('local-bili-header--autumn2022');
          var autumnVideo = document.createElement('video');
          autumnVideo.className = 'local-bili-header__autumn-video';
          autumnVideo.src = assetUrl(autumnSource, options.assetBase);
          autumnVideo.muted = true;
          autumnVideo.loop = true;
          autumnVideo.autoplay = true;
          autumnVideo.playsInline = true;
          autumnVideo.preload = 'auto';
          autumnVideo.setAttribute('aria-hidden', 'true');
          autumnVideo.play().catch(function () {});
          banner.appendChild(autumnVideo);

          var autumnScene = document.createElement('div');
          autumnScene.className = 'local-bili-header__autumn-scene';
          autumnScene.style.display = 'none';
          banner.appendChild(autumnScene);

          var autumnHitArea = document.createElement('div');
          autumnHitArea.className = 'local-bili-header__autumn-hitarea';
          autumnHitArea.setAttribute('role', 'button');
          autumnHitArea.setAttribute('tabindex', '0');
          var autumnExpanded = false;
          var autumnActivity = null;
          var autumnOriginalHeight = null;
          var autumnLayoutTimer = 0;
          var autumnLayoutReady = null;
          var autumnLayoutResolve = null;
          var autumnControlsObserver = null;
          var resizeAutumnActivity = function () {
            window.dispatchEvent(new Event('resize'));
          };
          var finishAutumnLayout = function () {
            clearTimeout(autumnLayoutTimer);
            autumnLayoutTimer = 0;
            if (autumnLayoutResolve) {
              autumnLayoutResolve();
              autumnLayoutResolve = null;
            }
            resizeAutumnActivity();
            if (autumnExpanded) autumnScene.style.visibility = 'visible';
          };
          var loadAutumnScript = function () {
            window.__BILI_AUTUMN_BASE__ = assetUrl('/banner/autumn/', options.assetBase);
            if (window.autumn2022) return Promise.resolve();
            var existing = document.querySelector('script[data-local-autumn2022]');
            if (existing) return new Promise(function (resolve, reject) {
              existing.addEventListener('load', resolve, { once: true });
              existing.addEventListener('error', reject, { once: true });
            });
            var script = document.createElement('script');
            script.src = assetUrl('/banner/autumn/autumn.js', options.assetBase);
            script.dataset.localAutumn2022 = 'true';
            document.head.appendChild(script);
            return new Promise(function (resolve, reject) {
              script.addEventListener('load', resolve, { once: true });
              script.addEventListener('error', reject, { once: true });
            });
          };
          var restoreAutumn = function () {
            if (!autumnExpanded && !autumnActivity) return;
            autumnExpanded = false;
            clearTimeout(autumnLayoutTimer);
            autumnLayoutTimer = 0;
            if (autumnLayoutResolve) {
              autumnLayoutResolve();
              autumnLayoutResolve = null;
            }
            if (autumnControlsObserver) {
              autumnControlsObserver.disconnect();
              autumnControlsObserver = null;
            }
            var activity = autumnActivity;
            autumnActivity = null;
            // The official dispose() invokes onExit; detach it before disposal.
            if (activity) {
              activity.onExit = null;
              if (activity.dispose) activity.dispose();
            }
            autumnScene.replaceChildren();
            autumnScene.style.display = 'none';
            autumnScene.style.visibility = 'hidden';
            banner.style.height = autumnOriginalHeight + 'px';
            banner.style.maxHeight = '240px';
            autumnVideo.style.transform = 'translateY(-4%)';
            autumnVideo.play().catch(function () {});
            if (staticImage) staticImage.style.display = '';
            if (logoLink) logoLink.style.display = '';
            shadow.style.display = '';
            autumnHitArea.style.display = '';
            autumnHitArea.setAttribute('aria-pressed', 'false');
          };
          var bindAutumnExitControl = function () {
            var controls = Array.prototype.slice.call(banner.children).find(function (node) {
              var style = node && node.style;
              return style && style.position === 'absolute' && style.top === '24px' && style.right === '24px';
            });
            if (!controls || controls.dataset.localAutumnExitBound === 'true') return Boolean(controls);
            var close = controls.firstElementChild;
            if (!close) return false;
            close.addEventListener('click', function () {
              // The official handler may run first and dispose the activity. This
              // fallback keeps the shell restoration independent of promise timing.
              setTimeout(restoreAutumn, 0);
            }, true);
            controls.dataset.localAutumnExitBound = 'true';
            return true;
          };
          var toggleAutumn = function () {
            if (autumnExpanded) return;
            autumnExpanded = !autumnExpanded;
            autumnOriginalHeight = banner.clientHeight;
            var height = Math.max(155, banner.clientWidth * 3 / 16);
            autumnVideo.pause();
            autumnVideo.style.transform = 'translateY(0)';
            if (staticImage) staticImage.style.display = 'none';
            if (logoLink) logoLink.style.display = 'none';
            shadow.style.display = 'none';
            autumnHitArea.style.display = 'none';
            autumnScene.style.display = '';
            autumnScene.style.visibility = 'hidden';
            banner.style.height = height + 'px';
            banner.style.maxHeight = height + 'px';
            autumnLayoutReady = new Promise(function (resolve) {
              autumnLayoutResolve = resolve;
            });
            // The official activity sizes its renderer once from clientHeight. The
            // shell animates to the expanded height, so notify it after the motion.
            banner.addEventListener('transitionend', finishAutumnLayout, { once: true });
            autumnLayoutTimer = setTimeout(finishAutumnLayout, 800);
            autumnHitArea.setAttribute('aria-pressed', String(autumnExpanded));
            if (global.CustomEvent) banner.dispatchEvent(new CustomEvent('banner-expand', { detail: autumnExpanded }));
            loadAutumnScript().then(function () {
              if (!window.autumn2022) throw new Error('autumn2022 activity entry was not found');
              return autumnLayoutReady.then(function () {
                if (!autumnExpanded) return null;
                bindAutumnExitControl();
                if (!autumnControlsObserver) {
                  autumnControlsObserver = new MutationObserver(bindAutumnExitControl);
                  autumnControlsObserver.observe(banner, { childList: true });
                }
                return window.autumn2022(autumnScene);
              });
            }).then(function (activity) {
              if (!autumnExpanded) {
                if (activity) {
                  activity.onExit = null;
                  if (activity.dispose) activity.dispose();
                }
                return;
              }
              autumnActivity = activity;
              if (activity) activity.onExit = restoreAutumn;
              bindAutumnExitControl();
            }).catch(function (error) {
              if (global.console) console.error('[BiliHeader] autumn activity failed', error);
              restoreAutumn();
            });
          };
          autumnHitArea.addEventListener('click', function (event) {
            if (!event.composedPath().some(function (node) { return node.classList && node.classList.contains('local-bili-header__logo-link'); })) toggleAutumn();
          });
          autumnHitArea.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleAutumn(); }
          });
          banner.appendChild(autumnHitArea);
    }
  }

  global.BiliHeaderExtensions = global.BiliHeaderExtensions || {};
  global.BiliHeaderExtensions.autumn2022 = installAutumn2022;
}(window));
