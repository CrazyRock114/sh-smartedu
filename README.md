# 学迹 (Xueji) · 上海小学生学习辅助

> **v0.2 · 2026-07-30 重写**
> 状态: **阶段 1 进行中**

给上海小学生家长 + 孩子用的学习辅助 Web 网站。不重复造内容, 把 basic.sh.smartedu.cn
现有免费资源用好用透, 加上孩子自己的学情画像 + 错题本 + 知识图谱。

## 目录结构

```
sh-smartedu/
├── README.md               ← 你正在看
├── docs/                   ← 设计文档 (v0.2 方案)
│   ├── 01-家长孩子真痛点.md
│   ├── 02-产品设计.md
│   ├── 03-技术方案.md
│   ├── 04-数据模型.md
│   ├── 05-落地计划.md
│   └── 06-自查与待办.md
├── backend/                ← Python FastAPI 后端
│   ├── app/
│   │   ├── api/            ← 路由 (auth/child/error/knowledge/curriculum/push)
│   │   ├── core/           ← 配置/数据库/安全
│   │   ├── models/         ← 9 个 ORM 模型
│   │   └── main.py
│   ├── scripts/seed_data.py ← 教研数据导入
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
├── web/                    ← Next.js 前端
│   ├── src/
│   │   ├── app/            ← App Router (首页已写)
│   │   └── ...
│   ├── package.json
│   ├── next.config.js
│   └── tailwind.config.js
├── data/                   ← 教研数据 (只读)
│   ├── knowledge/          ← 知识图谱 (math_g3.yaml 已写)
│   └── curriculum/         ← 教材改版 (2024_2026_changes.yaml 已写)
└── scripts/
```

## 快速开始 (本地开发)

### 准备

```bash
# 1. 安装 PostgreSQL 14+ (macOS)
brew install postgresql@14
brew services start postgresql@14

# 创建数据库和用户
createuser -s xueji
createdb -O xueji xueji

# 2. 安装 Python 依赖
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. 安装 Node 依赖
cd ../web
npm install  # 或 pnpm install
```

### 启动

```bash
# 终端 1: 启动后端
cd backend
cp .env.example .env
# 编辑 .env 至少确认 DATABASE_URL
uvicorn app.main:app --reload --port 8000

# 终端 2: 启动前端
cd web
cp .env.example .env.local
npm run dev
```

访问:
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000/api
- **后端文档**: http://localhost:8000/docs

### 导入教研数据(阶段 1 后期)

```bash
cd backend
# 确保 backend/.env 中有 DATABASE_URL
python scripts/seed_data.py
# 会导入 data/knowledge/*.yaml 和 data/curriculum/*.yaml
```

## 阶段进度

| 阶段 | 目标 | 状态 |
|------|------|------|
| **1 · 准备** | 环境 + 教研数据 | 🚧 进行中 |
| 2 · 骨架 | 微信登录 + 家庭/孩子管理 | ⏳ |
| 3 · 错题本 | 拍照 → 入库 → 复习 | ⏳ |
| 4 · 学情档案 | 仪表盘 + 周报 | ⏳ |
| 5 · 知识图谱 | 可视化 | ⏳ |
| 6 · 推送 + 锁屏 | 增值功能 | ⏳ |
| 7 · 公网部署 | 真实可用 | ⏳ |

## 阶段 1 已完成

- ✅ 项目结构(backend/ + web/ + data/)
- ✅ 后端: 6 个 API 占位 + 9 个 ORM 模型 + 配置 + 安全
- ✅ 前端: Next.js 14 + TS + Tailwind 脚手架 + 首页
- ✅ 教研数据: 三年级数学知识图谱(50+ 节点) + 2024-2026 教材改版数据
- ✅ 教研数据导入脚本(seed_data.py)
- ✅ 环境配置示例(.env.example)
- ✅ Git ignore

## 阶段 1 待办(需要石头配合)

- [ ] 找 1 个上海本地小学数学老师协助 review 知识图谱
- [ ] 校对 2024-2026 教材改版数据(verified=false 的部分)
- [ ] 决定: 是否建 Git 私有仓库
- [ ] 注册/准备: 阿里云账号、微信开放平台、智谱 AI API key
- [ ] 校对 basic.sh.smartedu.cn 微课视频链接(50+ 节点需要)

## 关键资源

- **设计文档**: `docs/` 目录, v0.2 完整方案
- **目标模式提示词**: 见对话历史
- **任务列表**: 通过 todowrite 跟踪

## 沟通约定

- 我(AI)做的所有改动会写 commit message
- 任何"必须问才能定"的事我会停下来问
- 任何超 100 元支出我会立刻停

## 致谢

调研参考:
- [国家中小学智慧教育平台](https://basic.smartedu.cn/)
- [上海中小学智慧教育平台·微校](https://basic.sh.smartedu.cn/)
- [上海空中课堂指南](http://sh.bendibao.com/news/2020220/217192.shtm)
- 2024-2026 教材改版相关搜狐/今日头条报道
- 鲸爱练、七天网络、人教智能教辅等行业产品
