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
      addToast('Please fill in all required fields', 'error')
      return
    }
    const data = {
      ...form,
      price: parseFloat(price),
      comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
      stock: parseInt(stock),
      tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
      images: form.images.filter(Boolean)
    }
    if (editingId) {
      updateProduct(editingId, data)
      addToast('Product updated successfully', 'success')
    } else {
      addProduct(data)
      addToast('Product added successfully', 'success')
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    deleteProduct(id)
    setDeleteConfirm(null)
    addToast('Product deleted', 'info')
  }

  const handleToggleActive = (product) => {
    updateProduct(product.id, { active: !product.active })
    addToast(`Product ${product.active ? 'hidden' : 'shown'} in store`, 'info')
  }

  const handleToggleFeatured = (product) => {
    updateProduct(product.id, { featured: !product.featured })
  }

  const updateForm = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const stockChip = (stock) => {
    if (stock === 0) return <span className="chip small error-container">Out</span>
    if (stock <= 5)  return <span className="chip small orange-container">Low ({stock})</span>
    return <span className="chip small green-container">{stock}</span>
  }

  return (
    <div className="admin-page products-page">
      <div className="admin-page-header row middle-align">
        <div>
          <h4 style={{ margin: 0 }}>Products</h4>
          <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 13 }}>
            {products.length} total · {products.filter(p => p.active).length} active
          </p>
        </div>
        <div className="max" />
        <button className="primary admin-page-action" onClick={openAdd}>
          <i>add</i><span>Add Product</span>
        </button>
      </div>

      <div className="products-filter-row">
        <div className="field label prefix border round products-search-field">
          <i>search</i>
          <input placeholder=" " value={search} onChange={e => setSearch(e.target.value)} />
          <label>Search by name or SKU…</label>
        </div>
        <div className="field label border round admin-filter-field products-category-field">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label>Category</label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <article className="center-align padding">
          <i className="extra on-surface-variant-text">inventory_2</i>
          <p className="on-surface-variant-text">No products found</p>
        </article>
      ) : (
        <article className="no-padding products-table-surface">
          <table className="stripes products-table">
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Category</th><th>Price</th>
                <th>Stock</th><th>Status</th><th>Featured</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="row middle-align products-product-cell">
                      <img className="products-product-image" src={p.images?.[0]} alt={p.name} />
                      <strong className="products-product-name">{p.name}</strong>
                    </div>
                  </td>
                  <td><code className="products-sku">{p.sku}</code></td>
                  <td className="products-category">{p.category}</td>
                  <td>
                    <strong>${p.price.toFixed(2)}</strong>
                    {p.comparePrice && (
                      <div className="on-surface-variant-text products-compare-price">
                        ${p.comparePrice.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td>{stockChip(p.stock)}</td>
                  <td>
                    <button className="circle transparent small" onClick={() => handleToggleActive(p)} title={p.active ? 'Hide from store' : 'Show in store'}>
                      <i className={p.active ? 'green-text' : 'on-surface-variant-text'}>
                        {p.active ? 'toggle_on' : 'toggle_off'}
                      </i>
                    </button>
                  </td>
                  <td>
                    <button className="circle transparent small" onClick={() => handleToggleFeatured(p)} title={p.featured ? 'Remove from featured' : 'Add to featured'}>
                      <i className={p.featured ? 'yellow-text fill' : 'on-surface-variant-text'}>star</i>
                    </button>
                  </td>
                  <td>
                    <div className="row products-action-group">
                      <button className="circle transparent small" onClick={() => openEdit(p)}><i>edit</i></button>
                      <button className="circle transparent small" onClick={() => setDeleteConfirm(p.id)}><i className="error-text">delete</i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      <dialog className={modalOpen ? 'active' : ''} style={{ maxWidth: 640 }}>
        <h5>{editingId ? 'Edit Product' : 'Add New Product'}</h5>
        <div className="grid">
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
            <label>SKU *</label>
          </div>
          <div className="s12 m6 field label border round">
            <input type="number" step="0.01" value={form.price} onChange={e => updateForm('price', e.target.value)} placeholder=" " />
            <label>Price ($) *</label>
          </div>
          <div className="s12 m6 field label border round">
            <input type="number" step="0.01" value={form.comparePrice} onChange={e => updateForm('comparePrice', e.target.value)} placeholder=" " />
            <label>Compare Price ($)</label>
          </div>
          <div className="s12 m6 field label border round">
            <input type="number" value={form.stock} onChange={e => updateForm('stock', e.target.value)} placeholder=" " />
            <label>Stock *</label>
          </div>
          <div className="s6 m3 field label border round">
            <input type="number" value={form.shippingDays?.min || 3} onChange={e => updateForm('shippingDays', { ...form.shippingDays, min: parseInt(e.target.value) })} placeholder=" " />
            <label>Ship Days Min</label>
          </div>
          <div className="s6 m3 field label border round">
            <input type="number" value={form.shippingDays?.max || 7} onChange={e => updateForm('shippingDays', { ...form.shippingDays, max: parseInt(e.target.value) })} placeholder=" " />
            <label>Ship Days Max</label>
          </div>
          <div className="s12 field label border round">
            <textarea rows={3} value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder=" " />
            <label>Description *</label>
          </div>
          <div className="s12 field label border round">
            <input value={form.images?.[0] || ''} onChange={e => updateForm('images', [e.target.value])} placeholder=" " />
            <label>Image URL</label>
          </div>
          {form.images?.[0] && (
            <div className="s12">
              <img src={form.images[0]} alt="Preview" style={{ maxHeight: 100, borderRadius: 8, border: '1px solid var(--outline-variant)' }} />
            </div>
          )}
          <div className="s12 field label border round">
            <input value={form.tags || ''} onChange={e => updateForm('tags', e.target.value)} placeholder=" " />
            <label>Tags (comma separated)</label>
          </div>
          <div className="s12" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', paddingTop: 4 }}>
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
                <strong style={{ display: 'block', fontSize: 14 }}>Active</strong>
                <span className="on-surface-variant-text" style={{ fontSize: 12 }}>Visible in store</span>
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
                <strong style={{ display: 'block', fontSize: 14 }}>Featured</strong>
                <span className="on-surface-variant-text" style={{ fontSize: 12 }}>Show on homepage</span>
              </div>
            </div>
          </div>
        </div>
        <nav className="right-align">
          <button className="border" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="primary" onClick={handleSave}>
            {editingId ? 'Save Changes' : 'Add Product'}
          </button>
        </nav>
      </dialog>

      <dialog className={deleteConfirm ? 'active' : ''} style={{ maxWidth: 380 }}>
        <h5>Delete Product?</h5>
        <p className="on-surface-variant-text">This action cannot be undone. The product will be permanently removed.</p>
        <nav className="right-align">
          <button className="border" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="error" onClick={() => handleDelete(deleteConfirm)}>Delete Product</button>
        </nav>
      </dialog>
    </div>
  )
}
