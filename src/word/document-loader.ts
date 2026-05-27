import type { DocumentModel, ParagraphModel, ParagraphStyle } from '../lint/document-model'

type OfficeReadyInfo = {
  host?: string
}

type OfficeRuntime = {
  HostType?: {
    Word?: string
  }
  onReady?: (callback?: (info: OfficeReadyInfo) => void) => Promise<OfficeReadyInfo> | void
}

type WordFont = {
  name?: string
  size?: number
  bold?: boolean
}

type WordParagraph = {
  text?: string
  style?: string
  font?: WordFont
}

type WordParagraphCollection = {
  items: WordParagraph[]
  load: (propertyNames: string) => void
}

type WordRequestContext = {
  document: {
    body: {
      paragraphs: WordParagraphCollection
    }
  }
  sync: () => Promise<void>
}

type WordRuntime = {
  run: <T>(callback: (context: WordRequestContext) => Promise<T>) => Promise<T>
}

type OfficeGlobal = typeof globalThis & {
  Office?: OfficeRuntime
  Word?: WordRuntime
}

const WORD_PARAGRAPH_LOAD_PROPERTIES =
  'items/text,items/style,items/font/name,items/font/size,items/font/bold'

export async function isWordHostAvailable(): Promise<boolean> {
  const office = getOfficeRuntime()

  if (office?.onReady) {
    const readyInfo = await waitForOfficeReady(office)
    const wordHostName = office.HostType?.Word ?? 'Word'

    if (readyInfo?.host && readyInfo.host !== wordHostName && readyInfo.host !== 'Word') {
      return false
    }
  }

  return Boolean(getWordRuntime()?.run)
}

export async function loadDocumentFromWord(): Promise<DocumentModel> {
  const office = getOfficeRuntime()

  if (office?.onReady) {
    await waitForOfficeReady(office)
  }

  const word = getWordRuntime()

  if (!word?.run) {
    throw new Error('Word runtime is not available.')
  }

  return word.run(async (context) => {
    const paragraphs = context.document.body.paragraphs

    paragraphs.load(WORD_PARAGRAPH_LOAD_PROPERTIES)
    await context.sync()

    return {
      paragraphs: paragraphs.items.map(toParagraphModel),
    }
  })
}

export function mapWordStyleToParagraphStyle(styleName: string | undefined): ParagraphStyle {
  const normalizedStyle = normalizeStyleName(styleName)

  if (['title', 'タイトル'].includes(normalizedStyle)) {
    return 'title'
  }

  if (['heading 1', 'heading1', '見出し 1', '見出し1'].includes(normalizedStyle)) {
    return 'heading1'
  }

  if (['normal', 'body', 'body text', '標準', '本文'].includes(normalizedStyle)) {
    return 'body'
  }

  return 'unknown'
}

function getOfficeRuntime(): OfficeRuntime | undefined {
  return (globalThis as OfficeGlobal).Office
}

function getWordRuntime(): WordRuntime | undefined {
  return (globalThis as OfficeGlobal).Word
}

async function waitForOfficeReady(office: OfficeRuntime): Promise<OfficeReadyInfo | undefined> {
  if (!office.onReady) {
    return undefined
  }

  const readyResult = office.onReady()

  if (isPromiseLike(readyResult)) {
    return readyResult
  }

  return new Promise((resolve) => {
    office.onReady?.((info) => resolve(info))
  })
}

function isPromiseLike(value: unknown): value is Promise<OfficeReadyInfo> {
  return typeof value === 'object' && value !== null && 'then' in value
}

function toParagraphModel(paragraph: WordParagraph): ParagraphModel {
  return {
    text: paragraph.text ?? '',
    style: mapWordStyleToParagraphStyle(paragraph.style),
    fontName: normalizeFontName(paragraph.font?.name),
    fontSize: normalizeFontSize(paragraph.font?.size),
    bold: paragraph.font?.bold === true,
  }
}

function normalizeStyleName(styleName: string | undefined): string {
  return (styleName ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeFontName(fontName: string | undefined): string {
  const normalizedFontName = fontName?.trim()

  return normalizedFontName ? normalizedFontName : 'Unknown'
}

function normalizeFontSize(fontSize: number | undefined): number {
  return typeof fontSize === 'number' && Number.isFinite(fontSize) ? fontSize : 0
}
