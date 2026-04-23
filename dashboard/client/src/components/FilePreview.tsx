import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './MarkdownPreview.css'
import './FilePreview.css'

interface FilePreviewData {
  fileName: string;
  filePath: string;
  extension: string;
  kind: 'markdown' | 'text' | 'image' | 'pdf' | 'unknown';
  mimeType: string;
  size: number;
  content?: string;
  dataUrl?: string;
}

interface FilePreviewProps {
  file: FilePreviewData | null;
  onClose: () => void;
}

type CodeLanguage = 'javascript' | 'typescript' | 'python' | 'shell' | 'sql' | 'css' | 'html' | 'json' | 'text'

const LANGUAGE_BY_EXTENSION: Record<string, CodeLanguage> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.json': 'json',
  '.jsonc': 'json',
  '.py': 'python',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.ps1': 'shell',
  '.sql': 'sql',
  '.css': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.less': 'css',
  '.html': 'html',
  '.htm': 'html',
}

const KEYWORDS: Record<Exclude<CodeLanguage, 'text'>, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends', 'import', 'from', 'export', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'this', 'null', 'true', 'false'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends', 'implements', 'interface', 'type', 'enum', 'import', 'from', 'export', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'this', 'readonly', 'public', 'private', 'protected', 'null', 'true', 'false'],
  python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'with', 'lambda', 'yield', 'async', 'await', 'pass', 'None', 'True', 'False'],
  shell: ['if', 'then', 'fi', 'for', 'in', 'do', 'done', 'while', 'case', 'esac', 'function', 'local', 'export', 'readonly', 'return', 'exit', 'break', 'continue'],
  sql: ['select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table', 'alter', 'drop', 'join', 'left', 'right', 'inner', 'outer', 'on', 'group', 'by', 'order', 'limit', 'offset', 'and', 'or', 'not', 'null', 'true', 'false'],
  css: ['display', 'position', 'flex', 'grid', 'padding', 'margin', 'color', 'background', 'border', 'width', 'height', 'content', 'align-items', 'justify-content', 'font-size', 'font-weight'],
  html: ['html', 'head', 'body', 'div', 'span', 'button', 'input', 'select', 'option', 'iframe', 'img', 'pre', 'code', 'section', 'article', 'main', 'header', 'footer'],
  json: ['true', 'false', 'null'],
}

const TOKEN_CLASS = {
  comment: 'code-token-comment',
  string: 'code-token-string',
  keyword: 'code-token-keyword',
  number: 'code-token-number',
  operator: 'code-token-operator',
  punctuation: 'code-token-punctuation',
  tag: 'code-token-tag',
  plain: 'code-token-plain',
} as const

const PUNCTUATION = new Set(['{', '}', '(', ')', '[', ']', ',', '.', ':', ';', '<', '>'])

type Token = { text: string; className: string }

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const titleForKind = (kind: FilePreviewData['kind']): string => {
  switch (kind) {
    case 'markdown': return 'Markdown'
    case 'text': return 'Text'
    case 'image': return 'Image'
    case 'pdf': return 'PDF'
    default: return 'Preview'
  }
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const languageForExtension = (extension: string): CodeLanguage => LANGUAGE_BY_EXTENSION[extension.toLowerCase()] ?? 'text'

const isCodeFile = (extension: string): boolean => extension.toLowerCase() in LANGUAGE_BY_EXTENSION

const tokenizeLine = (line: string, language: CodeLanguage): Token[] => {
  const trimmed = line.trimStart()
  if (language === 'shell' && trimmed.startsWith('#')) return [{ text: line, className: TOKEN_CLASS.comment }]
  if ((language === 'python' || language === 'shell') && trimmed.startsWith('#')) return [{ text: line, className: TOKEN_CLASS.comment }]
  if (language === 'sql' && trimmed.startsWith('--')) return [{ text: line, className: TOKEN_CLASS.comment }]
  if (language === 'css' && trimmed.startsWith('/*')) return [{ text: line, className: TOKEN_CLASS.comment }]
  if (language === 'html' && trimmed.startsWith('<!--')) return [{ text: line, className: TOKEN_CLASS.comment }]

  const keywords = language === 'text' ? [] : KEYWORDS[language]
  const keywordPattern = keywords.length > 0 ? `\\b(?:${keywords.map(escapeRegExp).join('|')})\\b` : '(?!)'
  const pattern = [
    '"(?:\\\\.|[^"\\\\])*"',
    "'(?:\\\\.|[^'\\\\])*'",
    '`(?:\\\\.|[^`\\\\])*`',
    keywordPattern,
    '\\b\\d+(?:\\.\\d+)?\\b',
    '[{}()[\\],.:;<>/+*=%-]'
  ].join('|')

  const regex = new RegExp(pattern, 'g')
  const pieces: Token[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) pieces.push({ text: line.slice(lastIndex, match.index), className: TOKEN_CLASS.plain })

    const value = match[0]
    if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) {
      pieces.push({ text: value, className: TOKEN_CLASS.string })
    } else if (/^\\d/.test(value)) {
      pieces.push({ text: value, className: TOKEN_CLASS.number })
    } else if (keywords.includes(value)) {
      pieces.push({ text: value, className: TOKEN_CLASS.keyword })
    } else if (PUNCTUATION.has(value)) {
      pieces.push({ text: value, className: TOKEN_CLASS.punctuation })
    } else {
      pieces.push({ text: value, className: TOKEN_CLASS.operator })
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < line.length) pieces.push({ text: line.slice(lastIndex), className: TOKEN_CLASS.plain })
  return pieces
}

const renderCode = (content: string, extension: string): React.ReactNode => {
  const language = languageForExtension(extension)
  return content.split('\n').map((line, index) => {
    const tokens = tokenizeLine(line, language)
    return (
      <div className="code-line" key={index}>
        <span className="code-line-number">{index + 1}</span>
        <span className="code-line-content">
          {tokens.map((part, partIndex) => (
            <span key={partIndex} className={part.className}>{part.text}</span>
          ))}
        </span>
      </div>
    )
  })
}

function FilePreview({ file, onClose }: FilePreviewProps) {
  if (!file) return null

  const icon = file.kind === 'image' ? '🖼️' : file.kind === 'pdf' ? '📕' : file.kind === 'markdown' ? '📄' : '📝'
  const canRenderCode = file.kind === 'text' && isCodeFile(file.extension)

  return (
    <div className="preview-container">
      <div className="preview-header">
        <div className="preview-title">
          <span className="preview-icon">{icon}</span>
          <div>
            <div>{file.fileName}</div>
            <div className="preview-meta">{titleForKind(file.kind)} · {file.extension || 'no extension'} · {formatBytes(file.size)}</div>
          </div>
        </div>
        <button className="preview-close" onClick={onClose}>×</button>
      </div>

      <div className="preview-content">
        {file.kind === 'image' && file.dataUrl ? (
          <div className="preview-media-wrap">
            <img className="preview-image" src={file.dataUrl} alt={file.fileName} />
          </div>
        ) : file.kind === 'pdf' && file.dataUrl ? (
          <iframe className="preview-pdf" src={file.dataUrl} title={file.fileName} />
        ) : file.kind === 'markdown' && file.content ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {file.content}
            </ReactMarkdown>
          </div>
        ) : file.content && canRenderCode ? (
          <div className="preview-code">{renderCode(file.content, file.extension)}</div>
        ) : file.content ? (
          <pre className="preview-plain"><code>{file.content}</code></pre>
        ) : (
          <div className="usage-empty">No preview available.</div>
        )}
      </div>
    </div>
  )
}

export default FilePreview
