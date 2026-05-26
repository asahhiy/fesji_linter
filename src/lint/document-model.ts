export type ParagraphStyle = 'title' | 'heading1' | 'body' | 'unknown'

export interface ParagraphModel {
  text: string
  style: ParagraphStyle
  fontName: string
  fontSize: number
  bold: boolean
}

export interface DocumentModel {
  paragraphs: ParagraphModel[]
}

export interface LintIssue {
  ruleId: string
  paragraphIndex: number
  message: string
}
