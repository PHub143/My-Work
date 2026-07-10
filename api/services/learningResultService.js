const prisma = require('./prismaService');

const RESULT_SELECT = {
  id: true,
  kind: true,
  raw: true,
  scaled: true,
  total: true,
  duration: true,
  perPart: true,
  perTag: true,
  payload: true,
  createdAt: true,
  updatedAt: true,
};

function normalizeResult(result) {
  if (!result) return null;

  return {
    id: result.id,
    kind: result.kind,
    raw: result.raw,
    scaled: result.scaled,
    total: result.total,
    duration: result.duration,
    perPart: result.perPart,
    perTag: result.perTag,
    payload: result.payload,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

async function createLearningResult(userId, data) {
  const result = await prisma.practiceResult.create({
    data: {
      userId,
      kind: data.kind,
      raw: data.raw,
      scaled: data.scaled,
      total: data.total,
      duration: data.duration,
      perPart: data.perPart,
      perTag: data.perTag,
      payload: data.payload,
    },
    select: RESULT_SELECT,
  });

  return normalizeResult(result);
}

async function getLearningResults(userId, { kind, limit } = {}) {
  const results = await prisma.practiceResult.findMany({
    where: {
      userId,
      ...(kind ? { kind } : {}),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    select: RESULT_SELECT,
  });

  return results.map(normalizeResult);
}

module.exports = {
  createLearningResult,
  getLearningResults,
};
