type JoinFunction = (...parts: string[]) => string;
type DirnameFunction = (path: string) => string;
type BasenameFunction = (path: string, ext?: string) => string;
type ExtnameFunction = (path: string) => string;

const join: JoinFunction = (...parts) => {
  return parts.filter(Boolean).join('/')
}

const dirname: DirnameFunction = (path) => {
  const result = path.replace(/\/[^/]+\/?$/, '')
  return result || '.'
}

const basename: BasenameFunction = (path, ext = '') => {
  const filename = path.replace(/.*\//, '')
  return ext && filename.endsWith(ext)
    ? filename.slice(0, -ext.length)
    : filename
}

const extname: ExtnameFunction = (path) => {
  const index = path.lastIndexOf('.')
  return index === -1 ? '' : path.slice(index)
}

interface PathPosix {
  join: JoinFunction;
  dirname: DirnameFunction;
  basename: BasenameFunction;
  extname: ExtnameFunction;
  sep: string;
  delimiter: string;

  normalize(p: string): string;

  resolve(...pathSegments: string[]): string;
}

const posix: PathPosix = {
  join,
  dirname,
  basename,
  extname,
  sep: '/',
  delimiter: ':',

  normalize(p) {
    if (typeof p !== 'string') {
      throw new TypeError(`Path must be a string. Received ${JSON.stringify(p)}`)
    }
    if (p === '') return '.'

    const isAbsolute = p.startsWith('/')
    const trailingSlash = p.endsWith('/')

    // 规范化路径
    const segments = p.split('/').filter(Boolean)
    const normalizedSegments: string[] = []
    for (const segment of segments) {
      if (segment === '.') continue
      if (segment === '..') {
        if (normalizedSegments.length > 0 && normalizedSegments[normalizedSegments.length - 1] !== '..') {
          normalizedSegments.pop()
        } else if (!isAbsolute) {
          normalizedSegments.push('..')
        }
      } else {
        normalizedSegments.push(segment)
      }
    }

    let normalized = normalizedSegments.join('/')
    if (trailingSlash && normalized !== '/') {
      normalized += '/'
    }

    return isAbsolute ? `/${normalized}` : normalized
  },

  resolve(...pathSegments) {
    let resolvedPath = ''
    for (let i = pathSegments.length - 1; i >= 0; i--) {
      const segment = pathSegments[i]
      if (segment) {
        resolvedPath = `${segment}/${resolvedPath}`
        if (segment.startsWith('/')) {
          break
        }
      }
    }
    return this.normalize(resolvedPath)
  }
}
export {
  posix
}