# lottery-random-picker

移动端随机抽号器：粘贴号码列表 → Fisher-Yates 乱序 → 按数量抽取，并尽量降低排序后的连号数。

## 使用

直接用浏览器打开 `index.html` 即可（支持 `file://` 本地打开，无需服务器）。

1. 在号码列表粘贴空格/逗号分隔的号码
2. 点击底部「乱序抽取」
3. 查看抽取结果；可通过「乱序池」预览完整乱序列表

## 开发

```bash
npm install
npm test        # 单元测试（Vitest）
npm run test:watch
```

乱序核心逻辑在 `shuffle.js`；`index.html` 内联了相同逻辑以支持本地文件直接打开。修改算法时请同步两处。

## 技术栈

- 单页 HTML/CSS/JS，无构建步骤
- localStorage 持久化主题与历史
- Vitest 测试 Fisher-Yates 与连号优化抽取
