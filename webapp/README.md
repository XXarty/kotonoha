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

- `vocabulary.json`：2,000 条 JMdict + Kaikki 中文维基词典词汇
- `grammar.json`：30 个依据 Tae Kim 指南重新组织的基础语法单元
- `kana.json`：46 组 CC0 基础五十音
- `sources.json`、`manifest.json`、`ATTRIBUTION.md`：来源、许可、快照日期与哈希

Vercel 构建不会下载词典，也不会从 Neon 读取公开内容。验证已提交内容：

```bash
cd ..
.venv-content/bin/python scripts/content/build_static_bundle.py \
  --verify webapp/src/content/generated
.venv-content/bin/python -m pytest tests/content -q
```

上游原始文件与构建草稿位于被忽略的 `data/content/upstream/` 和 `data/content/build/`。生成流程及固定来源命令记录在仓库实现计划中；不要提交完整上游词典。

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

将项目根目录设置为 `webapp/`，构建命令使用 `npm run build`。仅在需要账号同步时配置上述环境变量。项目启用 Tae Kim 的 CC BY-NC-SA 内容期间必须保持非商业。
