import React from 'react';

// Small stroke icons (20px grid, 1.5px line) for the exam screens. Decorative:
// always paired with a word or an aria-label on the control.
const Icon = ({ children, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const ArrowLeft = (props) => (
  <Icon {...props}>
    <path d="M16 10H4M9 5l-5 5 5 5" />
  </Icon>
);

export const ArrowRight = (props) => (
  <Icon {...props}>
    <path d="M4 10h12M11 5l5 5-5 5" />
  </Icon>
);

export const Check = (props) => (
  <Icon {...props}>
    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
  </Icon>
);

export const Cross = (props) => (
  <Icon {...props}>
    <path d="M6 6l8 8M14 6l-8 8" />
  </Icon>
);

export const Clock = (props) => (
  <Icon {...props}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 5.5V10l3 2" />
  </Icon>
);

export const Minus = (props) => (
  <Icon {...props}>
    <path d="M5 10h10" />
  </Icon>
);

export const Plus = (props) => (
  <Icon {...props}>
    <path d="M5 10h10M10 5v10" />
  </Icon>
);

export const Retake = (props) => (
  <Icon {...props}>
    <path d="M16 10a6 6 0 1 1-2-4.5M16 3.5V6h-2.5" />
  </Icon>
);
