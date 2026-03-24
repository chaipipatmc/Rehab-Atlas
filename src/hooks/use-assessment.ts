"use client";

import { useState, useCallback } from "react";
import type { AssessmentAnswers } from "@/types/assessment";

const TOTAL_STEPS = 5;

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
  };
}
