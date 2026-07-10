const prisma = require('./prismaService');
const { createHash, randomUUID } = require('node:crypto');

const SNAPSHOT_SELECT = {
  id: true,
  kind: true,
  version: true,
  status: true,
  checksum: true,
  source: true,
  summary: true,
  payload: true,
  createdAt: true,
  updatedAt: true,
};

function normalizeSnapshot(snapshot, { includePayload = true } = {}) {
  if (!snapshot) return null;

  return {
    id: snapshot.id,
    kind: snapshot.kind,
    version: snapshot.version,
    status: snapshot.status,
    checksum: snapshot.checksum,
    source: snapshot.source,
    summary: snapshot.summary,
    ...(includePayload ? { payload: snapshot.payload } : {}),
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

function getChecksum(snapshot) {
  const stableSnapshot = {
    schemaVersion: snapshot.schemaVersion,
    source: snapshot.source,
    summary: snapshot.summary,
    reading: snapshot.reading,
    listening: snapshot.listening,
    vocab: snapshot.vocab,
  };

  return createHash('sha256')
    .update(JSON.stringify(stableSnapshot))
    .digest('hex');
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function addIssue(issues, area, message) {
  issues.push({ area, message });
}

function countReading(reading = {}, issues = []) {
  const { part5, part6, part7 } = reading.parts || {};
  const part5Questions = part5?.questions || [];
  const part6Sets = part6?.sets || [];
  const singleSets = part7?.singleSets || [];
  const multiSets = part7?.multiSets || [];

  if (!reading.parts) addIssue(issues, 'reading', 'Missing reading.parts.');
  part5Questions.forEach((question) => {
    if (!hasText(question.id)) addIssue(issues, 'reading', 'Part 5 question is missing id.');
    if (!hasText(question.prompt)) addIssue(issues, 'reading', `${question.id || 'Part 5 question'} is missing prompt.`);
    if (!hasText(question.answer)) addIssue(issues, 'reading', `${question.id || 'Part 5 question'} is missing answer.`);
  });

  return {
    part5: part5Questions.length,
    part6Sets: part6Sets.length,
    part6Questions: part6Sets.reduce((sum, set) => sum + (set.questions || []).length, 0),
    part7SingleSets: singleSets.length,
    part7SingleQuestions: singleSets.reduce((sum, set) => sum + (set.questions || []).length, 0),
    part7MultiSets: multiSets.length,
    part7MultiQuestions: multiSets.reduce((sum, set) => sum + (set.questions || []).length, 0),
  };
}

function countListening(listening = {}, issues = []) {
  const { part1, part2, part3, part4 } = listening.parts || {};
  const part1Items = part1?.items || [];
  const part2Items = part2?.items || [];
  const part3Sets = part3?.sets || [];
  const part4Sets = part4?.sets || [];
  const audioSegments = [
    ...part1Items,
    ...part2Items,
    ...part3Sets,
    ...part4Sets,
  ].reduce((sum, item) => sum + (item?.segments || []).length, 0);

  if (!listening.parts) addIssue(issues, 'listening', 'Missing listening.parts.');

  return {
    part1: part1Items.length,
    part2: part2Items.length,
    part3Sets: part3Sets.length,
    part3Questions: part3Sets.reduce((sum, set) => sum + (set.questions || []).length, 0),
    part4Sets: part4Sets.length,
    part4Questions: part4Sets.reduce((sum, set) => sum + (set.questions || []).length, 0),
    audioSegments,
  };
}

function countVocab(vocab = {}, issues = []) {
  const decks = vocab.decks || [];
  if (!Array.isArray(vocab.decks)) addIssue(issues, 'vocab', 'Missing vocab.decks.');

  return {
    decks: decks.length,
    cards: decks.reduce((sum, deck) => sum + (deck.cards || []).length, 0),
  };
}

function validateSnapshotPayload(payload) {
  const issues = [];

  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      issues: [{ area: 'payload', message: 'Payload must be an object.' }],
      summary: null,
    };
  }

  ['schemaVersion', 'source', 'reading', 'listening', 'vocab'].forEach((field) => {
    if (!Object.hasOwn(payload, field)) addIssue(issues, 'payload', `Missing ${field}.`);
  });

  const summary = {
    reading: countReading(payload.reading, issues),
    listening: countListening(payload.listening, issues),
    vocab: countVocab(payload.vocab, issues),
  };

  if (summary.reading.part5 < 30) addIssue(issues, 'reading', 'Part 5 has fewer than 30 questions.');
  if (summary.reading.part6Questions < 16) addIssue(issues, 'reading', 'Part 6 has fewer than 16 questions.');
  if (summary.reading.part7SingleQuestions + summary.reading.part7MultiQuestions < 54) {
    addIssue(issues, 'reading', 'Part 7 has fewer than 54 questions.');
  }
  if (summary.listening.part1 < 6) addIssue(issues, 'listening', 'Part 1 has fewer than 6 items.');
  if (summary.listening.part2 < 25) addIssue(issues, 'listening', 'Part 2 has fewer than 25 items.');
  if (summary.listening.part3Questions < 39) addIssue(issues, 'listening', 'Part 3 has fewer than 39 questions.');
  if (summary.listening.part4Questions < 30) addIssue(issues, 'listening', 'Part 4 has fewer than 30 questions.');
  if (summary.vocab.cards < 300) addIssue(issues, 'vocab', 'Vocabulary has fewer than 300 cards.');

  return {
    valid: issues.length === 0,
    issues,
    summary,
  };
}

async function getLatestContentSnapshot({
  kind = 'english',
  status = 'published',
  includePayload = true,
} = {}) {
  const snapshot = await prisma.contentSnapshot.findFirst({
    where: { kind, status },
    orderBy: { createdAt: 'desc' },
    select: SNAPSHOT_SELECT,
  });

  return normalizeSnapshot(snapshot, { includePayload });
}

async function listContentSnapshots({
  kind = 'english',
  status,
  includePayload = false,
  take = 25,
} = {}) {
  const snapshots = await prisma.contentSnapshot.findMany({
    where: {
      kind,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
    select: SNAPSHOT_SELECT,
  });

  return snapshots.map((snapshot) => normalizeSnapshot(snapshot, { includePayload }));
}

async function getContentSnapshotById(id, { includePayload = true } = {}) {
  const snapshot = await prisma.contentSnapshot.findUnique({
    where: { id },
    select: SNAPSHOT_SELECT,
  });

  return normalizeSnapshot(snapshot, { includePayload });
}

async function createDraftSnapshot({ kind = 'english', baseSnapshotId } = {}) {
  const baseSnapshot = baseSnapshotId
    ? await prisma.contentSnapshot.findUnique({ where: { id: baseSnapshotId }, select: SNAPSHOT_SELECT })
    : await prisma.contentSnapshot.findFirst({
      where: { kind, status: 'published' },
      orderBy: { createdAt: 'desc' },
      select: SNAPSHOT_SELECT,
    });

  if (!baseSnapshot) {
    const error = new Error('No source snapshot found for draft.');
    error.status = 404;
    throw error;
  }

  const draft = await prisma.contentSnapshot.create({
    data: {
      kind,
      version: baseSnapshot.version,
      status: 'draft',
      checksum: `draft-${randomUUID()}`,
      source: {
        ...(baseSnapshot.source || {}),
        draftFrom: baseSnapshot.id,
      },
      summary: baseSnapshot.summary,
      payload: baseSnapshot.payload,
    },
  });

  return normalizeSnapshot(draft);
}

async function updateDraftSnapshot(id, payload) {
  const current = await prisma.contentSnapshot.findUnique({
    where: { id },
    select: { id: true, status: true, kind: true },
  });

  if (!current) {
    const error = new Error('Draft snapshot not found.');
    error.status = 404;
    throw error;
  }
  if (current.status !== 'draft') {
    const error = new Error('Only draft snapshots can be edited.');
    error.status = 409;
    throw error;
  }

  const report = validateSnapshotPayload(payload);
  if (!report.valid) {
    const error = new Error('Draft content validation failed.');
    error.status = 400;
    error.details = report;
    throw error;
  }

  const updated = await prisma.contentSnapshot.update({
    where: { id },
    data: {
      version: payload.schemaVersion || 1,
      source: payload.source || {},
      summary: report.summary,
      payload: {
        ...payload,
        summary: report.summary,
      },
    },
    select: SNAPSHOT_SELECT,
  });

  return normalizeSnapshot(updated);
}

async function validateDraftSnapshot(id) {
  const snapshot = await prisma.contentSnapshot.findUnique({
    where: { id },
    select: SNAPSHOT_SELECT,
  });

  if (!snapshot) {
    const error = new Error('Snapshot not found.');
    error.status = 404;
    throw error;
  }

  return validateSnapshotPayload(snapshot.payload);
}

async function publishDraftSnapshot(id) {
  const draft = await prisma.contentSnapshot.findUnique({
    where: { id },
    select: SNAPSHOT_SELECT,
  });

  if (!draft) {
    const error = new Error('Draft snapshot not found.');
    error.status = 404;
    throw error;
  }
  if (draft.status !== 'draft') {
    const error = new Error('Only draft snapshots can be published.');
    error.status = 409;
    throw error;
  }

  const report = validateSnapshotPayload(draft.payload);
  if (!report.valid) {
    const error = new Error('Draft content validation failed.');
    error.status = 400;
    error.details = report;
    throw error;
  }

  const payload = {
    ...draft.payload,
    summary: report.summary,
  };
  const checksum = getChecksum(payload);
  const existing = await prisma.contentSnapshot.findUnique({
    where: {
      kind_checksum: {
        kind: draft.kind,
        checksum,
      },
    },
    select: SNAPSHOT_SELECT,
  });

  if (existing && existing.id !== draft.id) {
    await prisma.contentSnapshot.update({
      where: { id },
      data: { status: 'archived' },
    });
    return {
      snapshot: normalizeSnapshot(existing),
      deduped: true,
    };
  }

  const published = await prisma.contentSnapshot.update({
    where: { id },
    data: {
      status: 'published',
      checksum,
      version: payload.schemaVersion || draft.version,
      source: payload.source || draft.source,
      summary: report.summary,
      payload,
    },
    select: SNAPSHOT_SELECT,
  });

  return {
    snapshot: normalizeSnapshot(published),
    deduped: false,
  };
}

module.exports = {
  createDraftSnapshot,
  getChecksum,
  getContentSnapshotById,
  getLatestContentSnapshot,
  listContentSnapshots,
  normalizeSnapshot,
  publishDraftSnapshot,
  updateDraftSnapshot,
  validateDraftSnapshot,
  validateSnapshotPayload,
};
