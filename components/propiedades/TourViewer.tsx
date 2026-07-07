'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TourRoom } from '@/lib/types'
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react'
import { PanoramaViewer } from './PanoramaViewer'

interface Props {
  rooms: TourRoom[]
  titulo: string
  ciudad?: string | null
  onClose?: () => void
  embed?: boolean
}

const ANIMATION_VARIANTS = [
  'kenburns-tl',
  'kenburns-tr',
  'kenburns-bl',
  'kenburns-br',
  'kenburns-center',
]

export function TourViewer({ rooms, titulo, ciudad, onClose, embed = false }: Props) {
  const [current, setCurrent]         = useState(0)
  const [prevIdx, setPrevIdx]         = useState<number | null>(null)
  const [animKey, setAnimKey]         = useState(0)
  const [animVariant, setAnimVariant] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const touchStart = useRef<number | null>(null)

  const is360 = rooms[current]?.is360 === true

  const go = useCallback((next: number) => {
    if (transitioning || rooms.length <= 1) return
    setTransitioning(true)
    setPrevIdx(current)
    setCurrent(next)
    setAnimKey((k) => k + 1)
    setAnimVariant((v) => (v + 1) % ANIMATION_VARIANTS.length)
    setTimeout(() => {
      setPrevIdx(null)
      setTransitioning(false)
    }, 600)
  }, [current, transitioning, rooms.length])

  const prev = useCallback(() => go((current - 1 + rooms.length) % rooms.length), [go, current, rooms.length])
  const next = useCallback(() => go((current + 1) % rooms.length), [go, current, rooms.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next, onClose])

  // Auto-advance every 6 s — paused when looking around a 360° room
  useEffect(() => {
    if (rooms.length <= 1 || is360) return
    const id = setInterval(() => next(), 6000)
    return () => clearInterval(id)
  }, [next, rooms.length, is360])

  if (!rooms.length) return null

  return (
    <>
      <style>{`
        @keyframes kenburns-tl {
          0%   { transform: scale(1)    translate(0, 0); }
          100% { transform: scale(1.12) translate(-2%, -2%); }
        }
        @keyframes kenburns-tr {
          0%   { transform: scale(1)    translate(0, 0); }
          100% { transform: scale(1.12) translate(2%, -2%); }
        }
        @keyframes kenburns-bl {
          0%   { transform: scale(1)    translate(0, 0); }
          100% { transform: scale(1.12) translate(-2%, 2%); }
        }
        @keyframes kenburns-br {
          0%   { transform: scale(1)    translate(0, 0); }
          100% { transform: scale(1.12) translate(2%, 2%); }
        }
        @keyframes kenburns-center {
          0%   { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
        .kb-active {
          animation-duration: 7s;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
        .tour-fade-in  { animation: fadeIn  0.6s ease forwards; }
        .tour-fade-out { animation: fadeOut 0.5s ease forwards; }
      `}</style>

      <div
        className="relative w-full h-full bg-black overflow-hidden select-none"
        onTouchStart={(e) => {
          if (is360) return  // let PSV handle touch for 360° rooms
          touchStart.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (is360 || touchStart.current === null) return
          const delta = e.changedTouches[0].clientX - touchStart.current
          if (delta > 50)  prev()
          if (delta < -50) next()
          touchStart.current = null
        }}
      >
        {/* ── 360° panorama layer ─────────────────────── */}
        {is360 && (
          <div key={`psv-${rooms[current].url}`} className="absolute inset-0" style={{ zIndex: 2 }}>
            <PanoramaViewer url={rooms[current].url} />
          </div>
        )}

        {/* ── Regular photo layers (Ken Burns) ────────── */}
        {!is360 && prevIdx !== null && !rooms[prevIdx].is360 && (
          <div key={`prev-${prevIdx}`} className="absolute inset-0 tour-fade-out" style={{ zIndex: 1 }}>
            <img src={rooms[prevIdx].url} alt={rooms[prevIdx].label} className="w-full h-full object-cover" />
          </div>
        )}

        {!is360 && (
          <div key={`active-${animKey}`} className="absolute inset-0 tour-fade-in" style={{ zIndex: 2 }}>
            <img
              src={rooms[current].url}
              alt={rooms[current].label}
              className={`w-full h-full object-cover kb-active ${ANIMATION_VARIANTS[animVariant]}`}
              style={{ animationName: ANIMATION_VARIANTS[animVariant] }}
            />
          </div>
        )}

        {/* Gradient overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 3, background: 'linear-gradient(to bottom, rgba(0,0,0,.45) 0%, transparent 28%, transparent 65%, rgba(0,0,0,.7) 100%)' }}
        />

        {/* Top bar — extra top padding keeps the title clear of the status bar
            when the tour opens inside the native app's edge-to-edge WebView. */}
        <div
          className="absolute top-0 left-0 right-0 flex items-start justify-between px-5"
          style={{ zIndex: 10, paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
        >
          <div>
            <p className="text-white font-semibold text-base leading-tight drop-shadow">{titulo}</p>
            {ciudad && <p className="text-white/70 text-xs mt-0.5 drop-shadow">{ciudad}</p>}
          </div>
          <div className="flex items-center gap-2">
            {is360 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/80 backdrop-blur-sm text-white text-xs font-semibold tracking-wide">
                360°
              </span>
            )}
            {!embed && (
              <a
                href={`${window.location.href}?embed=false`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition text-white backdrop-blur-sm"
                title="Abrir en pantalla completa"
              >
                <Maximize2 className="h-4 w-4" />
              </a>
            )}
            {onClose && (
              <button onClick={onClose} className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition text-white backdrop-blur-sm">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Room label */}
        <div className="absolute top-1/2 left-5 -translate-y-1/2 pointer-events-none" style={{ zIndex: 10 }}>
          <span className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-sm font-medium">
            {rooms[current].label}
          </span>
        </div>

        {/* Nav arrows */}
        {rooms.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/30 hover:bg-black/55 transition text-white backdrop-blur-sm"
              style={{ zIndex: 10 }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/30 hover:bg-black/55 transition text-white backdrop-blur-sm"
              style={{ zIndex: 10 }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Bottom room thumbnails */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8" style={{ zIndex: 10 }}>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide justify-center">
            {rooms.map((room, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`shrink-0 relative rounded-lg overflow-hidden transition-all duration-200 ${
                  i === current
                    ? 'ring-2 ring-white opacity-100 scale-105'
                    : 'opacity-60 hover:opacity-85'
                }`}
                style={{ width: 64, height: 44 }}
                title={room.label}
              >
                <img src={room.url} alt={room.label} className="w-full h-full object-cover" />
                {room.is360 && (
                  <div className="absolute top-0.5 right-0.5 text-[7px] bg-amber-500/90 text-white rounded px-0.5 leading-tight font-bold">
                    360
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 truncate px-1">
                  {room.label}
                </div>
              </button>
            ))}
          </div>

          {/* Counter + branding */}
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-white/50 text-xs">{current + 1} / {rooms.length}</p>
            <p className="text-white/30 text-[10px]">PropSync</p>
          </div>
        </div>
      </div>
    </>
  )
}
