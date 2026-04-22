import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import '../styles/number-train.css';
import { playDing, playBoing, playCheer } from '../utils/sounds.js';

interface RoundState {
  sequence: (number | null)[];
  missingIndex: number;
  answer: number;
  options: number[];
}

interface GameState extends RoundState {
  selectedOption: number | null;
  solved: boolean;
  score: number;
  wrongCarriage: boolean;
}

function generateRound(prevScore: number): GameState {
  const start = Math.floor(Math.random() * 7) + 1;
  const length = Math.floor(Math.random() * 3) + 4; // 4-6
  const seq = Array.from({ length }, (_, i) => start + i);
  const missingIndex = Math.floor(Math.random() * length);
  const answer = seq[missingIndex];
  seq[missingIndex] = null;

  const offsets = shuffle([-2, -1, 1, 2]);
  const options = [answer];
  for (const offset of offsets) {
    if (options.length >= 3) break;
    const d = answer + offset;
    if (d > 0) options.push(d);
  }
  while (options.length < 3) options.push(answer + options.length);

  return {
    sequence: seq,
    missingIndex,
    answer,
    options: shuffle(options),
    selectedOption: null,
    solved: false,
    score: prevScore,
    wrongCarriage: false,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DEFAULT_STATE: GameState = { sequence: [1, 2, null, 4], missingIndex: 2, answer: 3, options: [2, 3, 4], selectedOption: null, solved: false, score: 0, wrongCarriage: false };

export default function NumberTrain() {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);

  useEffect(() => { setState(generateRound(0)); }, []);
  const carriageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; value: number } | null>(null);

  const handleOptionTap = useCallback((value: number) => {
    if (state.solved) return;
    setState(s => ({
      ...s,
      selectedOption: s.selectedOption === value ? null : value,
    }));
  }, [state.solved]);

  const handleCarriageTap = useCallback(() => {
    if (state.solved || state.selectedOption === null) return;

    if (state.selectedOption === state.answer) {
      playDing();
      setTimeout(playCheer, 200);
      setState(s => ({
        ...s,
        solved: true,
        score: s.score + 1,
        sequence: s.sequence.map((v, i) => i === s.missingIndex ? s.answer : v),
      }));
    } else {
      playBoing();
      setState(s => ({ ...s, wrongCarriage: true, selectedOption: null }));
      setTimeout(() => {
        setState(s => ({ ...s, wrongCarriage: false }));
      }, 400);
    }
  }, [state.solved, state.selectedOption, state.answer]);

  const handlePointerDown = useCallback((e: PointerEvent, value: number) => {
    if (state.solved) return;
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY, value };
    setDragging(value);
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [state.solved]);

  useEffect(() => {
    if (dragging === null) return;

    const handleMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const handleUp = (e: PointerEvent) => {
      if (carriageRef.current) {
        const rect = carriageRef.current.getBoundingClientRect();
        const over =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        if (over && dragStartRef.current) {
          const value = dragStartRef.current.value;
          if (value === state.answer) {
            playDing();
            setTimeout(playCheer, 200);
            setState(s => ({
              ...s,
              solved: true,
              score: s.score + 1,
              sequence: s.sequence.map((v, i) => i === s.missingIndex ? s.answer : v),
            }));
          } else {
            playBoing();
            setState(s => ({ ...s, wrongCarriage: true }));
            setTimeout(() => {
              setState(s => ({ ...s, wrongCarriage: false }));
            }, 400);
          }
        }
      }

      setDragging(null);
      setDragPos(null);
      dragStartRef.current = null;
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, state.answer, state.missingIndex]);

  const nextRound = useCallback(() => {
    setState(s => generateRound(s.score));
  }, []);

  const trackCount = 1 + state.sequence.length; // locomotive + carriages

  return (
    <div class="train-game">
      <p class="train-prompt">What number is missing?</p>
      <p class="train-score">Score: {state.score}</p>

      <div class="train-wrapper">
        <div class="locomotive">
          <div class="locomotive-body">
            <span class="locomotive-face">🚂</span>
          </div>
          <div class="wheels">
            <div class="wheel"></div>
            <div class="wheel"></div>
          </div>
        </div>

        <div class="carriages-row">
          {state.sequence.map((num, i) => (
            <div class="carriage-cell" key={`cell-${i}`}>
              <div class="connector"></div>
              <div
                ref={i === state.missingIndex ? carriageRef : undefined}
                class={`carriage ${i === state.missingIndex ? (state.solved ? 'filled' : 'empty') : ''} ${i === state.missingIndex && state.wrongCarriage ? 'wrong' : ''}`}
                onClick={i === state.missingIndex && !state.solved ? handleCarriageTap : undefined}
              >
                {num !== null ? num : '?'}
                <div class="carriage-wheels">
                  <div class="carriage-wheel"></div>
                  <div class="carriage-wheel"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div class="tracks">
        <div class="track-segment loco-track"></div>
        {Array.from({ length: state.sequence.length }).map((_, i) => (
          <div class="track-segment" key={i}></div>
        ))}
      </div>

      <div class="options-area">
        {!state.solved ? (
          <>
            <p class="options-label">Pick a number, then tap the empty carriage!</p>
            <div class="options-row">
              {state.options.map((opt, i) => (
                <button
                  class={`option-btn opt-${i} ${state.selectedOption === opt ? 'selected' : ''} ${dragging === opt ? 'used' : ''}`}
                  onClick={() => handleOptionTap(opt)}
                  onPointerDown={(e: PointerEvent) => handlePointerDown(e, opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <button class="next-round-btn" onClick={nextRound}>
            NEXT!
          </button>
        )}
      </div>

      {dragging !== null && dragPos && (
        <div
          class={`drag-ghost opt-${state.options.indexOf(dragging)}`}
          style={{
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`,
          }}
        >
          {dragging}
        </div>
      )}
    </div>
  );
}
