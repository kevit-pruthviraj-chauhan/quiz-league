// Client-safe skin config. Palette and shape live in globals.css under body[data-skin=...].
export const SKINS = {
  general:  { name: 'Royal',    glyphs: ['♛', '♞', '♜', '♝', '♚', '♟'], wait: '👑', win: 'Magnificent!',   lose: 'Not quite' },
  science:  { name: 'Science',  glyphs: ['⚛', '🧪', '🔬', '🧬', '⚗', '💡'], wait: '🧪', win: 'Eureka!',        lose: 'Hypothesis rejected' },
  space:    { name: 'Space',    glyphs: ['🪐', '☄', '🚀', '🌙', '⭐', '🛰'], wait: '🚀', win: 'Mission success!', lose: 'Signal lost' },
  patterns: { name: 'Patterns', glyphs: ['▲', '◆', '●', '■', '★', '✚'], wait: '🧩', win: 'Pattern cracked!', lose: 'Pattern broken' },
  history:  { name: 'History',  glyphs: ['⚔', '🏛', '📜', '👑', '🛡', '🗝'], wait: '📜', win: 'Victory!',       lose: 'Lost to history' },
  nature:   { name: 'Nature',   glyphs: ['🌿', '🍃', '🌸', '🍄', '🦋', '🌻'], wait: '🌱', win: 'In full bloom!', lose: 'Withered' },
} as const;
export type SkinKey = keyof typeof SKINS;
