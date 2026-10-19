import React, { useEffect, useRef, useState } from 'react';
import {
  ArchiveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  InboxIcon,
  MailIcon,
  MailOpenIcon,
  RefreshIcon,
  RestoreIcon,
  SearchIcon,
  StarIcon,
  TrashIcon,
} from './MailIcons';
import './MailToolbar.css';

const SearchBox = ({ initialValue, onSearch, inputRef, disabled }) => {
  const [value, setValue] = useState(initialValue);
  return (
    <form
      className="mailtool-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
    >
      <SearchIcon />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search mail (from:ada is:unread has:attachment)"
        aria-label="Search mail. Gmail search syntax is supported."
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
      />
      {initialValue && (
        <button
          type="button"
          className="mailtool-icon mailtool-search-clear"
          aria-label="Clear search"
          onClick={() => {
            setValue('');
            onSearch('');
          }}
        >
          <CloseIcon size={16} />
        </button>
      )}
    </form>
  );
};

const ToolButton = ({ label, onClick, disabled, children, pressed }) => (
  <button
    type="button"
    className="mailtool-icon"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    aria-pressed={pressed}
  >
    {children}
  </button>
);

/**
 * Search, select-all, bulk actions, refresh and the Newer/Older pager.
 * `actions` is the object from actionsForRole(); `canDeleteForever` is
 * account.capabilities.permanentDelete.
 */
const MailToolbar = ({
  q,
  onSearch,
  searchRef,
  selectionCount,
  total,
  onToggleAll,
  actions,
  canDeleteForever,
  allStarred,
  onAction,
  onRefresh,
  refreshing,
  range,
  canNewer,
  canOlder,
  onNewer,
  onOlder,
  disabled,
}) => {
  const checkboxRef = useRef(null);
  const allSelected = total > 0 && selectionCount === total;
  const someSelected = selectionCount > 0 && !allSelected;
  const hasSelection = selectionCount > 0;

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <div className="mailtool" role="group" aria-label="Mail actions">
      {/* key={q}: the box re-seeds whenever the URL's query changes */}
      <SearchBox key={q} initialValue={q} onSearch={onSearch} inputRef={searchRef} disabled={disabled} />

      <div className="mailtool-row">
        <label className="mailtool-check" title="Select all (x selects one)">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            disabled={disabled || total === 0}
          />
          <span className="mailtool-check-label">
            {hasSelection ? `${selectionCount} selected` : 'Select all'}
          </span>
        </label>

        <div className="mailtool-group">
          {actions.archive && (
            <ToolButton label="Archive (e)" onClick={() => onAction('archive')} disabled={!hasSelection}>
              <ArchiveIcon />
            </ToolButton>
          )}
          {actions.notSpam && (
            <ToolButton label="Not spam: move to Inbox" onClick={() => onAction('moveToInbox')} disabled={!hasSelection}>
              <InboxIcon />
            </ToolButton>
          )}
          {actions.restore && (
            <ToolButton label="Restore from Trash" onClick={() => onAction('untrash')} disabled={!hasSelection}>
              <RestoreIcon />
            </ToolButton>
          )}
          {actions.trash && (
            <ToolButton label="Move to Trash (#)" onClick={() => onAction('trash')} disabled={!hasSelection}>
              <TrashIcon />
            </ToolButton>
          )}
          {actions.deleteForever && canDeleteForever && (
            <ToolButton
              label="Delete forever"
              onClick={() => onAction('deleteForever')}
              disabled={!hasSelection}
            >
              <CloseIcon />
            </ToolButton>
          )}
          <ToolButton label="Mark as read (Shift+I)" onClick={() => onAction('markRead')} disabled={!hasSelection}>
            <MailOpenIcon />
          </ToolButton>
          <ToolButton label="Mark as unread (Shift+U)" onClick={() => onAction('markUnread')} disabled={!hasSelection}>
            <MailIcon />
          </ToolButton>
          <ToolButton
            label={allStarred ? 'Remove star (s)' : 'Star (s)'}
            onClick={() => onAction(allStarred ? 'unstar' : 'star')}
            disabled={!hasSelection}
          >
            <StarIcon filled={allStarred} />
          </ToolButton>
        </div>

        <div className="mailtool-spacer" />

        <ToolButton label="Refresh" onClick={onRefresh} disabled={disabled || refreshing}>
          <span className={refreshing ? 'mailtool-spin' : undefined}>
            <RefreshIcon />
          </span>
        </ToolButton>

        <div className="mailtool-pager" role="group" aria-label="Pagination">
          <span className="mailtool-range" aria-live="off">
            {range}
          </span>
          <ToolButton label="Newer" onClick={onNewer} disabled={!canNewer || disabled}>
            <ChevronLeftIcon />
          </ToolButton>
          <ToolButton label="Older" onClick={onOlder} disabled={!canOlder || disabled}>
            <ChevronRightIcon />
          </ToolButton>
        </div>
      </div>
    </div>
  );
};

export default MailToolbar;
