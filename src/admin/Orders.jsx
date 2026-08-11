import React, { useState } from 'react'
import { useProductStore, useToastStore } from '../lib/store'

const STATUS_OPTIONS = ['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

export default function Orders() {
  const orders = useProductStore(s => s.orders)
  const updateOrderStatus = useProductStore(s => s.updateOrderStatus)
  const addToast = useToastStore(s => s.add)
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)

  const handleStatusChange = (orderId, status) => {
    updateOrderStatus(orderId, status)
    addToast(`Order #${orderId.slice(0, 8).toUpperCase()} updated to "${status}"`, 'success')
    if (selected?.id === orderId) setSelected(s => ({ ...s, status }))
  }

  const getStatusChipClass = (status) => {
    const map = {
      paid: 'green-container',
      processing: 'primary-container',
      shipped: 'secondary-container',
      delivered: 'green-container',
      cancelled: 'error-container',
      refunded: 'orange-container',
    }
    return map[status] || 'surface-container-high'
  }

  return (
    <div id="admin-orders-page" className="admin-page orders-page">
      {/* Header Section */}
      <div id="orders-header-section" className="admin-page-header row wrap middle-align">
        <div className="admin-page-heading">
          <span className="chip small primary-container margin-bottom-s">Sales & Transactions</span>
          <h2 className="admin-page-title">Orders Management</h2>
          <p className="admin-page-description on-surface-variant-text">
            {orders.length} total customer orders · Real-time fulfillment & payment state tracking
          </p>
        </div>

        {/* Quick Filter Pill Tabs */}
        <div className="row wrap gap-s middle-align" style={{ marginTop: 8 }}>
          <button
            className={`chip small ${statusFilter === 'all' ? 'primary-container' : 'surface-container-high'}`}
            onClick={() => setStatusFilter('all')}
            style={{ fontWeight: 700, borderRadius: 999 }}
          >
            All ({orders.length})
          </button>
          {STATUS_OPTIONS.map(s => {
            const count = orders.filter(o => o.status === s).length
            if (count === 0 && statusFilter !== s) return null
            return (
              <button
                key={s}
                className={`chip small ${statusFilter === s ? 'primary-container' : 'surface-container-high'}`}
                onClick={() => setStatusFilter(s)}
                style={{ fontWeight: 700, borderRadius: 999 }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Table Container */}
      {filtered.length === 0 ? (
        <div
          id="orders-empty-state"
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
            <i className="on-surface-variant-text" style={{ fontSize: 32 }}>shopping_bag</i>
          </div>
          <h4 style={{ margin: 0 }}>No orders found</h4>
          <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14 }}>
            {statusFilter === 'all'
              ? 'Customer checkout orders will appear here automatically.'
              : `No orders currently marked as "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div
          id="orders-table-wrapper"
          style={{
            background: 'var(--surface-container-low)',
            borderRadius: 28,
            border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="stripes" style={{ minWidth: 800, width: '100%' }}>
              <thead>
                <tr>
                  <th>Order Identifier</th>
                  <th>Customer Information</th>
                  <th>Order Date</th>
                  <th>Items</th>
                  <th>Grand Total</th>
                  <th>Fulfillment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id}>
                    <td>
                      <code style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: 'var(--surface-container)' }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </code>
                    </td>
                    <td>
                      <strong style={{ display: 'block', fontSize: 14 }}>{order.customer?.name || 'Guest Customer'}</strong>
                      <span className="on-surface-variant-text" style={{ fontSize: 12 }}>{order.customer?.email || 'No email registered'}</span>
                    </td>
                    <td className="on-surface-variant-text" style={{ fontSize: 13 }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td><span className="chip small surface-container">{order.items?.length || 0} items</span></td>
                    <td><strong style={{ fontSize: 14, color: 'var(--primary)' }}>${(order.total || 0).toFixed(2)}</strong></td>
                    <td>
                      <div className="field label border round" style={{ minWidth: 140, margin: 0 }}>
                        <select
                          value={order.status || 'paid'}
                          onChange={e => handleStatusChange(order.id, e.target.value)}
                          className={getStatusChipClass(order.status)}
                          style={{ fontWeight: 700 }}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <button
                        className="circle transparent small"
                        onClick={() => setSelected(order)}
                        title="View order details inspector"
                      >
                        <i>visibility</i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Inspector Modal */}
      <dialog id="order-inspector-modal" className={selected ? 'active' : ''} style={{ maxWidth: 600, borderRadius: 28, padding: 32 }}>
        {selected && (
          <div>
            <div className="row middle-align" style={{ marginBottom: 16 }}>
              <div>
                <span className="chip small primary-container margin-bottom-s">Order Inspector</span>
                <h4 style={{ margin: 0, fontWeight: 800 }}>Order #{selected.id.slice(0, 8).toUpperCase()}</h4>
                <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 13 }}>
                  Placed on {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}
                </p>
              </div>
              <div className="max" />
              <button className="circle transparent small" onClick={() => setSelected(null)}><i>close</i></button>
            </div>

            <div className="field label border round" style={{ maxWidth: 260, marginBottom: 24 }}>
              <select value={selected.status} onChange={e => handleStatusChange(selected.id, e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <label>Fulfillment Status</label>
            </div>

            <h6 style={{ margin: '0 0 10px', fontWeight: 800 }}>Customer Contact & Shipping</h6>
            <div style={{ background: 'var(--surface-container-low)', borderRadius: 20, border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)', padding: 16, marginBottom: 24 }}>
              {[
                ['Customer Name', selected.customer?.name],
                ['Email Address', selected.customer?.email],
                ['Phone Number', selected.customer?.phone || '—'],
                ['Shipping Address', `${selected.customer?.address || '—'}, ${selected.customer?.city || ''}, ${selected.customer?.state || ''} ${selected.customer?.zip || ''}`],
              ].map(([label, val]) => (
                <div key={label} className="row" style={{ padding: '8px 0', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)', justifyContent: 'space-between', gap: 16 }}>
                  <span className="on-surface-variant-text" style={{ fontSize: 13 }}>{label}</span>
                  <strong style={{ fontSize: 13, textAlign: 'right' }}>{val}</strong>
                </div>
              ))}
            </div>

            <h6 style={{ margin: '0 0 10px', fontWeight: 800 }}>Purchased Items</h6>
            <div style={{ background: 'var(--surface-container-low)', borderRadius: 20, border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)', padding: 16, marginBottom: 24 }}>
              {selected.items?.map((item, i) => (
                <div key={i} className="row middle-align" style={{ padding: '10px 0', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 14 }}>{item.name}</strong>
                    <span className="on-surface-variant-text" style={{ fontSize: 12 }}>${item.price?.toFixed(2)} each</span>
                  </div>
                  <span className="chip small surface-container">Qty: {item.qty}</span>
                  <strong style={{ fontSize: 14, color: 'var(--primary)' }}>${((item.price || 0) * (item.qty || 1)).toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <h6 style={{ margin: '0 0 10px', fontWeight: 800 }}>Payment Summary</h6>
            <div style={{ background: 'var(--surface-container-low)', borderRadius: 20, border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)', padding: 16, marginBottom: 24 }}>
              {[
                ['Subtotal', `$${(selected.subtotal || 0).toFixed(2)}`],
                ['Shipping', selected.shipping === 0 ? 'FREE' : `$${(selected.shipping || 0).toFixed(2)}`],
                ['Tax', `$${(selected.tax || 0).toFixed(2)}`],
              ].map(([label, val]) => (
                <div key={label} className="row" style={{ padding: '6px 0', justifyContent: 'space-between' }}>
                  <span className="on-surface-variant-text" style={{ fontSize: 13 }}>{label}</span>
                  <strong style={{ fontSize: 13 }}>{val}</strong>
                </div>
              ))}
              <div className="row" style={{ paddingTop: 10, marginTop: 6, borderTop: '2px solid var(--outline-variant)', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Grand Total</span>
                <strong style={{ fontSize: 18, color: 'var(--primary)' }}>${(selected.total || 0).toFixed(2)}</strong>
              </div>
            </div>

            <nav className="right-align">
              <button className="primary round" onClick={() => setSelected(null)}>Done</button>
            </nav>
          </div>
        )}
      </dialog>
    </div>
  )
}

