'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { errorsApi } from '@/lib/errors';
import {
  ERROR_TYPES,
  ERROR_TYPE_LABELS,
  type Child,
  type ErrorType,
  type SuggestResponse,
} from '@/lib/types';
import { getErrorMessage } from '@/lib/api';

const SUBJECTS: { value: string; label: string }[] = [
  { value: 'math', label: '数学' },
  { value: 'chinese', label: '语文' },
  { value: 'english', label: '英语' },
  { value: 'science', label: '科学' },
];

export default function NewErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryChildId = searchParams.get('child_id');

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string>(queryChildId || '');

  const [subject, setSubject] = useState('math');
  const [questionText, setQuestionText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [errorNote, setErrorNote] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>('OTHER');
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/errors/new');
      return;
    }
    childrenApi.list().then((cs) => {
      setChildren(cs);
      if (!childId && cs.length > 0) setChildId(cs[0].id);
    });
  }, [router]);

  // 调用归因建议 (用户点击"让 AI 看看"时触发)
  const handleSuggest = async () => {
    if (!questionText || !correctAnswer || !studentAnswer) {
      setError('先填完题目、正确答案、学生答案再让 AI 看');
      return;
    }
    setError(null);
    setSuggesting(true);
    try {
      const s = await errorsApi.suggest({
        question: questionText,
        correct_answer: correctAnswer,
        student_answer: studentAnswer,
        note: errorNote || undefined,
      });
      setSuggestion(s);
      if (errorType === 'OTHER' || !errorType) {
        setErrorType(s.error_type);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId) {
      setError('请选择孩子');
      return;
    }
    if (!questionText || !correctAnswer || !studentAnswer) {
      setError('题目、正确答案、学生答案都必须填');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const item = await errorsApi.create(childId, {
        subject,
        question_text: questionText,
        correct_answer: correctAnswer,
        student_answer: studentAnswer,
        error_note: errorNote || undefined,
        error_type: errorType,
        source: 'manual',
      });
      router.push(`/errors/${item.id}?child_id=${childId}`);
    } catch (e) {
      setError(getErrorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link
        href="/errors"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        返回错题本
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">录错题</h1>

      {children.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">先添加一个孩子再录错题</p>
          <Link
            href="/children/new"
            className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          >
            添加孩子
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 孩子选择 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">孩子</label>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade} 年级)
                </option>
              ))}
            </select>
          </div>

          {/* 学科 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">学科</label>
            <div className="flex gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSubject(s.value)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    subject === s.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 题目 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              题目 <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              placeholder="抄下来, 或简单描述: 一辆汽车 3 小时行驶 180 公里, 求平均速度"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                正确答案 <span className="text-rose-500">*</span>
              </label>
              <input
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="60 公里/小时"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                学生答案 <span className="text-rose-500">*</span>
              </label>
              <input
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="540"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          {/* 错因 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              错因 (家长判断 / AI 建议)
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              {ERROR_TYPES.map((et) => (
                <button
                  key={et}
                  type="button"
                  onClick={() => setErrorType(et)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    errorType === et
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {ERROR_TYPE_LABELS[et]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSuggest}
              disabled={suggesting}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {suggesting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              让 AI 看看 (启发式)
            </button>
            {suggestion && (
              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <strong>{ERROR_TYPE_LABELS[suggestion.error_type]}</strong> ({suggestion.source}) ·{' '}
                {suggestion.reason}
              </div>
            )}
          </div>

          {/* 备注 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              家长备注 (选填)
            </label>
            <textarea
              value={errorNote}
              onChange={(e) => setErrorNote(e.target.value)}
              rows={2}
              placeholder="例: 看错条件 / 算错了 / 这类题一直不会"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '录入中…' : '录错题'}
            </button>
            <Link
              href="/errors"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}
