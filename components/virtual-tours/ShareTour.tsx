'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
export function ShareTour({ slug, name }: { slug: string; name: string }) {
  const [url, setUrl] = useState('')
  const [qr, setQr] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    const value = `${location.origin}/tour/${slug}`
    setUrl(value)
    QRCode.toDataURL(value, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
      .then(setQr)
      .catch(() => setMessage('No se pudo generar el QR.'))
  }, [slug])
  return (
    <div className="vt-share">
      <p>Envía el recorrido o descarga su código QR.</p>
      <input
        aria-label="Enlace público"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="vt-actions">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url)
              setMessage('Enlace copiado.')
            } catch {
              setMessage('Selecciona el enlace y cópialo manualmente.')
            }
          }}
        >
          Copiar enlace
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${name} ${url}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(name)}&body=${encodeURIComponent(url)}`}
        >
          Email
        </a>
        <button
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: name, url })
              else {
                await navigator.clipboard.writeText(url)
                setMessage('Enlace copiado.')
              }
            } catch {
              setMessage('No se compartió el enlace.')
            }
          }}
        >
          Compartir
        </button>
      </div>
      {qr && (
        <>
          <img src={qr} alt={`QR del tour ${name}`} width={192} height={192} />
          <a className="vt-button" href={qr} download={`tour-${slug}-qr.png`}>
            Descargar QR
          </a>
        </>
      )}
      <p role="status">{message}</p>
    </div>
  )
}
