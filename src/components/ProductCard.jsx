import React from 'react'
import { useCartStore, useToastStore } from '../lib/store'

export default function ProductCard({ product, onClick }) {
  const addItem  = useCartStore(s => s.addItem)
  const addToast = useToastStore(s => s.add)

  const handleAddToCart = (e) => {
    e.stopPropagation()
    if (product.stock < 1) return
    addItem(product)
    addToast(`${product.name} added to cart`, 'success')
  }

  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null

  return (
    <div
      onClick={onClick}
      className="surface-container-low"
      style={{
        borderRadius: 28,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'box-shadow .2s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(19,82,43,.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Image */}
      <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '1' }}>
        <img
          src={product.images?.[0]}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
        {discount && (
          <span className="chip small primary" style={{ position: 'absolute', top: 12, left: 12, color: 'var(--on-primary)' }}>
            <i style={{ fontSize: 14 }}>sell</i>{discount}% OFF
          </span>
        )}
        {product.stock > 0 && product.stock < 5 && (
          <span className="chip small error" style={{ position: 'absolute', bottom: 12, left: 12, color: 'var(--on-error)' }}>
            Only {product.stock} left
          </span>
        )}
        {product.stock === 0 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700 }}>Sold Out</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <p className="primary-text" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
          {product.category?.replace('-', ' ')}
        </p>
        <h6 style={{ margin: '0 0 8px', fontSize: 17, lineHeight: 1.3 }}>{product.name}</h6>
        <p className="on-surface-variant-text" style={{
          fontSize: 13, lineHeight: 1.5, marginBottom: 20, flex: 1,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {product.description}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div>
            <strong style={{ fontSize: 20 }}>${product.price?.toFixed(2)}</strong>
            {product.comparePrice && (
              <span className="on-surface-variant-text" style={{ marginLeft: 6, fontSize: 13, textDecoration: 'line-through' }}>
                ${product.comparePrice.toFixed(2)}
              </span>
            )}
          </div>
          <button
            className="circle primary"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            title="Add to cart"
            style={{ width: 44, height: 44 }}
          >
            <i style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</i>
          </button>
        </div>
      </div>
    </div>
  )
}
