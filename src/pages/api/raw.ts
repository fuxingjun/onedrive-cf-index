import { getRequestQuery, posix as pathPosix } from '../../utils/nodePolyfill'

import axios from 'axios'
import type { AxiosResponseHeaders } from 'axios'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { driveApi, cacheControlHeader } from '../../../config/api.config'
import { encodePath, getAccessToken, checkAuthRoute } from './hello'

export const runtime = 'edge'

// CORS middleware for raw links: https://nextjs.org/docs/api-routes/api-middlewares
// export function runCorsMiddleware(req: NextRequest) {
//   const cors = Cors({ methods: ['GET', 'HEAD'] })
//   return new Promise((resolve, reject) => {
//     cors(req, res, result => {
//       if (result instanceof Error) {
//         return reject(result)
//       }
//
//       return resolve(result)
//     })
//   })
// }

export function runCorsMiddleware(request) {

  // 设置 CORS 头部
  const allowedOrigin = '*' // 可以根据需要指定具体的origin
  const allowedMethods = 'GET, HEAD' // 定义允许的请求方法
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin, // 允许的源
    'Access-Control-Allow-Methods': allowedMethods,// 允许的请求方法
    'Access-Control-Allow-Headers': 'Content-Type, Authorization' // 允许的请求头
  }
  let response
  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    response = new Response(null, {
      status: 204, // 无内容的响应
      headers
    })
  }
  return [response, ['GET', 'HEAD'].includes(request.method) ? headers : {}]
}

export default async function handler(req: NextRequest) {
  const accessToken = await getAccessToken()
  const headers = { 'Content-Type': 'application/json' }
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'No access token.' }), {
      status: 403,
      headers
    })
  }
  const query = getRequestQuery(req)
  const { path = '/', odpt = '', proxy = false } = query

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

  // Handle protected routes authentication
  const odTokenHeader = (req.headers.get('od-protected-token') as string) ?? odpt

  const { code, message } = await checkAuthRoute(cleanPath, accessToken, odTokenHeader)
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
  const [r, h] = runCorsMiddleware(req)
  headers['Cache-Control'] = 'no-cache'
  if (r) {
    return r
  }
  Object.assign(headers, h)
  try {
    // Handle response from OneDrive API
    const requestUrl = `${driveApi}/root${encodePath(cleanPath)}`
    const { data } = await axios.get(requestUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        // OneDrive international version fails when only selecting the downloadUrl (what a stupid bug)
        select: 'id,size,@microsoft.graph.downloadUrl'
      }
    })

    if ('@microsoft.graph.downloadUrl' in data) {
      // Only proxy raw file content response for files up to 4MB
      if (proxy && 'size' in data && data['size'] < 4194304) {
        const { headers, data: stream } = await axios.get(data['@microsoft.graph.downloadUrl'] as string, {
          responseType: 'stream'
        })
        headers['Cache-Control'] = cacheControlHeader
        // Send data stream as response
        return new Response(stream, {
          status: 200,
          headers: headers as AxiosResponseHeaders
        })
      } else {
        return NextResponse.redirect(data['@microsoft.graph.downloadUrl'], 302)
      }
    } else {
      const error = 'No download url found.'
      return new Response(JSON.stringify({ error }), {
        status: 404,
        headers
      })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.response?.data ?? 'Internal server error.' }), {
      status: error?.response?.code ?? 500,
      headers
    })
  }
}
