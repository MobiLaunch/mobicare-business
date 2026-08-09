import React, { useState } from 'react'
import { useProductStore, useToastStore } from '../lib/store'

const ICON_OPTIONS = ['bolt','shield','smartphone','power','star','battery_full','headphones','photo_camera','inventory_2','label','layers','cable']
const EMPTY = { name: '', description: '', icon: 'star' }

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
      addToast('Category updated', 'success')
    } else {
      addCategory(form)
      addToast('Category added', 'success')
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    const count = products.filter(p => p.category === id).length
    if (count > 0) { addToast(`Cannot delete — ${count} products use this category`, 'error'); setDeleteConfirm(null); return }
    deleteCategory(id)
    setDeleteConfirm(null)
    addToast('Category deleted', 'info')
  }

  return (
    <div className="admin-page categories-page">
      <div className="admin-page-header row middle-align">
        <div>
          <h4 style={{ margin: 0 }}>Categories</h4>
          <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 13 }}>{categories.length} categories</p>
        </div>
        <div className="max" />
        <button className="primary" onClick={openAdd}>
          <i>add</i><span>Add Category</span>
        </button>
      </div>

      <div className="grid">
        {categories.map(cat => {
          const count = products.filter(p => p.category === cat.id && p.active).length
          return (
            <div key={cat.id} className="s12 m6 l4">
              <article className="border no-elevate">
                <div className="padding">
                  <div className="row middle-align" style={{ marginBottom: 12 }}>
                    <div className="primary-container padding circle" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="primary-text">{cat.icon || 'label'}</i>
                    </div>
                    <div className="max" />
                    <button className="circle transparent small" onClick={() => openEdit(cat)}><i>edit</i></button>
                    <button className="circle transparent small" onClick={() => setDeleteConfirm(cat.id)}><i className="error-text">delete</i></button>
                  </div>
                  <h6 style={{ margin: '0 0 4px' }}>{cat.name}</h6>
                  <p className="on-surface-variant-text" style={{ fontSize: 13, margin: '0 0 12px' }}>{cat.description}</p>
                  <div className="row middle-align">
                    <span className="chip small primary-container">{count} product{count !== 1 ? 's' : ''}</span>
                    <div className="max" />
                    <code className="on-surface-variant-text" style={{ fontSize: 11 }}>{cat.id}</code>
                  </div>
                </div>
              </article>
            </div>
          )
        })}
      </div>

      <dialog className={modalOpen ? 'active' : ''} style={{ maxWidth: 480 }}>
        <h5>{editingId ? 'Edit Category' : 'New Category'}</h5>
        <div className="field label border round">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder=" " />
          <label>Category Name *</label>
        </div>
        <div className="field label border round">
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder=" " />
          <label>Description</label>
        </div>
        <div className="field label border round">
          <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}>
            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <label>Icon</label>
        </div>
        {!editingId && (
          <div className="field label border round">
            <input value={form.id || ''} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder=" " />
            <label>ID (auto-generated from name if blank)</label>
          </div>
        )}
        <nav className="right-align">
          <button className="border" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="primary" onClick={handleSave}>{editingId ? 'Save Changes' : 'Add Category'}</button>
        </nav>
      </dialog>

      <dialog className={deleteConfirm ? 'active' : ''} style={{ maxWidth: 380 }}>
        <h5>Delete Category?</h5>
        <p className="on-surface-variant-text">
          This will remove the category. Products in this category won't be deleted, but will lose their category assignment.
        </p>
        <nav className="right-align">
          <button className="border" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="error" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
        </nav>
      </dialog>
    </div>
  )
}
