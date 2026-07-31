'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BookMarked,
  Network,
  BookOpen,
  Bell,
  LayoutDashboard,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  Heart,
  Shield,
  Zap,
  Target,
  Gift,
} from 'lucide-react';
import { authApi } from '@/lib/auth';

const MODULES = [
  {
    icon: BookOpen,
    title: '教材同步',
    desc: '自动展示 2024-26 教材改了什么，每周章节一目了然',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    href: '/curriculum',
  },
  {
    icon: LayoutDashboard,
    title: '学情档案',
    desc: '多学科掌握度仪表盘，错题热力图，每周自动生成报告',
    color: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    href: '/dashboard',
  },
  {
    icon: BookMarked,
    title: '错题本',
    desc: '7 类错因智能归因，间隔重复自动安排复习计划',
    color: 'from-rose-500 to-rose-600',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    href: '/errors',
  },
  {
    icon: Network,
    title: '知识图谱',
    desc: '50+ 知识点可视化，孩子当前掌握度颜色编码',
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    href: '/knowledge',
  },
  {
    icon: Bell,
    title: '学习计划 + 锁屏',
    desc: '每周自动生成学习计划，21 点自动锁屏保护眼睛',
    color: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    href: '/push',
  },
];

const PROMISES = [
  { icon: Heart, label: '不商业化', desc: '自用 + 朋友家免费' },
  { icon: Shield, label: '不拍照给答案', desc: '教育部 2021 禁令' },
  { icon: Zap, label: '不重复造内容', desc: 'basic.sh.smartedu.cn 资源链接' },
  { icon: Target, label: '不推送营销', desc: '只在 App 内提醒' },
];

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(authApi.isLoggedIn());
  }, []);

  return (
    <div className="md:ml-0">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary-200 to-primary-300 opacity-40 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 opacity-40 blur-3xl" />
        </div>
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-medium text-primary-700 shadow-sm">
              <Sparkles className="h-3 w-3" />
              上海小学生学习辅助平台
            </div>
            <h1 className="bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              学迹 <span className="text-primary-600">Xueji</span>
            </h1>
            <p className="mt-3 text-lg text-slate-600 sm:text-xl">
              把孩子的错题、知识地图、学习节奏
              <br className="hidden sm:block" />
              连成一张清晰的网
            </p>
            <p className="mt-4 text-sm text-slate-500">
              对接 basic.sh.smartedu.cn 官方免费微课，<wbr />
              不重复造内容，不做校外培训，<wbr />
              只帮家长用好现有资源
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {loggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:shadow-xl hover:shadow-primary-500/40"
                >
                  去看学情
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/curriculum"
                  className="rounded-2xl border border-primary-300 bg-primary-50 px-6 py-3.5 text-base font-semibold text-primary-700 transition hover:bg-primary-100"
                >
                  选年级看微课 ↗
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/register"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:shadow-xl hover:shadow-primary-500/40"
                >
                  立即开始
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/auth/login"
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-base font-medium text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
                >
                  已有账号
                </Link>
              </>
            )}
          </div>

          {/* 年级直达: 朋友家最常问的组合 (登录后显示) */}
          {loggedIn && (
            <div className="mx-auto mt-6 max-w-3xl">
              <p className="mb-2 text-center text-xs text-slate-500">⚡ 朋友家 1 跳直达 (G3-G6 × 沪教版/统编/人教PEP)</p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                <QuickLink g={3} s="math" v="沪教版" sem="2025-spring" label="G3 数学" />
                <QuickLink g={4} s="math" v="沪教版" sem="2025-fall" label="G4 数学" />
                <QuickLink g={5} s="math" v="沪教版" sem="2025-fall" label="G5 数学" />
                <QuickLink g={6} s="math" v="沪教版" sem="2025-fall" label="G6 数学" />
                <span className="mx-1 text-slate-300">|</span>
                <QuickLink g={3} s="chinese" v="统编版" sem="2025-fall" label="G3 语文" />
                <QuickLink g={4} s="chinese" v="统编版" sem="2025-fall" label="G4 语文" />
                <QuickLink g={5} s="chinese" v="统编版" sem="2025-fall" label="G5 语文" />
                <span className="mx-1 text-slate-300">|</span>
                <QuickLink g={4} s="english" v="人教PEP版" sem="2025-fall" label="G4 英语" />
              </div>
              <div className="mt-3 text-center">
                <Link
                  href="/friends-guide"
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  <Gift className="h-3 w-3" />
                  邀请朋友家 (3 个邀请码 + 微信话术)
                </Link>
              </div>
            </div>
          )}

          {/* 数据点 */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4 sm:gap-8">
            <Stat number="50+" label="知识点" />
            <Stat number="4" label="学科" />
            <Stat number="21:00" label="锁屏" />
          </div>
        </div>
      </section>

      {/* 5 大模块 */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">5 大模块，跑通学习闭环</h2>
          <p className="mt-2 text-sm text-slate-500">从「不知道学什么」到「知道怎么学」</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white ${m.color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-primary-700">
                  {m.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-500">{m.desc}</p>
                <ArrowRight className="absolute right-5 top-5 h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4 个不 */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white sm:p-12">
          <div className="mb-6 flex items-center gap-2 text-amber-300">
            <Heart className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">v0.2 严守底线</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold sm:text-3xl">我们坚持不做</h2>
          <p className="mb-8 text-sm text-slate-300">
            公益项目，不商业化。只帮家长用好现有资源，不引入新的焦虑
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <Icon className="mb-2 h-5 w-5 text-amber-300" />
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{p.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 底部 CTA */}
      {!loggedIn && (
        <section className="mx-auto max-w-5xl px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900">15 秒注册，立即开始</h2>
          <p className="mt-2 text-sm text-slate-500">邮箱 + 密码就够，不用绑手机</p>
          <Link
            href="/auth/register"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:shadow-xl"
          >
            <GraduationCap className="h-5 w-5" />
            立即注册
          </Link>
        </section>
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
        <p>v0.2 · 自用 + 朋友圈公益项目</p>
        <p className="mt-1">不商业化 · 不收费 · 不做校外培训</p>
      </footer>
    </div>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-slate-900 sm:text-3xl">{number}</div>
      <div className="mt-1 text-xs text-slate-500 sm:text-sm">{label}</div>
    </div>
  );
}

function QuickLink({ g, s, v, sem, label }: { g: number; s: string; v: string; sem: string; label: string }) {
  return (
    <Link
      href={`/curriculum?grade=${g}&subject=${s}&version=${encodeURIComponent(v)}&semester=${sem}`}
      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
    >
      {label}
    </Link>
  );
}
