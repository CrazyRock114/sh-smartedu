'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BookOpen, Camera, Calendar, Sparkles, CheckCircle2, GraduationCap, Heart, Users } from 'lucide-react';
import { PageHeader } from '@/components/NavBar';

const STEPS = [
  {
    icon: Users,
    color: 'from-primary-500 to-primary-600',
    title: '1. 加孩子',
    desc: '在 "孩子" 页面点 "+ 添加孩子"，填年级和学科教材版本。家长账号下可以切换多个孩子，不需要给孩子单独注册。',
    cta: { label: '去加孩子', href: '/children/new' },
  },
  {
    icon: BookOpen,
    color: 'from-emerald-500 to-emerald-600',
    title: '2. 看本周微课',
    desc: '在 "教材" 页面选孩子的年级 / 学科 / 学期，点 ▶ 在新窗口打开 basic.sh.smartedu.cn 官方空中课堂（免费官方微课）。',
    cta: { label: '去选微课', href: '/curriculum' },
  },
  {
    icon: Camera,
    color: 'from-rose-500 to-rose-600',
    title: '3. 录错题 (拍照 5 秒)',
    desc: '在 "错题" 页面拍孩子做错的题，AI 自动读出题目 + 学生答案 + 错因。需要后端配 ZHIPUAI_APIKEY（智谱 GLM-4V），未配可手动录入。',
    cta: { label: '去录错题', href: '/errors/new' },
  },
  {
    icon: Calendar,
    color: 'from-amber-500 to-amber-600',
    title: '4. 每天回 dashboard 看今日待办',
    desc: '系统按艾宾浩斯曲线（4 小时 / 1 天 / 3 天 / 7 天 / 14 天 / 30 天）自动安排复习。家长每天看 1 次 dashboard 就行。',
    cta: { label: '去 dashboard', href: '/dashboard' },
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const [done, setDone] = useState(false);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-emerald-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-600 text-white shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">欢迎来到学迹 👋</h1>
            <p className="mt-1 text-sm text-slate-600">上海小学生学习辅助 · 对接 basic.sh.smartedu.cn 官方微课</p>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          4 步走完, 孩子本周就能用起来。每个按钮直达对应页面, 先点完 1-2-3-4 就行。
        </p>
      </div>

      <PageHeader icon={<ArrowRight className="h-5 w-5" />} title="30 秒 4 步上手" subtitle="按顺序点完下面 4 个按钮, 就能用起来了" />

      <div className="space-y-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.title}
              href={s.cta.href}
              className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${s.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-primary-700">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.desc}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-400 group-hover:text-primary-600" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        <div className="mb-1.5 flex items-center gap-1.5 font-semibold">
          <Heart className="h-3.5 w-3.5" />
          自用 + 朋友家公益项目
        </div>
        <p>
          ✅ 对接 basic.sh.smartedu.cn 官方免费微课 · 不重复造内容<br />
          ❌ 不收费 · 不做校外培训 · 不拍照给答案 · 不做 AI 讲题 · 不社交/打卡/排名
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => {
            setDone(true);
            setTimeout(() => router.push(next), 300);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
        >
          {done ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              好的, 进入主页
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              走完了, 进入主页
            </>
          )}
        </button>
      </div>
    </div>
  );
}
