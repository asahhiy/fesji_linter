import type { ParagraphLintRule } from './run-lint'
import { createFontFormatRule, type StyleExpectation } from './rules/font-format-rule'

export const defaultStyleExpectations: StyleExpectation[] = [
  {
    style: 'title',
    fontName: 'Calibri',
    fontSize: 16,
    bold: true,
  },
  {
    style: 'heading1',
    fontName: 'Calibri',
    fontSize: 14,
    bold: true,
  },
  {
    style: 'body',
    fontName: 'Calibri',
    fontSize: 11,
    bold: false,
  },
]

export const defaultLintRules: ParagraphLintRule[] = [
  createFontFormatRule({
    expectations: defaultStyleExpectations,
  }),
]
