import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useProductStore } from '../lib/store'

export default function Dashboard() {
  const navigate = useNavigate()
  const products = useProductStore(s => s.products)
  const orders = useProductStore(s => s.orders)
  const categories = useProductStore(s => s.categories)

  const activeProducts = products.filter(p => p.active).length
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length
  const outOfStock = products.filter(p => p.stock === 0).length
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)
  const recentOrders = orders.slice(0, 5)

  const stats = [
    { label: 'Products', value: products.length, sub: `${activeProducts} active`, icon: 'inventory_2', path: '/admin/products', color: 'primary' },
    { label: 'Categories', value: categories.length, sub: 'product groups', icon: 'label', path: '/admin/categories', color: 'secondary' },
    { label: 'Orders', value: orders.length, sub: 'all time', icon: 'shopping_bag', path: '/admin/orders', color: 'tertiary' },
    { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, sub: 'all time', icon: 'trending_up', path: '/admin/orders', color: 'primary' },
  ]

  const statusColor = (s) =>
    s === 'pending' ? 'orange' : s === 'shipped' ? 'blue' : s === 'delivered' ? 'green' : 'grey'

  return (
    <div className="admin-page dashboard-page">

      {/* ── Page Header ── */}
      <div className="admin-page-header row wrap middle-align">
        <div className="admin-page-heading">
          <h2 className="admin-page-title">
            Dashboard
          </h2>
          <p className="admin-page-description on-surface-variant-text">
            Welcome back — here's your store at a glance.
          </p>
        </div>
        <button
          className="primary round admin-page-action"
          onClick={() => navigate('/admin/products?action=add')}
        >
          <i>add</i>
          <span>Add Product</span>
        </button>
      </div>

      {/* ── Alerts ── */}
      {outOfStock > 0 && (
        <div
          className="error-container row wrap middle-align"
          style={{ marginBottom: 12, gap: 12, borderRadius: 20, padding: '12px 16px' }}
        >
          <i style={{ flexShrink: 0 }}>warning</i>
          <span style={{ flex: '1 1 180px', minWidth: 0, fontSize: 14 }}>
            {outOfStock} product{outOfStock !== 1 ? 's' : ''} out of stock.
          </span>
          <button
            className="border small round"
            onClick={() => navigate('/admin/products')}
            style={{ flexShrink: 0, borderRadius: 999, fontWeight: 600 }}
          >
            Review <i>arrow_forward</i>
          </button>
        </div>
      )}
      {lowStock > 0 && (
        <div
          className="orange-container row wrap middle-align"
          style={{ marginBottom: 24, gap: 12, borderRadius: 20, padding: '12px 16px' }}
        >
          <i style={{ flexShrink: 0 }}>inventory</i>
          <span style={{ flex: '1 1 180px', minWidth: 0, fontSize: 14 }}>
            {lowStock} product{lowStock !== 1 ? 's' : ''} running low (≤5 units).
          </span>
          <button
            className="border small round"
            onClick={() => navigate('/admin/products')}
            style={{ flexShrink: 0, borderRadius: 999, fontWeight: 600 }}
          >
            Review <i>arrow_forward</i>
          </button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid" style={{ marginBottom: 32, rowGap: 16, columnGap: 16 }}>
        {stats.map(s => (
          <div key={s.label} className="s12 m6 l3" style={{ minWidth: 0 }}>
            <div
              className="admin-stat-card"
              onClick={() => navigate(s.path)}
            >
              <div className="row middle-align" style={{ marginBottom: 20 }}>
                <div
                  className={`${s.color}-container`}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <i className={`${s.color}-text`} style={{ fontSize: 22 }}>{s.icon}</i>
                </div>
                <div className="max" />
                <i className="on-surface-variant-text" style={{ fontSize: 18 }}>arrow_forward</i>
              </div>
              <p style={{ margin: '0 0 2px', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {s.value}
              </p>
              <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 14 }}>{s.label}</p>
              <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 12 }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Orders ── */}
      <div style={{ marginBottom: 32 }}>
        <div className="row middle-align" style={{ marginBottom: 16, gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Recent Orders</h3>
          <div className="max" />
          <button
            className="transparent small round"
            onClick={() => navigate('/admin/orders')}
            style={{ fontWeight: 600, borderRadius: 999 }}
          >
            View All <i>arrow_forward</i>
          </button>
        </div>

        {recentOrders.length > 0 ? (
          <div
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 24,
              border: '1px solid color-mix(in srgb, var(--outline-variant) 60%, transparent)',
              overflow: 'hidden'
            }}
          >
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              <table className="stripes" style={{ minWidth: 600, width: '100%' }}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/orders')}>
                      <td><code style={{ fontSize: 12, fontWeight: 700 }}>#{order.id?.slice(0, 8).toUpperCase()}</code></td>
                      <td><strong>{order.customer?.name || '—'}</strong></td>
                      <td>{order.items?.length || 0}</td>
                      <td><strong>${order.total?.toFixed(2)}</strong></td>
                      <td>
                        <span className={`chip small ${statusColor(order.status)}`} style={{ fontWeight: 600, borderRadius: 999 }}>
                          {order.status}
                        </span>
                      </td>
                      <td className="on-surface-variant-text" style={{ fontSize: 12 }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 24,
              border: '1px solid color-mix(in srgb, var(--outline-variant) 60%, transparent)',
              padding: 48,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <i className="on-surface-variant-text" style={{ fontSize: 48 }}>shopping_bag</i>
            <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 15 }}>
              No orders yet. They'll appear here once customers start buying.
            </p>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700 }}>Quick Actions</h3>
        <div className="grid" style={{ rowGap: 12, columnGap: 12 }}>
          {[
            { icon: 'inventory_2', title: 'Add Product', sub: 'List a new accessory', action: () => navigate('/admin/products?action=add'), color: 'primary' },
            { icon: 'label', title: 'Manage Categories', sub: 'Organise product groups', action: () => navigate('/admin/categories'), color: 'secondary' },
            { icon: 'settings', title: 'Store Settings', sub: 'API keys & appearance', action: () => navigate('/admin/settings'), color: 'tertiary' },
          ].map(qa => (
            <div key={qa.title} className="s12 m4" style={{ minWidth: 0 }}>
              <div
                onClick={qa.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '18px 20px',
                  borderRadius: 24,
                  background: 'var(--surface-container-low)',
                  border: '1px solid color-mix(in srgb, var(--outline-variant) 60%, transparent)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                className="admin-stat-card"
              >
                <div
                  className={`${qa.color}-container`}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <i className={`${qa.color}-text`} style={{ fontSize: 22 }}>{qa.icon}</i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {qa.title}
                  </strong>
                  <span className="on-surface-variant-text" style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {qa.sub}
                  </span>
                </div>
                <i className="on-surface-variant-text" style={{ flexShrink: 0, fontSize: 18 }}>arrow_forward</i>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
