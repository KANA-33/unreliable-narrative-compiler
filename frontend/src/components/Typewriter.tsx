import { useEffect, useRef, useState } from 'react'

interface TypewriterProps {
  text: string
  /** Base delay per character, in ms. Punctuation adds extra pause. */
  speed?: number
  className?: string
}

// Characters that trigger a longer pause (sentence-end) or a shorter pause (clause-break).
const SENTENCE_END = new Set(['。', '！', '？', '.', '!', '?', '…'])
const CLAUSE_BREAK = new Set(['，', '、', '；', ':', '：', ',', ';', '—'])

/**
 * Reveals `text` one character at a time, with a blinking cursor until done.
 * Restarts when `text` changes identity.
 */
export default function Typewriter({ text, speed = 22, className = '' }: TypewriterProps) {
  const [count, setCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCount(0)
    let cancelled = false
    let cursor = 0

    const tick = () => {
      if (cancelled) return
      cursor += 1
      setCount(cursor)
      if (cursor < text.length) {
        const prev = text[cursor - 1]
        const delay =
          SENTENCE_END.has(prev) ? speed * 10 :
          CLAUSE_BREAK.has(prev) ? speed * 4  :
          prev === '\n'          ? speed * 6  :
                                   speed
        timerRef.current = setTimeout(tick, delay)
      }
    }

    timerRef.current = setTimeout(tick, speed)
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, speed])

  const done = count >= text.length

  return (
    <span className={className}>
      {text.slice(0, count)}
      {!done && (
        <span className="typewriter-cursor" aria-hidden="true">
          ▋
        </span>
      )}
    </span>
  )
}
