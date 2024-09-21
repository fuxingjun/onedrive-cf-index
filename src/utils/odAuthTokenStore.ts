import siteConfig from '../../config/site.config'
import { getRequestContext } from '@cloudflare/next-on-pages'

// Persistent key-value store is provided by Redis, hosted on Upstash
// https://vercel.com/integrations/upstash
// const kv = new Redis(process.env.REDIS_URL || '')

export const config = {
  runtime: 'edge'
}

export async function getOdAuthTokens(): Promise<{ accessToken: unknown; refreshToken: unknown }> {
  const kv = getRequestContext().env.onedrive_index
  const accessToken = await kv.get(`${siteConfig.kvPrefix}access_token`)
  const refreshToken = await kv.get(`${siteConfig.kvPrefix}refresh_token`)

  return {
    accessToken,
    refreshToken
  }
}

export async function storeOdAuthTokens({
                                          accessToken,
                                          accessTokenExpiry,
                                          refreshToken
                                        }: {
  accessToken: string
  accessTokenExpiry: number
  refreshToken: string
}): Promise<void> {
  const kv = getRequestContext().env.onedrive_index
  await kv.put(`${siteConfig.kvPrefix}access_token`, accessToken, { expirationTtl: Math.min(accessTokenExpiry, 7 * 24 * 3600) })
  await kv.put(`${siteConfig.kvPrefix}refresh_token`, refreshToken)
}
