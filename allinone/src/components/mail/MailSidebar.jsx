import React from 'react';
import { folderRole, sortFolders } from '../../utils/mail';
import { FolderIcon, PencilIcon } from './MailIcons';
import './MailSidebar.css';

const countFor = (folder) => {
  const role = folderRole(folder);
  const n = role === 'drafts' ? folder.totalCount : folder.unreadCount;
  return Number(n) > 0 ? Number(n) : 0;
};

/**
 * Folder navigation. Collapses to icons at 768–1199px (names stay available
 * to assistive tech and via the title tooltip) and becomes a horizontal strip
 * below 768px.
 */
const MailSidebar = ({
  accounts,
  accountId,
  onAccountChange,
  folders,
  folderId,
  onSelectFolder,
  onCompose,
  composeDisabled,
  loading,
}) => {
  const sorted = sortFolders(folders);

  return (
    <aside className="mailside" aria-label="Mailbox">
      <button
        type="button"
        className="mailside-compose"
        onClick={onCompose}
        disabled={composeDisabled}
        title="Compose (c)"
      >
        <PencilIcon />
        <span className="mailside-label">Compose</span>
      </button>

      {accounts.length > 1 && (
        <label className="mailside-account">
          <span className="mailside-account-label">Account</span>
          <select value={accountId} onChange={(e) => onAccountChange(e.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.emailAddress || account.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <nav aria-label="Folders" className="mailside-nav">
        {loading && sorted.length === 0 ? (
          <ul className="mailside-list" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="mailside-skeleton" />
            ))}
          </ul>
        ) : (
          <ul className="mailside-list">
            {sorted.map((folder) => {
              const count = countFor(folder);
              const active = folder.id === folderId;
              return (
                <li key={folder.id}>
                  <button
                    type="button"
                    className={`mailside-item${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    title={folder.name}
                    onClick={() => onSelectFolder(folder.id)}
                  >
                    <FolderIcon role={folderRole(folder)} />
                    <span className="mailside-label">{folder.name}</span>
                    {count > 0 && (
                      <span className="mailside-count">
                        {count > 999 ? '999+' : count}
                        <span className="mailside-sr">
                          {folderRole(folder) === 'drafts' ? ' drafts' : ' unread'}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
};

export default MailSidebar;
