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
    {
      id: 'stat-card-products',
      label: 'Products Catalog',
      value: products.length,
      sub: `${activeProducts} active in store`,
      icon: 'inventory_2',
      path: '/admin/products',
      color: 'primary',
      trend: '+12% vs last month'
    },
    {
      id: 'stat-card-categories',
      label: 'Categories',
      value: categories.length,
      sub: 'Organised product groups',
      icon: 'category',
      path: '/admin/categories',
      color: 'secondary',
      trend: 'Active taxonomies'
    },
    {
      id: 'stat-card-orders',
      label: 'Total Orders',
      value: orders.length,
      sub: 'Completed & pending',
      icon: 'shopping_bag',
      path: '/admin/orders',
      color: 'tertiary',
      trend: 'Real-time sync'
    },
    {
      id: 'stat-card-revenue',
      label: 'Gross Revenue',
      value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'All-time sales',
      icon: 'trending_up',
      path: '/admin/orders',
      color: 'primary',
      trend: 'Stripe & live orders'
    },
  ]

  const getStatusChipClass = (status) => {
    switch (status) {
      case 'paid':
      case 'delivered':
        return 'green-container'
      case 'processing':
      case 'shipped':
        return 'secondary-container'
      case 'cancelled':
      case 'refunded':
        return 'error-container'
      default:
        return 'surface-container-high'
    }
  }

  return (
    <div id="admin-dashboard-page" className="admin-page dashboard-page">
      {/* Page Header */}
      <div id="dashboard-header-section" className="admin-page-header row wrap middle-align">
        <div className="admin-page-heading">
          <span className="chip small primary-container margin-bottom-s">Executive Overview</span>
          <h2 className="admin-page-title">Store Operations</h2>
          <p className="admin-page-description on-surface-variant-text">
            Real-time metric telemetry, inventory status, and recent order activity.
          </p>
        </div>
        <div className="row gap-s middle-align">
          <button
            id="dashboard-add-product-btn"
            className="primary round admin-page-action"
            onClick={() => navigate('/admin/products?action=add')}
          >
            <i>add</i>
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Low Stock / Inventory Alerts */}
      <div id="dashboard-alerts-container" className="admin-alerts-group" style={{ marginBottom: 24 }}>
        {outOfStock > 0 && (
          <div
            id="alert-out-of-stock"
            className="error-container row wrap middle-align"
            style={{ borderRadius: 20, padding: '14px 20px', marginBottom: 12, gap: 12, boxShadow: '0 4px 16px rgba(186, 26, 26, 0.12)' }}
          >
            <i style={{ flexShrink: 0, fontSize: 24 }}>warning</i>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 14 }}>Stock Depleted Warning</strong>
              <span style={{ fontSize: 13, opacity: 0.9 }}>
                {outOfStock} product{outOfStock !== 1 ? 's are' : ' is'} currently completely out of stock.
              </span>
            </div>
            <button
              className="border small round"
              onClick={() => navigate('/admin/products')}
              style={{ flexShrink: 0, borderRadius: 999, fontWeight: 700 }}
            >
              Update Inventory <i>arrow_forward</i>
            </button>
          </div>
        )}

        {lowStock > 0 && (
          <div
            id="alert-low-stock"
            className="orange-container row wrap middle-align"
            style={{ borderRadius: 20, padding: '14px 20px', gap: 12 }}
          >
            <i style={{ flexShrink: 0, fontSize: 24 }}>inventory</i>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 14 }}>Low Inventory Alert</strong>
              <span style={{ fontSize: 13, opacity: 0.9 }}>
                {lowStock} product{lowStock !== 1 ? 's have' : ' has'} 5 or fewer items remaining.
              </span>
            </div>
            <button
              className="border small round"
              onClick={() => navigate('/admin/products')}
              style={{ flexShrink: 0, borderRadius: 999, fontWeight: 700 }}
            >
              View Stock <i>arrow_forward</i>
            </button>
          </div>
        )}
      </div>

      {/* Bento Metric Stat Cards Grid */}
      <section id="dashboard-metrics-grid" className="grid" style={{ marginBottom: 32, rowGap: 20, columnGap: 20 }}>
        {stats.map(s => (
          <div key={s.id} className="s12 m6 l3" style={{ minWidth: 0 }}>
            <div
              id={s.id}
              className="admin-stat-card"
              onClick={() => navigate(s.path)}
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}
            >
              <div className="row middle-align" style={{ marginBottom: 16 }}>
                <div
                  className={`${s.color}-container`}
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
                  <i className={`${s.color}-text`} style={{ fontSize: 24 }}>{s.icon}</i>
                </div>
                <div className="max" />
                <span className="chip small surface-container-high" style={{ fontSize: 11, fontWeight: 600 }}>
                  {s.trend}
                </span>
              </div>

              <div>
                <p style={{ margin: '0 0 4px', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {s.value}
                </p>
                <p style={{ margin: '4px 0 2px', fontWeight: 700, fontSize: 14 }}>{s.label}</p>
                <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 12 }}>{s.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Recent Orders Overview Section */}
      <section id="dashboard-recent-orders-section" style={{ marginBottom: 36 }}>
        <div className="row middle-align" style={{ marginBottom: 16, gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Recent Orders</h3>
            <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 13 }}>Latest purchases placed by store customers</p>
          </div>
          <div className="max" />
          <button
            id="view-all-orders-btn"
            className="transparent small round"
            onClick={() => navigate('/admin/orders')}
            style={{ fontWeight: 700, borderRadius: 999 }}
          >
            View All Orders <i>arrow_forward</i>
          </button>
        </div>

        {recentOrders.length > 0 ? (
          <div
            id="recent-orders-table-wrapper"
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 28,
              border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="stripes" style={{ minWidth: 640, width: '100%' }}>
                <thead>
                  <tr>
                    <th>Order Identifier</th>
                    <th>Customer Name</th>
                    <th>Items Count</th>
                    <th>Grand Total</th>
                    <th>Fulfillment Status</th>
                    <th>Order Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr
                      key={order.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate('/admin/orders')}
                    >
                      <td>
                        <code style={{ fontSize: 12, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'var(--surface-container)' }}>
                          #{order.id?.slice(0, 8).toUpperCase()}
                        </code>
                      </td>
                      <td><strong>{order.customer?.name || 'Guest Customer'}</strong></td>
                      <td>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</td>
                      <td><strong style={{ color: 'var(--primary)' }}>${(order.total || 0).toFixed(2)}</strong></td>
                      <td>
                        <span className={`chip small ${getStatusChipClass(order.status)}`} style={{ fontWeight: 700, borderRadius: 999 }}>
                          {order.status || 'pending'}
                        </span>
                      </td>
                      <td className="on-surface-variant-text" style={{ fontSize: 13 }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            id="recent-orders-empty-state"
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 28,
              border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
              padding: 48,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--surface-container-high)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="on-surface-variant-text" style={{ fontSize: 32 }}>shopping_bag</i>
            </div>
            <h4 style={{ margin: 0 }}>No orders recorded yet</h4>
            <p className="on-surface-variant-text" style={{ margin: 0, fontSize: 14, maxWidth: 400 }}>
              Orders will automatically appear here as customers complete checkout on the live store.
            </p>
          </div>
        )}
      </section>

      {/* Quick Actions Panel */}
      <section id="dashboard-quick-actions-section" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Management Shortcuts</h3>
        <div className="grid" style={{ rowGap: 16, columnGap: 16 }}>
          {[
            { id: 'qa-add-product', icon: 'inventory_2', title: 'Add Product', sub: 'Create new catalog item', action: () => navigate('/admin/products?action=add'), color: 'primary' },
            { id: 'qa-categories', icon: 'category', title: 'Manage Taxonomies', sub: 'Organise categories & tags', action: () => navigate('/admin/categories'), color: 'secondary' },
            { id: 'qa-content', icon: 'auto_fix_high', title: 'Site Content Editor', sub: 'Customize hero & brand text', action: () => navigate('/admin/content'), color: 'tertiary' },
            { id: 'qa-settings', icon: 'tune', title: 'Store Settings', sub: 'Configure API keys & integrations', action: () => navigate('/admin/settings'), color: 'primary' },
          ].map(qa => (
            <div key={qa.id} className="s12 m6 l3" style={{ minWidth: 0 }}>
              <div
                id={qa.id}
                onClick={qa.action}
                className="admin-stat-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '20px',
                  borderRadius: 24
                }}
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
      </section>
    </div>
  )
}

