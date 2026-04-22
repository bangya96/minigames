import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import '../styles/cookie-bake.css';
import { playCrunch, playCheer, playPop, playBoing, speakPhrase } from '../utils/sounds.js';

interface Cookie {
  id: number;
  plate: 'a' | 'b';
}

interface RoundState {
  a: number;
  b: number;
  sum: number;
  cookies: Cookie[];
  inOven: number;
  solved: boolean;
  score: number;
}

let cookieSeq = 0;

function generateRound(prevScore: number): RoundState {
  const a = 1 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * (10 - a));
  const sum = a + b;
  const cookies: Cookie[] = [];
  for (let i = 0; i < a; i++) cookies.push({ id: ++cookieSeq, plate: 'a' });
  for (let i = 0; i < b; i++) cookies.push({ id: ++cookieSeq, plate: 'b' });
  return { a, b, sum, cookies, inOven: 0, solved: false, score: prevScore };
}

export default function CookieBake() {
  const [state, setState] = useState<RoundState>(() => generateRound(0));
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [ovenHot, setOvenHot] = useState(false);
  const ovenRef = useRef<HTMLDivElement>(null);
  const overOven = useRef(false);

  const speakQuestion = useCallback(() => {
    speakPhrase(`${state.a} plus ${state.b}. Put them all in the oven!`);
  }, [state.a, state.b]);

  const bakeCookie = useCallback((cookieId: number) => {
    setState(s => {
      if (!s.cookies.some(c => c.id === cookieId) || s.solved) return s;
      const newCookies = s.cookies.filter(c => c.id !== cookieId);
      const newIn = s.inOven + 1;
      const solved = newIn === s.sum;
      playCrunch(1 + (newIn - 1) * 0.1);
      speakPhrase(String(newIn));
      if (solved) {
        setTimeout(() => {
          playCheer();
          setTimeout(playPop, 180);
          setTimeout(() => speakPhrase(`${s.a} plus ${s.b} equals ${s.sum}!`), 300);
        }, 200);
        return { ...s, cookies: newCookies, inOven: newIn, solved: true, score: s.score + 1 };
      }
      return { ...s, cookies: newCookies, inOven: newIn };
    });
  }, []);

  const handleTap = useCallback((cookieId: number) => {
    if (dragging !== null) return;
    bakeCookie(cookieId);
  }, [dragging, bakeCookie]);

  const handlePointerDown = useCallback((e: PointerEvent, cookieId: number) => {
    if (state.solved) return;
    e.preventDefault();
    setDragging(cookieId);
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [state.solved]);

  useEffect(() => {
    if (dragging === null) return;

    const handleMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
      if (ovenRef.current) {
        const r = ovenRef.current.getBoundingClientRect();
        const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        overOven.current = over;
        setOvenHot(over);
      }
    };

    const handleUp = () => {
      const draggedId = dragging;
      const landed = overOven.current;
      setDragging(null);
      setDragPos(null);
      overOven.current = false;
      setOvenHot(false);
      if (landed && draggedId !== null) {
        bakeCookie(draggedId);
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
  }, [dragging, bakeCookie]);

  const nextRound = useCallback(() => {
    setState(s => generateRound(s.score));
    setOvenHot(false);
  }, []);

  const plateA = state.cookies.filter(c => c.plate === 'a');
  const plateB = state.cookies.filter(c => c.plate === 'b');

  return (
    <div class="bake-game">
      <div class="bake-header">
        <div class="bake-equation">
          <span>{state.a}</span>
          <span class="op">+</span>
          <span>{state.b}</span>
          <span class="op">=</span>
          <span class={`total ${state.solved ? 'reveal' : ''}`}>{state.solved ? state.sum : '?'}</span>
          <button class="speaker-btn" onClick={speakQuestion} aria-label="Hear the question">🔊</button>
        </div>
        <div class="bake-score">Score: <span>{state.score}</span></div>
      </div>

      <div class="plates-row">
        <div class="plate plate-a">
          <div class="plate-label">{state.a}</div>
          <div class="plate-cookies">
            {plateA.map(c => (
              <button
                key={`c-${c.id}`}
                class={`cookie-btn ${dragging === c.id ? 'hiding' : ''}`}
                onClick={() => handleTap(c.id)}
                onPointerDown={(e: PointerEvent) => handlePointerDown(e, c.id)}
              >🍪</button>
            ))}
          </div>
        </div>
        <div class="plate plate-b">
          <div class="plate-label">{state.b}</div>
          <div class="plate-cookies">
            {plateB.map(c => (
              <button
                key={`c-${c.id}`}
                class={`cookie-btn ${dragging === c.id ? 'hiding' : ''}`}
                onClick={() => handleTap(c.id)}
                onPointerDown={(e: PointerEvent) => handlePointerDown(e, c.id)}
              >🍪</button>
            ))}
          </div>
        </div>
      </div>

      <div ref={ovenRef} class={`oven ${ovenHot ? 'hot' : ''} ${state.solved ? 'done' : ''}`}>
        <div class="oven-top">OVEN</div>
        <div class="oven-window">
          <div class="oven-count">{state.inOven}</div>
          <div class="oven-label">{state.inOven === 1 ? 'cookie' : 'cookies'}</div>
        </div>
      </div>

      {state.solved ? (
        <button class="next-btn" onClick={nextRound}>NEXT!</button>
      ) : (
        <p class="hint">Drag the cookies into the oven!</p>
      )}

      {dragging !== null && dragPos && (
        <div class="cookie-ghost" style={{ left: `${dragPos.x}px`, top: `${dragPos.y}px` }}>🍪</div>
      )}
    </div>
  );
}
