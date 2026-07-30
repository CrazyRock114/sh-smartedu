import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      {/* 头部 */}
      <div className="text-center">
        <div className="mb-3 inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
          MVP · 阶段 1
        </div>
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">学迹</h1>
        <p className="mt-2 text-lg text-gray-500">Xueji · 上海小学生学习辅助</p>
        <p className="mt-6 text-base leading-7 text-gray-600">
          给上海小学生家长 + 孩子用的学习辅助平台。
          <br />
          不重复造内容, 把 basic.sh.smartedu.cn 现有免费资源用好用透。
        </p>
      </div>

      {/* 三大入口卡片 */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-300 hover:shadow-md"
        >
          <div className="text-2xl">📊</div>
          <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-primary-600">学情档案</h3>
          <p className="mt-1 text-sm text-gray-500">看到孩子本周学了什么</p>
        </Link>
        <Link
          href="/errors"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-300 hover:shadow-md"
        >
          <div className="text-2xl">📝</div>
          <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-primary-600">错题本</h3>
          <p className="mt-1 text-sm text-gray-500">拍照即入库, 自动复习</p>
        </Link>
        <Link
          href="/knowledge"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-300 hover:shadow-md"
        >
          <div className="text-2xl">🗺️</div>
          <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-primary-600">知识图谱</h3>
          <p className="mt-1 text-sm text-gray-500">看到孩子的知识地图</p>
        </Link>
      </div>

      {/* 阶段状态 */}
      <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="text-sm font-semibold text-amber-900">🚧 当前进度</h3>
        <ul className="mt-3 space-y-2 text-sm text-amber-800">
          <li>✅ 阶段 1 · 准备: 项目骨架 + 教研数据 + 后端模型</li>
          <li className="text-amber-600">⏳ 阶段 2 · 骨架: 微信登录 + 家庭/孩子管理</li>
          <li className="text-amber-400">⏳ 阶段 3 · 错题本全流程</li>
          <li className="text-amber-400">⏳ 阶段 4 · 学情档案</li>
          <li className="text-amber-400">⏳ 阶段 5 · 知识图谱可视化</li>
          <li className="text-amber-400">⏳ 阶段 6 · 推送 + 锁屏</li>
          <li className="text-amber-400">⏳ 阶段 7 · 公网部署</li>
        </ul>
      </div>

      {/* 底部信息 */}
      <div className="mt-12 text-center text-xs text-gray-400">
        <p>v0.2 方案 · 自用 + 朋友圈公益项目</p>
        <p className="mt-1">不商业化 · 不收费 · 不做校外培训</p>
      </div>
    </main>
  );
}
