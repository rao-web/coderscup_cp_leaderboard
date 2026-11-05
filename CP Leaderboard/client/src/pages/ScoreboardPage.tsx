import { useState } from 'react';
import ScoreBoard from '../components/Scoreboard'
import PageTitle from '../components/PageTitle'

const batches = ['23k', '24k', '25k', '26k'];

type ScoreboardPayload = Parameters<NonNullable<React.ComponentProps<typeof ScoreBoard>['onDataUpdate']>>[0];

const ScoreboardPage = ({ isSoundOpen, page, onDataUpdate }: { isSoundOpen: boolean; page: string; onDataUpdate?: (p: ScoreboardPayload) => void }) => {
    const [selectedBatch, setSelectedBatch] = useState('26k');

    return (
        <div className="flex w-full flex-col items-center gap-5">
            <PageTitle eyebrow="The Chamber’s Final Algorithm" title="Scoreboard" />

            <div role="tablist" aria-label="Batch" className="flex flex-wrap justify-center gap-2 px-3">
                {batches.map((batch) => {
                    const active = batch === selectedBatch;
                    return (
                        <button
                            key={batch}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setSelectedBatch(batch)}
                            className={`cursor-pointer rounded-full border px-5 py-1.5 font-display text-lg transition-colors ${active
                                ? 'border-gold-bright bg-gold-deep text-parchment shadow-[0_0_18px_rgba(212,173,90,0.35)]'
                                : 'border-gold/40 bg-ink-900/70 text-gold hover:border-gold-bright hover:text-gold-bright'}`}
                        >
                            Batch ’{batch.slice(0, 2)}
                        </button>
                    );
                })}
            </div>

            <div className="flex w-full justify-center px-3">
                <ScoreBoard room={selectedBatch} isSoundOpen={isSoundOpen} page={page} onDataUpdate={onDataUpdate} />
            </div>
        </div>
    )
}

export default ScoreboardPage
