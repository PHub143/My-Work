import React, { useMemo, useState } from 'react';
import { buildSrcdoc, hasRemoteImages, sanitizeHtml } from '../../utils/mailHtml';
import './MailBody.css';

/**
 * Renders ONE message body.
 *
 * - HTML: sanitised (DOMPurify), wrapped with CSP + referrer metas, and shown
 *   ONLY inside a sandboxed iframe (no scripts, no same-origin). Remote images
 *   stay blocked until the user opts in for this message.
 * - Plain text: rendered through React (escaped) with pre-wrap.
 *
 * Never use dangerouslySetInnerHTML for mail content.
 */
const MailBody = ({ message }) => {
  const [showImages, setShowImages] = useState(false);
  const html = typeof message?.bodyHtml === 'string' ? message.bodyHtml : '';
  const text = typeof message?.bodyText === 'string' ? message.bodyText : '';

  const clean = useMemo(() => (html.trim() ? sanitizeHtml(html) : ''), [html]);
  const remote = useMemo(() => hasRemoteImages(clean), [clean]);
  const srcDoc = useMemo(
    () => (clean ? buildSrcdoc(clean, { allowRemoteImages: showImages }) : ''),
    [clean, showImages],
  );

  if (clean) {
    return (
      <div className="mailbody">
        {remote && !showImages && (
          <div className="mailbody-images" role="note">
            <span>
              Images are hidden to protect your privacy. Showing them tells the sender this
              message was opened.
            </span>
            <button type="button" className="mailbody-images-btn" onClick={() => setShowImages(true)}>
              Show images
            </button>
          </div>
        )}
        <iframe
          className="mailbody-frame"
          title={`Message from ${message?.from?.name || message?.from?.email || 'sender'}: ${message?.subject || 'no subject'}`}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          srcDoc={srcDoc}
        />
      </div>
    );
  }

  if (text.trim()) {
    return (
      <div className="mailbody">
        <pre className="mailbody-text">{text}</pre>
      </div>
    );
  }

  return (
    <div className="mailbody">
      <p className="mailbody-empty">
        {html.trim() ? 'This message could not be displayed safely.' : '(This message has no content.)'}
      </p>
    </div>
  );
};

export default MailBody;
