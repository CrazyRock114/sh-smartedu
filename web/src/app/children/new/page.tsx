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
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewChildPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number>(3);
  const [className, setClassName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [textbookVersions, setTextbookVersions] = useState<SubjectTextbookVersion[]>([
    { subject: 'math', version: '沪教版' }, // 上海默认
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
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link
        href="/children"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        返回孩子列表
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">添加孩子</h1>
      <p className="mt-1 text-sm text-gray-500">基础信息 + 教材版本 (数学必填)</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            孩子名字 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            maxLength={64}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="如: 大宝 / 小宝"
          />
        </div>

        <div>
          <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
            年级 <span className="text-red-500">*</span>
          </label>
          <select
            id="grade"
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g} 年级
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="class" className="block text-sm font-medium text-gray-700">
              班级 <span className="text-xs text-gray-400">(可选)</span>
            </label>
            <input
              id="class"
              type="text"
              maxLength={64}
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              placeholder="如: 三(2)班"
            />
          </div>
          <div>
            <label htmlFor="school" className="block text-sm font-medium text-gray-700">
              学校 <span className="text-xs text-gray-400">(可选)</span>
            </label>
            <input
              id="school"
              type="text"
              maxLength={128}
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              placeholder="如: 上海市实验小学"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            教材版本 <span className="text-xs text-gray-400">(数学必填, 其他学科可加可选)</span>
          </label>
          <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
            {SUBJECTS.map(({ value, label }) => {
              const versions = TEXTBOOK_VERSIONS[value];
              const current = textbookVersions.find((t) => t.subject === value);
              if (versions.length === 0) return null; // 没教材选项的学科不显示
              return (
                <div key={value} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-gray-600">{label}</span>
                  <select
                    value={current?.version || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        updateVersion(value, e.target.value);
                      } else {
                        removeSubject(value);
                      }
                    }}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary-500"
                  >
                    <option value="">— 不选 —</option>
                    {versions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  {value === 'math' && (
                    <span className="text-xs text-red-500">*</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 py-2.5 font-medium text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {loading ? '保存中…' : '保存'}
          </button>
          <Link
            href="/children"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </Link>
        </div>
      </form>
    </main>
  );
}
