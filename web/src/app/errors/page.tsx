import { Construction } from 'lucide-react';

export default function ErrorsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
        <Construction className="mx-auto h-10 w-10 text-gray-300" />
        <h1 className="mt-3 text-xl font-semibold text-gray-700">错题本</h1>
        <p className="mt-2 text-sm text-gray-500">阶段 3 实现 · 拍照 → 入库 → 归因 → 复习</p>
        <p className="mt-4 text-xs text-gray-400">先把孩子加好, 阶段 3 就能直接录错题</p>
      </div>
    </main>
  );
}
