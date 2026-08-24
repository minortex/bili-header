/* Lightweight BiliHeader replacement for the local banner archive. */
(function (global) {
  'use strict';

  var STYLE_ID = 'local-bili-header-style';
  var DEFAULTS = {
    dataUrl: 'seasons/2026-spring-summer/banner/header.json',
    height: null,
    parallax: true,
    showLogo: false,
    showShadow: false,
    theme: 'light'
  };

  function merge(base, extra) {
    var result = {};
    Object.keys(base).forEach(function (key) { result[key] = base[key]; });
    Object.keys(extra || {}).forEach(function (key) { result[key] = extra[key]; });
    return result;
  }

  function assetUrl(source, assetBase) {
    if (!source) return '';
    try {
      var url = new URL(source, document.baseURI);
      // The extracted JSON contains the original localhost host. Keep assets
      // portable when the archive is served from another host or port.
      var path = url.hostname === 'localhost' ? url.pathname + url.search : url.href;
      if (assetBase && path.indexOf('/banner/') === 0) return assetBase + path;
      return path;
    } catch (_) {
      return source;
    }
  }

  function createMedia(source, assetBase) {
    var url = assetUrl(source, assetBase);
    var video = /\.(webm|mp4)(?:[?#]|$)/i.test(url);
    var media = document.createElement(video ? 'video' : 'img');
    media.className = 'local-bili-header__layer';
    media.alt = '';
    if (video) {
      media.muted = true;
      media.loop = true;
      media.autoplay = true;
      media.playsInline = true;
      media.preload = 'auto';
    } else {
      media.loading = 'eager';
    }
    media.src = url;
    return media;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      'html,body{margin:0}',
      '.local-bili-header-host{display:block;width:100%;min-width:1100px;margin:0;padding:0}',
      '.local-bili-header{position:relative;z-index:0;width:100%;min-width:1000px;height:clamp(155px,9.375vw,240px);overflow:hidden;background-color:#e3e5e7}',
      '.local-bili-header__layers{position:absolute;inset:0;overflow:hidden}',
      '.local-bili-header__static{position:absolute;left:50%;top:0;width:100%;max-width:1920px;height:100%;transform:translateX(-50%);object-fit:cover;object-position:center top}',
      '.local-bili-header__shadow{position:absolute;top:0;left:0;z-index:1;width:100%;height:100px;background:linear-gradient(rgba(0,0,0,.4),transparent);pointer-events:none}',
      '.local-bili-header__layer{position:absolute;left:50%;top:50%;width:auto;height:auto;max-width:none;object-fit:cover}',
      '.local-bili-header__logo-link{position:absolute;left:56px;bottom:10px;z-index:2;display:block;width:220px;height:50%;min-height:60px}',
      '.local-bili-header__logo{display:block;width:162px;height:78px;object-fit:contain;object-position:left bottom}',
      '.local-bili-header__fallback{width:100%;height:100%;object-fit:cover;object-position:center}',
      '@media (min-width:1367px) and (max-width:1700.9px){.local-bili-header__logo-link{left:64px}}',
      '@media (min-width:1701px) and (max-width:2199.9px){.local-bili-header__logo-link{left:96px}}',
      '@media (min-width:2200px){.local-bili-header__logo-link{left:max(96px,calc((100vw - 2078px)/2))}}',
      '@media (prefers-reduced-motion:reduce){.local-bili-header__layer{transition:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function curve(curvePoints, value) {
    if (!curvePoints || curvePoints.length !== 4) return value;
    var sign = value < 0 ? -1 : 1;
    var t = Math.min(1, Math.abs(value));
    var x1 = curvePoints[0], y1 = curvePoints[1], x2 = curvePoints[2], y2 = curvePoints[3];
    var lo = 0, hi = 1, u = t;
    for (var i = 0; i < 12; i++) {
      var x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
      if (x < t) lo = u; else hi = u;
      u = (lo + hi) / 2;
    }
    return sign * (3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u);
  }

  function motionValue(spec, progress) {
    if (!spec) return 0;
    return (Number(spec.offset) || 0) * curve(spec.offsetCurve, progress);
  }

  function renderBanner(target, data, options) {
    var banner = document.createElement('div');
    banner.className = 'local-bili-header';
    if (options.height) banner.style.setProperty('--banner-height', Math.max(155, Number(options.height)) + 'px');
    banner.setAttribute('role', 'img');
    banner.setAttribute('aria-label', data.name || 'Bilibili banner');
    var backgroundSource = data.pic || (data.logo ? data.litpic : null);
    var logoSource = data.logo || (data.pic ? data.litpic : null);
    if (backgroundSource) {
      var staticImage = document.createElement('img');
      staticImage.className = 'local-bili-header__static';
      staticImage.src = assetUrl(backgroundSource, options.assetBase);
      staticImage.alt = '';
      banner.appendChild(staticImage);
    }
    var shadow = document.createElement('div');
    shadow.className = 'local-bili-header__shadow';
    shadow.hidden = !options.showShadow;
    banner.appendChild(shadow);
    if (logoSource) {
      var logoLink = document.createElement('a');
      var logo = document.createElement('img');
      logoLink.className = 'local-bili-header__logo-link';
      logoLink.href = 'https://www.bilibili.com/';
      logoLink.target = '_blank';
      logoLink.rel = 'noopener';
      logo.className = 'local-bili-header__logo';
      logo.src = assetUrl(logoSource, options.assetBase);
      logo.alt = 'B站';
      logo.width = 162;
      logo.height = 78;
      logoLink.appendChild(logo);
      banner.appendChild(logoLink);
    }
    var layers = document.createElement('div');
    layers.className = 'local-bili-header__layers';

    var split;
    try { split = typeof data.split_layer === 'string' ? JSON.parse(data.split_layer) : data.split_layer; } catch (_) { split = null; }
    var entries = split && Array.isArray(split.layers) ? split.layers : [];
    var records = [];
    if (entries.length) {
      entries.forEach(function (layer) {
        var resource = layer.resources && layer.resources[0];
        if (!resource || !resource.src) return;
        var image = createMedia(resource.src, options.assetBase);
        var scale = layer.scale && Number(layer.scale.initial) > 0 ? Number(layer.scale.initial) : 1;
        var initialTranslate = layer.translate && layer.translate.initial || [0, 0];
        var initialRotate = layer.rotate && Number(layer.rotate.initial) || 0;
        var record = { image: image, layer: layer, scale: scale, initialTranslate: initialTranslate, initialRotate: initialRotate };
        records.push(record);
        var readyEvent = image.tagName === 'VIDEO' ? 'loadedmetadata' : 'load';
        image.addEventListener(readyEvent, function () {
          image.dataset.naturalWidth = image.tagName === 'VIDEO' ? image.videoWidth : image.naturalWidth;
          image.dataset.naturalHeight = image.tagName === 'VIDEO' ? image.videoHeight : image.naturalHeight;
          image.dataset.scale = scale;
          resizeLayer(record, banner);
          if (image.tagName === 'VIDEO') image.play().catch(function () {});
        }, { once: true });
        image.style.transform = 'translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rotate)) scale(var(--layer-scale))';
        layers.appendChild(image);
      });
    } else if (data.pic || data.litpic) {
      var fallback = document.createElement('img');
      fallback.className = 'local-bili-header__fallback';
      fallback.src = assetUrl(data.pic || data.litpic);
      fallback.alt = data.name || 'Bilibili banner';
      layers.appendChild(fallback);
    }
    banner.appendChild(layers);
    target.replaceChildren(banner);
    thisFeatureState(banner, options);

    var resize = function () {
      records.forEach(function (record) { resizeLayer(record, banner); });
    };
    window.addEventListener('resize', resize, { passive: true });

    if (options.parallax && entries.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var progress = 0, startX = 0, inside = false, frame = 0, resetFrame = 0;
      var applyMotion = function (value) {
        records.forEach(function (record) {
          var layer = record.layer;
          var image = record.image;
          var ratio = banner.clientHeight / 155;
          var translate = layer.translate || {};
          var translateCurve = curve(translate.offsetCurve, value);
          var tx = (Number(record.initialTranslate[0]) || 0) + (translate.offset ? (Number(translate.offset[0]) || 0) * translateCurve : 0);
          var ty = (Number(record.initialTranslate[1]) || 0) + (translate.offset ? (Number(translate.offset[1]) || 0) * translateCurve : 0);
          image.style.setProperty('--tx', tx * ratio * record.scale + 'px');
          image.style.setProperty('--ty', ty * ratio * record.scale + 'px');
          image.style.setProperty('--rotate', (record.initialRotate + motionValue(layer.rotate, value)) + 'deg');
          image.style.setProperty('--layer-scale', 1 + motionValue(layer.scale, value));
          if (layer.opacity) image.style.opacity = Math.max(0, Math.min(1, (layer.opacity.initial == null ? 1 : layer.opacity.initial) + motionValue(layer.opacity, value)));
          if (layer.blur) image.style.filter = 'blur(' + Math.max(0, (layer.blur.initial || 0) + motionValue(layer.blur, value)) + 'px)';
        });
      };
      applyMotion(0);
      var move = function (event) {
        var rect = banner.getBoundingClientRect();
        if (event.clientY < rect.top || event.clientY >= rect.bottom) { reset(); return; }
        if (!inside) { inside = true; startX = event.clientX; }
        progress = (event.clientX - startX) / rect.width;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(function () { applyMotion(progress); });
      };
      var reset = function () {
        if (!inside) return;
        inside = false;
        var from = progress, started = performance.now();
        cancelAnimationFrame(resetFrame);
        var step = function (now) {
          var amount = Math.max(0, 1 - (now - started) / 200);
          progress = from * amount;
          applyMotion(progress);
          if (amount) resetFrame = requestAnimationFrame(step);
        };
        resetFrame = requestAnimationFrame(step);
      };
      document.addEventListener('mousemove', move, { passive: true });
      document.addEventListener('mouseleave', reset, { passive: true });
    }
    return banner;
  }

  function thisFeatureState(banner, options) {
    banner._logo = banner.querySelector('.local-bili-header__logo-link');
    banner._shadow = banner.querySelector('.local-bili-header__shadow');
    setFeatureVisibility(banner._logo, options.showLogo);
    setFeatureVisibility(banner._shadow, options.showShadow);
  }

  function setFeatureVisibility(node, enabled) {
    if (!node) return;
    node.hidden = !enabled;
    node.style.display = enabled ? '' : 'none';
  }

  function resizeLayer(record, banner) {
    var image = record.image;
    if (!image.dataset.naturalWidth) return;
    var ratio = banner.clientHeight / 155;
    var scale = Number(image.dataset.scale) || 1;
    image.style.width = Number(image.dataset.naturalWidth) * ratio * scale + 'px';
    image.style.height = Number(image.dataset.naturalHeight) * ratio * scale + 'px';
    image.style.setProperty('--tx', (record.initialTranslate[0] || 0) * ratio * scale + 'px');
    image.style.setProperty('--ty', (record.initialTranslate[1] || 0) * ratio * scale + 'px');
    image.style.setProperty('--rotate', record.initialRotate + 'deg');
    image.style.setProperty('--layer-scale', '1');
  }

  function BiliHeader(config) {
    this.config = merge(DEFAULTS, config && config.config);
    this.app = null;
    this.banner = null;
  }

  BiliHeader.prototype.init = function (target) {
    var element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) throw new TypeError('BiliHeader.init requires a target element');
    installStyles();
    this.target = element;
    element.classList.add('local-bili-header-host');
    var self = this;
    var theme = self.config.theme || 'light';
    document.documentElement.dataset.theme = theme;
    if (typeof self.config.themeSwitchHandler === 'function') self.config.themeSwitchHandler(theme);
    return this.load(self.config.dataUrl);
  };

  BiliHeader.prototype.load = function (dataUrl) {
    var self = this;
    if (!this.target) return Promise.reject(new Error('BiliHeader.init must be called before load'));
    this.config.dataUrl = dataUrl || this.config.dataUrl;
    this.config.assetBase = this.config.dataUrl.replace(/\/banner\/[^/]+\.json(?:[?#].*)?$/, '');
    return fetch(this.config.dataUrl).then(function (response) {
      if (!response.ok) throw new Error('Unable to load banner data (' + response.status + ')');
      return response.json();
    }).then(function (payload) {
      self.banner = renderBanner(self.target, payload.data || payload, self.config);
      return self.banner;
    }).catch(function (error) {
      self.target.textContent = '';
      self.target.setAttribute('data-banner-error', error.message);
      if (global.console) console.error('[BiliHeader]', error);
      return self.target;
    });
  };

  BiliHeader.prototype.setFeature = function (name, enabled) {
    if (name !== 'logo' && name !== 'shadow') throw new TypeError('Unknown header feature: ' + name);
    var key = name === 'logo' ? 'showLogo' : 'showShadow';
    this.config[key] = Boolean(enabled);
    if (!this.banner) return false;
    var node = this.banner[name === 'logo' ? '_logo' : '_shadow'];
    setFeatureVisibility(node, this.config[key]);
    return this.config[key];
  };

  BiliHeader.prototype.toggleFeature = function (name) {
    var key = name === 'logo' ? 'showLogo' : 'showShadow';
    return this.setFeature(name, !this.config[key]);
  };

  global.BiliHeader = BiliHeader;
}(window));
