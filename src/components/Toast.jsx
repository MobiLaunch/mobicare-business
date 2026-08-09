import React, { useEffect } from 'react'
import { useToastStore } from '../lib/store'

// BeerCSS snackbar — position bottom, class "active" shows it
export default function Toast() {
  const { toasts, remove } = useToastStore()

  return (
    <>
      {toasts.map(t => (
        <div key={t.id} className={`snackbar bottom active`}>
          <i>{t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}</i>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button className="transparent circle" onClick={() => remove(t.id)}>
            <i>close</i>
          </button>
        </div>
      ))}
    </>
  )
}
