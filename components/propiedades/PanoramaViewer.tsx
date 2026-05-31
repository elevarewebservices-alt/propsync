'use client'

import { useEffect, useRef } from 'react'

interface Props {
  url: string
}

export function PanoramaViewer({ url }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef    = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let active = true

    ;(async () => {
      const { Viewer } = await import('@photo-sphere-viewer/core')
      if (!active || !containerRef.current) return

      viewerRef.current = new Viewer({
        container:            containerRef.current,
        panorama:             url,
        navbar:               false,
        defaultZoomLvl:       50,
        touchmoveTwoFingers:  true,
        mousewheelCtrlKey:    true,
      })
    })()

    return () => {
      active = false
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
  }, [url])

  return <div ref={containerRef} className="w-full h-full" />
}
