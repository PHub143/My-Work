const express = require('express');
const router = express.Router();
const mailAccountController = require('../controllers/mailAccountController');
const mailController = require('../controllers/mailController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Every /mail route is admin-only. Applied once at router level so a route
// added later cannot accidentally be public.
router.use(authenticateToken, isAdmin);

// Mailbox content must never be cached by browsers or proxies.
router.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
});

// Providers
router.get('/providers', mailAccountController.listProvidersHandler);

// OAuth completion (state is verified against the signed-in admin)
router.post('/oauth/callback', mailAccountController.oauthCallbackHandler);

// Accounts
router.get('/accounts', mailAccountController.listAccountsHandler);
router.post('/accounts', mailAccountController.createAccountHandler);
router.get('/accounts/:id', mailAccountController.getAccountHandler);
router.put('/accounts/:id', mailAccountController.updateAccountHandler);
router.delete('/accounts/:id', mailAccountController.deleteAccountHandler);
router.post('/accounts/:id/default', mailAccountController.setDefaultHandler);
router.post('/accounts/:id/disconnect', mailAccountController.disconnectHandler);
router.get('/accounts/:id/oauth/url', mailAccountController.getAuthUrlHandler);

// Mailbox data
router.get('/accounts/:id/folders', mailController.listFoldersHandler);
router.get('/accounts/:id/threads', mailController.listThreadsHandler);
router.post('/accounts/:id/threads/actions', mailController.applyThreadActionHandler);
router.get('/accounts/:id/threads/:threadId', mailController.getThreadHandler);
router.post('/accounts/:id/messages/actions', mailController.applyMessageActionHandler);
router.get('/accounts/:id/messages/:messageId', mailController.getMessageHandler);
router.get('/accounts/:id/messages/:messageId/attachments/:attachmentId', mailController.getAttachmentHandler);

// Drafts + send
router.get('/accounts/:id/drafts', mailController.listDraftsHandler);
router.post('/accounts/:id/drafts', mailController.createDraftHandler);
router.get('/accounts/:id/drafts/:draftId', mailController.getDraftHandler);
router.put('/accounts/:id/drafts/:draftId', mailController.updateDraftHandler);
router.delete('/accounts/:id/drafts/:draftId', mailController.deleteDraftHandler);
router.post('/accounts/:id/drafts/:draftId/send', mailController.sendDraftHandler);
router.post('/accounts/:id/send', mailController.sendHandler);

module.exports = router;
