export const ease = [0.22, 1, 0.36, 1] as const;
export const easeOut = ease;
export const easeInOut = [0.65, 0, 0.35, 1] as const;

export const duration = {
  instant: 0.18,
  hover: 0.36,
  fast: 0.32,
  base: 0.5,
  reveal: 0.82,
  slow: 0.82,
  cinematic: 1.25,
} as const;

export const stagger = {
  tight: 0.05,
  base: 0.09,
  display: 0.12,
} as const;

export const distance = 28;
export const revealDistance = distance;
