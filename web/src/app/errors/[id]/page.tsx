'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  X,
  SkipForward,
  Trash2,
  CheckCircle,
  Clock,
  Edit3,
  Save,
  BookMarked,
} from 'lucide-react';
import { authApi } from '@/lib/auth';
import { errorsApi } from '@/lib/errors';
import {
  ERROR_TYPES,
  ERROR_TYPE_LABELS,
  ERROR_STATUS_LABELS,
  SUBJECT_LABELS,
  type ErrorItem,
  type ErrorType,
} from '@/lib/types';
import { getErrorMessage } from '@/lib/api';
import { Loading } from '@/components/NavBar';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-amber-100 text-amber-800',
  reviewing: 'bg-indigo-100 text-indigo-800',
  mastered: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-100 text-slate-600',
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  CARELESS: 'bg-orange-100 text-orange-700',
  READING_WRONG: 'bg-rose-100 text-rose-700',
  METHOD_WRONG: 'bg-violet-100 text-violet-700',
  CONCEPT_CONFUSE: 'bg-pink-100 text-pink-700',
  KNOWLEDGE_GAP: 'bg-blue-100 text-blue-700',
  TIME_PRESSURE: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-slate-100 text-slate-700',
};

export default function ErrorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const errorId = params.id as string;
  const childIdFromQuery = searchParams.get('child_id');

  const [item, setItem] = useState<ErrorItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editErrorType, setEditErrorType] = useState<ErrorType>('OTHER');
  const [editErrorNote, setEditErrorNote] = useState('');

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push(`/auth/login?next=/errors/${errorId}`);
      return;
    }
    if (!childIdFromQuery) {
      setError('缺少 child_id 参数');
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorId, childIdFromQuery, router]);

  async function load() {
    setLoading(true);
    try {
      const it = await errorsApi.get(errorId, childIdFromQuery!);
      setItem(it);
      setEditErrorType(it.error_type);
      setEditErrorNote(it.error_note || '');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(result: 'correct' | 'wrong' | 'skip') {
    if (!item) return;
    setActing(true);
    setError(null);
    try {
      const updated = await errorsApi.submitReview(item.id, item.child_id, result);
      setItem(updated);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setActing(false);
    }
  }

  async function handleSave() {
    if (!item) return;
    setActing(true);
    setError(null);
    try {
      const updated = await errorsApi.update(item.id, item.child_id, {
        error_type: editErrorType,
        error_note: editErrorNote || undefined,
      });
      setItem(updated);
      setEditing(false);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!confirm('确定删除这道错题? 删了就没了。')) return;
    setActing(true);
    try {
      await errorsApi.delete(item.id, item.child_id);
      router.push('/errors');
    } catch (e) {
      setError(getErrorMessage(e));
      setActing(false);
    }
  }

  if (loading) return <Loading label="加载错题…" />;

  if (error && !item) {
    return (
      <div className="max-w-2xl">
        <Link href="/errors" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 返回错题本
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="max-w-2xl">
      <Link href="/errors" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 返回错题本
      </Link>

      {/* 头部标签 */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
          {SUBJECT_LABELS[item.subject] || item.subject}
        </span>
        <span className={`rounded-md px-2 py-0.5 ${ERROR_TYPE_COLORS[item.error_type] || 'bg-slate-100'}`}>
          {ERROR_TYPE_LABELS[item.error_type] || item.error_type}
        </span>
        <span className={`rounded-md px-2 py-0.5 ${STATUS_COLORS[item.status] || 'bg-slate-100'}`}>
          {ERROR_STATUS_LABELS[item.status] || item.status}
        </span>
        {item.review_count > 0 && (
          <span className="text-slate-400">已复习 {item.review_count} 次</span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* 题目区 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">题目</h2>
        </div>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-900">
          {item.question_text}
        </p>
        {item.question_image_url && (
          <img src={item.question_image_url} alt="题目" className="mt-3 max-w-full rounded-lg" />
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-700">✓ 正确答案</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{item.correct_answer}</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-3">
            <p className="text-xs font-medium text-rose-700">✗ 学生答案</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{item.student_answer}</p>
          </div>
        </div>
      </section>

      {/* 错因 / 备注 */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">错因 & 备注</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <Edit3 className="h-3 w-3" />
              改
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs text-slate-500">错因</p>
              <div className="flex flex-wrap gap-1.5">
                {ERROR_TYPES.map((et) => (
                  <button
                    key={et}
                    type="button"
                    onClick={() => setEditErrorType(et)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      editErrorType === et
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {ERROR_TYPE_LABELS[et]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-slate-500">备注</p>
              <textarea
                value={editErrorNote}
                onChange={(e) => setEditErrorNote(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={acting}
                className="inline-flex items-center gap-1 rounded-xl bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-3 w-3" /> 保存
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditErrorType(item.error_type);
                  setEditErrorNote(item.error_note || '');
                }}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div>
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-xs ${
                ERROR_TYPE_COLORS[item.error_type] || 'bg-slate-100'
              }`}
            >
              {ERROR_TYPE_LABELS[item.error_type] || item.error_type}
            </span>
            {item.source_note && (
              <span className="ml-2 text-xs text-slate-400">· {item.source_note}</span>
            )}
            {item.error_note ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.error_note}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">(无备注)</p>
            )}
          </div>
        )}
      </section>

      {/* 复习区 */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">复习</h2>

        {item.status === 'mastered' ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            已掌握 · 答对 {item.review_count} 次
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {item.next_review_at
                ? `下次复习: ${new Date(item.next_review_at).toLocaleString('zh-CN')}`
                : '新错题, 可随时复习'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleReview('correct')}
                disabled={acting}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> 答对了
              </button>
              <button
                onClick={() => handleReview('wrong')}
                disabled={acting}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> 还不会
              </button>
              <button
                onClick={() => handleReview('skip')}
                disabled={acting}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <SkipForward className="h-4 w-4" /> 跳过
              </button>
            </div>
          </>
        )}
      </section>

      {/* 底部操作 */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
        <span>录入于 {new Date(item.created_at).toLocaleString('zh-CN')}</span>
        <button
          onClick={handleDelete}
          disabled={acting}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          删除
        </button>
      </div>
    </div>
  );
}
