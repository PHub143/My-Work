/* Shared utilities, sample data, AIO logo */

const AIOLogo = ({ size = 28, animated = true }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'baseline', gap: 0,
    fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: size,
    letterSpacing: '-0.04em', lineHeight: 1,
  }}>
    <span style={{
      background: 'linear-gradient(135deg, #ff3366 0%, #ff6b9d 100%)',
      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
    }}>A</span>
    <span style={{
      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ec4899 100%)',
      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      animation: animated ? 'aioHueShift 6s ease-in-out infinite' : 'none',
    }}>I</span>
    <span style={{
      background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
    }}>O</span>
  </span>
);

// Sample data — shared across variants
const SAMPLE_FILES = [
  { name: 'fortinet-vpn.png', kind: 'image', size: '847 KB', date: '2 days ago', tag: 'work', color: '#3b82f6' },
  { name: 'cabin-illustration.png', kind: 'image', size: '1.4 MB', date: '5 days ago', tag: 'personal', color: '#10b981' },
  { name: 'screenshot-2025-06-20.png', kind: 'image', size: '512 KB', date: '1 week ago', tag: 'misc', color: '#a855f7' },
  { name: 'aurora-mountains.jpg', kind: 'image', size: '2.1 MB', date: '2 weeks ago', tag: 'personal', color: '#06b6d4' },
  { name: 'ui-mockup.png', kind: 'image', size: '634 KB', date: '3 weeks ago', tag: 'work', color: '#ec4899' },
  { name: 'morning-coffee.jpg', kind: 'image', size: '1.8 MB', date: '1 month ago', tag: 'personal', color: '#f59e0b' },
];

const SAMPLE_DOCS = [
  { name: 'test_upload.txt', ext: 'txt', size: '2 KB', date: 'Today', tag: 'draft' },
  { name: 'test_v2.txt', ext: 'txt', size: '4 KB', date: 'Yesterday', tag: 'draft' },
  { name: 'ai-102.pdf', ext: 'pdf', size: '12.4 MB', date: '3 days ago', tag: 'study' },
  { name: 'AI_agent_security.pdf', ext: 'pdf', size: '8.7 MB', date: '4 days ago', tag: 'work' },
  { name: 'vocab smartword.pdf', ext: 'pdf', size: '1.2 MB', date: '1 week ago', tag: 'study' },
  { name: 'UNIT 4.2 PRACTICE.pdf', ext: 'pdf', size: '3.4 MB', date: '2 weeks ago', tag: 'study' },
  { name: 'automated_test.txt', ext: 'txt', size: '8 KB', date: '2 weeks ago', tag: 'work' },
  { name: 'meeting-notes.txt', ext: 'txt', size: '6 KB', date: '3 weeks ago', tag: 'work' },
  { name: 'project-brief.pdf', ext: 'pdf', size: '5.1 MB', date: '1 month ago', tag: 'work' },
  { name: 'recipe-collection.txt', ext: 'txt', size: '14 KB', date: '1 month ago', tag: 'personal' },
];

const SAMPLE_USERS = [
  { name: 'QA Test User Edited', email: 'qatest@example.com', role: 'USER', date: '4/12/2026', initials: 'Q' },
  { name: 'QA Success User', email: 'qa@example.com', role: 'USER', date: '4/12/2026', initials: 'Q' },
  { name: 'Final Test User', email: 'finaltest@example.com', role: 'USER', date: '4/12/2026', initials: 'F' },
  { name: 'System Admin', email: 'admin@example.com', role: 'ADMIN', date: '4/12/2026', initials: 'S', you: true },
];

const SAMPLE_TAGS = [
  { name: 'work', count: 14, color: '#3b82f6' },
  { name: 'personal', count: 22, color: '#10b981' },
  { name: 'study', count: 8, color: '#a855f7' },
  { name: 'draft', count: 5, color: '#f59e0b' },
  { name: 'misc', count: 11, color: '#ec4899' },
];

const SAMPLE_FOLDERS = [
  { name: 'Documents', count: 24, icon: '📄' },
  { name: 'Photos 2025', count: 142, icon: '🖼' },
  { name: 'Projects', count: 8, icon: '◆' },
  { name: 'Receipts', count: 31, icon: '◊' },
  { name: 'Travel', count: 56, icon: '◈' },
];

const SAMPLE_ACTIVITY = [
  { who: 'You', what: 'uploaded', target: 'aurora-mountains.jpg', when: '2m', type: 'up' },
  { who: 'You', what: 'tagged', target: 'ai-102.pdf', when: '14m', type: 'tag' },
  { who: 'QA Test User', what: 'shared', target: 'project-brief.pdf', when: '1h', type: 'share' },
  { who: 'You', what: 'created folder', target: 'Travel', when: '3h', type: 'folder' },
  { who: 'System', what: 'synced', target: 'Drive · 13 files', when: '6h', type: 'sync' },
];

// Tiny SVG icons
const Icon = {
  Search: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Upload: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  Folder: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>,
  Image: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Doc: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>,
  Users: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Settings: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  Plus: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M12 5v14"/></svg>,
  Edit: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
  Trash: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Check: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  Logout: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  Mail: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  Chevron: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="6 9 12 15 18 9"/></svg>,
  Sparkle: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>,
  Grid: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>,
  List: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>,
  Bolt: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  Sun: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
};

// Inject keyframes for shared animations
const sharedKeyframes = `
@keyframes aioHueShift { 0%,100% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(20deg); } }
@keyframes float-slow { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.1); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes pulse-glow { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
@keyframes spin-slow { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes drift { 0% { transform: translate(0,0); } 33% { transform: translate(30px,-40px); } 66% { transform: translate(-20px,30px); } 100% { transform: translate(0,0); } }
@keyframes blob { 0%,100% { border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%; } 50% { border-radius: 30% 70% 40% 60% / 60% 30% 70% 40%; } }
@keyframes sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes bounce-in { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
`;
const styleEl = document.createElement('style');
styleEl.textContent = sharedKeyframes;
document.head.appendChild(styleEl);

// Generate placeholder image gradients
const imgPlaceholder = (i, color) => {
  const palettes = [
    `linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%)`,
    `linear-gradient(135deg, #064e3b 0%, #134e4a 50%, #022c22 100%)`,
    `linear-gradient(135deg, #831843 0%, #500724 50%, #2d0a1f 100%)`,
    `linear-gradient(135deg, #78350f 0%, #451a03 50%, #1c1917 100%)`,
    `linear-gradient(135deg, #4c1d95 0%, #2e1065 50%, #1e1b4b 100%)`,
    `linear-gradient(135deg, #155e75 0%, #164e63 50%, #083344 100%)`,
  ];
  return palettes[i % palettes.length];
};

const fileExtColor = (ext) => {
  const map = {
    pdf: { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', label: 'PDF' },
    txt: { bg: 'linear-gradient(135deg,#64748b,#475569)', label: 'TXT' },
    doc: { bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', label: 'DOC' },
    docx: { bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', label: 'DOC' },
    png: { bg: 'linear-gradient(135deg,#10b981,#059669)', label: 'IMG' },
    jpg: { bg: 'linear-gradient(135deg,#10b981,#059669)', label: 'IMG' },
  };
  return map[ext] || { bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', label: ext.toUpperCase() };
};

Object.assign(window, {
  AIOLogo, Icon, SAMPLE_FILES, SAMPLE_DOCS, SAMPLE_USERS, SAMPLE_TAGS, SAMPLE_FOLDERS, SAMPLE_ACTIVITY,
  imgPlaceholder, fileExtColor,
});
