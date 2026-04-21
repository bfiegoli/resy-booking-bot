"use client";

// Forces color emoji rendering on macOS by appending VS16 (U+FE0F)
// and using an explicit emoji font stack
export function E({ children }: { children: string }) {
  const text = children.endsWith("\uFE0F") ? children : children + "\uFE0F";
  return (
    <span
      role="img"
      style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif" }}
    >
      {text}
    </span>
  );
}
