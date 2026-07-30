import { Construction } from 'lucide-react';

export default function PushPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
        <Construction className="mx-auto h-10 w-10 text-gray-300" />
        <h1 className="mt-3 text-xl font-semibold text-gray-700">推送设置</h1>
        <p className="mt-2 text-sm text-gray-500">阶段 6 实现 · 微信推送 + 21 点锁屏</p>
      </div>
    </main>
  );
}
