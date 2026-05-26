import { describe, expect, it } from 'vitest'

import type { DocumentModel } from './document-model'
import { createFontFormatRule } from './rules/font-format-rule'
import { runLint } from './run-lint'

const fontFormatRule = createFontFormatRule({
  expectations: [
    {
      style: 'title',
      fontName: 'Calibri',
      fontSize: 16,
      bold: true,
    },
    {
      style: 'body',
      fontName: 'Calibri',
      fontSize: 11,
      bold: false,
    },
  ],
})

function createDocument(paragraphs: DocumentModel['paragraphs']): DocumentModel {
  return { paragraphs }
}

describe('runLint', () => {
  it('returns no issues when all paragraphs match the style expectations', () => {
    const document = createDocument([
      {
        text: '文書タイトル',
        style: 'title',
        fontName: 'Calibri',
        fontSize: 16,
        bold: true,
      },
      {
        text: '本文です。',
        style: 'body',
        fontName: 'Calibri',
        fontSize: 11,
        bold: false,
      },
    ])

    expect(runLint(document, [fontFormatRule])).toEqual([])
  })

  it('reports font name, size, and bold mismatches with paragraph indexes', () => {
    const document = createDocument([
      {
        text: '本文です。',
        style: 'body',
        fontName: 'Times New Roman',
        fontSize: 10.5,
        bold: true,
      },
    ])

    expect(runLint(document, [fontFormatRule])).toEqual([
      {
        ruleId: 'font-format/font-name',
        paragraphIndex: 0,
        message: 'Expected font name "Calibri" for style "body", received "Times New Roman".',
      },
      {
        ruleId: 'font-format/font-size',
        paragraphIndex: 0,
        message: 'Expected font size 11pt for style "body", received 10.5pt.',
      },
      {
        ruleId: 'font-format/bold',
        paragraphIndex: 0,
        message: 'Expected bold=false for style "body", received bold=true.',
      },
    ])
  })

  it('ignores styles that do not have a configured expectation', () => {
    const document = createDocument([
      {
        text: '未定義スタイル',
        style: 'unknown',
        fontName: 'Any Font',
        fontSize: 99,
        bold: true,
      },
    ])

    expect(runLint(document, [fontFormatRule])).toEqual([])
  })

  it('produces deterministic output for the same document and rules', () => {
    const document = createDocument([
      {
        text: 'タイトル',
        style: 'title',
        fontName: 'Calibri',
        fontSize: 15,
        bold: false,
      },
      {
        text: '本文',
        style: 'body',
        fontName: 'Arial',
        fontSize: 11,
        bold: false,
      },
    ])

    const firstRun = runLint(document, [fontFormatRule])
    const secondRun = runLint(document, [fontFormatRule])

    expect(secondRun).toEqual(firstRun)
    expect(firstRun).toEqual([
      {
        ruleId: 'font-format/font-size',
        paragraphIndex: 0,
        message: 'Expected font size 16pt for style "title", received 15pt.',
      },
      {
        ruleId: 'font-format/bold',
        paragraphIndex: 0,
        message: 'Expected bold=true for style "title", received bold=false.',
      },
      {
        ruleId: 'font-format/font-name',
        paragraphIndex: 1,
        message: 'Expected font name "Calibri" for style "body", received "Arial".',
      },
    ])
  })
})
