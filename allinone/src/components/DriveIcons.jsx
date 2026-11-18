import React from 'react';

// Small stroke icons (20px grid, 1.5px line) for the Drive pages: Documents,
// Gallery, Upload, the file modal and the access screen. Decorative: always
// paired with a word or an aria-label on the control.
const Icon = ({ children, size = 20, stroke = 1.5 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const SearchIcon = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="M13.2 13.2L17 17" />
  </Icon>
);

export const SortIcon = (props) => (
  <Icon {...props}>
    <path d="M6 4v12M3 13l3 3 3-3M14 16V4M11 7l3-3 3 3" />
  </Icon>
);

export const MoreIcon = (props) => (
  <Icon {...props}>
    <circle cx="10" cy="4.5" r="0.75" />
    <circle cx="10" cy="10" r="0.75" />
    <circle cx="10" cy="15.5" r="0.75" />
  </Icon>
);

export const ChevronIcon = (props) => (
  <Icon {...props}>
    <path d="M5 8l5 5 5-5" />
  </Icon>
);

export const CheckIcon = (props) => (
  <Icon {...props}>
    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
  </Icon>
);

export const CloseIcon = (props) => (
  <Icon {...props}>
    <path d="M5 5l10 10M15 5L5 15" />
  </Icon>
);

export const DownloadIcon = (props) => (
  <Icon {...props}>
    <path d="M3 13v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 17 16v-3M6.5 8.5L10 12l3.5-3.5M10 12V3" />
  </Icon>
);

export const InfoIcon = (props) => (
  <Icon {...props}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 9v4.5M10 6.5v.01" />
  </Icon>
);

export const TrashIcon = (props) => (
  <Icon {...props}>
    <path d="M3.5 5.5h13M8 5.5V3.5h4v2M5.5 5.5l.7 11h7.6l.7-11M8.5 9v4.5M11.5 9v4.5" />
  </Icon>
);

export const WarnIcon = (props) => (
  <Icon {...props}>
    <path d="M10 3.5l7 12.5H3z" />
    <path d="M10 8.5v3.5M10 14v.01" />
  </Icon>
);

export const PlayIcon = (props) => (
  <Icon {...props}>
    <path d="M6.5 4.5v11l9-5.5z" />
  </Icon>
);

export const ImageIcon = (props) => (
  <Icon {...props}>
    <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" />
    <circle cx="7" cy="8" r="1.25" />
    <path d="M17.5 13l-4-4-8 7.5" />
  </Icon>
);

export const DocIcon = (props) => (
  <Icon {...props}>
    <path d="M5.5 2.5h6l3 3v12h-9z" />
    <path d="M11.5 2.5v3h3" />
  </Icon>
);

export const LockIcon = (props) => (
  <Icon {...props}>
    <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
  </Icon>
);

export const UploadIcon = (props) => (
  <Icon {...props}>
    <path d="M3 13v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 17 16v-3M13.5 6.5L10 3 6.5 6.5M10 3v10" />
  </Icon>
);

export const CheckCircleIcon = (props) => (
  <Icon {...props}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M6.5 10.5l2.5 2.5 4.5-5" />
  </Icon>
);

export const CrossCircleIcon = (props) => (
  <Icon {...props}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" />
  </Icon>
);

export const SpinIcon = (props) => (
  <Icon {...props}>
    <path d="M10 3a7 7 0 1 0 7 7" />
  </Icon>
);
