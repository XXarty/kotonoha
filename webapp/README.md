# KOTONOHA web app

KOTONOHA 是一个非商业日语学习 MVP。公开词汇、语法和五十音都来自仓库中已校验的静态 JSON；Neon 只用于可选的登录、个人进度与收藏。

## 运行环境

- Node.js `20.19+`、`22.13+` 或 `24+`（仓库 `.nvmrc` 使用 22.13）
- npm
- 仅在重新生成内容时需要 Python 3.12

```bash
nvm use
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。公开首页、目录、详情、搜索、来源页和访客本地评分不需要任何环境变量。

## 学习体验

- 顶部“搜索”会在当前页面打开全站搜索层，不会跳转到独立搜索页。搜索层第一次打开时才加载公开的 `/content/search-index.json`，之后在当前会话复用缓存；日文、假名、罗马字和中文释义都可以查询。旧的 `/search?q=...` 收藏链接仍会兼容跳转并自动打开搜索层。
- 词汇目录把当前 10,000 条真实发布记录分成“日常核心”和“进阶扩展”，支持词性目录、层级筛选与每页 60 条的分页，避免一次渲染完整词库。
- 120 个语法单元分为基础、核心、常用表达、进阶四条路径，每条路径 30 个单元。
- 键盘可以完成搜索的打开、结果选择与关闭；搜索关闭后焦点回到触发按钮。主要交互目标不小于 44 × 44 像素，并在 `prefers-reduced-motion: reduce` 下关闭非必要动画和位移。
- 未配置 Neon 时，全部公开内容、搜索、目录、详情和访客本地评分仍可使用；Neon 只负责可选账户、收藏与跨设备学习进度。

## 内容架构

部署所需内容已提交在 `src/content/generated/`：

- `vocabulary.json`：10,000 条通过写法、读音与词性门槛的 JMdict + Kaikki 中文维基词典词汇（5,000 条日常核心、5,000 条进阶扩展）
- `grammar.json`：120 个语法单元，基础、核心、常用表达与进阶四条路径各 30 个
- `kana.json`：46 组 CC0 基础五十音
- `vocabulary-retirements.json`：扩充前 2,000 个稳定词汇 ID 的保留或退役原因，逐 ID 可审计
- `sources.json`、`manifest.json`、`ATTRIBUTION.md`：来源、许可、快照日期与哈希

本次词汇快照固定为：

| 来源 | 官方资产与日期 | SHA-256 |
| --- | --- | --- |
| JMdict Simplified English full | [release `3.6.2+20260713141310`](https://github.com/scriptin/jmdict-simplified/releases/tag/3.6.2%2B20260713141310)，词典日期 2026-07-13；资产 `jmdict-eng-3.6.2+20260713141310.json.tgz` | `f2d1c9bf6f3283ceb2342edee16a06e4e912bb3ff5d08cc2108cd4844392d3e3` |
| Kaikki 中文维基词典 raw Wiktextract | [官方 raw-data 页面](https://kaikki.org/zhwiktionary/rawdata.html)，zhwiktionary dump 日期 2026-07-06，提取日期 2026-07-11；资产 `raw-wiktextract-data.jsonl.gz` | `0bbfb811f6abfd0a10c829908d5e9ec08325a968033194144fb32d11cb9e25db` |

机器可读的固定输入在 `data/content/sources/pinned-2026-07-15.json`。每个远程快照都带精确 `artifact_name`、HTTPS `asset_url` 与 SHA-256；本地课程和五十音快照使用仓库相对路径。无需手工填写被忽略的构建文件。

严格匹配后发布了上限 10,000 条；未发布候选按原因记录在 manifest：缺少可用中文释义 168,373 条、词性不兼容 28,544 条、中文候选歧义 2,995 条、无效或非中文释义事件 343 次、移除残留标题/网址等结构标记 16 次。每条已发布记录至少保留一条含 CJK 字符的中文释义；`COVID-19` 这类窄范围标准缩写只允许作为中文释义旁的辅助项。拒绝统计是质量证据，不会为了凑数改写中文释义。

兼容 pin 文件 `data/content/pins/pre-expansion-vocabulary-ids.json` 从提交 `d5b5ccb` 的 2,000 条线上词汇机械提取并排序。当前门槛下 496 条仍满足写法、读音、词性和中文质量要求，已在相同 tier 容量内优先保留；其余 1,504 条均因当前 JMdict/Kaikki 词性不兼容而逐 ID 退役，没有任何合格 pin 因 10,000 条切片被挤出。

词汇许可按组件区分：

- JMdict：遵守 [EDRDG redistribution terms](https://www.edrdg.org/edrdg/licence.html)。
- Kaikki/Wiktionary 派生中文释义：遵守 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)，数据入口为 [Kaikki 中文维基词典 raw data](https://kaikki.org/zhwiktionary/rawdata.html)。

Vercel 构建不会下载词典，也不会从 Neon 读取公开内容。验证已提交内容：

```bash
cd ..
.venv-content/bin/python scripts/content/build_static_bundle.py \
  --verify webapp/src/content/generated \
  --public-dir webapp/public
.venv-content/bin/python -m pytest tests/content -q
```

上游原始文件与构建草稿位于被忽略的 `data/content/upstream/` 和 `data/content/build/`。它们只用于离线重建；不要提交完整上游词典，Vercel 也不会下载它们。

从仓库根目录重建当前快照：

```bash
.venv-content/bin/python scripts/content/fetch_sources.py \
  --url 'https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20260713141310/jmdict-eng-3.6.2%2B20260713141310.json.tgz' \
  --output 'data/content/upstream/jmdict-eng-3.6.2+20260713141310.json.tgz' \
  --expected-sha256 f2d1c9bf6f3283ceb2342edee16a06e4e912bb3ff5d08cc2108cd4844392d3e3
.venv-content/bin/python scripts/content/fetch_sources.py \
  --url 'https://kaikki.org/zhwiktionary/raw-wiktextract-data.jsonl.gz' \
  --output data/content/upstream/kaikki-zh.jsonl.gz \
  --expected-sha256 0bbfb811f6abfd0a10c829908d5e9ec08325a968033194144fb32d11cb9e25db
tar -xzf 'data/content/upstream/jmdict-eng-3.6.2+20260713141310.json.tgz' \
  -C data/content/upstream
mv data/content/upstream/jmdict-eng-3.6.2.json \
  data/content/upstream/jmdict-eng-full.json

.venv-content/bin/python scripts/content/build_vocabulary.py \
  --jmdict data/content/upstream/jmdict-eng-full.json \
  --kaikki data/content/upstream/kaikki-zh.jsonl.gz \
  --limit 10000 \
  --core-limit 5000 \
  --pins data/content/pins/pre-expansion-vocabulary-ids.json \
  --retirements data/content/build/vocabulary-retirements.json \
  --baseline-commit d5b5ccb \
  --output data/content/build/vocabulary.json \
  --rejections data/content/build/rejections.json
.venv-content/bin/python scripts/content/validate_grammar.py data/content/grammar
.venv-content/bin/python scripts/content/build_static_bundle.py \
  --vocabulary data/content/build/vocabulary.json \
  --grammar data/content/grammar \
  --kana data/content/kana/gojuon.json \
  --source-metadata data/content/sources/pinned-2026-07-15.json \
  --rejections data/content/build/rejections.json \
  --retirements data/content/build/vocabulary-retirements.json \
  --output webapp/src/content/generated \
  --public-dir webapp/public
```

上述命令可从 clean checkout 直接执行；只需安装 Python 依赖并下载两个被忽略的上游资产。打包器会在临时目录验证数量、pin 分区、来源、引用和文件哈希，通过后才原子替换已提交快照。

## 可选的账号与进度

复制 `.env.example` 并设置：

- `DATABASE_URL`：Neon PostgreSQL 连接串
- `BETTER_AUTH_SECRET`：至少 32 字符
- `BETTER_AUTH_URL`、`NEXT_PUBLIC_APP_URL`：部署地址

然后执行：

```bash
npm run db:migrate
```

迁移 `0003_text_content_ids.sql` 将进度和收藏的静态内容 ID 改为文本并保留已有行。未配置 Neon 时，登录与跨设备同步不可用，但公开学习功能保持可用。

## 发布检查

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

端到端测试覆盖 360、768、1024 和 1440 像素宽度的访客学习路径。

## Vercel

将项目根目录设置为 `webapp/`，构建命令使用 `npm run build`。仅在需要账号同步时配置上述环境变量。120 条语法中，114 条直接对应 Tae Kim 课程并保持 `CC BY-NC-SA 3.0`；6 条 KOTONOHA 原创扩展单独标为 `All rights reserved`，课程语境链接不冒充直接来源。包含该语法包的网站必须保持非商业用途。

发布时先从本目录创建 Preview：

```bash
vercel deploy . -y
```

Preview 验证通过并获得明确确认后，才可以执行生产发布。本 README 不把尚未验证的 Preview 地址写成 Production URL，也不在确认前使用 `--prod`。
