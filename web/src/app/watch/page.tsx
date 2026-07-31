'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Search,
  Lightbulb,
  X,
} from 'lucide-react';

function WatchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('微课');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [hint, setHint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hintCollapsed, setHintCollapsed] = useState(false);

  useEffect(() => {
    const url = searchParams.get('url');
    const t = searchParams.get('title') || '微课';
    const kw = searchParams.get('kw') || '';
    const h = searchParams.get('hint') || '';
    if (!url) {
      setError('缺少 url 参数');
      setLoading(false);
      return;
    }
    setIframeUrl(url);
    setTitle(t);
    setSearchKeyword(kw);
    setHint(h);
    setLoading(false);
  }, [searchParams]);

  return (
    <div className="flex h-screen flex-col bg-slate-900">
      {/* 顶栏 */}
      <header className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2 sm:px-4 sm:py-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">返回</span>
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <h1 className="truncate text-sm font-medium text-white sm:text-base">
            {title}
          </h1>
        </div>
        {iframeUrl && (
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-xs text-white hover:bg-slate-600 sm:px-3"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">新窗口</span>
          </a>
        )}
      </header>

      {/* 操作提示 (可关闭) */}
      {!hintCollapsed && (searchKeyword || hint) && !error && (
        <div className="flex flex-shrink-0 items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium">怎么看这节课？</p>
            {searchKeyword && (
              <p className="mt-0.5 text-xs text-amber-800">
                在下方搜索框输入
                <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 font-mono text-amber-900">
                  {searchKeyword}
                </code>
                即可看到对应微课
              </p>
            )}
            {hint && <p className="mt-0.5 text-xs text-amber-800">{hint}</p>}
          </div>
          <button
            onClick={() => setHintCollapsed(true)}
            className="rounded p-1 text-amber-600 hover:bg-amber-100"
            title="关闭提示"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* iframe 区 */}
      <div className="relative flex-1 bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">加载微课...</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-white">
            <p className="text-rose-400">{error}</p>
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
            >
              回到学情
            </Link>
          </div>
        )}
        {iframeUrl && !error && (
          <iframe
            src={iframeUrl}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            title={title}
          />
        )}
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    }>
      <WatchPageInner />
    </Suspense>
  );
}
