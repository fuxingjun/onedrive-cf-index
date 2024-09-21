import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

import { encodePath, getAccessToken } from './hello'
import apiConfig from '../../../config/api.config'
import siteConfig from '../../../config/site.config'
import { getRequestQuery } from '@/utils/nodePolyfill'

export const runtime = 'edge'

/**
 * Sanitize the search query
 *
 * @param query User search query, which may contain special characters
 * @returns Sanitised query string, which:
 * - encodes the '<' and '>' characters,
 * - replaces '?' and '/' characters with ' ',
 * - replaces ''' with ''''
 * Reference: https://stackoverflow.com/questions/41491222/single-quote-escaping-in-microsoft-graph.
 */
function sanitiseQuery(query: string): string {
  const sanitisedQuery = query
    .replace(/'/g, '\'\'')
    .replace('<', ' &lt; ')
    .replace('>', ' &gt; ')
    .replace('?', ' ')
    .replace('/', ' ')
  return encodeURIComponent(sanitisedQuery)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get access token from storage
  const accessToken = await getAccessToken()

  const query = getRequestQuery(req)
  // Query parameter from request
  const { q: searchQuery = '' } = query

  const headers = { 'Content-Type': 'application/json' }
  // Set edge function caching for faster load times, check docs:
  // https://vercel.com/docs/concepts/functions/edge-caching
  headers['Cache-Control'] = apiConfig.cacheControlHeader

  if (typeof searchQuery === 'string') {
    // Construct Microsoft Graph Search API URL, and perform search only under the base directory
    const searchRootPath = encodePath('/')
    const encodedPath = searchRootPath === '' ? searchRootPath : searchRootPath + ':'

    const searchApi = `${apiConfig.driveApi}/root${encodedPath}/search(q='${sanitiseQuery(searchQuery)}')`

    try {
      const { data } = await axios.get(searchApi, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          select: 'id,name,file,folder,parentReference',
          top: siteConfig.maxItems
        }
      })
      return new Response(JSON.stringify(data.value), {
        status: 200,
        headers
      })
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error?.response?.data ?? 'Internal server error.' }), {
        status: error?.response?.status ?? 500,
        headers
      })
    }
  } else {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers
    })
  }
}
