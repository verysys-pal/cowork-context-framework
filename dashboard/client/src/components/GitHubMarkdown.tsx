import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import Mermaid from './Mermaid'

interface GitHubMarkdownProps {
  content: string;
}

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const language = match?.[1]?.toLowerCase()
    const content = String(children).replace(/\n$/, '')

    if (language === 'mermaid') {
      return (
        <div className="markdown-mermaid">
          <Mermaid chart={content} />
        </div>
      )
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

function GitHubMarkdown({ content }: GitHubMarkdownProps) {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]} 
      rehypePlugins={[rehypeRaw]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  )
}

export default GitHubMarkdown
