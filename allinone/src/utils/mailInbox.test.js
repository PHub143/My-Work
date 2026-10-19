import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ID_ROLE_FALLBACK,
  UNDO_INVERSE,
  draftToRow,
  failedIds,
  isGoogleAuthUrl,
  partialFailureText,
  removesFromView,
} from './mailInbox.js';

test('archive leaves the inbox view but not other folders', () => {
  assert.equal(removesFromView('archive', 'inbox'), true);
  assert.equal(removesFromView('archive', 'all'), false);
  assert.equal(removesFromView('archive', 'starred'), false);
});

test('trash and delete-forever always remove the row', () => {
  for (const role of ['inbox', 'sent', 'all', 'spam', 'trash', 'starred']) {
    assert.equal(removesFromView('trash', role), true);
    assert.equal(removesFromView('deleteForever', role), true);
  }
});

test('untrash only removes rows from the trash view; moveToInbox only from spam', () => {
  assert.equal(removesFromView('untrash', 'trash'), true);
  assert.equal(removesFromView('untrash', 'inbox'), false);
  assert.equal(removesFromView('moveToInbox', 'spam'), true);
  assert.equal(removesFromView('moveToInbox', 'inbox'), false);
});

test('unstar removes rows only from the starred view; read-state actions never remove', () => {
  assert.equal(removesFromView('unstar', 'starred'), true);
  assert.equal(removesFromView('unstar', 'inbox'), false);
  for (const action of ['markRead', 'markUnread', 'star']) {
    assert.equal(removesFromView(action, 'inbox'), false);
  }
});

test('undo maps archive and trash to their inverses and nothing else', () => {
  assert.deepEqual(UNDO_INVERSE, { archive: 'moveToInbox', trash: 'untrash' });
  assert.equal(UNDO_INVERSE.deleteForever, undefined);
});

test('system label ids map to roles', () => {
  assert.equal(ID_ROLE_FALLBACK.INBOX, 'inbox');
  assert.equal(ID_ROLE_FALLBACK.DRAFT, 'drafts');
  assert.equal(ID_ROLE_FALLBACK.TRASH, 'trash');
});

test('draftToRow shapes an API draft like a list row', () => {
  const row = draftToRow({
    draftId: 'r1',
    message: {
      id: 'm1',
      subject: 'Hello',
      snippet: 'snip',
      to: [{ name: 'A', email: 'a@x.co' }],
      date: '2026-10-14T00:00:00.000Z',
      attachments: [{ id: 'a' }],
      labelIds: ['DRAFT'],
    },
  });
  assert.equal(row.id, 'r1');
  assert.equal(row.isDraft, true);
  assert.equal(row.draftId, 'r1');
  assert.equal(row.subject, 'Hello');
  assert.deepEqual(row.participants, [{ name: 'A', email: 'a@x.co' }]);
  assert.equal(row.hasAttachments, true);
  assert.equal(row.unread, false);
});

test('draftToRow tolerates a sparse draft', () => {
  const row = draftToRow({ id: 'd2' });
  assert.equal(row.id, 'd2');
  assert.deepEqual(row.participants, []);
  assert.equal(row.subject, '');
  assert.equal(row.hasAttachments, false);
});

test('failedIds only returns string ids and never throws on odd input', () => {
  assert.deepEqual(failedIds({ updated: 1, failed: ['a', 'b'] }), ['a', 'b']);
  assert.deepEqual(failedIds({ failed: ['a', 5, null] }), ['a']);
  assert.deepEqual(failedIds({ failed: 'a' }), []);
  assert.deepEqual(failedIds({}), []);
  assert.deepEqual(failedIds(undefined), []);
});

test('partialFailureText pluralises', () => {
  assert.equal(partialFailureText(1, 1), '1 of 1 conversation could not be updated.');
  assert.equal(partialFailureText(2, 5), '2 of 5 conversations could not be updated.');
});

test('only https://accounts.google.com URLs are followed', () => {
  assert.equal(isGoogleAuthUrl('https://accounts.google.com/o/oauth2/v2/auth?client_id=1&state=2'), true);
  assert.equal(isGoogleAuthUrl('http://accounts.google.com/o/oauth2/v2/auth'), false);
  assert.equal(isGoogleAuthUrl('https://accounts.google.com.evil.example/auth'), false);
  assert.equal(isGoogleAuthUrl('https://evil.example/?u=https://accounts.google.com'), false);
  assert.equal(isGoogleAuthUrl('https://user:pw@accounts.google.com/auth'), false);
  assert.equal(isGoogleAuthUrl('javascript:alert(1)'), false);
  assert.equal(isGoogleAuthUrl(''), false);
  assert.equal(isGoogleAuthUrl(undefined), false);
});
