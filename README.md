# bili-header

B 站历届首页头图归档。

通用渲染器`js/bili-header.js`支持 PNG、WebM/MP4 分层和时段切换
2022 春/夏/秋的互动活动由对应的`js/bili-header-*.js`提供。

## 导入

```sh
node tools/import-header.js '<接口 URL 或 JSON 文件>' --id <id> --register
```

会下载 `split_layer`、`timeLayers`、`timeGroups` 引用的资源，改写为 `/banner/data/<sha1>.<ext>`；默认不覆盖已有文件，更新加 `--force`。

## 目录

| 路径 | 说明 |
|---|---|
| `js/bili-header.js` | 通用渲染器 |
| `js/header-controls.js` | 季节/时段/功能控件 |
| `js/bili-header-*.js` | 各季节互动活动适配器 |
| `seasons/<id>/banner/header.json` | 头图数据，资源平铺在 `banner/data/` |
| `config/seasons.json` | 季节清单，按年份 + 春→夏→秋→冬排序 |
| `tools/` | 导入与解析工具 |
