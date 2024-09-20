import type { NextApiRequest, NextApiResponse } from 'next'
import { default as rawFileHandler } from '../raw'
export const runtime = 'edge'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  rawFileHandler(req, res)
}
