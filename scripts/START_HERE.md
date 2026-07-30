# 启动指南 · 阶段 1 最后一步

> 阶段 1 准备基本完成, 这是你**今天接下来要做的 4 件事**。

---

## 1. 把本地代码推送到 GitHub (5 分钟)

代码已经在本地 commit 好, 现在要推到 `https://github.com/CrazyRock114/sh-smartedu`。

### 方式 A: HTTPS + Personal Access Token(推荐, macOS 默认)

```bash
cd /Users/paulshi/Documents/MiniMax/sh-smartedu

# 1. 加远程
git remote add origin https://github.com/CrazyRock114/sh-smartedu.git

# 2. 验证远程
git remote -v
# 应该看到: origin  https://github.com/CrazyRock114/sh-smartedu.git (fetch/push)

# 3. 推送(第一次)
git push -u origin main
```

推送时 GitHub 会要求认证:
- **Username**: `CrazyRock114` (你的 GitHub 用户名)
- **Password**: **不是密码**, 是 **Personal Access Token (PAT)**

如果你还没有 PAT:
1. 打开 https://github.com/settings/tokens
2. 点 "Generate new token" → "Generate new token (classic)"
3. Note: `xueji-local-dev`
4. Expiration: 90 days (够用了)
5. 勾选 `repo` (完整仓库访问)
6. 点 "Generate token"
7. **复制 token**(只显示一次!)
8. 粘到 git push 的 Password 提示

### 方式 B: SSH(如果你已经有 SSH key 配 GitHub)

```bash
cd /Users/paulshi/Documents/MiniMax/sh-smartedu
git remote add origin git@github.com:CrazyRock114/sh-smartedu.git
git push -u origin main
```

### 验证推送成功

```bash
git log --oneline
# 应该看到: 3a7bd1b v0.2 阶段 1: 项目骨架 + 教研数据初稿
```

然后打开 https://github.com/CrazyRock114/sh-smartedu 应该能看到代码。

---

## 2. 装 PostgreSQL(你正在做)

如果还没装完, 完整命令:

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# 验证
psql --version
# 应该输出: psql (PostgreSQL) 14.x

# 创建数据库和用户
createuser -s xueji
createdb -O xueji xueji

# 测试连接
psql -U xueji -d xueji -h localhost
# 应该能进去, 输 \q 退出
```

**如果遇到 "psql: error: connection to server"**:
- 用 `pg_isready` 检查服务在不在跑
- 看 `brew services list` 看 postgresql 状态
- 看 `~/.zshrc` 里有没有 `export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"`

---

## 3. 启动后端 (3 分钟)

```bash
cd /Users/paulshi/Documents/MiniMax/sh-smartedu/backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 装依赖
pip install -r requirements.txt

# 配 .env
cp .env.example .env
# 编辑 .env, 确认 DATABASE_URL 是:
#   postgresql+psycopg2://xueji:xueji@localhost:5432/xueji
# (这就是默认值, 一般不用改)

# 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

**应该看到**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
🚀 学迹 / Xueji 启动中...
   环境: development
   端口: 8000
INFO:     Application startup complete.
```

**打开**:
- http://localhost:8000/ → 应该看到 JSON: `{"name": "学迹 / Xueji", "version": "0.1.0", "status": "ok", ...}`
- http://localhost:8000/docs → 应该看到 Swagger API 文档
- http://localhost:8000/health → `{"status": "ok"}`

**如果报错**:
- `ImportError: No module named 'xxx'` → `pip install -r requirements.txt` 重装
- `sqlalchemy.exc.OperationalError` → 检查 .env 里的 DATABASE_URL, 检查 PG 服务在跑
- 其他错 → 复制报错信息给我

---

## 4. 启动前端 (3 分钟)

**新开一个终端**:

```bash
cd /Users/paulshi/Documents/MiniMax/sh-smartedu/web

# 装依赖
npm install
# 如果慢, 试 pnpm: pnpm install

# 配 .env
cp .env.example .env.local
# 默认值: NEXT_PUBLIC_API_URL=http://localhost:8000

# 启动
npm run dev
```

**应该看到**:
```
  ▲ Next.js 14.x
  - Local:        http://localhost:3000
  - Environments: .env.local
✓ Ready in 2s
```

**打开**:
- http://localhost:3000 → 应该看到 "学迹" 首页 + 3 个入口卡片 + 阶段进度

---

## 5. 验证都跑起来后告诉我

两件事都跑起来后, 跟我说:
1. "后端跑起来了" / "前端跑起来了"
2. 任何报错(贴出来)
3. 看到的页面截图(可选)

然后我开始 **阶段 2: 微信登录 + 家庭/孩子管理**。

---

## 常见问题快速排查

| 问题 | 原因 | 解决 |
|------|------|------|
| `pip: command not found` | Python 没装或不在 PATH | `brew install python@3.11` |
| `npm: command not found` | Node 没装 | `brew install node` |
| `psql: command not found` | PostgreSQL 没装 | `brew install postgresql@14` + 配 PATH |
| 后端启动报 "no module" | 依赖没装全 | `pip install -r requirements.txt` |
| 后端报 DB 连接错 | PG 没起 / URL 错 | 检查 `brew services list` 和 `.env` |
| 前端报 "EADDRINUSE" | 8000 端口被占 | `lsof -i :8000` 看谁占着 |
| 前端报 "Network Error" | 后端没起来 | 先启动后端 |

---

## 推送到 GitHub 后, 接下来

1. **我开始写阶段 2 代码**: 微信登录 + 家庭/孩子管理
2. **你开始 review 我的三年级数学知识图谱** (在 `data/knowledge/math_g3.yaml`): 
   - 准确性 (上海教材和这个对得上吗)
   - 完整性 (缺哪些)
   - 改版信息 (2024-2026 哪些改了我不知道的)
3. **你找时间看** `data/curriculum/2024_2026_changes.yaml`: 教材改版数据 verified=false 的几项

---

**有任何问题随时叫我, 别死磕。** 🛟
