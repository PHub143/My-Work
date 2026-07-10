import React from 'react';

function renderPassageLine(line, currentBlank, lineKey) {
  const segments = line.split(/(\[\d\])/);

  return (
    <p key={lineKey}>
      {segments.map((segment, index) => {
        const blankMatch = segment.match(/^\[(\d)\]$/);
        if (!blankMatch) return segment;
        const blankNumber = Number(blankMatch[1]);

        return (
          <span
            className={`english-blank${blankNumber === currentBlank ? ' current' : ''}`}
            key={`${lineKey}-blank-${index}`}
          >
            {segment}
          </span>
        );
      })}
    </p>
  );
}

const PassagePanel = ({ passages, currentBlank = null, idPrefix }) => {
  if (!passages?.length) {
    return null;
  }

  return (
    <>
      {passages.map((passage, passageIndex) => (
        <div className="english-passage-panel" key={`${idPrefix}-passage-${passageIndex}`}>
          <span className="english-passage-label">
            {passages.length > 1 ? `Passage ${passageIndex + 1} · ` : ''}
            {passage.type}
          </span>
          {passage.text.split('\n').map((line, lineIndex) => (
            line.trim()
              ? renderPassageLine(line, currentBlank, `${idPrefix}-p${passageIndex}-l${lineIndex}`)
              : null
          ))}
        </div>
      ))}
    </>
  );
};

export default PassagePanel;
