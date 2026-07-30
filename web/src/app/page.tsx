import Link from 'next/link';
import { authApi } from '@/lib/auth';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function HomePage() {
  const isLoggedIn = typeof window !== 'undefined' && authApi.isLoggedIn();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
          <Sparkles className="h-3 w-3" />
          v0.2 · MVP 阶段 1 完成
        </div>
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">学迹</h1>
        <p className="mt-2 text-lg text-gray-500">Xueji · 上海小学生学习辅助</p>
        <p className="mt-6 text-base leading-7 text-gray-600">
          给上海小学生家长 + 孩子用的学习辅助平台。
          <br />
          不重复造内容, 把 basic.sh.smartedu.cn 现有免费资源用好用透。
        </p>
      </div>

      {/* 主要 CTA */}
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={isLoggedIn ? '/dashboard' : '/auth/register'}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-600"
        >
          {isLoggedIn ? '去学情' : '开始使用'}
          <ArrowRight className="h-5 w-5" />
        </Link>
        {!isLoggedIn && (
          <Link
            href="/auth/login"
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 transition hover:border-primary-300"
          >
            已有账号 · 登录
          </Link>
        )}
      </div>

      {/* 三大入口卡片 */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-2xl">📊</div>
          <h3 className="mt-3 font-semibold text-gray-900">学情档案</h3>
          <p className="mt-1 text-sm text-gray-500">看到孩子本周学了什么</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-2xl">📝</div>
          <h3 className="mt-3 font-semibold text-gray-900">错题本</h3>
          <p className="mt-1 text-sm text-gray-500">拍照即入库, 自动复习</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-2xl">🗺️</div>
          <h3 className="mt-3 font-semibold text-gray-900">知识图谱</h3>
          <p className="mt-1 text-sm text-gray-500">看到孩子的知识地图</p>
        </div>
      </div>

      {/* 阶段状态 */}
      <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="text-sm font-semibold text-amber-900">🚧 当前进度</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-amber-800">
          <li>✅ 阶段 1 · 准备: 项目骨架 + 教研数据 + 后端模型</li>
          <li>✅ 阶段 2 · 骨架: 邮箱+密码登录 + 家庭/孩子管理</li>
          <li className="text-amber-600">⏳ 阶段 3 · 错题本全流程</li>
          <li className="text-amber-400">⏳ 阶段 4 · 学情档案</li>
          <li className="text-amber-400">⏳ 阶段 5 · 知识图谱可视化</li>
          <li className="text-amber-400">⏳ 阶段 6 · 推送 + 锁屏</li>
          <li className="text-amber-400">⏳ 阶段 7 · 公网部署</li>
        </ul>
      </div>

      <div className="mt-12 text-center text-xs text-gray-400">
        <p>v0.2 方案 · 自用 + 朋友圈公益项目</p>
        <p className="mt-1">不商业化 · 不收费 · 不做校外培训</p>
      </div>
    </main>
  );
}
