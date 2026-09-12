"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { countCharacters, countWords } from "@/lib/utils/text-metrics";

/**
 * Writing-process metadata for one text field, matching the columns on
 * writing_samples / casual_responses. These are AGGREGATE counts only —
 * no keystroke content is ever captured, only counts of event types.
 */
export interface FieldMetadata {
  startedAt: string | null;
  durationSeconds: number;
  keystrokeCount: number;
  backspaceCount: number;
  pasteAttempts: number;
  cutAttempts: number;
  dropAttempts: number;
  focusLossCount: number;
}

export interface UseProtectedTextFieldOptions {
  /** Allow paste/cut/drop — set true only for the AI-output field. */
  allowClipboard?: boolean;
  initialText?: string;
  /** Called (debounced by the caller) whenever text changes, for autosave. */
  onTextChange?: (text: string) => void;
}

export function useProtectedTextField(options: UseProtectedTextFieldOptions = {}) {
  const { allowClipboard = false, initialText = "", onTextChange } = options;

  const [text, setTextState] = useState(initialText);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const startedAtRef = useRef<string | null>(null);
  const metadataRef = useRef<FieldMetadata>({
    startedAt: null,
    durationSeconds: 0,
    keystrokeCount: 0,
    backspaceCount: 0,
    pasteAttempts: 0,
    cutAttempts: 0,
    dropAttempts: 0,
    focusLossCount: 0,
  });

  const ensureStarted = useCallback(() => {
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
      metadataRef.current.startedAt = startedAtRef.current;
    }
  }, []);

  const hasStartedTyping = text.length > 0;
  useEffect(() => {
    if (!startedAtRef.current) return;
    const interval = setInterval(() => {
      const startMs = new Date(startedAtRef.current as string).getTime();
      setElapsedSeconds(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => clearInterval(interval);
    // Re-run once startedAtRef gets set — text length 0->1 triggers a re-render via setTextState.
  }, [hasStartedTyping]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      ensureStarted();
      const newText = e.target.value;
      setTextState(newText);
      onTextChange?.(newText);
    },
    [ensureStarted, onTextChange]
  );

  // NOTE: we deliberately do NOT try to detect "unusually large insertion
  // events" by comparing text growth against keydown counts. IME-based
  // input for Tamil/Hindi/etc. (exactly the scripts this study cares about)
  // commonly composes several characters at once via `compositionend`
  // rather than firing a keydown per character, which made that heuristic
  // misfire on legitimate multilingual typing. Paste/cut/drop events below
  // are reliable and unaffected by IME composition, so integrity tracking
  // relies on those instead.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      metadataRef.current.backspaceCount += 1;
    }
    // Ignore pure modifier keys so counts roughly track actual characters typed.
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete" || e.key === "Enter") {
      metadataRef.current.keystrokeCount += 1;
    }
  }, []);

  const blockUnlessAllowed = useCallback(
    (kind: "paste" | "cut" | "drop") => (e: React.SyntheticEvent) => {
      if (allowClipboard) return;
      e.preventDefault();
      if (kind === "paste") metadataRef.current.pasteAttempts += 1;
      if (kind === "cut") metadataRef.current.cutAttempts += 1;
      if (kind === "drop") metadataRef.current.dropAttempts += 1;
    },
    [allowClipboard]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!allowClipboard) e.preventDefault();
    },
    [allowClipboard]
  );

  const handleBlur = useCallback(() => {
    if (startedAtRef.current) {
      metadataRef.current.focusLossCount += 1;
    }
  }, []);

  const getMetadata = useCallback((): FieldMetadata => {
    const startMs = startedAtRef.current ? new Date(startedAtRef.current).getTime() : Date.now();
    return {
      ...metadataRef.current,
      durationSeconds: Math.floor((Date.now() - startMs) / 1000),
    };
  }, []);

  return {
    text,
    setText: setTextState,
    wordCount: countWords(text),
    characterCount: countCharacters(text),
    elapsedSeconds,
    getMetadata,
    fieldProps: {
      value: text,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onPaste: blockUnlessAllowed("paste"),
      onCut: blockUnlessAllowed("cut"),
      onDrop: blockUnlessAllowed("drop"),
      onDragOver: (e: React.DragEvent) => {
        if (!allowClipboard) e.preventDefault();
      },
      onContextMenu: handleContextMenu,
      onBlur: handleBlur,
      autoComplete: "off",
      autoCorrect: "off",
      spellCheck: true,
    },
  };
}
