import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProductStore, useCartStore, useToastStore } from '../lib/store'
import { addDays, format } from 'date-fns'
import PageMeta from '../components/PageMeta'
import ProductCard from '../components/ProductCard'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = useProductStore(s => s.getProduct(id))
  const related = useProductStore(s => s.products.filter(p => p.active && p.category === product?.category && p.id !== id).slice(0, 4))
  const addItem = useCartStore(s => s.addItem)
  const addToast = useToastStore(s => s.add)
  const [qty, setQty] = useState(1)

  if (!product || !product.active) return (
    <div className="page-top center-align" style={{ padding: '80px 0' }}>
      <PageMeta title="Product Not Found | Mobicare" description="The requested product was not found." />
      <h4>Product not found</h4>
      <button className="border round" style={{ marginTop: 16 }} onClick={() => navigate('/shop')}>Back to Shop</button>
    </div>
  )

  const minArrival = format(addDays(new Date(), product.shippingDays.min + 1), 'MMM d')
  const maxArrival = format(addDays(new Date(), product.shippingDays.max + 1), 'MMM d')
  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null

  const handleAddToCart = () => {
    const added = addItem(product, qty)
    if (added) addToast(`${product.name} added to cart`, 'success')
    else addToast(`Only ${product.stock} available in stock`, 'error')
  }

  return (
    <main
      className="page-top responsive"
      style={{
        paddingLeft: 'clamp(12px, 3vw, 24px)',
        paddingRight: 'clamp(12px, 3vw, 24px)',
        paddingBottom: 48,
        overflowX: 'hidden'
      }}
    >
      <PageMeta
        title={`${product.name} | Mobicare Shop`}
        description={`${product.name} - ${product.description.slice(0, 150)}... Buy electronic accessories at Mobicare.`}
      />

      <button className="transparent" style={{ marginBottom: 16, padding: '4px 8px' }} onClick={() => navigate(-1)}>
        <i>arrow_back</i><span>Back</span>
      </button>

      <div className="grid">
        {/* Left: Product Image */}
        <div className="s12 m6" style={{ minWidth: 0 }}>
          <div className="surface-container-low product-photo-container">
            <img
              className="product-photo-image"
              src={product.images[0]}
              alt={product.name}
            />
            {discount && (
              <span className="badge primary product-discount-badge">
                {discount}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Right: Product Details */}
        <div className="s12 m6" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <p className="primary-text bold" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 6px', overflowWrap: 'break-word' }}>
            {product.category.replace('-', ' ')}
          </p>

          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(1.8rem, 4.5vw, 2.5rem)', fontWeight: 800, lineHeight: 1.1, overflowWrap: 'break-word' }}>
            {product.name}
          </h1>

          <div className="row wrap middle-align" style={{ gap: 10, marginBottom: 16 }}>
            <strong style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', lineHeight: 1 }}>${product.price.toFixed(2)}</strong>
            {product.comparePrice && (
              <>
                <span className="on-surface-variant-text" style={{ textDecoration: 'line-through', fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
                  ${product.comparePrice.toFixed(2)}
                </span>
                <span className="chip small green-container round" style={{ fontWeight: 600 }}>
                  Save ${(product.comparePrice - product.price).toFixed(2)}
                </span>
              </>
            )}
          </div>

          <p className="on-surface-variant-text" style={{ lineHeight: 1.6, marginBottom: 20, fontSize: 'clamp(15px, 2vw, 16px)', overflowWrap: 'break-word' }}>
            {product.description}
          </p>

          {product.tags?.length > 0 && (
            <div className="row wrap" style={{ gap: 6, marginBottom: 20 }}>
              {product.tags.map(t => (
                <span key={t} className="chip small surface-container-high round" style={{ border: '1px solid var(--outline-variant)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          <hr className="divider-row" style={{ margin: '8px 0 24px' }} />

          {/* Add to Cart Actions */}
          {product.stock > 0 ? (
            <div className="row wrap middle-align" style={{ gap: 14, marginBottom: 8 }}>
              <div className="row middle-align border round surface-container-low" style={{ padding: '4px', height: 48 }}>
                <button className="circle transparent small" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>
                  <i>remove</i>
                </button>
                <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                <button className="circle transparent small" onClick={() => setQty(q => Math.min(product.stock, q + 1))} disabled={qty >= product.stock}>
                  <i>add</i>
                </button>
              </div>
              <button
                className="primary fill round max"
                onClick={handleAddToCart}
                style={{ height: 48, fontWeight: 700, flexGrow: 1, minWidth: 200 }}
              >
                <i>shopping_cart</i>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Add to Cart — ${(product.price * qty).toFixed(2)}
                </span>
              </button>
            </div>
          ) : (
            <div className="error-container padding round center-align" style={{ marginBottom: 12, fontWeight: 600 }}>
              Out of Stock — Check Back Soon
            </div>
          )}

          {product.stock > 0 && product.stock < 5 && (
            <p style={{ color: 'var(--tertiary, #b26a00)', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              <i style={{ fontSize: 16, verticalAlign: 'bottom', marginRight: 4 }}>warning</i>
              Only {product.stock} left in stock — order soon
            </p>
          )}

          {/* Trust / Shipping Badges */}
          <article className="surface-container-low" style={{ marginTop: 24, marginBottom: 24, borderRadius: 20, border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
            {[
              { icon: 'local_shipping', title: 'Estimated Arrival', sub: `${minArrival} – ${maxArrival}` },
              { icon: 'shield', title: 'Secure Checkout', sub: '256-bit SSL encryption via Stripe' },
              { icon: 'restart_alt', title: '30-Day Returns', sub: 'Unopened items only. Contact us first.' },
            ].map((row, i) => (
              <div key={row.title} className="row middle-align padding small-padding" style={{ borderBottom: i < 2 ? '1px solid var(--outline-variant)' : 'none' }}>
                <div className="primary-container circle" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="primary-text" style={{ fontSize: 20 }}>{row.icon}</i>
                </div>
                <div style={{ marginLeft: 12, minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 14, overflowWrap: 'break-word' }}>{row.title}</strong>
                  <span className="on-surface-variant-text" style={{ fontSize: 13, overflowWrap: 'break-word' }}>{row.sub}</span>
                </div>
              </div>
            ))}
          </article>

          <p className="on-surface-variant-text" style={{ fontSize: 12, fontWeight: 500 }}>SKU: {product.sku}</p>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div style={{ marginTop: 64 }}>
          <h4 style={{ marginBottom: 20, textTransform: 'capitalize', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700 }}>
            More in {product.category.replace('-', ' ')}
          </h4>
          <div className="grid">
            {related.map(p => (
              <div key={p.id} className="s12 m6 l3" style={{ minWidth: 0 }}>
                <ProductCard product={p} onClick={() => navigate(`/product/${p.id}`)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
