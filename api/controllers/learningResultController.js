const learningResultService = require('../services/learningResultService');

const VALID_KINDS = new Set(['full', 'reading', 'listening', 'mini', 'drill']);
const MAX_LIMIT = 100;

function isPlainObject(value) {
  return value === null || (
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function parseOptionalInteger(value, field) {
  if (value === undefined || value === null || value === '') return { value: null };

  if (!Number.isInteger(value) || value < 0) {
    return { error: `${field} must be a non-negative integer.` };
  }

  return { value };
}

function parseJsonObject(value, field) {
  if (value === undefined || value === null) return { value: null };
  if (!isPlainObject(value)) {
    return { error: `${field} must be an object.` };
  }

  return { value };
}

function parseLimit(value) {
  if (value === undefined) return 20;

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    return null;
  }

  return Math.min(limit, MAX_LIMIT);
}

async function createResult(req, res, next) {
  try {
    const { kind } = req.body;
    if (!VALID_KINDS.has(kind)) {
      return res.status(400).json({ message: 'kind must be one of full, reading, listening, mini, or drill.' });
    }

    const raw = parseOptionalInteger(req.body.raw, 'raw');
    const scaled = parseOptionalInteger(req.body.scaled, 'scaled');
    const total = parseOptionalInteger(req.body.total, 'total');
    const duration = parseOptionalInteger(req.body.duration, 'duration');
    const perPart = parseJsonObject(req.body.perPart, 'perPart');
    const perTag = parseJsonObject(req.body.perTag, 'perTag');
    const payload = parseJsonObject(req.body.payload, 'payload');

    const validation = [raw, scaled, total, duration, perPart, perTag, payload].find((item) => item.error);
    if (validation) {
      return res.status(400).json({ message: validation.error });
    }

    const result = await learningResultService.createLearningResult(req.user.id, {
      kind,
      raw: raw.value,
      scaled: scaled.value,
      total: total.value,
      duration: duration.value,
      perPart: perPart.value,
      perTag: perTag.value,
      payload: payload.value,
    });

    return res.status(201).json({ result });
  } catch (error) {
    return next(error);
  }
}

async function listResults(req, res, next) {
  try {
    const { kind } = req.query;
    if (kind && !VALID_KINDS.has(kind)) {
      return res.status(400).json({ message: 'kind must be one of full, reading, listening, mini, or drill.' });
    }

    const limit = parseLimit(req.query.limit);
    if (!limit) {
      return res.status(400).json({ message: 'limit must be a positive integer.' });
    }

    const results = await learningResultService.getLearningResults(req.user.id, { kind, limit });
    return res.status(200).json({ results });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createResult,
  listResults,
};
