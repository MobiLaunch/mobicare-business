import React, { useState } from 'react'
import { useProductStore, useToastStore } from '../lib/store'

const ICON_OPTIONS = ['bolt', 'shield', 'smartphone', 'power', 'star', 'battery_full', 'headphones', 'photo_camera', 'inventory_2', 'label', 'layers', 'cable', 'category']
const EMPTY = { name: '', description: '', icon: 'category' }

export default function Categories() {
  const categories = useProductStore(s => s.categories)
  const products = useProductStore(s => s.products)
  const { addCategory, updateCategory, deleteCategory } = useProductStore()
  const addToast = useToastStore(s => s.add)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const openAdd = () => { setEditingId(null); setForm({ ...EMPTY }); setModalOpen(true) }
  const openEdit = (cat) => { setEditingId(cat.id); setForm({ ...cat }); setModalOpen(true) }

  const handleSave = () => {
    if (!form.name) { addToast('Category name is required', 'error'); return }
    if (editingId) {
      updateCategory(editingId, form)
      addToast('Category updated successfully', 'success')
    } else {
      addCategory(form)
      addToast('New category created', 'success')
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    const count = products.filter(p => p.category === id).length
    if (count > 0) {
      addToast(`Cannot delete — ${count} products rely on this category`, 'error')
      setDeleteConfirm(null)
      return
    }
    deleteCategory(id)
    setDeleteConfirm(null)
    addToast('Category removed', 'info')
  }

  return (
    <div id="admin-categories-page" className="admin-page categories-page">
      {/* Header Section */}
      <div id="categories-header-section" className="admin-page-header row wrap middle-align">
        <div className="admin-page-heading">
          <span className="chip small primary-container margin-bottom-s">Taxonomy Structure</span>
          <h2 className="admin-page-title">Category Management</h2>
          <p className="admin-page-description on-surface-variant-text">
            {categories.length} active store categories & product groupings
          </p>
        </div>
        <button id="categories-add-btn" className="primary round admin-page-action" onClick={openAdd}>
          <i>add</i>
          <span>Add New Category</span>
        </button>
      </div>

      {/* Grid of Categories Bento Cards */}
      <div id="categories-grid-container" className="grid" style={{ rowGap: 20, columnGap: 20 }}>
        {categories.map(cat => {
          const count = products.filter(p => p.category === cat.id && p.active).length
          return (
            <div key={cat.id} className="s12 m6 l4" style={{ minWidth: 0 }}>
              <div
                id={`cat-card-${cat.id}`}
                className="admin-stat-card"
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  padding: 24,
                  borderRadius: 28
                }}
              >
                <div>
                  <div className="row middle-align" style={{ marginBottom: 16 }}>
                    <div
                      className="primary-container"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <i className="primary-text" style={{ fontSize: 24 }}>{cat.icon || 'category'}</i>
                    </div>
                    <div className="max" />
                    <button className="circle transparent small" onClick={() => openEdit(cat)} title="Edit category">
                      <i>edit</i>
                    </button>
                    <button className="circle transparent small" onClick={() => setDeleteConfirm(cat.id)} title="Delete category">
                      <i className="error-text">delete</i>
                    </button>
                  </div>

                  <h5 style={{ margin: '0 0 6px', fontWeight: 800 }}>{cat.name}</h5>
                  <p className="on-surface-variant-text" style={{ fontSize: 13, margin: '0 0 16px', lineHeight: 1.4 }}>
                    {cat.description || 'No description specified for this category.'}
                  </p>
                </div>

                <div className="row middle-align" style={{ paddingTop: 12, borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)' }}>
                  <span className="chip small primary-container" style={{ fontWeight: 700 }}>
                    {count} active product{count !== 1 ? 's' : ''}
                  </span>
                  <div className="max" />
                  <code style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'var(--surface-container)' }}>
                    {cat.id}
                  </code>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Editor Modal */}
      <dialog id="category-editor-modal" className={modalOpen ? 'active' : ''} style={{ maxWidth: 500, borderRadius: 28, padding: 32 }}>
        <div className="row middle-align" style={{ marginBottom: 20 }}>
          <h4 style={{ margin: 0, fontWeight: 800 }}>{editingId ? 'Edit Category' : 'Create New Category'}</h4>
          <div className="max" />
          <button className="circle transparent small" onClick={() => setModalOpen(false)}><i>close</i></button>
        </div>

        <div className="grid" style={{ rowGap: 14 }}>
          <div className="s12 field label border round">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder=" " />
            <label>Category Name *</label>
          </div>
          <div className="s12 field label border round">
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder=" " />
            <label>Description</label>
          </div>
          <div className="s12 field label border round">
            <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}>
              {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <label>Display Icon</label>
          </div>
          {!editingId && (
            <div className="s12 field label border round">
              <input value={form.id || ''} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder=" " />
              <label>Unique ID (optional, auto-slugify if blank)</label>
            </div>
          )}
        </div>

        <nav className="right-align gap-s" style={{ marginTop: 24 }}>
          <button className="border round" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="primary round" onClick={handleSave}>
            {editingId ? 'Save Changes' : 'Create Category'}
          </button>
        </nav>
      </dialog>

      {/* Delete Confirmation Modal */}
      <dialog id="category-delete-modal" className={deleteConfirm ? 'active' : ''} style={{ maxWidth: 400, borderRadius: 24, padding: 24 }}>
        <h5 style={{ margin: '0 0 8px', fontWeight: 800 }}>Delete Category?</h5>
        <p className="on-surface-variant-text" style={{ margin: '0 0 20px', fontSize: 14 }}>
          Products currently linked to this category will lose their category association.
        </p>
        <nav className="right-align gap-s">
          <button className="border round" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="error round" onClick={() => handleDelete(deleteConfirm)}>Delete Permanently</button>
        </nav>
      </dialog>
    </div>
  )
}

