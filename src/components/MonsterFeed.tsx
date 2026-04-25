import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import '../styles/monster-feed.css';
import { playCrunch, playCheer, playPop, playBoing, speakPhrase } from '../utils/sounds.js';

interface GameState {
  target: number;
  eaten: number;
  cookies: number[];
  celebrating: boolean;
  score: number;
}

function generateRound(prevScore: number): GameState {
  const target = Math.min(Math.floor(prevScore / 3) + 2, 9);
  const cookieCount = target + 2;
  const cookies = Array.from({ length: cookieCount }, (_, i) => i);
  return { target, eaten: 0, cookies, celebrating: false, score: prevScore };
}

const DEFAULT_STATE: GameState = { target: 2, eaten: 0, cookies: [0, 1, 2, 3], celebrating: false, score: 0 };

export default function MonsterFeed() {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);

  useEffect(() => { setState(generateRound(0)); }, []);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const monsterRef = useRef<HTMLDivElement>(null);
  const dragOverMonster = useRef(false);
  const [mouthOpen, setMouthOpen] = useState(false);

  const eatCookie = useCallback((cookieId: number) => {
    setState(s => {
      if (!s.cookies.includes(cookieId) || s.celebrating) return s;

      if (s.eaten < s.target) {
        const newEaten = s.eaten + 1;
        const newCookies = s.cookies.filter(c => c !== cookieId);
        playCrunch(1 + (newEaten - 1) * 0.12);
        speakPhrase(String(newEaten));

        if (newEaten === s.target) {
          setTimeout(() => {
            playCheer();
            setTimeout(playPop, 150);
          }, 200);
          return { ...s, eaten: newEaten, cookies: newCookies, celebrating: true, score: s.score + 1 };
        }
        return { ...s, eaten: newEaten, cookies: newCookies };
      }

      playBoing();
      return s;
    });
  }, []);

  const handleCookieTap = useCallback((cookieId: number) => {
    if (dragging !== null) return;
    eatCookie(cookieId);
  }, [dragging, eatCookie]);

  const handlePointerDown = useCallback((e: PointerEvent, cookieId: number) => {
    if (state.celebrating) return;
    e.preventDefault();
    setDragging(cookieId);
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [state.celebrating]);

  useEffect(() => {
    if (dragging === null) return;

    const handleMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
      if (monsterRef.current) {
        const r = monsterRef.current.getBoundingClientRect();
        const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        dragOverMonster.current = over;
        setMouthOpen(over);
      }
    };

    const handleUp = () => {
      const draggedId = dragging;
      const landed = dragOverMonster.current;
      setDragging(null);
      setDragPos(null);
      dragOverMonster.current = false;
      setMouthOpen(false);
      if (landed && draggedId !== null) {
        eatCookie(draggedId);
      }
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging, eatCookie]);

  const nextRound = useCallback(() => {
    setState(s => generateRound(s.score));
  }, []);

  const counterText = state.eaten === 0 ? '' : Array.from({ length: state.eaten }, (_, i) => i + 1).join('  ');
  const rainbowColors = ['#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4ECDC4', '#9B59B6'];
  const showingMouth = mouthOpen || state.celebrating;

  return (
    <div class="monster-game">
      <div class="thought-area">
        <div class="thought-bubble">{state.target}</div>
        <button class="speaker-btn" onClick={() => speakPhrase(`Feed me ${state.target} cookies!`)}>🔊</button>
      </div>

      <div class="monster-area">
        <div ref={monsterRef} class={`monster-wrap ${state.celebrating ? 'wiggling' : ''} ${showingMouth ? 'eager' : ''}`}>
          <div class="monster">👾</div>
          <div class={`monster-mouth ${showingMouth ? 'open' : ''}`}></div>
        </div>
        {state.celebrating && (
          <div class="celebration">
            {rainbowColors.map((color, i) => (
              <span
                class="rainbow-dot"
                style={{
                  background: color,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div class="counter">{counterText || 'Drag or tap a cookie!'}</div>

      <div class="cookie-plate">
        {state.cookies.map(id => (
          <button
            key={`cookie-${id}`}
            class={`cookie-btn ${dragging === id ? 'hiding' : ''}`}
            onClick={() => handleCookieTap(id)}
            onPointerDown={(e: PointerEvent) => handlePointerDown(e, id)}
          >
            🍪
          </button>
        ))}
      </div>

      {state.celebrating && (
        <button class="next-btn" onClick={nextRound}>NEXT!</button>
      )}

      {dragging !== null && dragPos && (
        <div
          class="cookie-ghost"
          style={{ left: `${dragPos.x}px`, top: `${dragPos.y}px` }}
        >
          🍪
        </div>
      )}
    </div>
  );
}
