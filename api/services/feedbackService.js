const prisma = require('./prismaService');

const FEEDBACK_SELECT = {
  id: true,
  message: true,
  category: true,
  status: true,
  pageUrl: true,
  adminNote: true,
  attachments: true,
  userId: true,
  submitterEmail: true,
  submitterName: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, name: true, email: true },
  },
};

function normalizeFeedback(row) {
  if (!row) return null;

  return {
    id: row.id,
    message: row.message,
    category: row.category,
    status: row.status,
    pageUrl: row.pageUrl,
    adminNote: row.adminNote,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    userId: row.userId,
    submitterEmail: row.submitterEmail,
    submitterName: row.submitterName,
    // Fall back to the snapshot fields when the author account is gone.
    author: row.user
      ? { id: row.user.id, name: row.user.name, email: row.user.email }
      : { id: null, name: row.submitterName, email: row.submitterEmail },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createFeedback(userId, data) {
  const row = await prisma.feedback.create({
    data: {
      userId: userId || null,
      message: data.message,
      category: data.category,
      pageUrl: data.pageUrl || null,
      attachments: data.attachments || [],
      submitterEmail: data.submitterEmail || null,
      submitterName: data.submitterName || null,
    },
    select: FEEDBACK_SELECT,
  });

  return normalizeFeedback(row);
}

async function listFeedback({ status, category } = {}) {
  const rows = await prisma.feedback.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: FEEDBACK_SELECT,
  });

  return rows.map(normalizeFeedback);
}

async function getFeedbackById(id) {
  const row = await prisma.feedback.findUnique({
    where: { id },
    select: FEEDBACK_SELECT,
  });

  return normalizeFeedback(row);
}

async function updateFeedback(id, data) {
  const row = await prisma.feedback.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.adminNote !== undefined ? { adminNote: data.adminNote } : {}),
    },
    select: FEEDBACK_SELECT,
  });

  return normalizeFeedback(row);
}

async function deleteFeedback(id) {
  await prisma.feedback.delete({ where: { id } });
}

module.exports = {
  createFeedback,
  listFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
};
