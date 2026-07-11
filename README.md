# lottery-random-picker

移动端随机抽号器：粘贴号码池 → Fisher-Yates 乱序 → 按数量抽取，并尽量降低排序后的连号数。

## 发给用户（单文件）

构建后取以下任一文件发送给用户，双击即可使用（支持 `file://`）：

- `release/index.html`
- 根目录 `index.html`（与 release 同步）

```bash
pnpm install
pnpm build
```

## 开发

源码在 `src/` 目录：

```
src/
├── index.html      # 页面结构
├── css/app.css     # 样式
└── js/
    ├── shuffle.js  # 乱序/抽取算法（Vitest 测试）
    └── app.js      # 界面逻辑
```

```bash
pnpm test           # 单元测试
pnpm build          # 打包为单文件 HTML
```

本地调试源码需通过 HTTP 服务打开（ES Module），例如：

```bash
pnpm dlx serve src
```

## 技术栈

- 单页 HTML/CSS/JS，构建后合并为一个文件
- localStorage 持久化主题与历史
- Vitest 测试 Fisher-Yates 与连号优化抽取
- esbuild 打包（IIFE，兼容 file://）
- pnpm 管理依赖
