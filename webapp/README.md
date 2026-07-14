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

## 内容架构

部署所需内容已提交在 `src/content/generated/`：

- `vocabulary.json`：10,000 条通过写法、读音与词性门槛的 JMdict + Kaikki 中文维基词典词汇（5,000 条日常核心、5,000 条进阶扩展）
- `grammar.json`：120 个语法单元，基础、核心、常用表达与进阶四条路径各 30 个
- `kana.json`：46 组 CC0 基础五十音
- `sources.json`、`manifest.json`、`ATTRIBUTION.md`：来源、许可、快照日期与哈希

本次词汇快照固定为：

| 来源 | 官方资产与日期 | SHA-256 |
| --- | --- | --- |
| JMdict Simplified English full | [release `3.6.2+20260713141310`](https://github.com/scriptin/jmdict-simplified/releases/tag/3.6.2%2B20260713141310)，词典日期 2026-07-13；资产 `jmdict-eng-3.6.2+20260713141310.json.tgz` | `f2d1c9bf6f3283ceb2342edee16a06e4e912bb3ff5d08cc2108cd4844392d3e3` |
| Kaikki 中文维基词典 raw Wiktextract | [官方 raw-data 页面](https://kaikki.org/zhwiktionary/rawdata.html)，zhwiktionary dump 日期 2026-07-06，提取日期 2026-07-11；资产 `raw-wiktextract-data.jsonl.gz` | `0bbfb811f6abfd0a10c829908d5e9ec08325a968033194144fb32d11cb9e25db` |

严格匹配后发布了上限 10,000 条；未发布候选按原因记录在 manifest：缺少可用中文释义 169,269 条、词性不兼容 27,675 条、中文候选歧义 2,999 条。构建器也会单独识别读音不匹配；本次没有产生非零的该类计数。拒绝统计是质量证据，不会为了凑数改写中文释义。

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
  --output data/content/build/vocabulary.json \
  --rejections data/content/build/rejections.json
.venv-content/bin/python scripts/content/validate_grammar.py data/content/grammar
.venv-content/bin/python scripts/content/build_static_bundle.py \
  --vocabulary data/content/build/vocabulary.json \
  --grammar data/content/grammar \
  --kana data/content/kana/gojuon.json \
  --source-metadata data/content/build/sources.json \
  --rejections data/content/build/rejections.json \
  --output webapp/src/content/generated \
  --public-dir webapp/public
```

`data/content/build/sources.json` 必须填入上表的固定 URL 对应日期和下载文件哈希；打包器会在临时目录验证数量、引用和文件哈希，通过后才原子替换已提交快照。

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
