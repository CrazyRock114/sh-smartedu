import { Construction } from 'lucide-react';

export default function KnowledgePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
        <Construction className="mx-auto h-10 w-10 text-gray-300" />
        <h1 className="mt-3 text-xl font-semibold text-gray-700">知识图谱</h1>
        <p className="mt-2 text-sm text-gray-500">阶段 5 实现 · 节点展示 + 掌握度颜色编码</p>
      </div>
    </main>
  );
}
