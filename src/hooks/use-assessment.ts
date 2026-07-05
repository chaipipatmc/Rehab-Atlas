"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AssessmentAnswers } from "@/types/assessment";

const TOTAL_STEPS = 6;

// Persist in-progress answers so a refresh / accidental back-nav doesn't wipe
// a 3-5 minute form. sessionStorage-level privacy isn't enough here (users
// often come back later from an email or after talking to family), so we use
// localStorage with a 24h expiry and clear it on successful submission.
const STORAGE_KEY = "ra_assessment_progress_v1";
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredProgress {
  step: number;
  answers: Partial<AssessmentAnswers>;
  savedAt: number;
}

function loadProgress(): StoredProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProgress;
    if (
      typeof parsed?.step !== "number" ||
      typeof parsed?.savedAt !== "number" ||
      Date.now() - parsed.savedAt > STORAGE_TTL_MS
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAssessmentProgress() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}

const DEFAULT_ANSWERS: Partial<AssessmentAnswers> = {
  primary_issue: [],
  substances: [],
  co_occurring: [],
  prior_treatment: false,
  needs_detox: false,
  preferred_setting: "any",
  budget: "any",
  privacy_importance: "medium",
  urgency: "not_urgent",
};

export function useAssessment() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<AssessmentAnswers>>(DEFAULT_ANSWERS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumed, setResumed] = useState(false);
  const hydrated = useRef(false);

  // Restore saved progress once on mount (client only, avoids SSR mismatch)
  useEffect(() => {
    const saved = loadProgress();
    if (saved && saved.step > 0) {
      setAnswers({ ...DEFAULT_ANSWERS, ...saved.answers });
      setStep(Math.min(saved.step, TOTAL_STEPS - 1));
      setResumed(true);
    }
    hydrated.current = true;
  }, []);

  // Persist on every change after hydration
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, answers, savedAt: Date.now() } satisfies StoredProgress)
      );
    } catch {
      // storage full/blocked — continue without persistence
    }
  }, [step, answers]);

  const updateAnswer = useCallback(
    <K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K] | null) => {
      if (value !== null) {
        setAnswers((prev) => ({ ...prev, [key]: value }));
      }
    },
    []
  );

  const nextStep = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const prevStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const isLastStep = step === TOTAL_STEPS - 1;

  return {
    step,
    setStep,
    answers,
    updateAnswer,
    nextStep,
    prevStep,
    progress,
    isLastStep,
    totalSteps: TOTAL_STEPS,
    isSubmitting,
    setIsSubmitting,
    /** true when saved progress was restored from a previous visit */
    resumed,
  };
}
