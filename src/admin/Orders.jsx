import React, { useState } from 'react'
import { useProductStore, useToastStore } from '../lib/store'

const STATUS_OPTIONS = ['pending','processing','shipped','delivered','cancelled']

export default function Orders() {
  const orders = useProductStore(s => s.orders)
  const updateOrderStatus = useProductStore(s => s.updateOrderStatus)
  const addToast = useToastStore(s => s.add)
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)

  const handleStatusChange = (orderId, status) => {
    updateOrderStatus(orderId, status)
    addToast(`Order status updated to "${status}"`, 'success')
    if (selected?.id === orderId) setSelected(s => ({ ...s, status }))
  }

  const statusColor = (status) => {
    const map = { pending: 'orange-container', processing: 'primary-container', shipped: 'primary-container', delivered: 'green-container', cancelled: 'error-container' }
    return map[status] || 'orange-container'
  }

  return (
    <div className="admin-page orders-page">
      <div className="admin-page-header row middle-align">
        <div>
          <h4 style={{ margin: 0 }}>Orders</h4>
          <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 13 }}>{orders.length} total orders</p>
        </div>
        <div className="max" />
        <div className="field label border round admin-filter-field">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <label>Status</label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <article className="center-align padding">
          <i className="extra on-surface-variant-text">shopping_bag</i>
          <h6>No orders yet</h6>
          <p className="on-surface-variant-text">Orders placed through your store will appear here.</p>
        </article>
      ) : (
        <article className="no-padding" style={{ overflowX: 'auto' }}>
          <table className="stripes">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id}>
                  <td><code style={{ fontSize: 11 }}>#{order.id.slice(0,8).toUpperCase()}</code></td>
                  <td>
                    <strong style={{ display: 'block', fontSize: 13 }}>{order.customer?.name || '—'}</strong>
                    <span className="on-surface-variant-text" style={{ fontSize: 11 }}>{order.customer?.email || ''}</span>
                  </td>
                  <td className="on-surface-variant-text" style={{ fontSize: 12 }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>{order.items?.length || 0}</td>
                  <td><strong>${order.total?.toFixed(2)}</strong></td>
                  <td>
                    <div className="field label border round" style={{ minWidth: 130, margin: 0 }}>
                      <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)} className={statusColor(order.status)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                  <td><button className="circle transparent small" onClick={() => setSelected(order)}><i>visibility</i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      <dialog className={selected ? 'active' : ''} style={{ maxWidth: 560 }}>
        {selected && (
          <>
            <h5 style={{ marginBottom: 2 }}>Order #{selected.id.slice(0,8).toUpperCase()}</h5>
            <p className="on-surface-variant-text" style={{ fontSize: 13, marginBottom: 20 }}>
              {new Date(selected.createdAt).toLocaleString()}
            </p>

            <div className="field label border round" style={{ maxWidth: 220, marginBottom: 20 }}>
              <select value={selected.status} onChange={e => handleStatusChange(selected.id, e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <label>Status</label>
            </div>

            <h6 style={{ marginBottom: 8 }}>Customer</h6>
            <article className="border no-elevate no-padding" style={{ marginBottom: 20 }}>
              {[
                ['Name', selected.customer?.name],
                ['Email', selected.customer?.email],
                ['Phone', selected.customer?.phone || '—'],
                ['Address', `${selected.customer?.address}, ${selected.customer?.city}, ${selected.customer?.state} ${selected.customer?.zip}`],
              ].map(([label, val]) => (
                <div key={label} className="row padding small-padding" style={{ borderBottom: '1px solid var(--outline-variant)', justifyContent: 'space-between', gap: 12 }}>
                  <span className="on-surface-variant-text" style={{ fontSize: 12 }}>{label}</span>
                  <strong style={{ fontSize: 13, textAlign: 'right' }}>{val}</strong>
                </div>
              ))}
            </article>

            <h6 style={{ marginBottom: 8 }}>Items</h6>
            <article className="border no-elevate no-padding" style={{ marginBottom: 20 }}>
              {selected.items?.map((item, i) => (
                <div key={i} className="row padding small-padding" style={{ borderBottom: '1px solid var(--outline-variant)', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                  <span className="on-surface-variant-text" style={{ fontSize: 12 }}>×{item.qty}</span>
                  <strong style={{ fontSize: 13 }}>${(item.price * item.qty).toFixed(2)}</strong>
                </div>
              ))}
            </article>

            <h6 style={{ marginBottom: 8 }}>Totals</h6>
            <article className="border no-elevate no-padding" style={{ marginBottom: 20 }}>
              {[
                ['Subtotal', `$${selected.subtotal?.toFixed(2)}`],
                ['Shipping', selected.shipping === 0 ? 'FREE' : `$${selected.shipping?.toFixed(2)}`],
                ['Tax', `$${selected.tax?.toFixed(2)}`],
              ].map(([label, val]) => (
                <div key={label} className="row padding small-padding" style={{ borderBottom: '1px solid var(--outline-variant)', justifyContent: 'space-between' }}>
                  <span className="on-surface-variant-text" style={{ fontSize: 12 }}>{label}</span>
                  <strong style={{ fontSize: 13 }}>{val}</strong>
                </div>
              ))}
              <div className="row padding" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <strong style={{ fontSize: 16 }}>${selected.total?.toFixed(2)}</strong>
              </div>
            </article>

            <nav className="right-align">
              <button className="border" onClick={() => setSelected(null)}>Close</button>
            </nav>
          </>
        )}
      </dialog>
    </div>
  )
}
