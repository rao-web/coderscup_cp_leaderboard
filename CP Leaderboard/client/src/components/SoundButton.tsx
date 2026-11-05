import React from 'react'

const SoundButton = ({ isSoundOpen, setIsSoundOpen, phase }: { isSoundOpen: boolean, setIsSoundOpen: React.Dispatch<React.SetStateAction<boolean>>, phase: string }) => (
    <button
        type="button"
        onClick={() => setIsSoundOpen((v) => !v)}
        aria-pressed={isSoundOpen}
        aria-label={isSoundOpen ? 'Turn sound off' : 'Turn sound on'}
        title={isSoundOpen ? 'Sound: on' : 'Sound: off'}
        className={`${phase === 'during' ? '' : 'hidden'} fixed bottom-20 left-4 z-40 grid h-10 w-10 cursor-pointer select-none place-items-center rounded-full border border-gold/60 bg-ink-900/85 text-gold transition-colors hover:bg-gold hover:text-ink-950`}
    >
        <span className="text-xl leading-none">{isSoundOpen ? '🔊' : '🔇'}</span>
    </button>
)

export default SoundButton;
