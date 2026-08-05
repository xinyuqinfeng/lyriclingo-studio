export interface ParsedLine {
  seq: number
  text: string
  isSectionBreak: boolean
}

export function parseLyrics(lyrics: string): ParsedLine[] {
  // Reject truly empty input, but allow full-width-space-only lines (U+3000
  // is not removed here, so '　' passes as a non-empty line).
  if (!lyrics || lyrics.replace(/[ \t\n\r]/g, '') === '') {
    throw new Error('歌词为空')
  }
  const normalized = lyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rawLines = normalized.split('\n')
  const result: ParsedLine[] = []
  for (let i = 0; i < rawLines.length; i++) {
    // Trim ASCII whitespace but preserve full-width space (U+3000)
    // as a non-empty line, matching the test expectation.
    const text = rawLines[i].replace(/^[ \t]+|[ \t]+$/g, '')
    if (text === '') {
      result.push({ seq: i, text: '', isSectionBreak: true })
    } else {
      result.push({ seq: i, text, isSectionBreak: false })
    }
  }
  return result
}
