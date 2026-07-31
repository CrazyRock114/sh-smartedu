'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { childrenApi } from '@/lib/children';
import { getErrorMessage } from '@/lib/api';
import {
  GRADES,
  SUBJECTS,
  TEXTBOOK_VERSIONS,
  type ChildCreate,
  type Subject,
  type SubjectTextbookVersion,
} from '@/lib/types';
import { ArrowLeft, Plus, Save, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/NavBar';

export default function NewChildPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number>(3);
  const [className, setClassName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [textbookVersions, setTextbookVersions] = useState<SubjectTextbookVersion[]>([
    { subject: 'math', version: '沪教版' },
    { subject: 'chinese', version: '统编版' },
    { subject: 'english', version: '人教PEP版' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVersion = (subject: Subject, version: string) => {
    setTextbookVersions((prev) => {
      const idx = prev.findIndex((t) => t.subject === subject);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { subject, version };
        return next;
      }
      return [...prev, { subject, version }];
    });
  };

  const removeSubject = (subject: Subject) => {
    if (subject === 'math') {
      setError('数学教材必填, 不可移除');
      return;
    }
    setTextbookVersions((prev) => prev.filter((t) => t.subject !== subject));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('请输入孩子名字');
      return;
    }
    if (!textbookVersions.find((t) => t.subject === 'math')) {
      setError('数学教材必填');
      return;
    }

    const payload: ChildCreate = {
      name: name.trim(),
      grade,
      class_name: className.trim() || undefined,
      school_name: schoolName.trim() || undefined,
      textbook_versions: textbookVersions,
    };

    setLoading(true);
    try {
      await childrenApi.create(payload);
      router.push('/children');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Link
        href="/children"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        返回孩子列表
      </Link>

      <PageHeader
        icon={<Plus className="h-5 w-5" />}
        title="添加孩子"
        subtitle="基础信息 + 教材版本 (数学必填)"
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">基础信息</h2>

          <div className="space-y-4">
            <Field label="孩子名字" required>
              <input
                type="text"
                required
                maxLength={64}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="如: 大宝 / 小宝"
              />
            </Field>

            <Field label="年级" required>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g} 年级
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="班级" optional>
                <input
                  type="text"
                  maxLength={64}
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="如: 三(2)班"
                />
              </Field>
              <Field label="学校" optional>
                <input
                  type="text"
                  maxLength={128}
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="如: 上海市实验小学"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">教材版本</h2>
          </div>
          <p className="mb-3 text-xs text-slate-500">数学必填, 其他学科可选 · 上海默认沪教版数学</p>

          <div className="space-y-2">
            {SUBJECTS.map(({ value, label }) => {
              const versions = TEXTBOOK_VERSIONS[value];
              if (versions.length === 0) return null;
              const current = textbookVersions.find((t) => t.subject === value);
              return (
                <div key={value} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="w-16 text-sm text-slate-700">{label}</span>
                  <select
                    value={current?.version || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        updateVersion(value, e.target.value);
                      } else {
                        removeSubject(value);
                      }
                    }}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary-400"
                  >
                    <option value="">— 不选 —</option>
                    {versions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  {value === 'math' && <span className="text-xs text-rose-500">*</span>}
                </div>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? '保存中…' : '保存'}
          </button>
          <Link
            href="/children"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}{' '}
        {required && <span className="text-rose-500">*</span>}
        {optional && <span className="text-xs text-slate-400">(可选)</span>}
      </label>
      {children}
    </div>
  );
}
