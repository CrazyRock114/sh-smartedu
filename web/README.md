# 前端 · 学迹 Web

Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS。

## 当前状态(阶段 1)

- ✅ 项目脚手架 (Next.js + TS + Tailwind)
- ✅ 首页骨架 (3 大入口 + 阶段状态)
- ✅ API 反代配置 (next.config.js)
- ⏳ 阶段 2 起逐步实现各页面

## 快速开始

```bash
cd web
npm install  # 或 pnpm install / yarn install
cp .env.example .env.local
# 编辑 .env.local
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
web/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── layout.tsx    # 根布局
│   │   ├── page.tsx      # 首页
│   │   └── globals.css   # 全局样式
│   ├── components/       # 组件 (待写)
│   ├── lib/              # 工具函数 (待写)
│   └── ...
├── public/               # 静态资源
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 路由规划(阶段 2+)

| 路径 | 模块 | 阶段 |
|------|------|------|
| `/` | 首页 | ✅ 1 |
| `/auth/login` | 微信登录 | 2 |
| `/auth/callback` | 微信回调 | 2 |
| `/dashboard` | 家长首页 | 2 |
| `/children` | 孩子管理 | 2 |
| `/children/new` | 添加孩子 | 2 |
| `/errors` | 错题本 | 3 |
| `/errors/new` | 新增错题(拍照) | 3 |
| `/errors/:id` | 错题详情 | 3 |
| `/knowledge` | 知识图谱 | 5 |
| `/knowledge/:code` | 知识点详情 | 5 |
| `/curriculum` | 教材改版 | 2 |
| `/settings` | 设置 | 2 |

## 设计原则

- 移动端优先 (家长主要在手机上用)
- 简洁、温和 (避免焦虑感)
- 学习感、亲和力 (主色温暖蓝)
- 不滥用动效, 不花哨
