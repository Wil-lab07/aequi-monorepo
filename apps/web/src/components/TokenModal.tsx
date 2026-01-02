import { useState, useEffect } from 'react'
import { searchTokens } from '../services/dexscreener'
import type { Token } from '../services/token-manager'
import { getTokenLogo } from '../utils/logos'

interface TokenModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (token: Token) => void
  defaultTokens: Token[]
}

export function TokenModal({ isOpen, onClose, onSelect, defaultTokens }: TokenModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen])

  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      setLoading(true)
      try {
        const results = await searchTokens(searchQuery)
        // Filter results by chain if possible, or just show all
        // For now, we'll just show what we find
        setSearchResults(results)
      } catch (error) {
        console.error('Search failed', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(search, 500)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  if (!isOpen) return null

  const displayTokens = searchQuery ? searchResults : defaultTokens

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Select a token</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="search-container">
          <input
            className="search-input"
            placeholder="Search name or paste address"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="token-list">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading...
            </div>
          ) : (
            displayTokens.map((token) => (
              <div
                key={token.address}
                className="token-item"
                onClick={() => onSelect(token)}
              >
                {token.logoURI || getTokenLogo(token.symbol) ? (
                  <img src={token.logoURI || getTokenLogo(token.symbol)} alt={token.symbol} className="token-icon" />
                ) : (
                  <div className="token-icon">{token.symbol[0]}</div>
                )}
                <div className="token-info">
                  <span className="token-symbol">{token.symbol}</span>
                  <span className="token-name">{token.name}</span>
                </div>
                {token.isImported && <span className="import-badge">Imported</span>}
              </div>
            ))
          )}

          {searchQuery && !loading && displayTokens.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No tokens found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
