import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { io } from 'socket.io-client';
import './App.css';
import Backdrop from './components/Backdrop';
import BottomTicker from './components/BottomTicker';
import Credits from './components/Credits';
import SoundButton from './components/SoundButton';
import Timeboard from './components/Timeboard';
import { HOUSES, NEWS_TEMPLATES } from './utils/DataObjects';
import { formatHMS, fetchContestTimes, fetchTopTeams } from './utils/Functions';
import ScoreboardPage from './pages/ScoreboardPage';
import HouseStatsPage from './pages/HouseStatsPage';
import HouseRankPage from './pages/HouseRankPage';
import FinalStandingsPage from './pages/FinalStandingsPage';
import Celebration from './components/Celebration';
import Ceremony from './components/Ceremony';
import type { CelebrationData } from './components/Celebration';
import { getHouseInfo, detectHouseFromTeam, HOUSE_LIST } from './utils/houses';
import { BACKENDURL } from '../constants'

type Phase = 'idle' | 'before' | 'during' | 'after';
type Page = 'scoreboard' | 'house' | 'houserank' | 'final';

const order: Page[] = ['scoreboard', 'house', 'houserank', 'final'];

type Team = {
  teamId: string;
  rank: number;
  teamName: string;
  score: number;
  penalty: number;
  problems: Array<{ status: string; time: string; penalty: string; firstSolve: boolean }>;
};

function App() {

  const [page, setPage] = useState<Page>('house');
  const [endedDismissed, setEndedDismissed] = useState(false);
  const [previewCeremony, setPreviewCeremony] = useState(false);

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isSoundOpen, setIsSoundOpen] = useState<boolean>(false);

  const [label, setLabel] = useState<string>('');
  const [display, setDisplay] = useState<string>('--:--:--');
  const [phase, setPhase] = useState<Phase>('idle');

  const [topTeams, setTopTeams] = useState<Team[] | null>(null);
  const [loadingTop, setLoadingTop] = useState(false);

  const [tickerMessage, setTickerMessage] = useState<string>("");
  // house scoring data (same shape as HouseRankPage)
  type BatchScores = Record<string, number>;
  type HousesData = Record<string, BatchScores>;
  const [housesData, setHousesData] = useState<HousesData | null>(null);

  // connect to socket for houses (reuse existing backend data stream)
  useEffect(() => {
    const socket = io(BACKENDURL);
    socket.emit('joinRoom', 'Houses');
    socket.on('sendData', (data: HousesData) => {
      setHousesData(data);
    });
    return () => {
      socket.off('sendData');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchContestTimes(BACKENDURL, setStartTime, setEndTime);
    const interval = setInterval(
      () => fetchContestTimes(BACKENDURL, setStartTime, setEndTime),
      30000
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!startTime || !endTime) {
        setPhase('idle');
        setLabel('');
        setDisplay('--:--:--');
        return;
      }

      const now = Date.now();
      const tStart = startTime.getTime();
      const tEnd = endTime.getTime();

      if (now < tStart) {
        setPhase('before');
        setLabel('Starts in');
        setDisplay(formatHMS(tStart - now));
      } else if (now >= tStart && now <= tEnd) {
        setPhase('during');
        setLabel('Ends in');
        setDisplay(formatHMS(tEnd - now));
      } else {
        setPhase('after');
        setLabel('');
        setDisplay('Contest Ended');
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime, endTime]);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    if (phase === "during" || phase === "after") {
      fetchTopTeams(BACKENDURL, setLoadingTop, setTopTeams);
      if (phase === "during") {
        id = setInterval(
          () => fetchTopTeams(BACKENDURL, setLoadingTop, setTopTeams),
          30000
        );
      }
    }

    return () => {
      if (id) clearInterval(id);
    };
  }, [phase]);

  const podium = useMemo(() => {
    if (!topTeams || topTeams.length < 1) return [];
    const byRank: Record<number, Team | undefined> = {};
    topTeams.forEach(t => (byRank[t.rank] = t));
    return [byRank[1], byRank[2], byRank[3]].filter(Boolean) as Team[];
  }, [topTeams]);

  // derive sorted house totals
  const houseRows = useMemo(() => {
    if (!housesData) return [] as { house: string; total: number }[];
    return Object.entries(housesData)
      .map(([house, batches]) => ({
        house,
        total: Object.values(batches).reduce((s, v) => s + (v ?? 0), 0)
      }))
      .sort((a, b) => b.total - a.total);
  }, [housesData]);

  // House rivalry templates
  const HOUSE_TEMPLATES = useMemo<Array<(lead: string, behind: string, gap: number, rankDiff: number) => string>>(() => [
    (a, b, g) => `${a} extends its lead over ${b} by ${g} pts!`,
    (a, b, g) => `${a} keeps ${b} at bay — gap ${g}.`,
    (a, b, g) => `${b} is chasing ${a}; distance now ${g} points`,
    (a, b, g) => `${a} holds the top against ${b} (gap ${g}).`,
    (a, b, g, r) => `${a} is ${r === 1 ? 'just' : ''} ${r} rank(s) ahead of ${b} with ${g} point cushion!`,
    (a, b, g) => `${b} needs ${g + 1} more to catch ${a}!`,
    (a, b, g) => `${a} powers forward; ${b} trailing by ${g}.`,
    (a, b, g) => `${a} vs ${b}: gap steady at ${g} pts`,
    (a, b, g) => `${a} widens the margin — ${g} points now separate them from ${b}.`,
    (a, b, g) => `${b} closes in? Not yet — ${a} still +${g}`,
  ], []);

  const pickTickerMessage = useCallback(() => {
    // during the competition show house rivalry if we have at least 2 houses
    if (phase === 'during' && houseRows.length >= 2) {
      // pick a leading house (biased toward top) and a behind house below it
      const leadIndex = Math.floor(Math.random() * Math.min(3, houseRows.length)); // prefer among top 3
      const lead = houseRows[leadIndex];
      // behind index somewhere below lead
      const behindCandidates = houseRows.filter((_, i) => i !== leadIndex && i > leadIndex);
      if (behindCandidates.length === 0) return '';
      const behind = behindCandidates[Math.floor(Math.random() * behindCandidates.length)];
      const gap = lead.total - behind.total;
      const rankDiff = houseRows.indexOf(behind) - houseRows.indexOf(lead);
      if (gap === 0) {
        return `${lead.house} and ${behind.house} are neck and neck!`;
      }
      const template = HOUSE_TEMPLATES[Math.floor(Math.random() * HOUSE_TEMPLATES.length)];
      return template(lead.house, behind.house, gap, rankDiff);
    }
    // fallback to old team-based logic only if not enough house data
    if (podium.length) {
      const house = HOUSES[Math.floor(Math.random() * HOUSES.length)];
      const team = podium[Math.floor(Math.random() * podium.length)];
      const teamLabel = team?.teamName ?? 'a top team';
      const template = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
      return template(house, teamLabel);
    }
    return '';
  }, [phase, houseRows, podium, HOUSE_TEMPLATES]);

  useEffect(() => {
    if (phase !== 'during') return;
    // require at least some data (house or podium) to start ticker
    if (houseRows.length < 2 && podium.length === 0) return;
    setTickerMessage(pickTickerMessage());
    const id = setInterval(() => setTickerMessage(pickTickerMessage()), 50_000);
    return () => clearInterval(id);
  }, [phase, houseRows.length, podium.length, pickTickerMessage]);


  // ---------- Leader-change celebrations ----------
  const [celebration, setCelebration] = useState<(CelebrationData & { id: number }) | null>(null);
  const [intro, setIntro] = useState(true);
  const soundRef = useRef(false);
  useEffect(() => { soundRef.current = isSoundOpen; }, [isSoundOpen]);
  useEffect(() => { const id = setTimeout(() => setIntro(false), 1900); return () => clearTimeout(id); }, []);

  const celebrate = useCallback((d: CelebrationData) => {
    setCelebration({ ...d, id: Date.now() });
    if (soundRef.current) new Audio('audio/silver-chime.mp3').play().catch(() => { });
  }, []);

  // House takes #1 (only when it changes, never on first load)
  const houseLeaderRef = useRef<string | null>(null);
  useEffect(() => {
    if (houseRows.length < 2) return;
    const [a, b] = houseRows;
    if (a.total <= 0 || a.total === b.total) return;
    const prev = houseLeaderRef.current;
    houseLeaderRef.current = a.house;
    const info = getHouseInfo(a.house);
    if (prev && prev !== a.house && info) celebrate({ kind: 'house', house: info });
  }, [houseRows, celebrate]);

  // New team takes #1 inside a batch
  const batchLeaderRef = useRef<Record<string, string>>({});
  const onBatchPayload = useCallback((p: { batch: string; rows: Team[] }) => {
    const firsts = p.rows.filter(r => r.rank === 1 && r.teamId !== 'N/A' && r.score > 0);
    if (firsts.length !== 1) return;
    const top = firsts[0];
    const prev = batchLeaderRef.current[p.batch];
    batchLeaderRef.current[p.batch] = top.teamId;
    if (prev && prev !== top.teamId) {
      celebrate({ kind: 'team', batch: p.batch, teamName: top.teamName, score: top.score, house: detectHouseFromTeam(top.teamName) });
    }
  }, [celebrate]);

  // Preview keys: H = house animation, S = snitch animation, E = final ceremony
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') celebrate({ kind: 'house', house: HOUSE_LIST[Math.floor(Math.random() * 4)] });
      if (e.key.toLowerCase() === 'e') setPreviewCeremony(true);
      if (e.key.toLowerCase() === 's') celebrate({ kind: 'team', batch: '26k', teamName: 'slytherin_team7', score: 4, house: HOUSE_LIST[3] });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [celebrate]);

  const goRight = useCallback(() => {
    setPage(prev => order[Math.min(order.indexOf(prev) + 1, order.length - 1)]);
  }, []);

  const goLeft = useCallback(() => {
    setPage(prev => order[Math.max(order.indexOf(prev) - 1, 0)]);
  }, []);

  // keyboard navigation (handy on a projector / big screen)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goRight();
      if (e.key === 'ArrowLeft') goLeft();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goRight, goLeft]);

  const pageLabels: Record<Page, string> = {
    scoreboard: 'Scoreboard',
    house: 'House points',
    houserank: 'House rankings',
    final: 'Final standings',
  };

  const arrowBtn = "fixed top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-gold/60 bg-ink-900/85 text-gold shadow-lg backdrop-blur-sm transition-colors hover:bg-gold hover:text-ink-950 sm:h-14 sm:w-14";

  const slideCls = "absolute inset-0 no-scrollbar overflow-y-auto overflow-x-hidden pt-24 pb-28 sm:pt-20";
  const slideStyle = (target: Page): React.CSSProperties => {
    const d = order.indexOf(target) - order.indexOf(page);
    const active = d === 0;
    return {
      transform: active ? 'translate3d(0,0,0) rotateY(0deg) scale(1)' : `translate3d(${d * 110}%,0,0) rotateY(${d * -30}deg) scale(0.8)`,
      opacity: active ? 1 : 0,
      filter: active ? 'blur(0px)' : 'blur(14px)',
      pointerEvents: active ? 'auto' : 'none',
      transition: 'transform 1.1s cubic-bezier(.77,0,.18,1), opacity .9s ease, filter 1s ease',
    };
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-ink-950 text-parchment">
      <Backdrop />

      {/* Sliding pages */}
      <div className="relative h-full w-full" style={{ perspective: 1600 }}>
        <div className={slideCls} style={slideStyle('scoreboard')} aria-hidden={page !== 'scoreboard'}>
          <ScoreboardPage isSoundOpen={isSoundOpen} page={page} onDataUpdate={onBatchPayload} />
        </div>
        <div className={slideCls} style={slideStyle('house')} aria-hidden={page !== 'house'}>
          <HouseStatsPage page={page} />
        </div>
        <div className={slideCls} style={slideStyle('houserank')} aria-hidden={page !== 'houserank'}>
          <HouseRankPage page={page} />
        </div>
        <div className={slideCls} style={slideStyle('final')} aria-hidden={page !== 'final'}>
          <FinalStandingsPage page={page} onReplay={() => setPreviewCeremony(true)} />
        </div>
      </div>


      {/* magic sweep on every page change */}
      <motion.div
        key={page}
        initial={{ x: '-130%' }} animate={{ x: '130%' }} transition={{ duration: 1.2, ease: [0.77, 0, 0.18, 1] }}
        className="pointer-events-none fixed inset-y-0 left-0 z-20 w-[55vw] -skew-x-12 bg-linear-to-r from-transparent via-gold-bright/25 to-transparent"
      />

      {/* leader-change celebration */}
      <AnimatePresence>
        {celebration && <Celebration key={celebration.id} data={celebration} onDone={() => setCelebration(null)} />}
      </AnimatePresence>

      {/* opening gates */}
      <AnimatePresence>
        {intro && (
          <motion.div key="gates" className="fixed inset-0 z-70 flex items-center justify-center" exit={{ transition: { duration: 1.4 } }}>
            <motion.div className="absolute inset-y-0 left-0 w-1/2 border-r-2 border-gold bg-ink-950" initial={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 1.3, ease: [0.77, 0, 0.18, 1] }} />
            <motion.div className="absolute inset-y-0 right-0 w-1/2 border-l-2 border-gold bg-ink-950" initial={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 1.3, ease: [0.77, 0, 0.18, 1] }} />
            <motion.div className="relative text-center" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.9 }}>
              <p className="font-display text-lg tracking-[0.5em] text-gold">Hogwarts presents</p>
              <h1 className="title-shimmer font-display text-6xl sm:text-8xl">Coder’s Cup ’26</h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Credits />
      <SoundButton isSoundOpen={isSoundOpen} setIsSoundOpen={setIsSoundOpen} phase={phase} />
      <Timeboard label={label} display={display} />

      {/* Page arrows */}
      {page !== order[order.length - 1] && (
        <button className={`${arrowBtn} right-3 sm:right-5`} onClick={goRight} aria-label="Next page">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
      {page !== 'scoreboard' && (
        <button className={`${arrowBtn} left-3 sm:left-5`} onClick={goLeft} aria-label="Previous page">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
      )}

      {/* Page dots */}
      <nav aria-label="Pages" className="fixed bottom-20 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        {order.map(p => (
          <button
            key={p}
            onClick={() => setPage(p)}
            aria-label={pageLabels[p]}
            aria-current={page === p}
            className={`h-2.5 cursor-pointer rounded-full transition-all ${page === p ? 'w-8 bg-gold-bright' : 'w-2.5 bg-gold/40 hover:bg-gold'}`}
          />
        ))}
      </nav>

      {/* Before the contest */}
      {phase === 'before' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm">
          <div className="mx-4 max-w-lg rounded-sm border border-gold/60 bg-ink-900/95 px-8 py-10 text-center shadow-[0_0_60px_rgba(212,173,90,0.2)]">
            <p className="font-display text-lg tracking-widest text-gold">The final trial begins soon</p>
            <h2 className="mt-2 font-display text-4xl text-parchment md:text-5xl">Gather in the Great Hall</h2>
            <p className="mt-6 text-5xl font-semibold tabular-nums text-gold-bright">{display}</p>
          </div>
        </div>
      )}

      {/* After the contest: winners ceremony */}
      <AnimatePresence>
        {((phase === 'after' && !endedDismissed) || previewCeremony) && (
          <Ceremony houseRows={houseRows} isSoundOpen={isSoundOpen} onClose={() => { setEndedDismissed(true); setPreviewCeremony(false); setPage('final'); }} />
        )}
      </AnimatePresence>

      {/* dummy usage to silence lint for loadingTop */}
      <span style={{ display: 'none' }}>{loadingTop ? 'loading' : ''}</span>

      {/* bottom ticker message */}
      {phase === 'during' && tickerMessage && (
        <BottomTicker tickerMessage={tickerMessage} />
      )}
    </main>
  );
}

export default App;
