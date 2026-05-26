import type { DocumentModel, LintIssue, ParagraphModel } from './document-model'

export interface ParagraphLintRule {
  id: string
  checkParagraph: (paragraph: ParagraphModel, paragraphIndex: number) => LintIssue[]
}

export function runLint(document: DocumentModel, rules: ParagraphLintRule[]): LintIssue[] {
  return document.paragraphs.flatMap((paragraph, paragraphIndex) =>
    rules.flatMap((rule) => rule.checkParagraph(paragraph, paragraphIndex)),
  )
}
