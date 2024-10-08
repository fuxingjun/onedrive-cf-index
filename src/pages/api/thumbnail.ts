import type { OdThumbnail } from '../../types'

import { getRequestQuery, posix as pathPosix } from '../../utils/nodePolyfill'

import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import { NextResponse } from 'next/server'

import { checkAuthRoute, encodePath, getAccessToken } from './hello'
import apiConfig from '../../../config/api.config'

export const runtime = 'edge'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = await getAccessToken()
  const headers = { 'Content-Type': 'application/json' }
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'No access token.' }), {
      status: 403,
      headers
    })
  }

  const query = getRequestQuery(req)

  // Get item thumbnails by its path since we will later check if it is protected
  const { path = '', size = 'medium', odpt = '' } = query

  // Set edge function caching for faster load times, if route is not protected, check docs:
  // https://vercel.com/docs/concepts/functions/edge-caching
  if (odpt === '') headers['Cache-Control'] = apiConfig.cacheControlHeader

  // Check whether the size is valid - must be one of 'large', 'medium', or 'small'
  if (size !== 'large' && size !== 'medium' && size !== 'small') {
    return new Response(JSON.stringify({ error: 'Invalid size' }), {
      status: 400,
      headers
    })
  }
  // Sometimes the path parameter is defaulted to '[...path]' which we need to handle
  if (path === '[...path]') {
    return new Response(JSON.stringify({ error: 'No path specified.' }), {
      status: 400,
      headers
    })
  }
  // If the path is not a valid path, return 400
  if (typeof path !== 'string') {
    return new Response(JSON.stringify({ error: 'Path query invalid.' }), {
      status: 400,
      headers
    })
  }
  const cleanPath = pathPosix.resolve('/', pathPosix.normalize(path))

  const { code, message } = await checkAuthRoute(cleanPath, accessToken, odpt as string)
  // Status code other than 200 means user has not authenticated yet
  if (code !== 200) {
    return new Response(JSON.stringify({ error: message }), {
      status: code,
      headers
    })
  }
  // If message is empty, then the path is not protected.
  // Conversely, protected routes are not allowed to serve from cache.
  if (message !== '') {
    headers['Cache-Control'] = 'no-cache'
  }

  const requestPath = encodePath(cleanPath)
  // Handle response from OneDrive API
  const requestUrl = `${apiConfig.driveApi}/root${requestPath}`
  // Whether path is root, which requires some special treatment
  const isRoot = requestPath === ''

  try {
    const { data } = await axios.get(`${requestUrl}${isRoot ? '' : ':'}/thumbnails`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    const thumbnailUrl = data.value && data.value.length > 0 ? (data.value[0] as OdThumbnail)[size].url : null
    if (thumbnailUrl) {
      return NextResponse.redirect(thumbnailUrl, 302)
    } else {
      return new Response(JSON.stringify({ error: 'The item doesn\'t have a valid thumbnail.' }), {
        status: 400,
        headers
      })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.response?.data ?? 'Internal server error.' }), {
      status: error?.response?.status,
      headers
    })
  }
}
