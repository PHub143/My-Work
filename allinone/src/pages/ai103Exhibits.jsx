// Shared exhibit widgets for AI-103 questions whose PDF answer areas are
// tables, code snippets, or label+dropdown hotspots. Used by both the
// read-only study page (AI103.jsx) and the practice runner (AI103Practice.jsx)
// so the extracted markup stays in one place instead of two.

export function ExhibitTable({ headers, rows, caption }) {
  return (
    <div className="ai103-exhibit-table-wrap">
      <table className="ai103-exhibit-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExhibitCode({ code, caption }) {
  return (
    <figure className="ai103-exhibit-code-wrap">
      {caption ? <figcaption>{caption}</figcaption> : null}
      <pre className="ai103-exhibit-code">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

export function OptionSelect({ options, answer, revealAnswer, className }) {
  return (
    <select
      className={`${className}${revealAnswer ? ' is-correct' : ''}`}
      disabled={revealAnswer}
      defaultValue={revealAnswer ? answer : ''}
      aria-label={revealAnswer ? `Correct value: ${answer}` : `Choose a value: ${options.join(', ')}`}
    >
      {!revealAnswer ? (
        <option value="" disabled>
          Select…
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function CodeWithBlanks({ template, blanks, revealAnswer }) {
  const parts = template.split(/(\{\{\w+\}\})/g);

  return (
    <pre className="ai103-exhibit-code">
      <code>
        {parts.map((part, index) => {
          const match = part.match(/^\{\{(\w+)\}\}$/);
          if (!match) {
            return part;
          }
          const blank = blanks[match[1]];
          return (
            <OptionSelect
              key={index}
              options={blank.options}
              answer={blank.answer}
              revealAnswer={revealAnswer}
              className="ai103-code-blank"
            />
          );
        })}
      </code>
    </pre>
  );
}

const URL_SPLIT_PATTERN = /(https?:\/\/\S+)/g;
const URL_TEST_PATTERN = /^https?:\/\//;

export function ReferenceLinks({ references, headingId }) {
  if (!references?.length) {
    return null;
  }

  return (
    <section className="ai103-references" aria-labelledby={headingId}>
      <h3 id={headingId}>References</h3>
      <ul className="ai103-references-list">
        {references.map((reference, index) => (
          <li key={`reference-${index}`}>
            {reference.split(URL_SPLIT_PATTERN).map((part, partIndex) =>
              URL_TEST_PATTERN.test(part) ? (
                <a key={partIndex} href={part} target="_blank" rel="noopener noreferrer">
                  {part}
                </a>
              ) : (
                part
              ),
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HotspotFields({ fields, revealAnswer }) {
  return (
    <dl className="ai103-hotspot-fields">
      {fields.map((field) => (
        <div className="ai103-hotspot-field" key={field.label}>
          <dt>{field.label}</dt>
          <dd>
            <OptionSelect
              options={field.options}
              answer={field.answer}
              revealAnswer={revealAnswer}
              className="ai103-hotspot-blank"
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}
