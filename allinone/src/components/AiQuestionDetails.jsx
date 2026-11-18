import React from 'react';

// "Question details" side card on the AI-103 and AI-102 study pages: question
// type, source PDF pages and the position in the current list. Styles live in
// pages/AI103.css (shared by the AI pages).
const AiQuestionDetails = ({ typeLabel, sourcePages, position, total }) => {
  const percent = total ? Math.max(2, Math.round((position / total) * 100)) : 0;

  return (
    <aside className="ai103-details" aria-label="Question details">
      <h2>Question details</h2>
      <div className="ai103-details-row">
        <span className="ai103-details-label">Type</span>
        <span>{typeLabel}</span>
      </div>
      <div className="ai103-details-row">
        <span className="ai103-details-label">Source pages</span>
        <span>{sourcePages}</span>
      </div>
      <div className="ai103-details-row">
        <div className="ai103-details-progress-head">
          <span className="ai103-details-label">Progress</span>
          <span className="ai103-details-count">{position} / {total}</span>
        </div>
        <div
          className="ai103-progress"
          role="progressbar"
          aria-label={`Question ${position} of ${total}`}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={position}
        >
          <div className="ai103-progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </aside>
  );
};

export default AiQuestionDetails;
