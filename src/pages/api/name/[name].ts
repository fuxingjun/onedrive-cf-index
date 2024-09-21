import type { NextRequest } from 'next/server'
import { default as rawFileHandler } from '../raw'

export const runtime = 'edge'
export default async function handler(req: NextRequest) {
  rawFileHandler(req)
}
