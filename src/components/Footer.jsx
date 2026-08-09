import React from 'react'
import { Link } from 'react-router-dom'
import { useSiteStore } from '../lib/siteStore'
import localLogo from '../assets/mobicare-logo.svg'

const SHOP_LINKS = [
  { label: 'All Products', to: '/shop' },
  { label: 'Chargers', to: '/shop?cat=chargers' },
  { label: 'Cases', to: '/shop?cat=cases' },
  { label: 'Screen Protectors', to: '/shop?cat=screen-protectors' },
  { label: 'Cables', to: '/shop?cat=cables' },
]

const REPAIR_LINKS = [
  { label: 'All Services', to: '/repairs' },
  { label: 'Screen Repair', to: '/repairs#screen-repair' },
  { label: 'Battery Replacement', to: '/repairs#battery-replacement' },
  { label: 'Water Damage', to: '/repairs#water-damage' },
  { label: 'Data Recovery', to: '/repairs#data-recovery' },
]

export default function Footer() {
  const brand = useSiteStore(s => s.brand)
  const business = useSiteStore(s => s.business)
  const appearance = useSiteStore(s => s.appearance)
  const logoSrc = appearance?.logoUrl || localLogo

  const linkStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    boxSizing: 'border-box',
    textDecoration: 'none',
    minHeight: '34px',
    padding: '4px 0',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--on-surface-variant)',
  }

  return (
    <footer
      className="surface-container-low"
      style={{
        width: '100%',
        padding: '32px 16px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1180px',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Main Footer Surface */}
        <div
          className="surface-container round"
          style={{
            width: '100%',
            padding: '24px',
            boxSizing: 'border-box',
            borderRadius: '28px',
          }}
        >
          {/* Call Shop CTA */}
          <div
            className="primary-container round"
            style={{
              width: '100%',
              padding: '20px 24px',
              marginBottom: '32px',
              boxSizing: 'border-box',
              borderRadius: '20px',
            }}
          >
            <div
              className="row middle-align"
              style={{
                justifyContent: 'space-between',
                gap: '20px',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  flex: '1 1 240px',
                  minWidth: 0,
                }}
              >
                <div
                  className="bold"
                  style={{
                    fontSize: '15px',
                    marginBottom: '4px',
                  }}
                >
                  Need a device repair right now?
                </div>

                <div
                  className="on-primary-container-text small-text"
                  style={{
                    lineHeight: 1.5,
                  }}
                >
                  Fast turnarounds & honest pricing in Southern Illinois.
                </div>
              </div>

              {business?.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="button primary fill round row middle-align"
                  style={{
                    gap: '8px',
                    textDecoration: 'none',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i>call</i>
                  <span>Call Shop</span>
                </a>
              )}
            </div>
          </div>

          {/* Footer Columns */}
          <div
            className="grid"
            style={{
              rowGap: '32px',
            }}
          >
            {/* Brand */}
            <div
              className="s12 m12 l4"
              style={{
                minWidth: 0,
              }}
            >
              <div
                className="row middle-align"
                style={{
                  marginBottom: '14px',
                  minWidth: 0,
                }}
              >
                {appearance?.logoType === 'image' ? (
                  <img
                    className="site-footer-logo"
                    src={logoSrc}
                    alt={
                      appearance.logoAlt ||
                      brand?.name ||
                      'Business logo'
                    }
                  />
                ) : (
                  <div
                    className="primary-container circle row center-align middle-align"
                    style={{
                      width: '36px',
                      height: '36px',
                      minWidth: '36px',
                      flexShrink: 0,
                    }}
                  >
                    <i>bolt</i>
                  </div>
                )}

                <div
                  style={{
                    marginLeft: '12px',
                    minWidth: 0,
                  }}
                >
                  <div
                    className="bold"
                    style={{
                      fontSize: '15px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {brand?.name}
                  </div>

                  {brand?.subLabel && (
                    <div className="on-surface-variant-text small-text">
                      {brand.subLabel}
                    </div>
                  )}
                </div>
              </div>

              <p
                className="on-surface-variant-text small-text"
                style={{
                  lineHeight: 1.6,
                  maxWidth: '340px',
                  margin: 0,
                }}
              >
                Southern Illinois' trusted repair shop for iPhones,
                Androids, tablets, and more. Quality parts and expert
                technician service.
              </p>
            </div>

            {/* Shop */}
            <div
              className="s6 m4 l2"
              style={{
                minWidth: 0,
              }}
            >
              <h6
                className="on-surface-variant-text"
                style={{
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                  margin: '0 0 10px',
                  fontWeight: 700,
                }}
              >
                Shop
              </h6>

              <nav
                aria-label="Shop"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  width: '100%',
                }}
              >
                {SHOP_LINKS.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    style={linkStyle}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Repairs */}
            <div
              className="s6 m4 l2"
              style={{
                minWidth: 0,
              }}
            >
              <h6
                className="on-surface-variant-text"
                style={{
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                  margin: '0 0 10px',
                  fontWeight: 700,
                }}
              >
                Repairs
              </h6>

              <nav
                aria-label="Repairs"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {REPAIR_LINKS.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    style={linkStyle}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Contact & Hours */}
            <div
              className="s12 m4 l4"
              style={{
                minWidth: 0,
              }}
            >
              <h6
                className="on-surface-variant-text"
                style={{
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                  margin: '0 0 10px',
                  fontWeight: 700,
                }}
              >
                Contact & Hours
              </h6>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                }}
              >
                {business?.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    style={linkStyle}
                  >
                    <i
                      style={{
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      call
                    </i>

                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {business.phone}
                    </span>
                  </a>
                )}

                {business?.email && (
                  <a
                    href={`mailto:${business.email}`}
                    style={linkStyle}
                  >
                    <i
                      style={{
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      mail
                    </i>

                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {business.email}
                    </span>
                  </a>
                )}

                {business?.city && (
                  <div style={linkStyle}>
                    <i
                      style={{
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      location_on
                    </i>

                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {business.city}
                    </span>
                  </div>
                )}
              </div>

              {/* Business Hours */}
              {business?.hours?.length > 0 && (
                <div
                  style={{
                    marginTop: '12px',
                    maxWidth: '360px',
                  }}
                >
                  {business.hours.map(h => (
                    <div
                      key={h.days}
                      className="row"
                      style={{
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '16px',
                        fontSize: '12px',
                        color: 'var(--on-surface-variant)',
                        padding: '3px 0',
                        lineHeight: 1.4,
                      }}
                    >
                      <span
                        style={{
                          minWidth: 0,
                        }}
                      >
                        {h.days}
                      </span>

                      <span
                        className="bold"
                        style={{
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {h.hours}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div
            className="divider"
            style={{
              margin: '28px 0 18px',
            }}
          />

          {/* Footer Bottom */}
          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px 20px',
              flexWrap: 'wrap',
              fontSize: '12px',
            }}
          >
            <p
              className="on-surface-variant-text"
              style={{
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              © {new Date().getFullYear()} {brand?.name}. All rights
              reserved.
            </p>

            <p
              className="on-surface-variant-text"
              style={{
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {business?.city || 'Fairfield, Illinois'}

              {business?.phone && (
                <>
                  {' · '}
                  <a
                    href={`tel:${business.phone}`}
                    className="primary-text"
                    style={{
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {business.phone}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Sample component for preview
export const SampleDefault = () => (
  <Footer
  />
);
