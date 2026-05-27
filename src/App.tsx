import { useEffect, useMemo, useState } from 'react'

import { inspectCurrentWordDocument, type InspectionResult } from './app/inspect-document'
import { defaultStyleExpectations } from './lint/default-rules'
import type { LintIssue, ParagraphModel, ParagraphStyle } from './lint/document-model'
import { isWordHostAvailable } from './word/document-loader'

type WordStatus = 'checking' | 'ready' | 'unavailable'
type RunStatus = 'idle' | 'loading' | 'complete' | 'error'

const styleLabels: Record<ParagraphStyle, string> = {
  title: 'タイトル',
  heading1: '見出し 1',
  body: '本文',
  unknown: '未分類',
}

const ruleLabels: Record<string, string> = {
  'font-format/font-name': 'フォント名',
  'font-format/font-size': 'フォントサイズ',
  'font-format/bold': '太字',
}

export default function App() {
  const [wordStatus, setWordStatus] = useState<WordStatus>('checking')
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [result, setResult] = useState<InspectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true

    isWordHostAvailable()
      .then((available) => {
        if (isCurrent) {
          setWordStatus(available ? 'ready' : 'unavailable')
        }
      })
      .catch(() => {
        if (isCurrent) {
          setWordStatus('unavailable')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const summary = useMemo(() => {
    return {
      paragraphCount: result?.document.paragraphs.length ?? 0,
      issueCount: result?.issues.length ?? 0,
      checkedAt: result ? formatCheckedAt(result.checkedAt) : '未実行',
    }
  }, [result])

  async function handleInspect() {
    setRunStatus('loading')
    setError(null)

    try {
      const nextResult = await inspectCurrentWordDocument()
      setResult(nextResult)
      setRunStatus('complete')
      setWordStatus('ready')
    } catch (caughtError) {
      setRunStatus('error')
      setError(getErrorMessage(caughtError))
    }
  }

  const canInspect = wordStatus === 'ready' && runStatus !== 'loading'

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Word Add-in
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">文書リンター</h1>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={wordStatus} />
            <button
              type="button"
              onClick={handleInspect}
              disabled={!canInspect}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {runStatus === 'loading' ? '検査中' : '検査'}
            </button>
          </div>
        </header>

        {wordStatus === 'unavailable' ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Word タスクペインで起動してください。
          </div>
        ) : null}

        {runStatus === 'error' && error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="段落" value={summary.paragraphCount.toString()} />
          <Metric label="指摘" value={summary.issueCount.toString()} tone={summary.issueCount > 0 ? 'alert' : 'ok'} />
          <Metric label="最終検査" value={summary.checkedAt} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-md border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold">検出結果</h2>
              {result ? (
                <span className="text-xs font-medium text-slate-500">
                  {result.issues.length === 0 ? '問題なし' : `${result.issues.length} 件`}
                </span>
              ) : null}
            </div>

            <div className="px-4 py-4">
              <IssueList result={result} runStatus={runStatus} />
            </div>
          </div>

          <aside className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold">基準</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {defaultStyleExpectations.map((expectation) => (
                <div key={expectation.style} className="px-4 py-3">
                  <div className="text-sm font-semibold">{styleLabels[expectation.style]}</div>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-600">
                    <dt>フォント</dt>
                    <dd className="text-right text-slate-900">{expectation.fontName}</dd>
                    <dt>サイズ</dt>
                    <dd className="text-right text-slate-900">{expectation.fontSize} pt</dd>
                    <dt>太字</dt>
                    <dd className="text-right text-slate-900">{expectation.bold ? 'あり' : 'なし'}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

interface MetricProps {
  label: string
  value: string
  tone?: 'alert' | 'ok'
}

function Metric({ label, value, tone }: MetricProps) {
  const valueTone =
    tone === 'alert' ? 'text-red-700' : tone === 'ok' ? 'text-emerald-700' : 'text-slate-950'

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 break-words text-2xl font-semibold ${valueTone}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: WordStatus }) {
  const statusClassName =
    status === 'ready'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : status === 'checking'
        ? 'border-slate-200 bg-white text-slate-600'
        : 'border-amber-200 bg-amber-50 text-amber-800'

  const label = status === 'ready' ? 'Word 接続済み' : status === 'checking' ? '確認中' : 'Word 未接続'

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-md border px-3 text-xs font-semibold ${statusClassName}`}
    >
      {label}
    </span>
  )
}

function IssueList({ result, runStatus }: { result: InspectionResult | null; runStatus: RunStatus }) {
  if (runStatus === 'loading') {
    return <EmptyState title="検査中" />
  }

  if (!result) {
    return <EmptyState title="未検査" />
  }

  if (result.issues.length === 0) {
    return <EmptyState title="指摘はありません" tone="ok" />
  }

  return (
    <ol className="space-y-3">
      {result.issues.map((issue, index) => (
        <IssueItem
          key={`${issue.ruleId}-${issue.paragraphIndex}-${index}`}
          issue={issue}
          paragraph={result.document.paragraphs[issue.paragraphIndex]}
        />
      ))}
    </ol>
  )
}

function IssueItem({ issue, paragraph }: { issue: LintIssue; paragraph: ParagraphModel | undefined }) {
  return (
    <li className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          段落 {issue.paragraphIndex + 1}
        </span>
        <span className="rounded-sm bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
          {ruleLabels[issue.ruleId] ?? issue.ruleId}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-900">{issue.message}</p>

      <div className="mt-3 border-l-2 border-slate-300 pl-3 text-sm leading-6 text-slate-600">
        {paragraph?.text.trim() ? paragraph.text : '空の段落'}
      </div>
    </li>
  )
}

function EmptyState({ title, tone }: { title: string; tone?: 'ok' }) {
  const className =
    tone === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-slate-200 bg-slate-50 text-slate-600'

  return (
    <div className={`rounded-md border px-4 py-8 text-center text-sm font-medium ${className}`}>
      {title}
    </div>
  )
}

function formatCheckedAt(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return '検査に失敗しました。'
}
