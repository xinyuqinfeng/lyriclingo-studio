import { z } from 'zod'
import { partsOfSpeech } from './language'

export const TokenSchema = z.object({
  surface: z.string().min(1),
  start: z.number().int().min(0),
  end: z.number().int().min(1),
  pos: z.enum(partsOfSpeech),
  baseForm: z.string().min(1),
  baseReading: z.string().optional(),
  reading: z.string().optional(),
  meaning: z.string().min(1),
  contextualMeaning: z.string().optional(),
  conjugation: z.string().optional(),
  confirmed: z.boolean().default(true),
})
export type Token = z.infer<typeof TokenSchema>

export const LineAnalysisSchema = z.object({
  lineIndex: z.number().int().min(0),
  translation: z.string().min(1),
  readingText: z.string().optional(),
  tokens: z.array(TokenSchema),
  grammarNotes: z.array(z.string()).optional(),
  uncertainty: z.array(z.string()).optional(),
})
export type LineAnalysis = z.infer<typeof LineAnalysisSchema>

export const LineAnalysisSchemaArray = z.array(LineAnalysisSchema)

export function parseLineAnalysisArray(input: unknown): LineAnalysis[] {
  return LineAnalysisSchemaArray.parse(input)
}
