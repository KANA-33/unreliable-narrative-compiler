import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

const IMAGE_ANIM_MS = 6000

// The three authored endings. `imageKey` maps to the `/api/ending/<key>`
// route so dropping `positive.jpg` / `negative.jpg` / `zero.jpg` into
// backend/endings/ continues to wire up the visuals.
const ENDINGS = {
  ending1: {
    imageKey: 'positive',
    title: 'Ending 1: [Infinite Loop]',
    body:
      'A strong wave of dizziness washes over you, your vision goes black, and you completely lose consciousness. ' +
      'When you open your eyes again, you find that the water level inside slants 45 degrees to the left in the cup ' +
      'is still quietly floating right in front of you. You rub your sore neck. The familiar sixteen surveillance ' +
      'screens are still emitting a pale light, and the clock on the wall points to 01:00. You realize that you ' +
      'have never left this monitor room, experiencing the exact same events over and over again. You have become ' +
      'the most perfect, permanently sealed piece of correct data within the building. In this endless, closed-loop ' +
      'maze, you slowly give up the struggle and cease to think.',
  },
  ending2: {
    imageKey: 'negative',
    title: 'Ending 2: [A Mundane Life]',
    body:
      'Accompanied by the final crisp sound of shattering glass, all the eerie, oppressive atmosphere in the ' +
      'building dissipates instantly. You stumble and push open the heavy front doors of the building, greeted by ' +
      'the morning breeze and the distant clamor of the streets. You have finally walked out of the building and ' +
      'returned to your warm home. Looking back at everything you experienced last night, it feels like an absurd ' +
      'hallucination brought on by a high fever and exhaustion. You never return to that building, nor do you wish ' +
      'to mention that night to anyone. In the years that follow, just like the vast majority of people, you follow ' +
      'the routine—working, living, and growing old—living out a thoroughly unremarkable life.',
  },
  ending3: {
    imageKey: 'zero',
    title: 'Ending 3: [The Awakened Observer]',
    body:
      'At the tipping point between order and chaos, a splitting, violent headache engulfs you. You jolt awake and ' +
      'struggle to get up, only to find your body firmly restrained, completely unable to move. A blinding white ' +
      'surgical light shines on your face, and you realize you are surrounded by unfamiliar faces wearing white ' +
      'coats and surgical masks. Seeing you suddenly open your eyes, the people around you let out terrified ' +
      'screams, backing away in a panic while frantically recording something. You try to ask a question, but your ' +
      'throat can only produce a hoarse gasp. The building, the monitors, the ID badges... all the memories ' +
      'intertwine. You have finally touched the most foundational "reality" of this world.',
  },
} as const

const CH3_STORY_ID = 'ch03_sync'

// Selection priority: a balanced score (TotalScore = 0) overrides everything
// and routes to the awakened-observer ending. Otherwise the chapter 3 choice
// determines the path — comply → infinite loop, defy → mundane life. If the
// player somehow reached the screen without resolving ch3 (e.g. dev shortcut),
// fall back to score sign so we never leave the screen blank.
function selectEnding(totalScore: number, ch3ChoiceId: string | null) {
  if (totalScore === 0) return ENDINGS.ending3
  if (ch3ChoiceId === 'choice_a_comply') return ENDINGS.ending1
  if (ch3ChoiceId === 'choice_b_defy') return ENDINGS.ending2
  return totalScore > 0 ? ENDINGS.ending1 : ENDINGS.ending2
}

export default function EndingScreen() {
  const { totalScore, chapterStates, gameState, setScreen } = useGameStore()
  const [animDone, setAnimDone] = useState(false)
  const [imgError, setImgError] = useState(false)

  // The ch3 snapshot is normally already in chapterStates because the player
  // had to load it to play through. Fall back to the live gameState in case
  // the player is still on ch3 when they click the arrow.
  const ch3State =
    chapterStates[CH3_STORY_ID] ??
    (gameState?.story_id === CH3_STORY_ID ? gameState : null)
  const ch3Choice =
    ch3State?.events.find((e) => e.id === 'evt_003')?.resolved_choice_id ??
    ch3State?.choices_made?.find((c) => c.event_id === 'evt_003')?.choice_id ??
    null

  const ending = selectEnding(totalScore, ch3Choice ?? null)

  useEffect(() => {
    const t = setTimeout(() => setAnimDone(true), IMAGE_ANIM_MS)
    return () => clearTimeout(t)
  }, [])

  const handleClick = () => {
    if (animDone) setScreen('start')
  }

  return (
    <div
      onClick={handleClick}
      className={`fixed inset-0 z-[400] bg-black overflow-hidden select-none
                  ${animDone ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {!imgError && (
        <img
          src={`/api/ending/${ending.imageKey}`}
          alt=""
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover ending-image-anim
                     origin-center pointer-events-none"
        />
      )}

      {/* Dim scrim so the long body paragraph stays legible over the image */}
      {animDone && (
        <div className="absolute inset-0 bg-black/55 ending-text-anim pointer-events-none" />
      )}

      {animDone && (
        <>
          <div className="absolute inset-0 flex flex-col items-center justify-center
                          px-6 py-10 pointer-events-none">
            <span className="font-headline italic text-white/95 text-5xl md:text-6xl
                             tracking-[0.35em] ending-text-anim drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              END
            </span>
            <h2 className="mt-5 font-headline italic text-white/90 text-xl md:text-2xl
                           tracking-widest text-center ending-text-anim
                           drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
              {ending.title}
            </h2>
            <p className="mt-4 max-w-3xl font-headline text-white/90 text-sm md:text-base
                          leading-relaxed text-center ending-text-anim
                          drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
              {ending.body}
            </p>
          </div>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-label text-[11px]
                        tracking-widest text-white/50 uppercase ending-text-anim pointer-events-none">
            Tap anywhere to return
          </p>
        </>
      )}
    </div>
  )
}
