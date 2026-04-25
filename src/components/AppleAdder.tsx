import { useState, useCallback, useEffect } from 'preact/hooks';
import '../styles/apple-adder.css';
import { playDing, playBoing, playCheer, playPop, speakPhrase } from '../utils/sounds.js';
import { getSavedScore, saveScore, calculateStage } from '../utils/storage.js';

interface RoundState {
  a: number;
  b: number;
  sum: number;
  options: number[];
  solved: boolean;
  wrongPick: number | null;
  score: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRound(prevScore: number): RoundState {
  const stage = calculateStage(prevScore);
  const maxSum = Math.min(10, 2 + stage);
  const a = 1 + Math.floor(Math.random() * (maxSum - 1));
  const b = 1 + Math.floor(Math.random() * (maxSum - a));
  const sum = a + b;

  const pool = new Set<number>([sum]);
  const offsets = shuffle([-2, -1, 1, 2]);
  for (const off of offsets) {
    const cand = sum + off;
    if (cand >= 1 && cand <= 10) pool.add(cand);
    if (pool.size === 3) break;
  }
  while (pool.size < 3) {
    const pick = 1 + Math.floor(Math.random() * 10);
    pool.add(pick);
  }

  return {
    a,
    b,
    sum,
    options: shuffle([...pool]),
    solved: false,
    wrongPick: null,
    score: prevScore,
  };
}

const DEFAULT_STATE: RoundState = { a: 2, b: 3, sum: 5, options: [4, 5, 6], solved: false, wrongPick: null, score: 0 };

export default function AppleAdder() {
  const [state, setState] = useState<RoundState>(DEFAULT_STATE);

  useEffect(() => {
    const saved = getSavedScore('apple-adder');
    setState(generateRound(saved));
  }, []);

  const speakQuestion = useCallback(() => {
    speakPhrase(`${state.a} plus ${state.b} equals?`);
  }, [state.a, state.b]);

  const handlePick = useCallback((n: number) => {
    if (state.solved) return;
    if (n === state.sum) {
      playDing();
      setTimeout(playCheer, 150);
      setTimeout(playPop, 350);
      setState(s => {
        const newScore = s.score + 1;
        saveScore('apple-adder', newScore);
        return { ...s, solved: true, wrongPick: null, score: newScore };
      });
      setTimeout(() => speakPhrase(`${state.a} plus ${state.b} equals ${state.sum}!`), 400);
    } else {
      playBoing();
      setState(s => ({ ...s, wrongPick: n }));
      setTimeout(() => setState(s => (s.wrongPick === n ? { ...s, wrongPick: null } : s)), 400);
    }
  }, [state.solved, state.sum, state.a, state.b]);

  const nextRound = useCallback(() => {
    setState(s => generateRound(s.score));
  }, []);

  const renderApples = (count: number) => (
    <div class="apple-cluster">
      {Array.from({ length: count }, (_, i) => (
        <span class="apple" key={`apple-${i}`} style={{ animationDelay: `${i * 0.04}s` }}>🍎</span>
      ))}
    </div>
  );

  return (
    <div class="apple-game">
      <div class="game-stats-bar">
        <span>Stage {calculateStage(state.score)}/10</span>
        <span>Score: {state.score}</span>
      </div>

      <div class="equation-area">
        <div class="group group-a">
          {renderApples(state.a)}
          <div class="number-tag">{state.a}</div>
        </div>
        <div class="plus-sign">+</div>
        <div class="group group-b">
          {renderApples(state.b)}
          <div class="number-tag">{state.b}</div>
        </div>
        <div class="equals-sign">=</div>
        <div class={`answer-slot ${state.solved ? 'solved' : ''}`}>
          {state.solved ? state.sum : '?'}
        </div>
        <button class="speaker-btn" onClick={speakQuestion} aria-label="Hear the question">🔊</button>
      </div>

      {!state.solved ? (
        <div class="options-row">
          {state.options.map((opt, i) => (
            <button
              key={`opt-${opt}`}
              class={`opt-btn opt-${i} ${state.wrongPick === opt ? 'shake' : ''}`}
              onClick={() => handlePick(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <button class="next-btn" onClick={nextRound}>NEXT!</button>
      )}
    </div>
  );
}
