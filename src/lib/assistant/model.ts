// The model the AI assistant uses. Kept in one place so it's swappable without
// touching the route or tool layer. Current Sonnet-class string.
export const ASSISTANT_MODEL = "claude-sonnet-4-6";

// Bounds to keep cost predictable (see the route's tool loop).
export const MAX_TOOL_ITERATIONS = 6;
export const MAX_TOKENS = 1024;
