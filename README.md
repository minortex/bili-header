## 历程

在线预览：<https://minortex.github.io/bili-header/>

这次阿b使坏了，没有出现 `header.json` 而是直接访问一个 header/v2 获取，不过用图片url直接搜索，还是能找到这个路径的。

当前页面使用通用的 `js/bili-header.js`，控件逻辑位于 `js/header-controls.js`。渲染器只依赖 Bilibili 的 `header.json` 协议，可用于不同季节的头图（包括 PNG、WebM/MP4 分层）。2022 秋季的特殊 Three.js 活动单独位于 `js/bili-header-autumn2022.js`，页面需要先加载它，再加载通用渲染器：

```html
<script src="./js/bili-header-autumn2022.js"></script>
<script src="./js/bili-header.js"></script>
```

```js
const header = new BiliHeader({ config: {
  dataUrl: 'seasons/2026-spring-summer/banner/header.json',
  assetBase: 'seasons/2026-spring-summer',
  theme: 'light',
  showLogo: true
} })
header.init(document.querySelector('#biliMainHeader'))
```

更换季节时只需传入对应的 `config.dataUrl`，例如 `seasons/2025-summer-winter/banner/header.json`；旧版 `frontpage.json` 也支持，脚本会自动识别 `logo + litpic` 字段。资源路径使用当前站点和季节目录，可直接部署到域名或子目录。若不需要视差，可设置 `config.parallax = false`。logo 和顶部阴影默认关闭，可通过 `config.showLogo`、`config.showShadow` 或运行时的 `header.toggleFeature('logo'/'shadow')` 开关控制。

带时段的头图（如 2021 夏、2021 冬）在 `data` 中使用两种字段之一：

- `timeLayers`：每项是一个时段场景，如 `{ "name": "白天", "timeIndex": 0, "resources": [...] }`。
- `timeGroups`：每项是一个时段，`{ "name": "00:00 - 06:00", "layers": [...] }`，同一时段的全部图层一起显示。

渲染器会生成时段按钮（`banner._timeOptions`），点击后调用 `header.setTime(index)`；没有这两个字段时保持原有分层行为。

## 导入 Bilibili header/v2 或 JSON

使用 Node.js 18+ 的零依赖工具，把 Bilibili 接口 URL 或已经格式化的 JSON 完整归档为本项目的本地协议：

```sh
node tools/import-header.js 'https://api.bilibili.com/x/web-show/page/header/v2?category=0&web_location=333.934' \
  --id 2026-spring-summer --register
```

也可以传入本地 JSON 文件：

```sh
node tools/import-header.js seasons/2026-summer/banner/header.json \
  --id 2026-summer --register
```

工具会解析 `data.split_layer`、`data.timeLayers` 和 `data.timeGroups`，下载主图和所有分层/时段资源，生成 `seasons/<id>/banner/header.json`，并将远程地址统一改写为 `/banner/data/<sha1>.<ext>`。`--id` 应与季节目录名一致；`--register` 会按年份 + 季节（春→夏→秋→冬）排序写入 `config/seasons.json`。默认不会覆盖已有文件；需要更新同一季时显式加 `--force`。

季节清单位于 [`config/seasons.json`](config/seasons.json)。每项包含稳定的 `id`、页面显示用的 `label`、头图 JSON 的 `dataUrl` 和资源目录 `assetBase`。重命名目录、JSON 文件或按钮文字时只需修改该文件，无需改运行器或 HTML。`header.load(season)` 接受完整季节对象，也继续兼容直接传入 URL 字符串。

目录约定：`js/` 存放通用渲染器和页面控件，`js/bili-header-*.js` 存放对应季节的互动活动适配器；`seasons/<id>/banner/header.json` 是头图数据，图片和视频统一平铺在 `seasons/<id>/banner/data/`，文件名使用资源 URL 的 sha1；`config/seasons.json` 按年份 + 季节（春→夏→秋→冬）排序，`id` 与季节目录名一致；`tools/` 只保留资源导入与解析工具。
