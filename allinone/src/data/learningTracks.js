// Lightweight card metadata for the learning home screen.
//
// LearningHome only needs a title, subtitle, and question count per track,
// but importing ai103Content.json / ai102Content.json for those three fields
// pulled their full question banks (~2 MB combined, one chunk each) into the
// first load of every learning tab. These constants are tiny and hand-kept;
// update the counts here whenever the matching *Content.json changes (the
// AI-102/AI-103 pages themselves still read the count straight from the JSON,
// so a drift here only mis-labels a card, never the exam).
export const AI_103_TRACK = {
  title: 'AI-103',
  subtitle: 'Microsoft Azure AI solution study material',
  questionCount: 135,
};

export const AI_102_TRACK = {
  title: 'AI-102',
  subtitle: 'Designing and Implementing a Microsoft Azure AI Solution',
  questionCount: 329,
};
