import { defaultLintRules } from '../lint/default-rules'
import type { DocumentModel, LintIssue } from '../lint/document-model'
import { runLint } from '../lint/run-lint'
import { loadDocumentFromWord } from '../word/document-loader'

export interface InspectionResult {
  checkedAt: string
  document: DocumentModel
  issues: LintIssue[]
}

export async function inspectCurrentWordDocument(): Promise<InspectionResult> {
  const document = await loadDocumentFromWord()

  return {
    checkedAt: new Date().toISOString(),
    document,
    issues: runLint(document, defaultLintRules),
  }
}
