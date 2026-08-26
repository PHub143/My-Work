import React, { useMemo } from 'react';
import './HackerReadingContent.css';
import { PARTS } from '../data/hacker/manifest.js';

// Splits one content-tree part into ordered navigation units. Each unit's
// `questions` list is what Prev/Next and the answer sheet jump between.
//
// - "passage-set" parts (6, 7): one unit per shared-passage set.
// - "text-only" parts (3, 4, 5): one unit per standalone item, except a
//   group of 3 Part 3/4 questions that share a printed graphic (a table,
//   notice, or chart) collapse into one unit around that `graphics` entry
//   — same idea as a Part 7 set, just triggered by a shared visual instead
//   of a shared passage.
function buildUnitsForPart(part) {
  if (part.type === 'passage-set') {
    return part.sets.map((set) => ({
      questions: set.questions,
      instruction: set.instruction,
      passages: set.passages || [set.passage],
      items: set.items,
    }));
  }

  const graphicByQuestion = new Map();
  (part.graphics || []).forEach((graphic) => {
    graphic.questions.forEach((number) => graphicByQuestion.set(number, graphic));
  });

  // Standalone items (no shared passage/graphic) have plenty of empty room
  // below a single question, so batch them a few to a screen instead of one
  // at a time — same idea as a passage set, just grouped by page space
  // rather than by shared content. Graphic groups stay exactly as printed
  // (2-3 questions tied to one table/chart) and never merge with this
  // batching. `part.batchSize` overrides the default of 3 — Part 2's 25
  // identical "Mark your answer" items set it to their own count so they
  // render as one screen, matching the single printed page they come from,
  // instead of nine near-empty pages of paging.
  const STANDALONE_BATCH_SIZE = part.batchSize || 3;
  const units = [];
  const renderedGraphics = new Set();
  let pending = [];

  const flushPending = () => {
    if (!pending.length) return;
    units.push({
      questions: pending.map((entry) => entry.number),
      instruction: null,
      passages: [],
      items: pending,
    });
    pending = [];
  };

  for (const item of part.items) {
    const graphic = graphicByQuestion.get(item.number);
    if (!graphic) {
      pending.push(item);
      if (pending.length === STANDALONE_BATCH_SIZE) flushPending();
      continue;
    }
    flushPending();
    if (renderedGraphics.has(graphic)) continue;
    renderedGraphics.add(graphic);
    units.push({
      questions: graphic.questions,
      instruction: null,
      passages: [graphic.passage],
      items: part.items.filter((entry) => graphic.questions.includes(entry.number)),
    });
  }
  flushPending();
  return units;
}

// Concatenates every transcribed part belonging to `section`, in part order,
// into one flat navigation list — so Next/Prev crosses from the last
// question of one part straight into the first of the next (e.g. Part 5's
// 130 into Part 6's 131) instead of dead-ending at each part's boundary.
// Parts with no transcribed content (Parts 1-2, or any part not yet done for
// this test) are simply absent from `content.parts` and skipped.
function buildUnits(content, section) {
  const partNumbers = PARTS.filter((entry) => entry.section === section).map((entry) => entry.part);
  const units = [];
  for (const partNumber of partNumbers) {
    const part = content?.parts?.[String(partNumber)];
    if (part) units.push(...buildUnitsForPart(part));
  }
  return units;
}

// Part 6 passages carry inline "[[131]]" tokens marking which blank each
// question fills; Part 7's "— [1] —" insert-sentence markers are already
// plain text and need no special handling.
function renderBlanks(text) {
  const parts = text.split(/(\[\[\d+\]\])/g);
  return parts.map((chunk, index) => {
    const match = chunk.match(/^\[\[(\d+)\]\]$/);
    if (!match) return <React.Fragment key={index}>{chunk}</React.Fragment>;
    return (
      <span className="hkr-blank" key={index}>
        {match[1]}
      </span>
    );
  });
}

function Paragraphs({ paragraphs }) {
  if (!paragraphs?.length) return null;
  return paragraphs.map((text, index) => <p key={index}>{renderBlanks(text)}</p>);
}

function SignOff({ closing, signer, signerTitle }) {
  if (!closing && !signer && !signerTitle) return null;
  return (
    <p className="hkr-signoff">
      {closing && <>{closing}<br /></>}
      {signer && <>{signer}<br /></>}
      {signerTitle && <span className="hkr-signoff-title">{signerTitle}</span>}
    </p>
  );
}

function Table({ table, totalRow }) {
  if (!table) return null;
  return (
    <div className="hkr-table-wrap">
      {table.title && <div className="hkr-table-title">{table.title}</div>}
      <table className="hkr-table">
        {table.columns && (
          <thead>
            <tr>{table.columns.map((col) => <th key={col}>{col}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
          ))}
          {totalRow && (
            <tr className="hkr-table-total">
              <td colSpan={(table.columns?.length || 2) - 1}>{totalRow[0]}</td>
              <td>{totalRow[1]}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Passage({ passage, assetUrl }) {
  const p = passage;
  return (
    <div className={`hkr-passage hkr-passage--${p.kind}`}>
      {p.heading && <div className="hkr-passage-heading">{p.heading}</div>}
      {p.kind === 'graphic' && (
        <img className="hkr-graphic" src={assetUrl(p.asset)} alt={p.alt} />
      )}
      {p.byline && <div className="hkr-passage-byline">{p.byline}</div>}
      {p.note && <div className="hkr-passage-note">{p.note}</div>}

      {p.meta && (
        <dl className="hkr-meta">
          {Object.entries(p.meta).map(([label, value]) => (
            <React.Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}

      {p.addressBlock && (
        <p className="hkr-address">
          {p.date && <span className="hkr-letter-date">{p.date}</span>}
          {p.addressBlock.map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}
        </p>
      )}

      {p.salutation && <p className="hkr-salutation">{p.salutation}</p>}

      {p.fields && (
        <dl className="hkr-fields">
          {p.fields.map((f) => (
            <React.Fragment key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}

      {p.fieldRows && (
        <div className="hkr-form-rows">
          {p.fieldRows.map((row, i) => (
            <div className="hkr-form-row" key={i}>
              {row.map((f) => (
                <div className="hkr-form-cell" key={f.label}>
                  <span className="hkr-form-label">{f.label}</span>
                  <span className="hkr-form-value">{f.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {p.intro && <p className="hkr-intro">{p.intro}</p>}

      <Paragraphs paragraphs={p.paragraphs} />

      {p.bulletList && (
        <ul className="hkr-bullets">
          {p.bulletList.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      )}

      {p.messages && (
        <div className="hkr-chat">
          {p.messages.map((m, i) => (
            <div className="hkr-chat-bubble" key={i}>
              <div className="hkr-chat-head">
                <strong>{m.speaker}</strong>
                <span>{m.time}</span>
              </div>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      )}

      {p.site && (
        <div className="hkr-webpage">
          <div className="hkr-webpage-head">
            <strong>{p.site.name}</strong>
            <span>{p.site.url}</span>
          </div>
          {p.site.nav && <nav className="hkr-webpage-nav">{p.site.nav.join(' | ')}</nav>}
        </div>
      )}
      {p.sectionTitle && <div className="hkr-section-title">{p.sectionTitle}</div>}
      {p.comments?.map((c, i) => (
        <div className="hkr-comment" key={i}>
          <p className="hkr-comment-meta"><em>{c.author} {c.meta}:</em></p>
          <p>{c.text}</p>
        </div>
      ))}

      {p.days && (
        <div className="hkr-program">
          {p.days.map((d) => (
            <div className="hkr-program-day" key={d.day}>
              <div className="hkr-program-day-name">{d.day}</div>
              <div className="hkr-program-time">{d.time}</div>
              <div className="hkr-program-title">{d.title}</div>
              <div className="hkr-program-instructor">{d.instructor}</div>
              <div className="hkr-program-cost">{d.cost}</div>
            </div>
          ))}
        </div>
      )}

      <Table table={p.table} totalRow={p.totalRow} />

      {p.closingParagraphs && <Paragraphs paragraphs={p.closingParagraphs} />}

      {p.footnote && <p className="hkr-footnote">{p.footnote}</p>}

      <SignOff closing={p.closing} signer={p.signer} signerTitle={p.signerTitle} />
    </div>
  );
}

function QuestionItem({ item, focused, selected, onSelect, onFocus, disabled, correctAnswer }) {
  return (
    <div
      className={`hkr-q${focused ? ' is-focused' : ''}`}
      id={`hkr-q-${item.number}`}
      onClick={onFocus}
    >
      <div className="hkr-q-num">{item.number}.</div>
      <div className="hkr-q-body">
        {item.stem && <p className="hkr-q-stem">{item.stem}</p>}
        {item.choices && (
          <div className={`hkr-q-choices${item.type === 'sentence' ? ' hkr-q-choices--sentence' : ''}`}>
            {Object.entries(item.choices).map(([key, text]) => {
              const picked = selected === key;
              const correct = disabled && correctAnswer === key;
              const wrong = disabled && picked && !correct;
              const className = correct ? 'is-correct' : wrong ? 'is-incorrect' : picked ? 'is-picked' : '';
              return (
                <button
                  type="button"
                  key={key}
                  className={className}
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(key);
                  }}
                >
                  <b>{key}</b> {text}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Renders the currently focused Part 3-7 unit (a single item, or a whole
// shared-passage/shared-graphic set) as real text instead of the scanned
// booklet image. Prev/Next moves between units, not raw questions, since a
// grouped set must be read and answered together.
export default function HackerReadingContent({
  content,
  section,
  focus,
  onFocusChange,
  selections,
  onSelect,
  disabled,
  correctAnswers,
  assetUrl,
  nextSectionLabel,
  onGoToNextSection,
  onGoToPreviousPart,
}) {
  const units = useMemo(() => buildUnits(content, section), [content, section]);
  const unitIndex = units.findIndex((unit) => unit.questions.includes(focus));
  const unit = units[unitIndex] ?? units[0];

  if (!unit) return null;

  const prevUnit = units[unitIndex - 1];
  const nextUnit = units[unitIndex + 1];
  // At the true end of this section's transcribed content (e.g. Listening's
  // last question), hand off into the next section instead of dead-ending —
  // same idea as the scanned-page viewer's Part 1/2 -> Part 3 handoff.
  const canGoToNextSection = !nextUnit && Boolean(onGoToNextSection);
  // Mirror image, at the very first transcribed unit: hand back into the
  // scanned booklet for the image-only part right before it (e.g. Listening
  // Part 1/2), instead of disabling Prev with nowhere left to go.
  const canGoToPreviousPart = !prevUnit && Boolean(onGoToPreviousPart);

  return (
    <div className="hkr-reading">
      <div className="hkr-reading-controls">
        <button
          type="button"
          disabled={!prevUnit && !canGoToPreviousPart}
          onClick={() => {
            if (!prevUnit) return onGoToPreviousPart();
            onFocusChange(prevUnit.questions[0]);
          }}
        >
          ← Prev
        </button>
        <span className="hkr-reading-instruction">
          {unit.instruction || (
            unit.questions.length > 1
              ? `Questions ${unit.questions[0]}-${unit.questions[unit.questions.length - 1]}`
              : `Question ${unit.questions[0]}`
          )}
        </span>
        <button
          type="button"
          disabled={!nextUnit && !canGoToNextSection}
          onClick={() => {
            if (!nextUnit) return onGoToNextSection();
            onFocusChange(nextUnit.questions[0]);
          }}
        >
          {canGoToNextSection ? `Continue → ${nextSectionLabel}` : 'Next →'}
        </button>
      </div>

      <div className="hkr-reading-body">
        {unit.passages.map((passage, index) => (
          <Passage passage={passage} assetUrl={assetUrl} key={index} />
        ))}

        <div
          className={`hkr-reading-items${
            unit.items.every((item) => !item.choices) ? ' hkr-reading-items--columns' : ''
          }`}
          style={{ '--rows': Math.ceil(unit.items.length / 2) }}
        >
          {unit.items.map((item) => (
            <QuestionItem
              key={item.number}
              item={item}
              focused={item.number === focus}
              selected={selections[item.number]}
              onSelect={(option) => onSelect(item.number, option)}
              onFocus={() => onFocusChange(item.number)}
              disabled={disabled}
              correctAnswer={correctAnswers[item.number]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
