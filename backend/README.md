# 后端 · 学迹 API

FastAPI 单体后端, 阶段 1 骨架版本。

## 当前状态(阶段 1)

- ✅ 项目结构 + 依赖
- ✅ 6 个核心 ORM 模型(Family / Child / KnowledgePoint / ErrorItem / MasteryState / CurriculumChange + 2 个辅助)
- ✅ 6 个 API 路由占位(auth / child / error / knowledge / curriculum / push)
- ✅ 配置 + 安全 + 数据库连接
- ⏳ 阶段 2 起逐步实现各 API

## 快速开始

### 1. 安装依赖

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env, 填入 DATABASE_URL 等
```

### 3. 准备数据库

需要本地有 PostgreSQL 14+:

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# 创建数据库
createdb xueji
createuser -s xueji  # 或者用 psql 给 xueji 用户授权
```

### 4. 初始化数据库(阶段 2 才用)

```bash
# 阶段 2 实现
alembic upgrade head
python scripts/seed_data.py  # 导入教研数据
```

### 5. 启动开发服务器

```bash
uvicorn app.main:app --reload --port 8000
```

访问:
- API: http://localhost:8000/api
- 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

## 项目结构

```
backend/
├── app/
│   ├── api/              # 路由
│   │   ├── auth.py       # 微信登录
│   │   ├── child.py      # 孩子档案
│   │   ├── error.py      # 错题
│   │   ├── knowledge.py  # 知识图谱
│   │   ├── curriculum.py # 教材改版
│   │   └── push.py       # 推送
│   ├── core/             # 核心
│   │   ├── config.py     # 配置
│   │   ├── db.py         # 数据库
│   │   └── security.py   # JWT
│   ├── models/           # ORM
│   ├── schemas/          # Pydantic (待写)
│   ├── services/         # 业务逻辑 (待写)
│   └── main.py           # 入口
├── migrations/           # Alembic (阶段 2)
├── tests/                # 测试 (待写)
├── requirements.txt
├── alembic.ini
└── .env.example
```

## 阶段对应

| 阶段 | 内容 |
|------|------|
| 1 (当前) | 骨架 + 模型 + API 占位 |
| 2 | 微信登录 + 孩子/家庭 CRUD |
| 3 | 错题本全流程 (拍照 OCR + 归因 + 复习) |
| 4 | 学情档案 + 周报 |
| 5 | 知识图谱可视化 API |
| 6 | 推送 + 锁屏 + 时长统计 |
| 7 | 公网部署 |

## 注意事项

- **不要**提交 `.env` 文件到 Git
- 生产环境**必须**修改 `JWT_SECRET`
- 数据库连接串密码**不要**用默认值
- 任何 SDK / 库的引入需先与石头确认
