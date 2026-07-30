import { Construction } from 'lucide-react';

export default function CurriculumPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
        <Construction className="mx-auto h-10 w-10 text-gray-300" />
        <h1 className="mt-3 text-xl font-semibold text-gray-700">教材同步</h1>
        <p className="mt-2 text-sm text-gray-500">阶段 1 数据已入库 · 阶段 2 接前端展示</p>
        <p className="mt-4 text-xs text-gray-400">
          2024-2026 沪教版数学改版数据已存, 50+ 知识点已入库
        </p>
      </div>
    </main>
  );
}
