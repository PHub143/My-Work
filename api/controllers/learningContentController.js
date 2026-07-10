const learningContentService = require('../services/learningContentService');

const VALID_KINDS = new Set(['english']);

function parseBoolean(value, defaultValue = true) {
  if (value === undefined) return defaultValue;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

async function getLatestSnapshot(req, res, next) {
  try {
    const kind = req.query.kind || 'english';
    if (!VALID_KINDS.has(kind)) {
      return res.status(400).json({ message: 'kind must be english.' });
    }

    const includePayload = parseBoolean(req.query.includePayload, true);
    if (includePayload === null) {
      return res.status(400).json({ message: 'includePayload must be true or false.' });
    }

    const snapshot = await learningContentService.getLatestContentSnapshot({
      kind,
      includePayload,
    });

    if (!snapshot) {
      return res.status(404).json({ message: 'No published content snapshot found.' });
    }

    return res.status(200).json({ snapshot });
  } catch (error) {
    return next(error);
  }
}

async function listSnapshots(req, res, next) {
  try {
    const kind = req.query.kind || 'english';
    if (!VALID_KINDS.has(kind)) {
      return res.status(400).json({ message: 'kind must be english.' });
    }

    const includePayload = parseBoolean(req.query.includePayload, false);
    if (includePayload === null) {
      return res.status(400).json({ message: 'includePayload must be true or false.' });
    }

    const status = req.query.status;
    if (status && !['published', 'draft', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'status must be published, draft, or archived.' });
    }

    const snapshots = await learningContentService.listContentSnapshots({
      kind,
      status,
      includePayload,
    });

    return res.status(200).json({ snapshots });
  } catch (error) {
    return next(error);
  }
}

async function getSnapshot(req, res, next) {
  try {
    const includePayload = parseBoolean(req.query.includePayload, true);
    if (includePayload === null) {
      return res.status(400).json({ message: 'includePayload must be true or false.' });
    }

    const snapshot = await learningContentService.getContentSnapshotById(req.params.id, {
      includePayload,
    });

    if (!snapshot) {
      return res.status(404).json({ message: 'Snapshot not found.' });
    }

    return res.status(200).json({ snapshot });
  } catch (error) {
    return next(error);
  }
}

async function exportSnapshot(req, res, next) {
  try {
    const snapshot = await learningContentService.getContentSnapshotById(req.params.id, {
      includePayload: true,
    });

    if (!snapshot) {
      return res.status(404).json({ message: 'Snapshot not found.' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="english-content-${snapshot.id}.json"`,
    );
    return res.status(200).send(`${JSON.stringify(snapshot.payload, null, 2)}\n`);
  } catch (error) {
    return next(error);
  }
}

async function createDraft(req, res, next) {
  try {
    const kind = req.body?.kind || 'english';
    if (!VALID_KINDS.has(kind)) {
      return res.status(400).json({ message: 'kind must be english.' });
    }

    const snapshot = await learningContentService.createDraftSnapshot({
      kind,
      baseSnapshotId: req.body?.baseSnapshotId,
    });

    return res.status(201).json({ snapshot });
  } catch (error) {
    return next(error);
  }
}

async function updateDraft(req, res, next) {
  try {
    const payload = req.body?.payload;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ message: 'payload is required.' });
    }

    const snapshot = await learningContentService.updateDraftSnapshot(req.params.id, payload);

    return res.status(200).json({ snapshot });
  } catch (error) {
    if (error.details) {
      return res.status(error.status || 400).json({
        message: error.message,
        report: error.details,
      });
    }
    return next(error);
  }
}

async function validateDraft(req, res, next) {
  try {
    const report = await learningContentService.validateDraftSnapshot(req.params.id);

    return res.status(200).json({ report });
  } catch (error) {
    return next(error);
  }
}

async function publishDraft(req, res, next) {
  try {
    const result = await learningContentService.publishDraftSnapshot(req.params.id);

    return res.status(200).json(result);
  } catch (error) {
    if (error.details) {
      return res.status(error.status || 400).json({
        message: error.message,
        report: error.details,
      });
    }
    return next(error);
  }
}

module.exports = {
  createDraft,
  exportSnapshot,
  getLatestSnapshot,
  getSnapshot,
  listSnapshots,
  publishDraft,
  updateDraft,
  validateDraft,
};
