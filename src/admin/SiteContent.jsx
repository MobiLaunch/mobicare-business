import React, { useState } from 'react'
import { useSiteStore, DEFAULT_SITE_CONTENT, FONT_PRESETS } from '../lib/siteStore'
import { useToastStore } from '../lib/store'

const TABS = [
  { id: 'brand',      label: 'Brand',           icon: 'language' },
  { id: 'hero',       label: 'Hero Section',    icon: 'title' },
  { id: 'trust',      label: 'Trust Bar',       icon: 'layers' },
  { id: 'cta',        label: 'CTA Strip',       icon: 'notes' },
  { id: 'services',   label: 'Services',        icon: 'build' },
  { id: 'devices',    label: 'Devices & Models',icon: 'smartphone' },
  { id: 'about',      label: 'About Page',      icon: 'menu_book' },
  { id: 'business',   label: 'Business Info',   icon: 'business' },
  { id: 'footer',     label: 'Footer',          icon: 'dashboard' },
  { id: 'social',     label: 'Social Links',    icon: 'share' },
  { id: 'seo',        label: 'SEO & Analytics', icon: 'search' },
  { id: 'appearance', label: 'Appearance',      icon: 'palette' },
]

/* ── Shared field wrapper ─────────────────────────────────────────────────── */
function Field({ label, hint, children, col }) {
  return (
    <div className={`field-wrap${col === 'full' ? ' field-full' : ''}`}>
      {label && <label className="field-label">{label}</label>}
      {hint  && <p className="field-hint">{hint}</p>}
      {children}
    </div>
  )
}

/* ── Brand Tab ────────────────────────────────────────────────────────────── */
function BrandTab() {
  const brand            = useSiteStore(s => s.brand)
  const appearance       = useSiteStore(s => s.appearance)
  const updateBrand      = useSiteStore(s => s.updateBrand)
  const updateAppearance = useSiteStore(s => s.updateAppearance)
  const addToast         = useToastStore(s => s.add)
  const [lb, setLb] = useState({ ...brand })
  const [la, setLa] = useState({ ...appearance })

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { addToast('Logo must be under 2MB', 'error'); return }
    const r = new FileReader()
    r.onload = ev => { setLa(a => ({ ...a, logoUrl: ev.target.result })); addToast('Logo loaded', 'info') }
    r.readAsDataURL(file)
  }

  const save = () => { updateBrand(lb); updateAppearance(la); addToast('Brand & logo saved', 'success') }

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>Brand Identity</h2>
        <p>Business name, tagline, and logo shown in the header and footer.</p>
      </div>
      <div className="grid">
        <Field label="Business Name" hint="Shown in the header and page titles.">
          <input className="input" value={lb.name} onChange={e => setLb(b => ({...b, name: e.target.value}))} />
        </Field>
        <Field label="Sub Label" hint="Small text under the logo (e.g. 'Device Recovery').">
          <input className="input" value={lb.subLabel} onChange={e => setLb(b => ({...b, subLabel: e.target.value}))} />
        </Field>
        <Field label="Tagline / Slogan" hint="Short slogan used in meta and SEO contexts." col="full">
          <input className="input" value={lb.tagline} onChange={e => setLb(b => ({...b, tagline: e.target.value}))} />
        </Field>
      </div>

      <div className="divider-row" />
      <h3 className="section-heading">Logo</h3>

      <div className="row">
        {['icon', 'image'].map(t => (
          <button key={t} type="button"
            className={`${la.logoType === t ? 'primary round' : 'border round'}`}
            onClick={() => setLa(a => ({...a, logoType: t}))}>
            {t === 'icon' ? 'Default Icon + Text' : 'Custom Image'}
          </button>
        ))}
      </div>

      {la.logoType === 'image' && (
        <div className="grid">
          <Field label="Upload Logo File" hint="PNG or SVG with transparency recommended. Max 2 MB.">
            <div className="row middle-align">
              <input type="file" accept="image/*" id="logo-upload" style={{display:'none'}} onChange={handleLogoUpload} />
              <label htmlFor="logo-upload" className="btn border round" style={{cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8}}>
                <i style={{fontSize:14}}>upload</i> Choose File
              </label>
              {la.logoUrl && <span className="green-text small-text">Image loaded ✓</span>}
            </div>
          </Field>
          <Field label="Or Paste Image URL" hint="Direct URL to a hosted image.">
            <input className="input" value={la.logoUrl} placeholder="https://..." onChange={e => setLa(a => ({...a, logoUrl: e.target.value}))} />
          </Field>
          <Field label="Alt Text" hint="For screen readers and SEO.">
            <input className="input" value={la.logoAlt} onChange={e => setLa(a => ({...a, logoAlt: e.target.value}))} />
          </Field>
          {la.logoUrl && (
            <Field label="Preview">
              <div className="logo-preview">
                <img src={la.logoUrl} alt="Logo preview" />
              </div>
            </Field>
          )}
        </div>
      )}
      <button className="primary round" onClick={save} style={{marginTop:8}}><i style={{fontSize:14}}>save</i> Save Brand</button>
    </div>
  )
}

/* ── Hero Tab ─────────────────────────────────────────────────────────────── */
function HeroTab() {
  const hero       = useSiteStore(s => s.hero)
  const updateHero = useSiteStore(s => s.updateHero)
  const addToast   = useToastStore(s => s.add)
  const [l, setL] = useState({...hero})
  const set = (k, v) => setL(p => ({...p, [k]: v}))
  const save = () => { updateHero(l); addToast('Hero section saved', 'success') }

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>Hero Section</h2>
        <p>The large banner at the top of your homepage.</p>
      </div>
      <div className="grid">
        <Field label="Badge Text" hint="Pill above the headline — e.g. 'Fairfield, IL · Est. 2019'" col="full">
          <input className="input" value={l.badgeText} onChange={e => set('badgeText', e.target.value)} />
        </Field>
        <Field label="Headline Line 1">
          <input className="input" value={l.headlineLine1} onChange={e => set('headlineLine1', e.target.value)} />
        </Field>
        <Field label="Headline Accent Word" hint="Shown in your accent colour.">
          <input className="input" value={l.headlineAccent} onChange={e => set('headlineAccent', e.target.value)} />
        </Field>
        <Field label="Description" col="full">
          <textarea className="input" rows={4} value={l.description} onChange={e => set('description', e.target.value)} />
        </Field>
        <Field label="Primary CTA Label" hint="Main button — links to /shop.">
          <input className="input" value={l.primaryCta} onChange={e => set('primaryCta', e.target.value)} />
        </Field>
        <Field label="Secondary CTA Label" hint="Second button — e.g. 'Call 618-204-1497'.">
          <input className="input" value={l.secondaryCta} onChange={e => set('secondaryCta', e.target.value)} />
        </Field>
      </div>
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save Hero</button>
    </div>
  )
}

/* ── Trust Bar Tab ────────────────────────────────────────────────────────── */
function TrustTab() {
  const trustItems      = useSiteStore(s => s.trustItems)
  const updateTrustItem = useSiteStore(s => s.updateTrustItem)
  const addToast        = useToastStore(s => s.add)
  const [ls, setLs] = useState(trustItems.map(t => ({...t})))
  const set = (i, k, v) => setLs(a => a.map((l, idx) => idx === i ? {...l, [k]: v} : l))
  const save = () => { ls.forEach((item, i) => updateTrustItem(i, item)); addToast('Trust bar saved', 'success') }

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>Trust Bar</h2>
        <p>Four highlights shown below the hero on the homepage.</p>
      </div>
      <div className="grid">
        {ls.map((item, i) => (
          <div key={i} className="trust-card">
            <div className="trust-card-num">{i + 1}</div>
            <Field label="Label">
              <input className="input" value={item.label} onChange={e => set(i, 'label', e.target.value)} />
            </Field>
            <Field label="Description">
              <input className="input" value={item.desc} onChange={e => set(i, 'desc', e.target.value)} />
            </Field>
          </div>
        ))}
      </div>
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save Trust Bar</button>
    </div>
  )
}

/* ── CTA Strip Tab ────────────────────────────────────────────────────────── */
function CtaTab() {
  const ctaStrip      = useSiteStore(s => s.ctaStrip) || {}
  const updateCtaStrip = useSiteStore(s => s.updateCtaStrip)
  const repairBanner   = useSiteStore(s => s.repairBanner)
  const updateRepairBanner = useSiteStore(s => s.updateRepairBanner)
  const addToast       = useToastStore(s => s.add)
  const [lc, setLc] = useState({...DEFAULT_SITE_CONTENT.ctaStrip, ...ctaStrip})
  const [lr, setLr] = useState({...repairBanner})
  const save = () => {
    updateCtaStrip(lc)
    updateRepairBanner(lr)
    addToast('CTA & Repair Banner saved', 'success')
  }

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>CTA Strip & Repair Banner</h2>
        <p>The call-to-action strip at the bottom of the homepage, and the repair section banner.</p>
      </div>

      <h3 className="section-heading">Bottom CTA Strip</h3>
      <div className="grid">
        <Field label="Headline">
          <input className="input" value={lc.headline} onChange={e => setLc(c => ({...c, headline: e.target.value}))} />
        </Field>
        <Field label="Subtext">
          <input className="input" value={lc.subtext} onChange={e => setLc(c => ({...c, subtext: e.target.value}))} />
        </Field>
        <Field label="Primary Button Label">
          <input className="input" value={lc.primaryCta} onChange={e => setLc(c => ({...c, primaryCta: e.target.value}))} />
        </Field>
        <Field label="Secondary Button Label">
          <input className="input" value={lc.secondaryCta} onChange={e => setLc(c => ({...c, secondaryCta: e.target.value}))} />
        </Field>
      </div>

      <div className="divider-row" />
      <h3 className="section-heading">Repair Banner (Homepage Mid-section)</h3>
      <div className="grid">
        <Field label="Eyebrow" hint="Small label above the headline.">
          <input className="input" value={lr.eyebrow} onChange={e => setLr(r => ({...r, eyebrow: e.target.value}))} />
        </Field>
        <Field label="Headline">
          <input className="input" value={lr.headline} onChange={e => setLr(r => ({...r, headline: e.target.value}))} />
        </Field>
        <Field label="Description" col="full">
          <textarea className="input" rows={3} value={lr.description} onChange={e => setLr(r => ({...r, description: e.target.value}))} />
        </Field>
        <Field label="Primary CTA Label">
          <input className="input" value={lr.primaryCta} onChange={e => setLr(r => ({...r, primaryCta: e.target.value}))} />
        </Field>
        <Field label="Secondary CTA Label">
          <input className="input" value={lr.secondaryCta} onChange={e => setLr(r => ({...r, secondaryCta: e.target.value}))} />
        </Field>
      </div>

      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save CTA & Banner</button>
    </div>
  )
}

/* ── Services Tab ─────────────────────────────────────────────────────────── */
function ServicesTab() {
  const repairServices    = useSiteStore(s => s.repairServices)
  const setRepairServices = useSiteStore(s => s.setRepairServices)
  const addToast          = useToastStore(s => s.add)
  const [ls, setLs] = useState(repairServices.map(s => ({...s})))
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newDuration, setNewDuration] = useState('')
  const [newIcon, setNewIcon] = useState('Smartphone')
  const [newDesc, setNewDesc] = useState('')

  const set = (id, k, v) => setLs(a => a.map(l => l.id === id ? {...l, [k]: v} : l))
  const updateVariant = (sid, vi, f, v) => setLs(a => a.map(l => {
    if (l.id !== sid) return l
    const vars = [...(l.variants || [])]; vars[vi] = {...vars[vi], [f]: v}; return {...l, variants: vars}
  }))
  const deleteVariant = (sid, vi) => setLs(a => a.map(l => l.id !== sid ? l : {...l, variants: (l.variants||[]).filter((_,i)=>i!==vi)}))
  const addVariant = (sid) => setLs(a => a.map(l => l.id !== sid ? l : {...l, variants: [...(l.variants||[]), {name:'',price:''}]}))
  const handleDelete = (id) => {
    if (!window.confirm('Delete this service?')) return
    setLs(a => a.filter(l => l.id !== id))
  }
  const handleAdd = () => {
    if (!newName) { addToast('Enter a service name', 'error'); return }
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    if (ls.some(l => l.id === slug)) { addToast('Service already exists', 'error'); return }
    setLs(a => [...a, { id: slug, name: newName, priceRange: newPrice||'$49 – $99', duration: newDuration||'1 hour', icon: newIcon, description: newDesc||'Service description.' }])
    setNewName(''); setNewPrice(''); setNewDuration(''); setNewIcon('Smartphone'); setNewDesc('')
    addToast('Service added — save to persist', 'success')
  }
  const save = () => { setRepairServices(ls); addToast('Services saved', 'success') }

  const ICONS = ['smartphone','tablet_mac','laptop_mac','tv','watch','sports_esports','headphones','speaker','photo_camera','battery_full','ev_station','water_drop','sd_card','shield','bolt','build','memory']

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>Repair Services</h2>
        <p>Manage services shown on the Repairs page and Booking Wizard.</p>
      </div>

      <div className="services-list">
        {ls.map(svc => (
          <div key={svc.id} className="border round padding service-editor">
            <div className="row middle-align">
              <span className="service-editor-id">{svc.id}</span>
              <h3>{svc.name}</h3>
              <button className="btn border round" style={{marginLeft:'auto',fontSize:12,color:'var(--md-error)'}} onClick={() => handleDelete(svc.id)}>
                <i style={{fontSize:12}}>delete</i> Delete
              </button>
            </div>
            <div className="grid">
              <Field label="Service Name">
                <input className="input" value={svc.name} onChange={e => set(svc.id,'name',e.target.value)} />
              </Field>
              <Field label="Price Range" hint="e.g. '$49 – $249'">
                <input className="input" value={svc.priceRange} onChange={e => set(svc.id,'priceRange',e.target.value)} />
              </Field>
              <Field label="Duration" hint="e.g. '1–2 hours'">
                <input className="input" value={svc.duration} onChange={e => set(svc.id,'duration',e.target.value)} />
              </Field>
              <Field label="Icon">
                <div className="row middle-align" style={{ gap: 10 }}>
                  <div className="primary-container padding circle" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i style={{ fontSize: 20 }}>{svc.icon}</i>
                  </div>
                  <select className="input" value={svc.icon} onChange={e => set(svc.id,'icon',e.target.value)} style={{ flex: 1 }}>
                    {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Description" col="full">
                <textarea className="input" rows={3} value={svc.description} onChange={e => set(svc.id,'description',e.target.value)} />
              </Field>
            </div>
            <div className="service-variants">
              <h4>Price Tiers / Part Variants</h4>
              <p className="on-surface-variant-text small-text">Overrides the price range in the Booking Wizard if set.</p>
              {(svc.variants||[]).map((v,vi) => (
                <div key={vi} className="row">
                  <input className="input" placeholder="e.g. OEM Premium" value={v.name} onChange={e => updateVariant(svc.id,vi,'name',e.target.value)} />
                  <input className="input" placeholder="e.g. $149" value={v.price} onChange={e => updateVariant(svc.id,vi,'price',e.target.value)} />
                  <button type="button" className="btn btn-ghost" style={{color:'var(--md-error)'}} onClick={() => deleteVariant(svc.id,vi)}><i style={{fontSize:13}}>delete</i></button>
                </div>
              ))}
              <button type="button" className="btn border round" style={{marginTop:8,fontSize:12}} onClick={() => addVariant(svc.id)}>
                <i style={{fontSize:12}}>add</i> Add Tier
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border round padding dashed">
        <h3 className="section-heading"><i style={{fontSize:15}}>add</i> Add New Service</h3>
        <div className="grid">
          <Field label="Service Name"><input className="input" placeholder="e.g. Back Glass Replacement" value={newName} onChange={e=>setNewName(e.target.value)} /></Field>
          <Field label="Price Range"><input className="input" placeholder="e.g. $79 – $129" value={newPrice} onChange={e=>setNewPrice(e.target.value)} /></Field>
          <Field label="Duration"><input className="input" placeholder="e.g. 1–2 hours" value={newDuration} onChange={e=>setNewDuration(e.target.value)} /></Field>
          <Field label="Icon">
            <select className="input" value={newIcon} onChange={e=>setNewIcon(e.target.value)}>
              {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
            </select>
          </Field>
          <Field label="Description" col="full">
            <textarea className="input" rows={2} placeholder="Describe the repair..." value={newDesc} onChange={e=>setNewDesc(e.target.value)} />
          </Field>
        </div>
        <button type="button" className="btn border round" onClick={handleAdd}><i style={{fontSize:14}}>add</i> Add to List</button>
      </div>

      <div className="divider-row" />
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save All Services</button>
    </div>
  )
}

/* ── About Tab ────────────────────────────────────────────────────────────── */
function AboutTab() {
  const about       = useSiteStore(s => s.about)
  const updateAbout = useSiteStore(s => s.updateAbout)
  const addToast    = useToastStore(s => s.add)
  const [l, setL] = useState({...about, story:[...about.story]})
  const set = (k,v) => setL(p => ({...p,[k]:v}))
  const setStory = (i,v) => setL(p => { const s=[...p.story]; s[i]=v; return {...p,story:s} })
  const addPara = () => setL(p => ({...p, story:[...p.story,'']}))
  const delPara = (i) => setL(p => ({...p, story:p.story.filter((_,idx)=>idx!==i)}))
  const save = () => { updateAbout(l); addToast('About page saved', 'success') }

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>About Page</h2>
        <p>Edit headline, lead text, and story paragraphs shown on /about.</p>
      </div>
      <div className="grid">
        <Field label="Eyebrow" hint="Small all-caps label above the headline.">
          <input className="input" value={l.eyebrow} onChange={e => set('eyebrow',e.target.value)} />
        </Field>
        <Field label="Page Headline">
          <input className="input" value={l.headline} onChange={e => set('headline',e.target.value)} />
        </Field>
        <Field label="Lead Paragraph" col="full">
          <textarea className="input" rows={3} value={l.lead} onChange={e => set('lead',e.target.value)} />
        </Field>
      </div>
      <h3 className="section-heading">Story Paragraphs</h3>
      {l.story.map((para,i) => (
        <div key={i} className="row">
          <div style={{flex:1}}>
            <label className="field-label">Paragraph {i+1}</label>
            <textarea className="input" rows={4} value={para} onChange={e => setStory(i,e.target.value)} />
          </div>
          <button className="btn btn-ghost" style={{color:'var(--md-error)',alignSelf:'flex-start',marginTop:24}} onClick={() => delPara(i)}>
            <i style={{fontSize:14}}>delete</i>
          </button>
        </div>
      ))}
      <button type="button" className="btn border round" style={{marginTop:8,marginBottom:16}} onClick={addPara}><i style={{fontSize:14}}>add</i> Add Paragraph</button>
      <div className="divider-row"/>
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save About Page</button>
    </div>
  )
}

/* ── Business Info Tab ────────────────────────────────────────────────────── */
function BusinessTab() {
  const business           = useSiteStore(s => s.business)
  const updateBusiness     = useSiteStore(s => s.updateBusiness)
  const updateBusinessHour = useSiteStore(s => s.updateBusinessHour)
  const addToast           = useToastStore(s => s.add)
  const [l, setL] = useState({...business, hours:business.hours.map(h=>({...h}))})
  const set = (k,v) => setL(p=>({...p,[k]:v}))
  const setHour = (i,k,v) => setL(p=>{ const h=[...p.hours]; h[i]={...h[i],[k]:v}; return {...p,hours:h} })
  const addHourRow = () => setL(p => ({...p, hours:[...p.hours,{days:'',hours:''}]}))
  const delHourRow = (i) => setL(p => ({...p, hours:p.hours.filter((_,idx)=>idx!==i)}))
  const save = () => { updateBusiness({...l,hours:l.hours}); l.hours.forEach((h,i)=>updateBusinessHour(i,h)); addToast('Business info saved','success') }

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>Business Information</h2>
        <p>Contact details and hours shown in the header, footer, and about/repair pages.</p>
      </div>
      <div className="grid">
        <Field label="Business Name">
          <input className="input" value={l.name} onChange={e=>set('name',e.target.value)} />
        </Field>
        <Field label="Phone Number" hint="Include area code, e.g. 618-204-1497">
          <input className="input" type="tel" value={l.phone} onChange={e=>set('phone',e.target.value)} />
        </Field>
        <Field label="Email Address">
          <input className="input" type="email" value={l.email} onChange={e=>set('email',e.target.value)} />
        </Field>
        <Field label="Street Address">
          <input className="input" value={l.address} onChange={e=>set('address',e.target.value)} />
        </Field>
        <Field label="City + ZIP" col="full">
          <input className="input" value={l.city} onChange={e=>set('city',e.target.value)} />
        </Field>
      </div>
      <div className="border round padding">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 className="section-heading" style={{margin:0}}>Business Hours</h3>
          <button type="button" className="btn border round" style={{fontSize:12}} onClick={addHourRow}><i style={{fontSize:12}}>add</i> Add Row</button>
        </div>
        {l.hours.map((h,i)=>(
          <div key={i} className="row">
            <Field label="Days"><input className="input" value={h.days} placeholder="e.g. Monday – Friday" onChange={e=>setHour(i,'days',e.target.value)}/></Field>
            <Field label="Hours"><input className="input" value={h.hours} placeholder="e.g. 9:00 AM – 6:00 PM" onChange={e=>setHour(i,'hours',e.target.value)}/></Field>
            <button className="btn btn-ghost" style={{color:'var(--md-error)',alignSelf:'flex-end',marginBottom:18}} onClick={()=>delHourRow(i)}><i style={{fontSize:14}}>delete</i></button>
          </div>
        ))}
      </div>
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save Business Info</button>
    </div>
  )
}

/* ── Footer Tab ───────────────────────────────────────────────────────────── */
function FooterTab() {
  const footer       = useSiteStore(s => s.footer) || {}
  const updateFooter = useSiteStore(s => s.updateFooter)
  const addToast     = useToastStore(s => s.add)
  const [l, setL] = useState({...DEFAULT_SITE_CONTENT.footer, ...footer})
  const set = (k,v) => setL(p=>({...p,[k]:v}))
  const setLink = (i,k,v) => setL(p=>{ const el=[...p.extraLinks]; el[i]={...el[i],[k]:v}; return {...p,extraLinks:el} })
  const addLink = () => setL(p=>({...p,extraLinks:[...p.extraLinks,{label:'',href:''}]}))
  const delLink = (i) => setL(p=>({...p,extraLinks:p.extraLinks.filter((_,idx)=>idx!==i)}))
  const save = () => { updateFooter(l); addToast('Footer saved','success') }

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>Footer</h2>
        <p>Tagline, copyright name, visibility toggles, and extra links in the site footer.</p>
      </div>
      <div className="grid">
        <Field label="Footer Tagline" hint="Short line shown under the logo in the footer." col="full">
          <input className="input" value={l.tagline} onChange={e=>set('tagline',e.target.value)} />
        </Field>
        <Field label="Copyright Name" hint="e.g. 'Mobicare Device Recovery'">
          <input className="input" value={l.copyrightName} onChange={e=>set('copyrightName',e.target.value)} />
        </Field>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <label className="switch icon">
            <input
              type="checkbox"
              checked={!!l.showHours}
              onChange={e => set('showHours', e.target.checked)}
            />
            <span>
              <i>close</i>
              <i>done</i>
            </span>
          </label>
          <div>
            <strong style={{ display: 'block', fontSize: 14 }}>Show Business Hours</strong>
            <span className="on-surface-variant-text" style={{ fontSize: 12 }}>Display opening hours in the footer</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <label className="switch icon">
            <input
              type="checkbox"
              checked={!!l.showSocial}
              onChange={e => set('showSocial', e.target.checked)}
            />
            <span>
              <i>close</i>
              <i>done</i>
            </span>
          </label>
          <div>
            <strong style={{ display: 'block', fontSize: 14 }}>Show Social Icons</strong>
            <span className="on-surface-variant-text" style={{ fontSize: 12 }}>Display social media links in the footer</span>
          </div>
        </div>
      </div>

      <div className="divider-row"/>
      <h3 className="section-heading">Footer Links</h3>
      <p className="field-hint" style={{marginBottom:12}}>Extra links shown in the bottom bar (e.g. Privacy Policy, Terms).</p>
      {l.extraLinks.map((link,i)=>(
        <div key={i} className="row">
          <Field label="Label"><input className="input" value={link.label} placeholder="e.g. Privacy Policy" onChange={e=>setLink(i,'label',e.target.value)} /></Field>
          <Field label="URL"><input className="input" value={link.href} placeholder="/privacy" onChange={e=>setLink(i,'href',e.target.value)} /></Field>
          <button className="btn btn-ghost" style={{color:'var(--md-error)',alignSelf:'flex-end',marginBottom:18}} onClick={()=>delLink(i)}><i style={{fontSize:14}}>delete</i></button>
        </div>
      ))}
      <button type="button" className="btn border round" style={{marginBottom:16,fontSize:12}} onClick={addLink}><i style={{fontSize:12}}>add</i> Add Link</button>
      <div className="divider-row"/>
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save Footer</button>
    </div>
  )
}

/* ── Social Links Tab ─────────────────────────────────────────────────────── */
function SocialTab() {
  const social       = useSiteStore(s => s.social) || {}
  const updateSocial = useSiteStore(s => s.updateSocial)
  const addToast     = useToastStore(s => s.add)
  const [l, setL] = useState({...DEFAULT_SITE_CONTENT.social, ...social})
  const set = (k,v) => setL(p=>({...p,[k]:v}))
  const save = () => { updateSocial(l); addToast('Social links saved','success') }

  const PLATFORMS = [
    {key:'facebook',  label:'Facebook',  placeholder:'https://facebook.com/yourpage'},
    {key:'instagram', label:'Instagram', placeholder:'https://instagram.com/yourhandle'},
    {key:'twitter',   label:'X / Twitter', placeholder:'https://x.com/yourhandle'},
    {key:'tiktok',    label:'TikTok',    placeholder:'https://tiktok.com/@yourhandle'},
    {key:'youtube',   label:'YouTube',   placeholder:'https://youtube.com/@yourchannel'},
    {key:'yelp',      label:'Yelp',      placeholder:'https://yelp.com/biz/your-business'},
    {key:'google',    label:'Google Business Profile', placeholder:'https://g.page/...'},
  ]

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>Social Links</h2>
        <p>Links shown as icon buttons in the footer. Leave blank to hide.</p>
      </div>
      <div className="grid">
        {PLATFORMS.map(p => (
          <Field key={p.key} label={p.label}>
            <input className="input" type="url" value={l[p.key]||''} placeholder={p.placeholder} onChange={e=>set(p.key,e.target.value)} />
          </Field>
        ))}
      </div>
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save Social Links</button>
    </div>
  )
}

/* ── SEO & Analytics Tab ──────────────────────────────────────────────────── */
function SeoTab() {
  const seo       = useSiteStore(s => s.seo) || {}
  const updateSeo = useSiteStore(s => s.updateSeo)
  const addToast  = useToastStore(s => s.add)
  const [l, setL] = useState({...DEFAULT_SITE_CONTENT.seo, ...seo})
  const set = (k,v) => setL(p=>({...p,[k]:v}))
  const save = () => { updateSeo(l); addToast('SEO settings saved','success') }

  const charCount = l.metaDescription?.length || 0
  const titleCount = (l.siteTitle?.length||0) + (l.titleSuffix?.length||0) + 3

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>SEO & Analytics</h2>
        <p>Meta tags, Open Graph, and analytics tracking IDs used across the site.</p>
      </div>

      <h3 className="section-heading">Page Titles & Meta</h3>
      <div className="grid">
        <Field label="Site Title" hint="Homepage title tag.">
          <input className="input" value={l.siteTitle} onChange={e=>set('siteTitle',e.target.value)} />
        </Field>
        <Field label="Title Suffix" hint="Appended to all page titles — e.g. '| Mobicare'.">
          <input className="input" value={l.titleSuffix} onChange={e=>set('titleSuffix',e.target.value)} />
        </Field>
        <Field label="Meta Description" hint={`${charCount}/160 chars — shown in Google search results.`} col="full">
          <textarea className="input" rows={3} maxLength={160} value={l.metaDescription} onChange={e=>set('metaDescription',e.target.value)} />
          <span className="on-surface-variant-text small-text right-align" style={{color: charCount > 150 ? 'var(--warning)' : 'var(--md-on-surface-variant)'}}>{charCount}/160</span>
        </Field>
        <Field label="Keywords" hint="Comma-separated keywords for meta tags." col="full">
          <input className="input" value={l.keywords} placeholder="phone repair, screen repair, Fairfield IL" onChange={e=>set('keywords',e.target.value)} />
        </Field>
      </div>

      <div className="divider-row"/>
      <h3 className="section-heading">Open Graph / Social Preview</h3>
      <div className="grid">
        <Field label="OG Image URL" hint="1200×630 px image shown when shared on Facebook/Twitter." col="full">
          <input className="input" type="url" value={l.ogImage} placeholder="https://..." onChange={e=>set('ogImage',e.target.value)} />
        </Field>
        {l.ogImage && (
          <div className="og-preview">
            <img src={l.ogImage} alt="OG preview" />
            <span>Social share preview image</span>
          </div>
        )}
      </div>

      <div className="divider-row"/>
      <h3 className="section-heading">Analytics & Tracking</h3>
      <div className="on-surface-variant-text small-text">
        Paste your IDs below. Tracking only activates when the ID is set — no code changes needed.
      </div>
      <div className="grid">
        <Field label="Google Analytics ID" hint="e.g. G-XXXXXXXXXX or UA-XXXXXXXX-X">
          <input className="input" value={l.googleAnalyticsId} placeholder="G-XXXXXXXXXX" onChange={e=>set('googleAnalyticsId',e.target.value)} />
        </Field>
        <Field label="Facebook Pixel ID" hint="e.g. 1234567890123456">
          <input className="input" value={l.facebookPixelId} placeholder="1234567890123456" onChange={e=>set('facebookPixelId',e.target.value)} />
        </Field>
      </div>
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save SEO Settings</button>
    </div>
  )
}

/* ── Appearance Tab ───────────────────────────────────────────────────────── */
function AppearanceTab() {
  const appearance       = useSiteStore(s => s.appearance)
  const updateAppearance = useSiteStore(s => s.updateAppearance)
  const addToast         = useToastStore(s => s.add)
  const [l, setL] = useState({...appearance})
  const set = (k,v) => setL(p=>({...p,[k]:v}))

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 2*1024*1024) { addToast('Logo must be under 2MB','error'); return }
    const r = new FileReader()
    r.onload = ev => { set('logoUrl', ev.target.result); addToast('Logo loaded — save to apply','info') }
    r.readAsDataURL(file)
  }

  const save = () => { updateAppearance(l); addToast('Appearance saved','success') }
  const currentFont = FONT_PRESETS.find(f => f.id === l.fontFamily)

  const COLOR_FIELDS = [
    {key:'accentColor',     label:'Accent (Primary)',    hint:'Active links, badges, buttons'},
    {key:'accentColorDeep', label:'Accent Deep (CTAs)',  hint:'Solid backgrounds on primary buttons'},
    {key:'bgBase',          label:'Page Background',     hint:'Whole-screen base color'},
    {key:'bgSurface',       label:'Card Surface',        hint:'Cards, header, floating elements'},
    {key:'bgElevated',      label:'Elevated Surface',    hint:'Nested cards and panels'},
  ]

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>Appearance</h2>
        <p>Color scheme, custom logo, typography, and visual style across the entire site.</p>
      </div>

      <h3 className="section-heading">Color Scheme</h3>
      <div className="row">
        {['dark','light'].map(s => (
          <button key={s} type="button"
            className={`${l.colorScheme === s ? 'primary round' : 'border round'}`}
            onClick={() => set('colorScheme', s)}>
            {s === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        ))}
      </div>

      <div className="divider-row"/>
      <h3 className="section-heading">Accent Colors</h3>
      <div className="grid">
        {COLOR_FIELDS.map(cf => (
          <div key={cf.key} className="field-wrap">
            <label className="field-label">{cf.label}</label>
            {cf.hint && <p className="field-hint">{cf.hint}</p>}
            <div className="row middle-align">
              <input type="color" className="color-swatch" value={l[cf.key]||'#000000'} onChange={e=>set(cf.key,e.target.value)} />
              <input className="input" value={l[cf.key]||''} placeholder="#000000" onChange={e=>set(cf.key,e.target.value)} style={{flex:1}} />
            </div>
          </div>
        ))}
      </div>

      <div className="divider-row"/>
      <h3 className="section-heading">Typography</h3>
      <div className="grid">
        <Field label="Font Family" hint="Choose from presets or enter a custom Google Font URL.">
          <select className="input" value={l.fontFamily} onChange={e=>set('fontFamily',e.target.value)}>
            {FONT_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        {l.fontFamily === 'custom' && (
          <Field label="Custom Font URL" hint="e.g. https://fonts.googleapis.com/css2?family=Sora...">
            <input className="input" value={l.fontUrl} placeholder="https://fonts.googleapis.com/..." onChange={e=>set('fontUrl',e.target.value)} />
          </Field>
        )}
      </div>
      <div className="border round padding" style={{fontFamily: currentFont?.css || 'inherit'}}>
        <span className="font-preview-large">The quick brown fox</span>
        <span className="on-surface-variant-text small-text">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</span>
      </div>

      <div className="divider-row"/>
      <h3 className="section-heading">Custom Logo</h3>
      <div className="row">
        {['icon','image'].map(t=>(
          <button key={t} type="button" className={`${l.logoType===t?'primary round':'border round'}`} onClick={()=>set('logoType',t)}>
            {t==='icon'?'Default Icon + Text':'Custom Image'}
          </button>
        ))}
      </div>
      {l.logoType==='image' && (
        <div className="grid" style={{marginTop:14}}>
          <Field label="Upload File" hint="PNG/SVG, max 2MB">
            <div className="row middle-align">
              <input type="file" accept="image/*" id="app-logo-upload" style={{display:'none'}} onChange={handleLogoUpload}/>
              <label htmlFor="app-logo-upload" className="btn border round" style={{cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8}}><i style={{fontSize:14}}>upload</i> Choose File</label>
              {l.logoUrl && <span className="green-text small-text">Loaded ✓</span>}
            </div>
          </Field>
          <Field label="Or Image URL">
            <input className="input" value={l.logoUrl} placeholder="https://..." onChange={e=>set('logoUrl',e.target.value)}/>
          </Field>
          <Field label="Alt Text">
            <input className="input" value={l.logoAlt} onChange={e=>set('logoAlt',e.target.value)}/>
          </Field>
          {l.logoUrl && <Field label="Preview"><div className="logo-preview"><img src={l.logoUrl} alt="preview"/></div></Field>}
        </div>
      )}

      <div className="divider-row"/>
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save Appearance</button>
    </div>
  )
}

/* ── Devices Tab (unchanged logic, restyled) ─────────────────────────────── */
function DevicesTab() {
  const deviceTypes    = useSiteStore(s => s.deviceTypes) || []
  const setDeviceTypes = useSiteStore(s => s.setDeviceTypes)
  const addToast       = useToastStore(s => s.add)
  const [ld, setLd] = useState(JSON.parse(JSON.stringify(deviceTypes)))
  const [selId, setSelId] = useState(ld[0]?.id||'')
  const [newModel, setNewModel] = useState('')
  const cur = ld.find(d=>d.id===selId)

  const addType = () => {
    const name = window.prompt('New device category name:'); if (!name) return
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-')
    if (ld.some(d=>d.id===id)) { addToast('Category already exists','error'); return }
    const updated = [...ld,{id,name,models:[]}]; setLd(updated); setSelId(id)
  }
  const renameType = (d) => {
    const name = window.prompt(`Rename "${d.name}":`,d.name); if (!name) return
    setLd(a=>a.map(x=>x.id===d.id?{...x,name}:x))
  }
  const delType = (id) => {
    if (ld.length<=1) { addToast('Keep at least one category','error'); return }
    if (!window.confirm('Delete this category and all its models?')) return
    const updated = ld.filter(d=>d.id!==id); setLd(updated)
    if (selId===id) setSelId(updated[0]?.id||'')
  }
  const addModel = (e) => {
    e.preventDefault(); if (!newModel.trim()) return
    if (cur.models.includes(newModel.trim())) { addToast('Model already exists','error'); return }
    setLd(a=>a.map(d=>d.id===cur.id?{...d,models:[...d.models,newModel.trim()]}:d)); setNewModel('')
  }
  const delModel = (m) => setLd(a=>a.map(d=>d.id===cur?.id?{...d,models:d.models.filter(x=>x!==m)}:d))
  const save = () => { setDeviceTypes(ld); addToast('Devices & models saved','success') }

  return (
    <div className="padding">
      <div className="tab-header">
        <h2>Devices & Models</h2>
        <p>Configure device categories and models shown in the Booking Wizard dropdowns.</p>
      </div>
      <div className="site-devices-layout">
        <div className="border round site-device-category-panel">
          <div className="site-device-category-header">
            <h3>Categories</h3>
            <button className="btn border round site-device-add-button" onClick={addType}><i>add</i> Add</button>
          </div>
          <div className="device-types-list">
            {ld.map(d=>(
              <div key={d.id} className={`device-type-row ${selId===d.id?"active":''}`} onClick={()=>setSelId(d.id)}>
                <span>{d.name}</span>
                <div className="row" onClick={e=>e.stopPropagation()}>
                  <button className="circle transparent small" onClick={()=>renameType(d)}>Edit</button>
                  <button className="circle transparent small" onClick={()=>delType(d.id)}><i style={{fontSize:11}}>delete</i></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border round padding site-device-model-panel">
          {cur ? (
            <>
              <div className="site-device-model-header">
                <h3>Models for {cur.name}</h3>
                <span className="on-surface-variant-text small-text">{cur.models.length} model{cur.models.length!==1?'s':''}</span>
              </div>
              <form onSubmit={addModel} className="site-device-model-form">
                <input className="input" placeholder="e.g. iPhone 16 Pro Max" value={newModel} onChange={e=>setNewModel(e.target.value)} />
                <button type="submit" className="primary round">Add</button>
              </form>
              <div className="site-device-model-chips">
                {cur.models.length===0
                  ? <p className="on-surface-variant-text italic">No models yet — Booking Wizard will show a text field.</p>
                  : cur.models.map(m=>(
                    <div key={m} className="chip">
                      <span>{m}</span>
                      <button type="button" className="delete-pill-btn" onClick={()=>delModel(m)}>&times;</button>
                    </div>
                  ))
                }
              </div>
            </>
          ) : <p className="on-surface-variant-text italic">Select a category to manage models.</p>}
        </div>
      </div>
      <div className="divider-row"/>
      <button className="primary round" onClick={save}><i style={{fontSize:14}}>save</i> Save Devices</button>
    </div>
  )
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function SiteContent() {
  const [activeTab, setActiveTab] = useState('brand')
  const resetToDefaults = useSiteStore(s => s.resetToDefaults)
  const addToast        = useToastStore(s => s.add)
  const handleReset = () => {
    if (window.confirm('Reset ALL site content to factory defaults? This cannot be undone.')) {
      resetToDefaults(); addToast('Reset to defaults','info')
    }
  }
  const renderTab = () => {
    switch(activeTab) {
      case 'brand':      return <BrandTab/>
      case 'hero':       return <HeroTab/>
      case 'trust':      return <TrustTab/>
      case 'cta':        return <CtaTab/>
      case 'services':   return <ServicesTab/>
      case 'devices':    return <DevicesTab/>
      case 'about':      return <AboutTab/>
      case 'business':   return <BusinessTab/>
      case 'footer':     return <FooterTab/>
      case 'social':     return <SocialTab/>
      case 'seo':        return <SeoTab/>
      case 'appearance': return <AppearanceTab/>
      default:           return null
    }
  }

  return (
    <div className="page-content admin-page site-content-page">

      {/* ── Page Header ── */}
      <div className="admin-page-header row wrap middle-align">
        <div className="admin-page-heading">
          <h2 className="admin-page-title">
            Site Content
          </h2>
          <p className="admin-page-description on-surface-variant-text">
            Edit every public-facing piece of text, branding, and styling.
          </p>
        </div>
        <button
          className="border round admin-page-action"
          onClick={handleReset}
        >
          <i>restart_alt</i>
          <span>Reset to Defaults</span>
        </button>
      </div>

      {/* ── Tab Layout ── */}
      <div className="site-content-tabs">

        {/* Left tab rail */}
        <nav className="site-content-tab-rail">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`site-content-tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <i className="site-content-tab-icon">{tab.icon}</i>
              <span className="site-content-tab-label">
                {tab.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Vertical divider */}
        <div className="site-content-tab-divider" />

        {/* Tab content */}
        <div className="site-content-tab-panel">
          {renderTab()}
        </div>
      </div>
    </div>
  )
}
