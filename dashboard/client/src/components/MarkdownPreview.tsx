import GitHubMarkdown from './GitHubMarkdown'
import './MarkdownPreview.css'

interface MarkdownPreviewProps {
  content: string;
  onClose: () => void;
  fileName: string;
}

function MarkdownPreview({ content, onClose, fileName }: MarkdownPreviewProps) {
  return (
    <div className="preview-container">
      <div className="preview-header">
        <div className="preview-title">
          <span className="preview-icon">📄</span>
          {fileName}
        </div>
        <button className="preview-close" onClick={onClose}>×</button>
      </div>
      <div className="preview-content markdown-body">
        <GitHubMarkdown content={content} />
      </div>
    </div>
  )
}

export default MarkdownPreview
