'use client'

import { useState, useEffect, useCallback } from 'react'

const DICE_PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[26, 26], [74, 74]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[26, 26], [26, 74], [74, 26], [74, 74]],
  5: [[26, 26], [26, 74], [50, 50], [74, 26], [74, 74]],
  6: [[26, 26], [26, 74], [50, 26], [50, 74], [74, 26], [74, 74]],
}

const DICE_XP = [0, 10, 20, 30, 40, 50, 100]

function DiceFace({ value, size = 80 }: { value: number; size?: number }) {
  const pips = DICE_PIPS[value] || []
  const r = size * 0.08

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`dg-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8e8e8" />
        </linearGradient>
        <filter id={`ds-${size}`}>
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.25" />
        </filter>
        <radialGradient id={`pip-${size}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor="#555" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </radialGradient>
      </defs>
      <rect
        x="4" y="4" width="92" height="92" rx="18" ry="18"
        fill={`url(#dg-${size})`}
        stroke="#c0c0c0"
        strokeWidth="2"
        filter={`url(#ds-${size})`}
      />
      {pips.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#pip-${size})`} />
      ))}
    </svg>
  )
}

interface DiceGameProps {
  onRoll: () => Promise<{ dice_result: number; dice_xp: number; dice_remaining: number } | null>
  diceAvailable: number
  onClose: () => void
  onXpEarned?: (xp: number) => void
}

export default function DiceGame({ onRoll, diceAvailable, onClose, onXpEarned }: DiceGameProps) {
  const [phase, setPhase] = useState<'ready' | 'rolling' | 'result'>('ready')
  const [displayFace, setDisplayFace] = useState(1)
  const [result, setResult] = useState<{ dice_result: number; dice_xp: number } | null>(null)
  const [remaining, setRemaining] = useState(diceAvailable)

  useEffect(() => {
    if (phase !== 'rolling') return
    let frame = 0
    const interval = setInterval(() => {
      setDisplayFace(Math.floor(Math.random() * 6) + 1)
      frame++
      if (frame > 15) clearInterval(interval)
    }, 100)
    return () => clearInterval(interval)
  }, [phase])

  const handleRoll = useCallback(async () => {
    setPhase('rolling')
    const res = await onRoll()
    if (!res) {
      setPhase('ready')
      return
    }
    // Wait for animation
    setTimeout(() => {
      setDisplayFace(res.dice_result)
      setResult(res)
      setRemaining(res.dice_remaining)
      setPhase('result')
      onXpEarned?.(res.dice_xp)
    }, 1600)
  }, [onRoll, onXpEarned])

  const handleRollAgain = useCallback(() => {
    setResult(null)
    setPhase('ready')
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-5 text-center space-y-4">
          <p className="font-bold text-lg">
            {phase === 'ready' && '주사위를 굴려보세요!'}
            {phase === 'rolling' && '굴리는 중...'}
            {phase === 'result' && '결과!'}
          </p>

          {/* Dice */}
          <div className="flex justify-center py-3">
            <div className={phase === 'rolling' ? 'animate-bounce' : ''}>
              <DiceFace value={phase === 'result' && result ? result.dice_result : displayFace} size={100} />
            </div>
          </div>

          {/* Result */}
          {phase === 'result' && result && (
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${result.dice_result === 6 ? 'text-yellow-500' : 'text-violet-600'}`}>
                +{result.dice_xp} XP {result.dice_result === 6 ? '!!!' : ''}
              </p>
              {result.dice_result === 6 && (
                <p className="text-yellow-500 font-semibold text-sm animate-pulse">JACKPOT!</p>
              )}
              <p className="text-xs text-muted-foreground">
                {result.dice_result === 1 && '다음엔 더 좋은 결과가!'}
                {result.dice_result === 2 && '괜찮아요, 꾸준히 출석하세요!'}
                {result.dice_result === 3 && '나쁘지 않은 결과!'}
                {result.dice_result === 4 && '좋은 결과네요!'}
                {result.dice_result === 5 && '대단해요!'}
                {result.dice_result === 6 && '최고의 행운! 100 XP 획득!'}
              </p>
            </div>
          )}

          {/* XP Table */}
          {phase === 'ready' && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">보상 테이블</p>
              <div className="grid grid-cols-6 gap-1 text-center text-xs">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="space-y-1">
                    <div className="flex justify-center"><DiceFace value={n} size={28} /></div>
                    <span className={`font-semibold ${n === 6 ? 'text-yellow-500' : 'text-violet-600'}`}>
                      +{DICE_XP[n]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            남은 주사위: {remaining}개
          </p>
        </div>

        <div className="p-4 pt-0 flex gap-2">
          {phase === 'ready' && (
            <button
              onClick={handleRoll}
              className="flex-1 py-2.5 bg-violet-600 text-white font-bold rounded-xl text-sm"
            >
              주사위 굴리기!
            </button>
          )}
          {phase === 'result' && remaining > 0 && (
            <button
              onClick={handleRollAgain}
              className="flex-1 py-2.5 bg-violet-600 text-white font-bold rounded-xl text-sm"
            >
              한번 더! ({remaining}개 남음)
            </button>
          )}
          <button
            onClick={onClose}
            disabled={phase === 'rolling'}
            className={`py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 ${
              phase === 'result' && remaining <= 0 ? 'flex-1 bg-violet-600 text-white' : 'flex-1 bg-gray-100 text-gray-700'
            }`}
          >
            {phase === 'result' && remaining <= 0 ? '확인' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  )
}
