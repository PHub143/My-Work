const feedbackService = require('../services/feedbackService');
const googleDriveService = require('../services/googleDriveService');
const userService = require('../services/userService');

const VALID_CATEGORIES = new Set(['bug', 'idea', 'content', 'other']);
const VALID_STATUSES = new Set(['new', 'in_progress', 'resolved', 'wont_do']);
const MESSAGE_MAX = 4000;
const NOTE_MAX = 4000;
const MAX_ATTACHMENTS = 3;
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function validateAttachments(value) {
  if (value === undefined || value === null) return { value: [] };
  if (!Array.isArray(value)) return { error: 'attachments must be an array.' };
  if (value.length > MAX_ATTACHMENTS) {
    return { error: `A maximum of ${MAX_ATTACHMENTS} attachments is allowed.` };
  }

  const normalized = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || !isNonEmptyString(item.driveFileId)) {
      return { error: 'Each attachment must include a driveFileId.' };
    }
    normalized.push({
      driveFileId: item.driveFileId,
      mimeType: typeof item.mimeType === 'string' ? item.mimeType : 'image/*',
      name: typeof item.name === 'string' ? item.name : 'attachment',
    });
  }

  return { value: normalized };
}

/**
 * Streams one image attachment to Drive and returns its reference. The
 * returned driveFileId is passed back in the feedback create payload.
 */
async function uploadAttachmentHandler(req, res, next) {
  try {
    const attachment = await googleDriveService.uploadImage(req, undefined, {
      maxBytes: ATTACHMENT_MAX_BYTES,
      subfolder: 'feedback',
    });
    return res.status(201).json({ attachment });
  } catch (error) {
    return next(error);
  }
}

async function createFeedbackHandler(req, res, next) {
  try {
    const { message, category } = req.body;

    if (!isNonEmptyString(message)) {
      return res.status(400).json({ message: 'message is required.' });
    }
    if (message.trim().length > MESSAGE_MAX) {
      return res.status(400).json({ message: `message must be ${MESSAGE_MAX} characters or fewer.` });
    }

    const resolvedCategory = category === undefined ? 'other' : category;
    if (!VALID_CATEGORIES.has(resolvedCategory)) {
      return res.status(400).json({ message: 'category must be one of bug, idea, content, or other.' });
    }

    const pageUrl = isNonEmptyString(req.body.pageUrl) ? req.body.pageUrl.trim().slice(0, 500) : null;

    const attachments = validateAttachments(req.body.attachments);
    if (attachments.error) {
      return res.status(400).json({ message: attachments.error });
    }

    const author = await userService.findUserById(req.user.id);

    const feedback = await feedbackService.createFeedback(req.user.id, {
      message: message.trim(),
      category: resolvedCategory,
      pageUrl,
      attachments: attachments.value,
      submitterEmail: author ? author.email : null,
      submitterName: author ? author.name : null,
    });

    return res.status(201).json({ feedback });
  } catch (error) {
    return next(error);
  }
}

async function listFeedbackHandler(req, res, next) {
  try {
    const { status, category } = req.query;

    if (status !== undefined && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: 'Invalid status filter.' });
    }
    if (category !== undefined && !VALID_CATEGORIES.has(category)) {
      return res.status(400).json({ message: 'Invalid category filter.' });
    }

    const feedback = await feedbackService.listFeedback({ status, category });
    return res.status(200).json({ feedback });
  } catch (error) {
    return next(error);
  }
}

async function updateFeedbackHandler(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      if (!VALID_STATUSES.has(req.body.status)) {
        return res.status(400).json({ message: 'status must be one of new, in_progress, resolved, or wont_do.' });
      }
      updateData.status = req.body.status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'adminNote')) {
      const note = req.body.adminNote;
      if (note !== null && typeof note !== 'string') {
        return res.status(400).json({ message: 'adminNote must be a string or null.' });
      }
      if (typeof note === 'string' && note.length > NOTE_MAX) {
        return res.status(400).json({ message: `adminNote must be ${NOTE_MAX} characters or fewer.` });
      }
      updateData.adminNote = note === null ? null : note;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No supported fields to update.' });
    }

    const feedback = await feedbackService.updateFeedback(id, updateData);
    return res.status(200).json({ feedback });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Feedback not found.' });
    }
    return next(error);
  }
}

async function deleteFeedbackHandler(req, res, next) {
  try {
    const { id } = req.params;

    const feedback = await feedbackService.getFeedbackById(id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' });
    }

    for (const attachment of feedback.attachments) {
      try {
        await googleDriveService.deleteFile(attachment.driveFileId);
      } catch (driveError) {
        if (driveError.status !== 404) {
          console.warn(`Failed to delete feedback attachment ${attachment.driveFileId}:`, driveError.message);
        }
      }
    }

    await feedbackService.deleteFeedback(id);
    return res.status(200).json({ message: 'Feedback deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Feedback not found.' });
    }
    return next(error);
  }
}

/**
 * Admin-only proxy that streams a feedback attachment from Drive. Direct
 * `<img src>` embeds of Drive URLs are blocked by Drive's CDN CORP header
 * (see .claude/rules/architecture.md), so the admin UI fetches through here.
 */
async function getAttachmentHandler(req, res, next) {
  try {
    const { id, driveFileId } = req.params;

    const feedback = await feedbackService.getFeedbackById(id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' });
    }

    const attachment = feedback.attachments.find((item) => item.driveFileId === driveFileId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found.' });
    }

    res.set('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.set('Cache-Control', 'private, max-age=3600');

    const stream = await googleDriveService.streamFile(driveFileId);
    stream.on('error', (error) => next(error));
    stream.pipe(res);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadAttachmentHandler,
  createFeedbackHandler,
  listFeedbackHandler,
  updateFeedbackHandler,
  deleteFeedbackHandler,
  getAttachmentHandler,
};
