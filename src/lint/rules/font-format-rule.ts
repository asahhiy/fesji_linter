import type { LintIssue, ParagraphModel, ParagraphStyle } from '../document-model'

export interface StyleExpectation {
  style: ParagraphStyle
  fontName: string
  fontSize: number
  bold: boolean
}

export interface FontFormatRuleOptions {
  expectations: StyleExpectation[]
}

export function createFontFormatRule(options: FontFormatRuleOptions) {
  const expectationsByStyle = new Map(
    options.expectations.map((expectation) => [expectation.style, expectation]),
  )

  return {
    id: 'font-format',
    checkParagraph(paragraph: ParagraphModel, paragraphIndex: number): LintIssue[] {
      const expectation = expectationsByStyle.get(paragraph.style)
      if (!expectation) {
        return []
      }

      const issues: LintIssue[] = []

      if (paragraph.fontName !== expectation.fontName) {
        issues.push({
          ruleId: 'font-format/font-name',
          paragraphIndex,
          message: `Expected font name "${expectation.fontName}" for style "${paragraph.style}", received "${paragraph.fontName}".`,
        })
      }

      if (paragraph.fontSize !== expectation.fontSize) {
        issues.push({
          ruleId: 'font-format/font-size',
          paragraphIndex,
          message: `Expected font size ${expectation.fontSize}pt for style "${paragraph.style}", received ${paragraph.fontSize}pt.`,
        })
      }

      if (paragraph.bold !== expectation.bold) {
        issues.push({
          ruleId: 'font-format/bold',
          paragraphIndex,
          message: `Expected bold=${expectation.bold} for style "${paragraph.style}", received bold=${paragraph.bold}.`,
        })
      }

      return issues
    },
  }
}
