export function getSavedScore(gameId) {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(`minijoy_${gameId}_score`) || '0', 10);
}

export function saveScore(gameId, score) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`minijoy_${gameId}_score`, score.toString());
}

export function calculateStage(score) {
  return Math.min(10, Math.floor(score / 5) + 1);
}
