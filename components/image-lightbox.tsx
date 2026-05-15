'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

interface Props {
  src: string
  onClose: () => void
}

export default function ImageLightbox({ src, onClose }: Props) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const lastTap = useRef(0)
  const lastDist = useRef<number | null>(null)
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const clampOffset = (s: number, ox: number, oy: number) => {
    const maxX = Math.max(0, (s - 1) * 150)
    const maxY = Math.max(0, (s - 1) * 200)
    return {
      x: Math.min(maxX, Math.max(-maxX, ox)),
      y: Math.min(maxY, Math.max(-maxY, oy)),
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDist.current = Math.sqrt(dx * dx + dy * dy)
    } else if (e.touches.length === 1) {
      const now = Date.now()
      if (now - lastTap.current < 300) {
        // 더블탭: 확대/초기화 토글
        setScale(prev => {
          if (prev > 1) { setOffset({ x: 0, y: 0 }); return 1 }
          return 2.5
        })
      }
      lastTap.current = now
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: offset.x, oy: offset.y }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation()
    if (e.touches.length === 2 && lastDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const newScale = Math.min(5, Math.max(1, scale * (dist / lastDist.current)))
      lastDist.current = dist
      setScale(newScale)
      if (newScale <= 1) setOffset({ x: 0, y: 0 })
    } else if (e.touches.length === 1 && dragStart.current && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      setOffset(clampOffset(scale, dragStart.current.ox + dx, dragStart.current.oy + dy))
    }
  }

  const handleTouchEnd = () => {
    lastDist.current = null
    dragStart.current = null
    if (scale < 1.1) { setScale(1); setOffset({ x: 0, y: 0 }) }
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
      onClick={() => { if (scale === 1) onClose() }}
    >
      {/* 상단 버튼 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
        <div className="flex gap-3">
          <button
            onClick={e => { e.stopPropagation(); setScale(s => Math.min(5, s + 0.75)) }}
            className="bg-white/20 text-white rounded-full p-2"
          ><ZoomIn size={18} /></button>
          <button
            onClick={e => { e.stopPropagation(); const s = Math.max(1, scale - 0.75); setScale(s); if (s <= 1) setOffset({ x: 0, y: 0 }) }}
            className="bg-white/20 text-white rounded-full p-2"
          ><ZoomOut size={18} /></button>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClose() }}
          className="bg-white/20 text-white rounded-full p-2"
        ><X size={20} /></button>
      </div>

      <img
        src={src}
        alt="확대 이미지"
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          transition: lastDist.current ? 'none' : 'transform 0.1s',
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={e => e.stopPropagation()}
        draggable={false}
      />
    </div>
  )
}
