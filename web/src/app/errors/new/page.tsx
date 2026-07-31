'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Loader2, Camera, Plus, ImageIcon, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { errorsApi } from '@/lib/errors';
import {
  ERROR_TYPES,
  ERROR_TYPE_LABELS,
  SUBJECT_LABELS,
  type Child,
  type ErrorType,
  type OcrExtractResponse,
  type SuggestResponse,
} from '@/lib/types';
import { getErrorMessage } from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/NavBar';

const SUBJECTS = [
  { value: 'math', label: '数学' },
  { value: 'chinese', label: '语文' },
  { value: 'english', label: '英语' },
  { value: 'science', label: '科学' },
];

export default function NewErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryChildId = searchParams.get('child_id');
  const querySubject = searchParams.get('subject');

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string>(queryChildId || '');

  const [subject, setSubject] = useState(querySubject || 'math');
  const [questionText, setQuestionText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [errorNote, setErrorNote] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>('OTHER');
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 拍照 OCR
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrExtractResponse | null>(null);

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/errors/new');
      return;
    }
    childrenApi.list().then((cs) => {
      setChildren(cs);
      if (!childId && cs.length > 0) setChildId(cs[0].id);
    });
  }, [router, childId]);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setError(null);
    setOcrResult(null);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleClearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setOcrResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOcr = async () => {
    if (!photoFile) return;
    setError(null);
    setOcrLoading(true);
    try {
      const r = await errorsApi.ocrExtract(photoFile, subject);
      setOcrResult(r);
      // 自动填入 OCR 识别的字段 (家长可改)
      if (r.question_text) setQuestionText(r.question_text);
      if (r.student_answer) setStudentAnswer(r.student_answer);
      setErrorType(r.error_type);
      setSuggestion({
        error_type: r.error_type,
        reason: r.reason,
        source: 'glm',
        labels: r.labels,
      });
    } catch (e: any) {
      const msg = getErrorMessage(e);
      const status = e?.response?.status;
      if (status === 503) {
        setError('拍照识别需要后端配 ZHIPUAI_API_KEY (智谱 GLM-4V)。当前未配, 请手动录入。');
      } else {
        setError(`拍照识别失败: ${msg}`);
      }
    } finally {
      setOcrLoading(false);
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
        source: ocrResult ? 'ocr' : 'manual',
      });
      router.push(`/errors/${item.id}?child_id=${childId}`);
    } catch (e) {
      setError(getErrorMessage(e));
      setSubmitting(false);
    }
  };

  if (children.length === 0) {
    return (
      <div>
        <PageHeader icon={<Plus className="h-5 w-5" />} title="录错题" />
        <EmptyState
          icon={<Plus className="h-6 w-6" />}
          title="先添加一个孩子"
          desc="再开始录错题"
          action={
            <Link
              href="/children/new"
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2.5 text-sm font-medium text-white"
            >
              添加孩子
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/errors"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        返回错题本
      </Link>

      <PageHeader icon={<Plus className="h-5 w-5" />} title="录错题" subtitle="5 秒入库, 系统自动安排复习" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="孩子">
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade} 年级)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="学科">
              <div className="flex flex-wrap gap-1.5">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSubject(s.value)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      subject === s.value
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <Field label="题目" required>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              placeholder="抄下来, 或简单描述: 一辆汽车 3 小时行驶 180 公里, 求平均速度"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              required
            />
          </Field>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="正确答案" required>
              <input
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="60 公里/小时"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                required
              />
            </Field>
            <Field label="学生答案" required>
              <input
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="540"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                required
              />
            </Field>
          </div>

          {/* 拍照 OCR 一键识别 (GLM-4V, 需 ZHIPUAI_API_KEY) */}
          <div className="mt-3 rounded-xl border border-dashed border-primary-200 bg-gradient-to-br from-primary-50/50 to-amber-50/30 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary-700">
              <Camera className="h-3.5 w-3.5" />
              <span>📸 拍照 OCR (5 秒入库) — 后端需配 ZHIPUAI_API_KEY</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {!photoPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-white py-2.5 text-sm font-medium text-primary-700 transition hover:border-primary-300 hover:bg-primary-50"
              >
                <ImageIcon className="h-4 w-4" />
                选 / 拍 错题照片
              </button>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="错题照片预览"
                    className="max-h-48 w-full rounded-lg border border-slate-200 object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleOcr}
                  disabled={ocrLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
                >
                  {ocrLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI 看图中…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      一键识别 (题目+答案+错因)
                    </>
                  )}
                </button>
                {ocrResult && (
                  <div className="flex items-start gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>已自动填入题目/学生答案, 错因建议: <strong>{ERROR_TYPE_LABELS[ocrResult.error_type]}</strong>。请在下方核对 + 填正确答案。</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <Field label="错因 (家长判断 / AI 建议)">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {ERROR_TYPES.map((et) => (
                <button
                  key={et}
                  type="button"
                  onClick={() => setErrorType(et)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    errorType === et
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-100 disabled:opacity-50"
            >
              {suggesting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              让 AI 看看 (启发式)
            </button>
            {suggestion && (
              <div className="mt-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700">
                <strong>{ERROR_TYPE_LABELS[suggestion.error_type]}</strong> ({suggestion.source}) ·{' '}
                {suggestion.reason}
              </div>
            )}
          </Field>
        </Card>

        <Card>
          <Field label="家长备注 (选填)">
            <textarea
              value={errorNote}
              onChange={(e) => setErrorNote(e.target.value)}
              rows={2}
              placeholder="例: 看错条件 / 算错了 / 这类题一直不会"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </Field>
        </Card>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
          >
            {submitting ? '录入中…' : '录错题'}
          </button>
          <Link
            href="/errors"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">{children}</div>;
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}
