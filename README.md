## 历程

这次阿b使坏了，没有出现 `header.json` 而是直接访问一个 header/v2 获取，不过用图片url直接搜索，还是能找到这个路径的。

当前页面使用通用的 `js/bili-header.js`，控件逻辑位于 `js/header-controls.js`。渲染器只依赖 Bilibili 的 `header.json` 协议，可用于不同季节的头图（包括 PNG、WebM/MP4 分层）：

```js
const header = new BiliHeader({ config: { theme: 'light', showLogo: true } })
header.init(document.querySelector('#biliMainHeader'))
```

更换季节时只需传入对应的 `config.dataUrl`，例如 `seasons/2025-summer-winter/banner/header.json`；旧版 `frontpage.json` 也支持，脚本会自动识别 `logo + litpic` 字段。资源路径使用当前站点和季节目录，可直接部署到域名或子目录。若不需要视差，可设置 `config.parallax = false`。logo 和顶部阴影默认关闭，可通过 `config.showLogo`、`config.showShadow` 或运行时的 `header.toggleFeature('logo'/'shadow')` 开关控制。
