import type { GitFile, LinkItem } from '../types';

export const DEFAULT_LINKS: LinkItem[] = []
export const LEGACY_LINK_STORAGE_KEY = 'cowork-dashboard-links'
export const LINK_GROUP_COLOR_STORAGE_KEY = 'cowork-dashboard-link-group-colors'

export const readLinkGroupColors = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(LINK_GROUP_COLOR_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => (
        typeof entry[0] === 'string' && /^#[0-9a-f]{6}$/i.test(String(entry[1]))
      ))
    )
  } catch {
    return {}
  }
}

export const hexToRgb = (hex: string): string => {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return `${red}, ${green}, ${blue}`
}

export const statusLabelForFile = (file: GitFile): string => {
  if (!file.status || file.status === 'none') return ''
  if (file.status === '??') return 'U'
  return file.status.slice(0, 1)
}

export const iconForExplorerFile = (fileName: string): string => {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.md')) return '⬢'
  if (lowerName.endsWith('.json')) return '{}'
  if (lowerName.endsWith('.ts') || lowerName.endsWith('.tsx')) return 'TS'
  if (lowerName.endsWith('.css')) return '#'
  if (lowerName.endsWith('.log')) return '≡'
  return '•'
}

export const isExcludedPath = (pathValue: string | undefined, excludeFolders: string[]): boolean => {
  if (!pathValue) return false

  const normalizedExcludes = excludeFolders
    .map((folder) => folder.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)

  if (normalizedExcludes.length === 0) return false

  const pathSegments = pathValue.replace(/\\/g, '/').split('/').filter(Boolean)
  return normalizedExcludes.some((excluded) => {
    const excludedSegments = excluded.split('/').filter(Boolean)
    if (excludedSegments.length === 1) {
      return pathSegments.includes(excludedSegments[0])
    }

    return pathValue.replace(/\\/g, '/').includes(excluded)
  })
}

export const filterExcludedFiles = (items: GitFile[], excludeFolders: string[]): GitFile[] => (
  items.filter((item) => !isExcludedPath(item.path || item.fullName || item.name, excludeFolders))
)

export const readLegacyLinks = (): LinkItem[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(LEGACY_LINK_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.url === 'string')
      .filter((item) => item.id !== 'opencode-web')
      .map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        note: typeof item.note === 'string' ? item.note : '',
        tag: typeof item.tag === 'string' ? (item.tag.trim() || 'General') : 'General',
      }))
  } catch {
    return []
  }
}
