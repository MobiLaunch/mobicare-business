import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProductStore } from '../lib/store'
import ProductCard from '../components/ProductCard'
import PageMeta from '../components/PageMeta'

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'A–Z Name' },
  { value: 'newest', label: 'Newest First' },
]

export default function Shop() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const products = useProductStore(s => s.products.filter(p => p.active))
  const categories = useProductStore(s => s.categories)

  const [search, setSearch] = useState('')
  const [searchMenuOpen, setSearchMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [sort, setSort] = useState('featured')
  const [selectedCat, setSelectedCat] = useState(searchParams.get('cat') || 'all')

  useEffect(() => {
    const cat = searchParams.get('cat')
    if (cat) setSelectedCat(cat)
  }, [searchParams])

  const handleCatChange = (cat) => {
    setSelectedCat(cat)
    setSearchParams(cat === 'all' ? {} : { cat })
  }

  let filtered = products.filter(p => {
    const matchesCat = selectedCat === 'all' || p.category === selectedCat
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
      p.category?.toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price
    if (sort === 'price-desc') return b.price - a.price
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
  })

  const searchSuggestions = categories.slice(0, 3).map(category => category.name)
  const selectedSort = SORT_OPTIONS.find(option => option.value === sort)

  const applySearch = (value) => {
    setSearch(value)
    setSearchMenuOpen(false)
  }

  return (
    <main
      className="responsive page-top"
      style={{
        paddingLeft: 'clamp(12px, 3vw, 24px)',
        paddingRight: 'clamp(12px, 3vw, 24px)',
        paddingBottom: 48,
        overflowX: 'hidden'
      }}
    >
      <PageMeta
        title="Shop — Mobicare"
        description="Shop premium phone accessories at Mobicare."
      />

      {/* Page header */}
      <div className="row middle-align wrap" style={{ marginBottom: 24, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p className="primary-text bold upper" style={{ fontSize: 11, letterSpacing: '0.1em', margin: 0, overflowWrap: 'break-word' }}>
            Accessories &amp; Gear
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.1, overflowWrap: 'break-word' }}>
            Shop
          </h1>
        </div>
        <div className="max" />
        <span className="chip surface-container-high" style={{ fontWeight: 600, fontSize: 12, border: '1px solid var(--outline-variant)' }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="shop-filter-toolbar">
        <div className={`field large prefix round fill shop-search-field ${searchMenuOpen ? 'active' : ''}`}>
          <i className="front">search</i>
          <input
            type="search"
            value={search}
            onFocus={() => setSearchMenuOpen(true)}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applySearch(e.currentTarget.value)}
            aria-label="Search products"
          />
          {search && (
            <button className="circle transparent small shop-search-clear" onClick={() => applySearch('')} aria-label="Clear search">
              <i>close</i>
            </button>
          )}
          <menu className="min shop-search-menu">
            <li className="transparent">
              <div className="field large prefix shop-search-menu-field">
                <i className="front">arrow_back</i>
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applySearch(e.currentTarget.value)}
                  aria-label="Refine product search"
                />
              </div>
            </li>
            {searchSuggestions.map(suggestion => (
              <li key={suggestion} onMouseDown={e => e.preventDefault()} onClick={() => applySearch(suggestion)}>
                <i>history</i>
                <div>{suggestion}</div>
              </li>
            ))}
          </menu>
        </div>

        <div className={`shop-sort-control ${sortMenuOpen ? 'active' : ''}`}>
          <button
            className="circle surface-container-high shop-sort-trigger"
            onClick={() => { setSearchMenuOpen(false); setSortMenuOpen(open => !open) }}
            aria-label={`Sort products: ${selectedSort.label}`}
            aria-expanded={sortMenuOpen}
          >
            <i>filter_list</i>
          </button>
          <menu className="min shop-sort-menu">
            {SORT_OPTIONS.map(option => (
              <li key={option.value} className={sort === option.value ? 'active' : ''}>
                <button onClick={() => { setSort(option.value); setSortMenuOpen(false) }}>
                  {sort === option.value && <i>check</i>}
                  <span>{option.label}</span>
                </button>
              </li>
            ))}
          </menu>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="row wrap" style={{ gap: 8, marginBottom: 24 }}>
        <button
          className={`chip round ${selectedCat === 'all' ? 'primary' : 'surface-container-high'}`}
          onClick={() => handleCatChange('all')}
          style={{
            fontWeight: selectedCat === 'all' ? 700 : 500,
            border: selectedCat === 'all' ? 'none' : '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)',
            transition: 'all 0.2s ease'
          }}
        >
          {selectedCat === 'all' && <i style={{ fontSize: 15 }}>check_circle</i>}
          All Products
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`chip round ${selectedCat === cat.id ? 'primary' : 'surface-container-high'}`}
            onClick={() => handleCatChange(cat.id)}
            style={{
              fontWeight: selectedCat === cat.id ? 700 : 500,
              border: selectedCat === cat.id ? 'none' : '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)',
              transition: 'all 0.2s ease'
            }}
          >
            {selectedCat === cat.id && <i style={{ fontSize: 15 }}>check_circle</i>}
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product grid — BeerCSS grid */}
      {filtered.length > 0 ? (
        <div className="grid">
          {filtered.map(p => (
            <div key={p.id} className="s12 m6 l3" style={{ minWidth: 0 }}>
              <ProductCard product={p} onClick={() => navigate(`/product/${p.id}`)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="center-align padding surface-container-low" style={{ borderRadius: 24, marginTop: 32, border: '1px solid var(--outline-variant)' }}>
          <i className="extra primary-text" style={{ fontSize: 48, marginBottom: 16 }}>search_off</i>
          <h5 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 600 }}>No products found</h5>
          <p className="on-surface-variant-text" style={{ margin: '0 0 24px' }}>Try adjusting your search or category filter.</p>
          <button className="primary round" onClick={() => { setSearch(''); handleCatChange('all') }}>
            <i>filter_alt_off</i>
            <span>Clear Filters</span>
          </button>
        </div>
      )}
    </main>
  )
}
