import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProductStore, useToastStore } from '../lib/store'

const EMPTY_PRODUCT = {
  name: '', category: '', price: '', comparePrice: '', stock: '',
  sku: '', description: '', images: [''], tags: '',
  featured: false, active: true,
  shippingDays: { min: 3, max: 7 }
}

export default function Products() {
  const [searchParams] = useSearchParams()
  const products = useProductStore(s => s.products)
  const categories = useProductStore(s => s.categories)
  const { addProduct, updateProduct, deleteProduct } = useProductStore()
  const addToast = useToastStore(s => s.add)

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    if (searchParams.get('action') === 'add') openAdd()
  }, [])

  const filtered = products.filter(p => {
    const matchesCat = catFilter === 'all' || p.category === catFilter
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_PRODUCT })
    setModalOpen(true)
  }

  const openEdit = (product) => {
    setEditingId(product.id)
    setForm({
      ...product,
      price: String(product.price),
      comparePrice: product.comparePrice ? String(product.comparePrice) : '',
      stock: String(product.stock),
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.tags || '',
      images: product.images?.length ? product.images : ['']
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    const { name, category, price, stock, sku, description } = form
    if (!name || !category || !price || !stock || !sku || !description) {
      addToast('Please fill in all required fields (*)', 'error')
      return
    }
    const priceNum = parseFloat(price)
    const stockNum = parseInt(stock, 10)
    const compareNum = form.comparePrice ? parseFloat(form.comparePrice) : null

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      addToast('Please enter a valid non-negative price', 'error')
      return
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      addToast('Please enter a valid stock quantity', 'error')
      return
    }
    if (compareNum != null && (!Number.isFinite(compareNum) || compareNum < 0)) {
      addToast('Please enter a valid compare-at price', 'error')
      return
    }

    const data = {
      ...form,
      price: priceNum,
      comparePrice: compareNum,
      stock: stockNum,
      tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
      images: form.images.filter(Boolean)
    }

    if (editingId) {
      updateProduct(editingId, data)
      addToast('Product saved successfully', 'success')
    } else {
      addProduct(data)
      addToast('New product added to catalog', 'success')
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    deleteProduct(id)
    setDeleteConfirm(null)
    addToast('Product removed from catalog', 'info')
  }

  const handleToggleActive = (product) => {
    updateProduct(product.id, { active: !product.active })
    addToast(`Product ${product.active ? 'hidden from' : 'published on'} live store`, 'info')
  }

  const handleToggleFeatured = (product) => {
    updateProduct(product.id, { featured: !product.featured })
  }

  const updateForm = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const stockChip = (stock) => {
    if (stock === 0) return <span className="chip small error-container" style={{ fontWeight: 700 }}>Out of Stock</span>
    if (stock <= 5) return <span className="chip small orange-container" style={{ fontWeight: 700 }}>Low ({stock})</span>
    return <span className="chip small green-container" style={{ fontWeight: 700 }}>{stock} in stock</span>
  }

  return (
    <div id="admin-products-page" className="admin-page products-page">
      {/* Header Bar */}
      <div id="products-header-section" className="admin-page-header row wrap middle-align">
        <div className="admin-page-heading">
          <span className="chip small primary-container margin-bottom-s">Inventory Catalog</span>
          <h2 className="admin-page-title">Products Management</h2>
          <p className="admin-page-description on-surface-variant-text">
            {products.length} total items · {products.filter(p => p.active).length} currently active on store
          </p>
        </div>
        <button id="products-add-btn" className="primary round admin-page-action" onClick={openAdd}>
          <i>add</i>
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div id="products-filter-toolbar" className="products-filter-row" style={{ marginBottom: 24, gap: 16 }}>
        <div className="field label prefix border round products-search-field" style={{ margin: 0 }}>
          <i>search</i>
          <input placeholder=" " value={search} onChange={e => setSearch(e.target.value)} />
          <label>Search by product name or SKU code…</label>
        </div>
        <div className="field label border round admin-filter-field products-category-field" style={{ margin: 0 }}>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label>Filter Category</label>
        </div>
      </div>

      {/* Products Data Table */}
      {filtered.length === 0 ? (
        <div
          id="products-empty-state"
          style={{
            background: 'var(--surface-container-low)',
            borderRadius: 28,
            border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
            padding: 56,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="on-surface-variant-text" style={{ fontSize: 32 }}>inventory_2</i>
          </div>
          <h4 style={{ margin: 0 }}>No matching products found</h4>
          <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14 }}>Try adjusting your search criteria or category filter.</p>
        </div>
      ) : (
        <div
          id="products-table-container"
          style={{
            background: 'var(--surface-container-low)',
            borderRadius: 28,
            border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="stripes products-table" style={{ minWidth: 800, width: '100%' }}>
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock State</th>
                  <th>Visibility</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="row middle-align gap-m" style={{ minWidth: 200 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            overflow: 'hidden',
                            background: 'var(--surface-container-high)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)'
                          }}
                        >
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <i className="on-surface-variant-text">image</i>
                          )}
                        </div>
                        <strong style={{ fontSize: 14 }}>{p.name}</strong>
                      </div>
                    </td>
                    <td><code style={{ fontSize: 12, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'var(--surface-container)' }}>{p.sku}</code></td>
                    <td><span className="chip small surface-container-high">{p.category}</span></td>
                    <td>
                      <strong style={{ fontSize: 14, color: 'var(--primary)' }}>${p.price.toFixed(2)}</strong>
                      {p.comparePrice && (
                        <div className="on-surface-variant-text" style={{ fontSize: 11, textDecoration: 'line-through' }}>
                          ${p.comparePrice.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td>{stockChip(p.stock)}</td>
                    <td>
                      <button
                        className="circle transparent small"
                        onClick={() => handleToggleActive(p)}
                        title={p.active ? 'Hide from live store' : 'Show on live store'}
                      >
                        <i className={p.active ? 'green-text' : 'on-surface-variant-text'} style={{ fontSize: 24 }}>
                          {p.active ? 'toggle_on' : 'toggle_off'}
                        </i>
                      </button>
                    </td>
                    <td>
                      <button
                        className="circle transparent small"
                        onClick={() => handleToggleFeatured(p)}
                        title={p.featured ? 'Remove from featured homepage list' : 'Highlight on homepage'}
                      >
                        <i className={p.featured ? 'yellow-text fill' : 'on-surface-variant-text'}>star</i>
                      </button>
                    </td>
                    <td>
                      <div className="row middle-align gap-s">
                        <button className="circle transparent small" onClick={() => openEdit(p)} title="Edit product details">
                          <i>edit</i>
                        </button>
                        <button className="circle transparent small" onClick={() => setDeleteConfirm(p.id)} title="Delete product">
                          <i className="error-text">delete</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Edit / Create Modal Dialog */}
      <dialog id="product-editor-modal" className={modalOpen ? 'active' : ''} style={{ maxWidth: 680, borderRadius: 28, padding: 32 }}>
        <div className="row middle-align" style={{ marginBottom: 20 }}>
          <h4 style={{ margin: 0, fontWeight: 800 }}>{editingId ? 'Edit Product Details' : 'Create New Catalog Product'}</h4>
          <div className="max" />
          <button className="circle transparent small" onClick={() => setModalOpen(false)}><i>close</i></button>
        </div>

        <div className="grid" style={{ rowGap: 14, columnGap: 14 }}>
          <div className="s12 field label border round">
            <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder=" " />
            <label>Product Name *</label>
          </div>
          <div className="s12 m6 field label border round">
            <select value={form.category} onChange={e => updateForm('category', e.target.value)}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label>Category *</label>
          </div>
          <div className="s12 m6 field label border round">
            <input value={form.sku} onChange={e => updateForm('sku', e.target.value)} placeholder=" " />
            <label>SKU Code *</label>
          </div>
          <div className="s12 m6 field label border round">
            <input type="number" step="0.01" value={form.price} onChange={e => updateForm('price', e.target.value)} placeholder=" " />
            <label>Selling Price ($) *</label>
          </div>
          <div className="s12 m6 field label border round">
            <input type="number" step="0.01" value={form.comparePrice} onChange={e => updateForm('comparePrice', e.target.value)} placeholder=" " />
            <label>Original Compare Price ($)</label>
          </div>
          <div className="s12 m6 field label border round">
            <input type="number" value={form.stock} onChange={e => updateForm('stock', e.target.value)} placeholder=" " />
            <label>Available Stock Units *</label>
          </div>
          <div className="s6 m3 field label border round">
            <input type="number" value={form.shippingDays?.min || 3} onChange={e => updateForm('shippingDays', { ...form.shippingDays, min: parseInt(e.target.value) || 1 })} placeholder=" " />
            <label>Est. Min Days</label>
          </div>
          <div className="s6 m3 field label border round">
            <input type="number" value={form.shippingDays?.max || 7} onChange={e => updateForm('shippingDays', { ...form.shippingDays, max: parseInt(e.target.value) || 7 })} placeholder=" " />
            <label>Est. Max Days</label>
          </div>
          <div className="s12 field label border round">
            <textarea rows={3} value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder=" " />
            <label>Product Description *</label>
          </div>
          <div className="s12 field label border round">
            <input value={form.images?.[0] || ''} onChange={e => updateForm('images', [e.target.value])} placeholder=" " />
            <label>Image URL</label>
          </div>
          {form.images?.[0] && (
            <div className="s12">
              <span className="on-surface-variant-text" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Image Preview:</span>
              <img src={form.images[0]} alt="Preview" style={{ maxHeight: 110, borderRadius: 12, border: '1px solid var(--outline-variant)' }} />
            </div>
          )}
          <div className="s12 field label border round">
            <input value={form.tags || ''} onChange={e => updateForm('tags', e.target.value)} placeholder=" " />
            <label>Tags (comma separated)</label>
          </div>
          <div className="s12" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <label className="switch icon">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => updateForm('active', e.target.checked)}
                />
                <span>
                  <i>close</i>
                  <i>done</i>
                </span>
              </label>
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>Active Listing</strong>
                <span className="on-surface-variant-text" style={{ fontSize: 12 }}>Visible to shoppers</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <label className="switch icon">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={e => updateForm('featured', e.target.checked)}
                />
                <span>
                  <i>close</i>
                  <i>done</i>
                </span>
              </label>
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>Featured Product</strong>
                <span className="on-surface-variant-text" style={{ fontSize: 12 }}>Highlight on storefront</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="right-align gap-s" style={{ marginTop: 24 }}>
          <button className="border round" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="primary round" onClick={handleSave}>
            {editingId ? 'Save Changes' : 'Publish Product'}
          </button>
        </nav>
      </dialog>

      {/* Delete Confirmation Modal */}
      <dialog id="product-delete-modal" className={deleteConfirm ? 'active' : ''} style={{ maxWidth: 400, borderRadius: 24, padding: 24 }}>
        <h5 style={{ margin: '0 0 8px', fontWeight: 800 }}>Confirm Deletion</h5>
        <p className="on-surface-variant-text" style={{ margin: '0 0 20px', fontSize: 14 }}>
          This product will be permanently removed from your catalog store inventory.
        </p>
        <nav className="right-align gap-s">
          <button className="border round" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="error round" onClick={() => handleDelete(deleteConfirm)}>Delete Permanently</button>
        </nav>
      </dialog>
    </div>
  )
}

