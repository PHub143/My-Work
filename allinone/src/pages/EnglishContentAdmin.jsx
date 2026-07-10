import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './EnglishContentAdmin.css';
import { useAuth } from '../AuthContext.jsx';
import { useEnglishContent } from '../utils/englishContent.js';
import {
  createContentDraft,
  exportContentSnapshot,
  getContentSnapshot,
  listContentSnapshots,
  publishContentDraft,
  updateContentDraft,
  validateContentDraft,
} from '../utils/englishContentAdminApi.js';
import {
  createContentInventory,
  filterContentInventory,
  getInventoryFacets,
  getInventorySummary,
} from '../utils/englishContentAdmin.js';

const bankLabels = {
  all: 'All banks',
  reading: 'Reading',
  listening: 'Listening',
  vocab: 'Vocabulary',
};

function optionRows(options = {}) {
  return Object.entries(options).map(([key, value]) => ({ key, value }));
}

function QuestionPreview({ question }) {
  if (!question) return null;

  return (
    <div className="content-admin-question">
      <div className="content-admin-question-head">
        <strong>{question.id}</strong>
        {question.blank && <span>Blank {question.blank}</span>}
      </div>
      <p>{question.prompt}</p>
      {optionRows(question.options).length > 0 && (
        <ul className="content-admin-options">
          {optionRows(question.options).map((option) => (
            <li key={option.key} className={option.key === question.answer ? 'correct' : ''}>
              <span>{option.key}</span>
              {option.value}
            </li>
          ))}
        </ul>
      )}
      <div className="content-admin-answer">
        <strong>Answer:</strong> {question.answer}
      </div>
      {question.explanation && <p className="content-admin-explanation">{question.explanation}</p>}
    </div>
  );
}

function PassagePreview({ passages = [] }) {
  if (!passages.length) return null;

  return (
    <div className="content-admin-preview-section">
      <h3>Passages</h3>
      {passages.map((passage, index) => (
        <article key={`${passage.type}-${index}`} className="content-admin-passage">
          <span>{passage.type || `Passage ${index + 1}`}</span>
          <p>{passage.text}</p>
        </article>
      ))}
    </div>
  );
}

function TranscriptPreview({ segments = [] }) {
  if (!segments.length) return null;

  return (
    <div className="content-admin-preview-section">
      <h3>Transcript</h3>
      <div className="content-admin-transcript">
        {segments.map((segment) => (
          <p key={segment.id}>
            <strong>{segment.voice}</strong>
            {segment.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function VocabularyPreview({ data }) {
  return (
    <div className="content-admin-vocab-preview">
      <dl>
        <div>
          <dt>Word</dt>
          <dd>{data.word}</dd>
        </div>
        <div>
          <dt>Deck</dt>
          <dd>{data.deckLabel}</dd>
        </div>
        <div>
          <dt>Part of speech</dt>
          <dd>{data.partOfSpeech}</dd>
        </div>
        <div>
          <dt>Vietnamese</dt>
          <dd>{data.vi}</dd>
        </div>
      </dl>
      <div className="content-admin-preview-section">
        <h3>Definition</h3>
        <p>{data.definition}</p>
      </div>
      <div className="content-admin-preview-section">
        <h3>Example</h3>
        <p>{data.example}</p>
      </div>
    </div>
  );
}

function ItemPreview({ item }) {
  if (!item) {
    return (
      <div className="content-admin-empty-preview">
        Select an item to inspect its source content.
      </div>
    );
  }

  const { data } = item;
  const isSingleQuestion = item.part === 'Part 5';
  const passageText = data.passage ? [{ type: data.passageType || item.type, text: data.passage }] : [];
  const passages = data.passages || passageText;
  const questions = isSingleQuestion ? [data] : data.questions || [];

  return (
    <article className="content-admin-preview">
      <div className="content-admin-preview-top">
        <div>
          <span className={`content-admin-bank ${item.bank}`}>{bankLabels[item.bank]}</span>
          <h2>{item.id}</h2>
        </div>
        <span>{item.part}</span>
      </div>

      <p className="content-admin-preview-title">{item.title}</p>

      {item.bank === 'vocab' ? (
        <VocabularyPreview data={data} />
      ) : (
        <>
          {data.image && (
            <div className="content-admin-preview-section">
              <h3>Image reference</h3>
              <p>{data.image}</p>
            </div>
          )}
          <PassagePreview passages={passages} />
          <TranscriptPreview segments={data.segments} />
          {questions.length > 0 && (
            <div className="content-admin-preview-section">
              <h3>Questions</h3>
              {questions.map((question) => (
                <QuestionPreview key={question.id} question={question} />
              ))}
            </div>
          )}
          {data.answer && (
            <div className="content-admin-answer">
              <strong>Answer:</strong> {data.answer}
            </div>
          )}
          {data.explanation && <p className="content-admin-explanation">{data.explanation}</p>}
        </>
      )}

      {item.tags.length > 0 && (
        <div className="content-admin-tags" aria-label="Content tags">
          {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      )}
    </article>
  );
}

const defaultFilters = {
  bank: 'all',
  part: 'all',
  tag: 'all',
  query: '',
};

function getSnapshotSourceLabel(activeSnapshot, content) {
  if (activeSnapshot) return `${activeSnapshot.status} snapshot`;
  return content.source === 'api' ? 'Database snapshot' : 'Bundled fallback';
}

function updatePart5Question(payload, questionId, updater) {
  const questions = payload.reading?.parts?.part5?.questions || [];
  const questionIndex = questions.findIndex((question) => question.id === questionId);
  if (questionIndex < 0) return payload;

  return {
    ...payload,
    reading: {
      ...payload.reading,
      parts: {
        ...payload.reading.parts,
        part5: {
          ...payload.reading.parts.part5,
          questions: questions.map((question, index) => (
            index === questionIndex ? updater(question) : question
          )),
        },
      },
    },
  };
}

function updateVocabCard(payload, cardId, updater) {
  const decks = payload.vocab?.decks || [];

  return {
    ...payload,
    vocab: {
      ...payload.vocab,
      decks: decks.map((deck) => ({
        ...deck,
        cards: (deck.cards || []).map((card) => (
          card.id === cardId ? updater(card, deck) : card
        )),
      })),
    },
  };
}

function updateReadingSet(payload, setId, updater) {
  const part6Sets = payload.reading?.parts?.part6?.sets || [];
  const singleSets = payload.reading?.parts?.part7?.singleSets || [];
  const multiSets = payload.reading?.parts?.part7?.multiSets || [];

  return {
    ...payload,
    reading: {
      ...payload.reading,
      parts: {
        ...payload.reading.parts,
        part6: {
          ...payload.reading.parts.part6,
          sets: part6Sets.map((set) => (set.id === setId ? updater(set) : set)),
        },
        part7: {
          ...payload.reading.parts.part7,
          singleSets: singleSets.map((set) => (set.id === setId ? updater(set) : set)),
          multiSets: multiSets.map((set) => (set.id === setId ? updater(set) : set)),
        },
      },
    },
  };
}

function updateListeningItem(payload, itemId, updater) {
  const { part1, part2, part3, part4 } = payload.listening?.parts || {};

  return {
    ...payload,
    listening: {
      ...payload.listening,
      parts: {
        ...payload.listening.parts,
        part1: {
          ...part1,
          items: (part1?.items || []).map((item) => (item.id === itemId ? updater(item) : item)),
        },
        part2: {
          ...part2,
          items: (part2?.items || []).map((item) => (item.id === itemId ? updater(item) : item)),
        },
        part3: {
          ...part3,
          sets: (part3?.sets || []).map((set) => (set.id === itemId ? updater(set) : set)),
        },
        part4: {
          ...part4,
          sets: (part4?.sets || []).map((set) => (set.id === itemId ? updater(set) : set)),
        },
      },
    },
  };
}

function updateQuestionInList(questions = [], questionId, updater) {
  return questions.map((question) => (question.id === questionId ? updater(question) : question));
}

function QuestionFields({ question, optionKeys, onChange }) {
  return (
    <div className="content-admin-subform">
      <div className="content-admin-field-editor-head">
        <strong>{question.id}</strong>
        {question.blank && <span>Blank {question.blank}</span>}
      </div>
      <label>
        Prompt
        <textarea
          value={question.prompt || ''}
          onChange={(event) => onChange(question.id, (current) => ({
            ...current,
            prompt: event.target.value,
          }))}
        />
      </label>
      <div className="content-admin-option-grid">
        {optionKeys.map((key) => (
          <label key={key}>
            Option {key}
            <input
              value={question.options?.[key] || ''}
              onChange={(event) => onChange(question.id, (current) => ({
                ...current,
                options: { ...current.options, [key]: event.target.value },
              }))}
            />
          </label>
        ))}
      </div>
      <div className="content-admin-option-grid compact">
        <label>
          Answer
          <select
            value={question.answer || optionKeys[0]}
            onChange={(event) => onChange(question.id, (current) => ({
              ...current,
              answer: event.target.value,
            }))}
          >
            {optionKeys.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <label>
          Tags
          <input
            value={(question.tags || []).join(', ')}
            onChange={(event) => onChange(question.id, (current) => ({
              ...current,
              tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
            }))}
          />
        </label>
      </div>
      <label>
        Explanation
        <textarea
          value={question.explanation || ''}
          onChange={(event) => onChange(question.id, (current) => ({
            ...current,
            explanation: event.target.value,
          }))}
        />
      </label>
    </div>
  );
}

function FieldEditor({ item, activeSnapshot, draftPayload, imageOptions, onDraftPayloadChange }) {
  if (activeSnapshot?.status !== 'draft') {
    return (
      <div className="content-admin-field-editor muted">
        Select or create a draft to edit fields.
      </div>
    );
  }

  if (!item) {
    return (
      <div className="content-admin-field-editor muted">
        Select a Part 5 question or vocabulary card to edit.
      </div>
    );
  }

  if (item.part === 'Part 5') {
    const question = item.data;
    const updateQuestion = (updater) => {
      onDraftPayloadChange(updatePart5Question(draftPayload, question.id, updater));
    };

    return (
      <div className="content-admin-field-editor">
        <div className="content-admin-field-editor-head">
          <strong>Part 5 field editor</strong>
          <span>{question.id}</span>
        </div>
        <label>
          Prompt
          <textarea
            value={question.prompt}
            onChange={(event) => updateQuestion((current) => ({
              ...current,
              prompt: event.target.value,
            }))}
          />
        </label>
        <div className="content-admin-option-grid">
          {['A', 'B', 'C', 'D'].map((key) => (
            <label key={key}>
              Option {key}
              <input
                value={question.options?.[key] || ''}
                onChange={(event) => updateQuestion((current) => ({
                  ...current,
                  options: { ...current.options, [key]: event.target.value },
                }))}
              />
            </label>
          ))}
        </div>
        <div className="content-admin-option-grid compact">
          <label>
            Answer
            <select
              value={question.answer}
              onChange={(event) => updateQuestion((current) => ({
                ...current,
                answer: event.target.value,
              }))}
            >
              {['A', 'B', 'C', 'D'].map((key) => <option key={key} value={key}>{key}</option>)}
            </select>
          </label>
          <label>
            Tags
            <input
              value={(question.tags || []).join(', ')}
              onChange={(event) => updateQuestion((current) => ({
                ...current,
                tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
              }))}
            />
          </label>
        </div>
        <label>
          Explanation
          <textarea
            value={question.explanation || ''}
            onChange={(event) => updateQuestion((current) => ({
              ...current,
              explanation: event.target.value,
            }))}
          />
        </label>
      </div>
    );
  }

  if (item.bank === 'vocab') {
    const card = item.data;
    const updateCard = (field, value) => {
      onDraftPayloadChange(updateVocabCard(draftPayload, card.id, (current) => ({
        ...current,
        [field]: value,
      })));
    };

    return (
      <div className="content-admin-field-editor">
        <div className="content-admin-field-editor-head">
          <strong>Vocabulary field editor</strong>
          <span>{card.id}</span>
        </div>
        <div className="content-admin-option-grid">
          <label>
            Word
            <input value={card.word} onChange={(event) => updateCard('word', event.target.value)} />
          </label>
          <label>
            Part of speech
            <input value={card.partOfSpeech} onChange={(event) => updateCard('partOfSpeech', event.target.value)} />
          </label>
        </div>
        <label>
          Definition
          <textarea value={card.definition} onChange={(event) => updateCard('definition', event.target.value)} />
        </label>
        <label>
          Example
          <textarea value={card.example} onChange={(event) => updateCard('example', event.target.value)} />
        </label>
        <label>
          Vietnamese
          <input value={card.vi} onChange={(event) => updateCard('vi', event.target.value)} />
        </label>
      </div>
    );
  }

  if (item.bank === 'reading' && item.part !== 'Part 5') {
    const set = item.data;
    const isPart6 = item.part === 'Part 6';
    const updateSet = (updater) => {
      onDraftPayloadChange(updateReadingSet(draftPayload, set.id, updater));
    };
    const updateQuestion = (questionId, updater) => {
      updateSet((current) => ({
        ...current,
        questions: updateQuestionInList(current.questions, questionId, updater),
      }));
    };

    return (
      <div className="content-admin-field-editor">
        <div className="content-admin-field-editor-head">
          <strong>{item.part} set editor</strong>
          <span>{set.id}</span>
        </div>
        {isPart6 ? (
          <>
            <label>
              Passage type
              <input
                value={set.passageType || ''}
                onChange={(event) => updateSet((current) => ({
                  ...current,
                  passageType: event.target.value,
                }))}
              />
            </label>
            <label>
              Passage
              <textarea
                value={set.passage || ''}
                onChange={(event) => updateSet((current) => ({
                  ...current,
                  passage: event.target.value,
                }))}
              />
            </label>
          </>
        ) : (
          (set.passages || []).map((passage, index) => (
            <div key={`${set.id}-passage-${index}`} className="content-admin-subform">
              <div className="content-admin-field-editor-head">
                <strong>Passage {index + 1}</strong>
                <span>{passage.type}</span>
              </div>
              <label>
                Passage type
                <input
                  value={passage.type || ''}
                  onChange={(event) => updateSet((current) => ({
                    ...current,
                    passages: current.passages.map((currentPassage, currentIndex) => (
                      currentIndex === index ? { ...currentPassage, type: event.target.value } : currentPassage
                    )),
                  }))}
                />
              </label>
              <label>
                Passage text
                <textarea
                  value={passage.text || ''}
                  onChange={(event) => updateSet((current) => ({
                    ...current,
                    passages: current.passages.map((currentPassage, currentIndex) => (
                      currentIndex === index ? { ...currentPassage, text: event.target.value } : currentPassage
                    )),
                  }))}
                />
              </label>
            </div>
          ))
        )}
        {(set.questions || []).map((question) => (
          <QuestionFields
            key={question.id}
            question={question}
            optionKeys={['A', 'B', 'C', 'D']}
            onChange={updateQuestion}
          />
        ))}
      </div>
    );
  }

  if (item.bank === 'listening') {
    const listeningItem = item.data;
    const optionKeys = item.part === 'Part 2' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
    const updateItem = (updater) => {
      onDraftPayloadChange(updateListeningItem(draftPayload, listeningItem.id, updater));
    };
    const updateQuestion = (questionId, updater) => {
      updateItem((current) => ({
        ...current,
        questions: updateQuestionInList(current.questions, questionId, updater),
      }));
    };

    return (
      <div className="content-admin-field-editor">
        <div className="content-admin-field-editor-head">
          <strong>{item.part} listening editor</strong>
          <span>{listeningItem.id}</span>
        </div>
        {item.part === 'Part 1' && (
          <label>
            Photo reference
            <select
              value={listeningItem.image || ''}
              onChange={(event) => updateItem((current) => ({
                ...current,
                image: event.target.value,
              }))}
            >
              {imageOptions.map((image) => <option key={image} value={image}>{image}</option>)}
            </select>
          </label>
        )}
        {['Part 1', 'Part 2'].includes(item.part) && (
          <div className="content-admin-option-grid compact">
            <label>
              Answer
              <select
                value={listeningItem.answer || optionKeys[0]}
                onChange={(event) => updateItem((current) => ({
                  ...current,
                  answer: event.target.value,
                }))}
              >
                {optionKeys.map((key) => <option key={key} value={key}>{key}</option>)}
              </select>
            </label>
            <label>
              Tags
              <input
                value={(listeningItem.tags || []).join(', ')}
                onChange={(event) => updateItem((current) => ({
                  ...current,
                  tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
                }))}
              />
            </label>
          </div>
        )}
        {(listeningItem.segments || []).map((segment, index) => (
          <div key={segment.id} className="content-admin-subform">
            <div className="content-admin-field-editor-head">
              <strong>Audio segment {index + 1}</strong>
              <span>{segment.id}</span>
            </div>
            <div className="content-admin-option-grid compact">
              <label>
                Voice
                <input
                  value={segment.voice || ''}
                  onChange={(event) => updateItem((current) => ({
                    ...current,
                    segments: current.segments.map((currentSegment) => (
                      currentSegment.id === segment.id ? { ...currentSegment, voice: event.target.value } : currentSegment
                    )),
                  }))}
                />
              </label>
              <label>
                Audio reference
                <input value={`${segment.id}.m4a`} readOnly />
              </label>
            </div>
            <label>
              Transcript
              <textarea
                value={segment.text || ''}
                onChange={(event) => updateItem((current) => ({
                  ...current,
                  segments: current.segments.map((currentSegment) => (
                    currentSegment.id === segment.id ? { ...currentSegment, text: event.target.value } : currentSegment
                  )),
                }))}
              />
            </label>
          </div>
        ))}
        {(listeningItem.questions || []).map((question) => (
          <QuestionFields
            key={question.id}
            question={question}
            optionKeys={['A', 'B', 'C', 'D']}
            onChange={updateQuestion}
          />
        ))}
        {listeningItem.explanation !== undefined && (
          <label>
            Explanation
            <textarea
              value={listeningItem.explanation || ''}
              onChange={(event) => updateItem((current) => ({
                ...current,
                explanation: event.target.value,
              }))}
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="content-admin-field-editor muted">
      Field editing for this item type is still handled in JSON.
    </div>
  );
}

const EnglishContentAdmin = () => {
  const bundledOrPublishedContent = useEnglishContent();
  const { token } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedId, setSelectedId] = useState(null);
  const [snapshotStatus, setSnapshotStatus] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [activeSnapshot, setActiveSnapshot] = useState(null);
  const [editorText, setEditorText] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState(null);
  const [validationReport, setValidationReport] = useState(null);

  const content = useMemo(() => {
    if (!activeSnapshot?.payload) return bundledOrPublishedContent;
    return {
      readingContent: activeSnapshot.payload.reading,
      listeningContent: activeSnapshot.payload.listening,
      vocabDecks: activeSnapshot.payload.vocab,
      source: activeSnapshot.status,
      checksum: activeSnapshot.checksum,
      summary: activeSnapshot.summary,
    };
  }, [activeSnapshot, bundledOrPublishedContent]);

  const inventory = useMemo(() => createContentInventory(content), [content]);
  const summary = useMemo(() => getInventorySummary(inventory), [inventory]);
  const facets = useMemo(() => getInventoryFacets(inventory), [inventory]);
  const filteredItems = useMemo(
    () => filterContentInventory(inventory, filters),
    [filters, inventory],
  );
  const selectedItem = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;
  const imageOptions = useMemo(() => (
    (content.listeningContent?.parts?.part1?.items || [])
      .map((item) => item.image)
      .filter(Boolean)
  ), [content]);

  const refreshSnapshots = useCallback(async () => {
    if (!token) return;
    const data = await listContentSnapshots({ token, status: snapshotStatus });
    setSnapshots(data.snapshots || []);
  }, [snapshotStatus, token]);

  useEffect(() => {
    refreshSnapshots().catch((error) => {
      setAdminMessage({ type: 'error', text: error.message });
    });
  }, [refreshSnapshots]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const loadSnapshot = async (id) => {
    if (!id) {
      setActiveSnapshot(null);
      setEditorText('');
      setValidationReport(null);
      return;
    }

    setIsBusy(true);
    setAdminMessage(null);
    try {
      const data = await getContentSnapshot({ token, id });
      setActiveSnapshot(data.snapshot);
      setEditorText(JSON.stringify(data.snapshot.payload, null, 2));
      setValidationReport(null);
    } catch (error) {
      setAdminMessage({ type: 'error', text: error.message });
    } finally {
      setIsBusy(false);
    }
  };

  const applyDraftPayload = (payload) => {
    setActiveSnapshot((current) => (
      current ? { ...current, payload, summary: payload.summary || current.summary } : current
    ));
    setEditorText(JSON.stringify(payload, null, 2));
    setValidationReport(null);
    setAdminMessage({ type: 'success', text: 'Draft fields updated. Save the draft to persist.' });
  };

  const handleCreateDraft = async () => {
    setIsBusy(true);
    setAdminMessage(null);
    try {
      const data = await createContentDraft({ token, baseSnapshotId: activeSnapshot?.id });
      setSnapshotStatus('draft');
      setActiveSnapshot(data.snapshot);
      setEditorText(JSON.stringify(data.snapshot.payload, null, 2));
      setValidationReport(null);
      setAdminMessage({ type: 'success', text: `Draft ${data.snapshot.id} created.` });
      await refreshSnapshots();
    } catch (error) {
      setAdminMessage({ type: 'error', text: error.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!activeSnapshot || activeSnapshot.status !== 'draft') return;

    setIsBusy(true);
    setAdminMessage(null);
    try {
      const payload = JSON.parse(editorText);
      const data = await updateContentDraft({ token, id: activeSnapshot.id, payload });
      setActiveSnapshot(data.snapshot);
      setEditorText(JSON.stringify(data.snapshot.payload, null, 2));
      setValidationReport(null);
      setAdminMessage({ type: 'success', text: 'Draft saved.' });
      await refreshSnapshots();
    } catch (error) {
      const report = error.data?.report;
      setValidationReport(report || null);
      setAdminMessage({ type: 'error', text: error.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleValidateDraft = async () => {
    if (!activeSnapshot) return;

    setIsBusy(true);
    setAdminMessage(null);
    try {
      const data = await validateContentDraft({ token, id: activeSnapshot.id });
      setValidationReport(data.report);
      setAdminMessage({
        type: data.report.valid ? 'success' : 'error',
        text: data.report.valid ? 'Validation passed.' : 'Validation found issues.',
      });
    } catch (error) {
      setAdminMessage({ type: 'error', text: error.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!activeSnapshot || activeSnapshot.status !== 'draft') return;

    setIsBusy(true);
    setAdminMessage(null);
    try {
      const data = await publishContentDraft({ token, id: activeSnapshot.id });
      setActiveSnapshot(data.snapshot);
      setEditorText(JSON.stringify(data.snapshot.payload, null, 2));
      setValidationReport(null);
      setSnapshotStatus('');
      setAdminMessage({
        type: 'success',
        text: data.deduped ? 'Identical published snapshot already exists.' : 'Draft published.',
      });
      await refreshSnapshots();
    } catch (error) {
      const report = error.data?.report;
      setValidationReport(report || null);
      setAdminMessage({ type: 'error', text: error.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportSnapshot = async () => {
    if (!activeSnapshot) return;

    setIsBusy(true);
    setAdminMessage(null);
    try {
      const text = await exportContentSnapshot({ token, id: activeSnapshot.id });
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `english-content-${activeSnapshot.id}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setAdminMessage({ type: 'success', text: 'Snapshot export downloaded.' });
    } catch (error) {
      setAdminMessage({ type: 'error', text: error.message });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="content-admin-page">
      <header className="content-admin-header">
        <div>
          <span className="content-admin-kicker">English content operations</span>
          <h1>Content inventory</h1>
          <p>
            Review the active reading, listening, and vocabulary banks before publishing
            learner-facing updates.
          </p>
        </div>
        <div className="content-admin-status">
          <span>{getSnapshotSourceLabel(activeSnapshot, content)}</span>
          <strong>{content.checksum ? content.checksum.slice(0, 12) : 'local bundle'}</strong>
        </div>
      </header>

      <section className="content-admin-metrics" aria-label="Inventory summary">
        <div>
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>Reading</span>
          <strong>{summary.reading}</strong>
        </div>
        <div>
          <span>Listening</span>
          <strong>{summary.listening}</strong>
        </div>
        <div>
          <span>Vocabulary</span>
          <strong>{summary.vocab}</strong>
        </div>
      </section>

      <section className="content-admin-snapshots" aria-label="Snapshot workflow">
        <div className="content-admin-snapshot-controls">
          <label>
            Publish status
            <select value={snapshotStatus} onChange={(event) => setSnapshotStatus(event.target.value)}>
              <option value="">All snapshots</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label>
            Snapshot
            <select
              value={activeSnapshot?.id || ''}
              onChange={(event) => loadSnapshot(event.target.value)}
              disabled={isBusy}
            >
              <option value="">Latest learner snapshot</option>
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.status} · {snapshot.id} · {snapshot.checksum.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <div className="content-admin-actions">
            <button type="button" onClick={handleCreateDraft} disabled={isBusy}>Create draft</button>
            <button type="button" onClick={handleExportSnapshot} disabled={isBusy || !activeSnapshot}>Export</button>
            <button
              type="button"
              onClick={handleValidateDraft}
              disabled={isBusy || activeSnapshot?.status !== 'draft'}
            >
              Validate
            </button>
            <button
              type="button"
              className="primary"
              onClick={handlePublishDraft}
              disabled={isBusy || activeSnapshot?.status !== 'draft'}
            >
              Publish
            </button>
          </div>
        </div>

        {adminMessage && (
          <div className={`content-admin-message ${adminMessage.type}`}>
            {adminMessage.text}
          </div>
        )}

        {activeSnapshot?.status === 'draft' && (
          <div className="content-admin-editor">
            <div className="content-admin-editor-head">
              <strong>Draft JSON editor</strong>
              <button type="button" onClick={handleSaveDraft} disabled={isBusy}>Save draft</button>
            </div>
            <textarea
              value={editorText}
              onChange={(event) => setEditorText(event.target.value)}
              spellCheck="false"
            />
          </div>
        )}

        {validationReport && (
          <div className={`content-admin-validation ${validationReport.valid ? 'success' : 'error'}`}>
            <strong>{validationReport.valid ? 'Validation passed' : `${validationReport.issues.length} validation issue(s)`}</strong>
            {validationReport.issues.length > 0 && (
              <ul>
                {validationReport.issues.slice(0, 12).map((issue, index) => (
                  <li key={`${issue.area}-${index}`}>
                    <span>{issue.area}</span>
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="content-admin-toolbar" aria-label="Content filters">
        <label>
          Search
          <input
            type="search"
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
            placeholder="Question, answer, tag, transcript"
          />
        </label>
        <label>
          Bank
          <select value={filters.bank} onChange={(event) => updateFilter('bank', event.target.value)}>
            <option value="all">All banks</option>
            {facets.banks.map((bank) => (
              <option key={bank} value={bank}>{bankLabels[bank] || bank}</option>
            ))}
          </select>
        </label>
        <label>
          Part or deck
          <select value={filters.part} onChange={(event) => updateFilter('part', event.target.value)}>
            <option value="all">All parts</option>
            {facets.parts.map((part) => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
        </label>
        <label>
          Tag
          <select value={filters.tag} onChange={(event) => updateFilter('tag', event.target.value)}>
            <option value="all">All tags</option>
            {facets.tags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setFilters(defaultFilters)}>
          Reset
        </button>
      </section>

      <div className="content-admin-workspace">
        <section className="content-admin-list" aria-label="Content items">
          <div className="content-admin-list-head">
            <strong>{filteredItems.length} items</strong>
            <span>{selectedItem?.id || 'No selection'}</span>
          </div>
          <div className="content-admin-list-scroll">
            {filteredItems.map((item) => (
              <button
                key={`${item.bank}-${item.id}`}
                type="button"
                className={item.id === selectedItem?.id ? 'active' : ''}
                onClick={() => setSelectedId(item.id)}
              >
                <span className={`content-admin-bank ${item.bank}`}>{bankLabels[item.bank]}</span>
                <strong>{item.id}</strong>
                <em>{item.title}</em>
                <small>{item.part} · {item.type} · {item.countLabel}</small>
              </button>
            ))}
          </div>
        </section>

        <div className="content-admin-detail-stack">
          <FieldEditor
            item={selectedItem}
            activeSnapshot={activeSnapshot}
            draftPayload={activeSnapshot?.payload}
            imageOptions={imageOptions}
            onDraftPayloadChange={applyDraftPayload}
          />
          <ItemPreview item={selectedItem} />
        </div>
      </div>
    </div>
  );
};

export default EnglishContentAdmin;
