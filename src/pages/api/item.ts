import axios from 'axios'
import type { NextRequest } from 'next/server'

import { getAccessToken } from './hello'
import apiConfig from '../../../config/api.config'
import { getRequestQuery } from '@/utils/nodePolyfill'

export const runtime = 'edge'

export default async function handler(req: NextRequest) {

  // Get access token from storage
  const accessToken = await getAccessToken()

  // Get item details (specifically, its path) by its unique ID in OneDrive
  const query = getRequestQuery(req)
  const { id = '' } = query

  const headers = { 'Content-Type': 'application/json' }
  // Set edge function caching for faster load times, check docs:
  // https://vercel.com/docs/concepts/functions/edge-caching
  headers['Cache-Control'] = apiConfig.cacheControlHeader

  if (typeof id === 'string') {
    const itemApi = `${apiConfig.driveApi}/items/${id}`

    try {
      const { data } = await axios.get(itemApi, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          select: 'id,name,parentReference'
        }
      })
      return new Response(JSON.stringify(data), {
        status: 400,
        headers
      })
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error?.response?.data ?? 'Internal server error.' }), {
        status: error?.response?.status ?? 500,
        headers
      })
    }
  } else {
    const error = 'Invalid driveItem ID.'
    return new Response(JSON.stringify({ error }), {
      status: 400,
      headers
    })
  }
}
