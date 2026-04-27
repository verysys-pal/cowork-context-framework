
import type { LinkItem } from '../types';
import { hexToRgb } from '../utils';

export interface LinkPageProps {
  linksLoading: boolean;
  links: LinkItem[];
  linksError: string | null;
  linkTitle: string;
  setLinkTitle: (v: string) => void;
  linkUrl: string;
  setLinkUrl: (v: string) => void;
  linkTag: string;
  setLinkTag: (v: string) => void;
  handleAddLink: () => void;
  linkGroupColors: Record<string, string>;
  handleUpdateLinkGroupColor: (tag: string, color: string) => void;
  activeTagDropdownId: string | null;
  setActiveTagDropdownId: (id: string | null) => void;
  handleUpdateLinkTag: (id: string, tag: string) => void;
  handleUpdateLinkTagPrompt: (id: string) => void;
  openNoteModal: (id: string) => void;
  handleRemoveLink: (id: string) => void;
  linkError: string | null;
}

export function LinkPage({
  linksLoading,
  links,
  linksError,
  linkTitle,
  setLinkTitle,
  linkUrl,
  setLinkUrl,
  linkTag,
  setLinkTag,
  handleAddLink,
  linkGroupColors,
  handleUpdateLinkGroupColor,
  activeTagDropdownId,
  setActiveTagDropdownId,
  handleUpdateLinkTag,
  handleUpdateLinkTagPrompt,
  openNoteModal,
  handleRemoveLink,
  linkError,
}: LinkPageProps) {
  return (
    <div className="link-page">
      <div className="link-page-card">
        <div className="sidebar-title">Add New Link</div>
        <div className="link-page-meta">
          {linksLoading ? '링크를 불러오는 중…' : `${links.length}개 링크`}
          {linksError && <span className="link-error">{linksError}</span>}
        </div>
        <div className="link-form">
          <input
            className="link-input"
            type="text"
            placeholder="링크 제목"
            value={linkTitle}
            onChange={(event) => setLinkTitle(event.target.value)}
          />
          <input
            className="link-input"
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
          />
          <input
            className="link-input link-tag-input"
            type="text"
            placeholder="태그"
            list="existing-tags"
            value={linkTag}
            onChange={(event) => setLinkTag(event.target.value)}
          />
          <datalist id="existing-tags">
            {Array.from(new Set(links.map((l) => l.tag || 'General'))).sort().map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
          <button type="button" className="monitor-folder-button" onClick={() => handleAddLink()}>
            링크 추가
          </button>
        </div>
        {linkError && <div className="link-error">{linkError}</div>}
      </div>

      {(() => {
        const grouped = links.reduce((acc, link) => {
          const tag = link.tag || 'General'
          if (!acc[tag]) acc[tag] = []
          acc[tag].push(link)
          return acc
        }, {} as Record<string, LinkItem[]>)

        const sortedTags = Object.keys(grouped).sort((a, b) => {
          if (a === 'General') return -1
          if (b === 'General') return 1
          return a.localeCompare(b)
        })

        const allTags = Array.from(new Set(links.map(l => l.tag || 'General'))).sort()

        return sortedTags.map(tag => {
          const groupColor = linkGroupColors[tag] || '#6366f1'
          const colorRgb = hexToRgb(groupColor)

          return (
            <div
              key={tag}
              className="link-page-card link-group-card"
              style={{
                background: `linear-gradient(135deg, rgba(${colorRgb}, 0.18), rgba(${colorRgb}, 0.05)), var(--bg-card)`,
                borderColor: `rgba(${colorRgb}, 0.45)`,
              }}
            >
              <div className="link-group-card-header">
                <div className="sidebar-title">{tag}</div>
                <label className="link-group-color-control" title={`${tag} 배경색 변경`}>
                  <input
                    type="color"
                    value={groupColor}
                    aria-label={`${tag} 그룹 카드 배경색 변경`}
                    onChange={(event) => handleUpdateLinkGroupColor(tag, event.target.value)}
                  />
                  <span className="link-group-color-icon" style={{ backgroundColor: groupColor }} />
                </label>
              </div>
              <div className="link-list">
                {grouped[tag].map((item) => (
                  <div key={item.id} className="link-item">
                    <div className="link-item-main">
                      <div className="link-item-title">{item.title}</div>
                      <a className="link-item-url" href={item.url} target="_blank" rel="noreferrer">
                        {item.url}
                      </a>
                    </div>
                    <div className="link-item-actions">
                      <div className="tag-dropdown-wrapper">
                        <button
                          type="button"
                          className="monitor-folder-button tag-dropdown-toggle"
                          onClick={() => setActiveTagDropdownId(activeTagDropdownId === item.id ? null : item.id)}
                          title="태그 변경"
                        >
                          ▼
                        </button>
                        {activeTagDropdownId === item.id && (
                          <div className="tag-dropdown-menu">
                            {allTags.map(t => (
                              <div
                                key={t}
                                className={`tag-dropdown-item ${item.tag === t ? 'active' : ''}`}
                                onClick={() => { handleUpdateLinkTag(item.id, t); setActiveTagDropdownId(null); }}
                              >
                                {t}
                              </div>
                            ))}
                            <div
                              className="tag-dropdown-item new-tag"
                              onClick={() => { handleUpdateLinkTagPrompt(item.id); setActiveTagDropdownId(null); }}
                            >
                              + New Tag
                            </div>
                          </div>
                        )}
                      </div>
                      <button type="button" className="monitor-folder-button link-note-button" onClick={() => openNoteModal(item.id)}>
                        메모
                      </button>
                      <button type="button" className="monitor-folder-button link-remove-button" onClick={() => handleRemoveLink(item.id)}>
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      })()}
    </div>
  )
}
