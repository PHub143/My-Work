// TOEIC raw-to-scaled score conversion for the YBM full tests.
//
// Real TOEIC conversion tables are published per form and vary slightly; these
// anchors are the approximation carried over from the previous English module.
// Listening and Reading are each scored 5-495, so a full test lands in 10-990.

const SCALED_SCORE_ANCHORS = [
  [0, 5],
  [10, 30],
  [20, 70],
  [30, 115],
  [40, 160],
  [50, 210],
  [60, 260],
  [70, 310],
  [80, 365],
  [90, 425],
  [96, 465],
  [100, 495],
];

export const SECTION_QUESTION_COUNT = 100;
export const MIN_SECTION_SCORE = 5;
export const MAX_SECTION_SCORE = 495;

// Piecewise-linear interpolation across the anchor table, rounded to the
// nearest 5 the way official TOEIC scores are reported.
export function getScaledSectionScore(correctCount, totalQuestions = SECTION_QUESTION_COUNT) {
  if (!totalQuestions) return MIN_SECTION_SCORE;

  const percent = Math.max(0, Math.min(100, (correctCount / totalQuestions) * 100));
  let scaled = SCALED_SCORE_ANCHORS[SCALED_SCORE_ANCHORS.length - 1][1];

  for (let index = 1; index < SCALED_SCORE_ANCHORS.length; index += 1) {
    const [x0, y0] = SCALED_SCORE_ANCHORS[index - 1];
    const [x1, y1] = SCALED_SCORE_ANCHORS[index];

    if (percent <= x1) {
      scaled = y0 + ((percent - x0) / (x1 - x0)) * (y1 - y0);
      break;
    }
  }

  return Math.max(
    MIN_SECTION_SCORE,
    Math.min(MAX_SECTION_SCORE, Math.round(scaled / 5) * 5),
  );
}

export function getFullTestScore(listeningCorrect, readingCorrect) {
  const listening = getScaledSectionScore(listeningCorrect);
  const reading = getScaledSectionScore(readingCorrect);

  return { listening, reading, total: listening + reading };
}
