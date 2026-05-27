import { describe, expect, it } from 'vitest'

import { mapWordStyleToParagraphStyle } from './document-loader'

describe('mapWordStyleToParagraphStyle', () => {
  it('maps supported Word style names into lint model styles', () => {
    expect(mapWordStyleToParagraphStyle('Title')).toBe('title')
    expect(mapWordStyleToParagraphStyle('Heading 1')).toBe('heading1')
    expect(mapWordStyleToParagraphStyle('Normal')).toBe('body')
  })

  it('maps Japanese built-in style names into lint model styles', () => {
    expect(mapWordStyleToParagraphStyle('タイトル')).toBe('title')
    expect(mapWordStyleToParagraphStyle('見出し 1')).toBe('heading1')
    expect(mapWordStyleToParagraphStyle('標準')).toBe('body')
  })

  it('returns unknown for unconfigured styles', () => {
    expect(mapWordStyleToParagraphStyle('Quote')).toBe('unknown')
    expect(mapWordStyleToParagraphStyle(undefined)).toBe('unknown')
  })
})
