"use client";

import { useRouter } from "next/navigation";
import { useAssessment } from "@/hooks/use-assessment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WHO_FOR_OPTIONS,
  AGE_RANGE_OPTIONS,
  TREATMENT_FOCUS_OPTIONS,
  SUBSTANCE_OPTIONS,
  CONDITION_OPTIONS,
  SEVERITY_OPTIONS,
  BUDGET_OPTIONS,
  SETTING_TYPE_OPTIONS,
  INSURANCE_OPTIONS,
  PRIVACY_OPTIONS,
  URGENCY_OPTIONS,
} from "@/lib/constants";
import { ArrowLeft, ArrowRight, User, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { AssessmentAnswers } from "@/types/assessment";

const STEP_LABELS = ["Personal Context", "Primary Concern", "Severity", "Preferences", "Urgency"];

export default function AssessmentPage() {
  const router = useRouter();
  const {
    step,
    answers,
    updateAnswer,
    nextStep,
    prevStep,
    progress,
    isLastStep,
    isSubmitting,
    setIsSubmitting,
  } = useAssessment();

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const data = await res.json();
      if (!res.ok) {
        // Show validation errors
        if (data.details?.fieldErrors) {
          const errors = Object.values(data.details.fieldErrors).flat();
          toast.error(errors[0] as string || "Please check your responses");
        } else {
          toast.error(data.error || "Something went wrong");
        }
        setIsSubmitting(false);
        return;
      }
      if (data.assessment_id) {
        router.push(`/assessment/results?id=${data.assessment_id}`);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  function handleNextStep() {
    if (step === 0 && !answers.who_for) {
      toast.error("Please select who this is for");
      return;
    }
    if (step === 0 && !answers.age_range) {
      toast.error("Please select an age range");
      return;
    }
    if (step === 1 && (!answers.primary_issue || answers.primary_issue.length === 0)) {
      toast.error("Please select an option to continue");
      return;
    }
    if (step === 2 && !answers.severity) {
      toast.error("Please select an option to continue");
      return;
    }
    if (step === 4 && !answers.urgency) {
      toast.error("Please select an option to continue");
      return;
    }
    nextStep();
  }

  function toggleArrayItem(key: keyof AssessmentAnswers, item: string) {
    const current = (answers[key] as string[]) || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    updateAnswer(key, updated as AssessmentAnswers[typeof key]);
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header bar */}
      <div className="bg-surface-bright">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Step {step + 1} of 5
            </span>
            {/* Progress bar */}
            <div className="hidden sm:block w-48 h-1 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-xs uppercase tracking-wider text-primary font-medium">
            {STEP_LABELS[step]}
          </span>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-2xl">
        {/* Step Content Card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient p-5 sm:p-8 md:p-10">
          {/* Step 0: Who */}
          {step === 0 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-headline-lg font-semibold text-foreground">
                  Who needs help today?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Every journey to recovery starts with a single, honest step. Tell us who we are supporting today so we can tailor the next questions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { value: "self", label: "Myself", desc: "I am seeking support for my own journey.", icon: User },
                  { value: "loved_one", label: "A Loved One", desc: "I am helping a friend or family member.", icon: Users },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateAnswer("who_for", opt.value as AssessmentAnswers["who_for"])}
                    className={`flex flex-col items-center text-center p-6 rounded-xl transition-all duration-300 ${
                      answers.who_for === opt.value
                        ? "bg-primary/15 ring-2 ring-primary/40 shadow-ambient"
                        : "bg-surface-container-low ghost-border hover:bg-surface-container"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                      answers.who_for === opt.value ? "bg-primary text-white" : "bg-surface-container-high"
                    }`}>
                      <opt.icon className={`h-5 w-5 ${answers.who_for === opt.value ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <p className="font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Age Range</Label>
                <Select
                  value={answers.age_range || ""}
                  onValueChange={(v) => updateAnswer("age_range", v)}
                >
                  <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                    <SelectValue placeholder="Select age range" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 1: Primary Issue */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-headline-lg font-semibold text-foreground">
                  What is the primary concern?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">Select all that apply.</p>
              </div>
              <div className="space-y-2">
                {TREATMENT_FOCUS_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => toggleArrayItem("primary_issue", opt.value)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-300 ${
                      answers.primary_issue?.includes(opt.value)
                        ? "bg-primary/5 ghost-border ring-1 ring-primary/20"
                        : "bg-surface-container-low ghost-border hover:bg-surface-container"
                    }`}
                  >
                    <Checkbox
                      checked={answers.primary_issue?.includes(opt.value) || false}
                      onCheckedChange={() => toggleArrayItem("primary_issue", opt.value)}
                    />
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </div>
                ))}
              </div>

              {answers.primary_issue?.some((i) => ["substance_use", "dual_diagnosis"].includes(i)) && (
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                    Substance(s) involved
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUBSTANCE_OPTIONS.map((opt) => (
                      <div
                        key={opt.value}
                        onClick={() => toggleArrayItem("substances", opt.value)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-300 ${
                          answers.substances?.includes(opt.value)
                            ? "bg-primary/5 ring-1 ring-primary/20"
                            : "bg-surface-container-low ghost-border hover:bg-surface-container"
                        }`}
                      >
                        <Checkbox
                          checked={answers.substances?.includes(opt.value) || false}
                          onCheckedChange={() => toggleArrayItem("substances", opt.value)}
                        />
                        <span className="text-xs text-foreground">{opt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Severity */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-headline-lg font-semibold text-foreground">
                How would you describe the severity?
              </h2>
              <RadioGroup
                value={answers.severity || ""}
                onValueChange={(v) => updateAnswer("severity", v as AssessmentAnswers["severity"])}
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-low ghost-border hover:bg-surface-container cursor-pointer transition-all duration-300">
                    <RadioGroupItem value={opt.value} id={`sev-${opt.value}`} />
                    <Label htmlFor={`sev-${opt.value}`} className="cursor-pointer flex-1 text-sm">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                  Co-occurring conditions
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {CONDITION_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => toggleArrayItem("co_occurring", opt.value)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-300 ${
                        answers.co_occurring?.includes(opt.value)
                          ? "bg-primary/5 ring-1 ring-primary/20"
                          : "bg-surface-container-low ghost-border hover:bg-surface-container"
                      }`}
                    >
                      <Checkbox
                        checked={answers.co_occurring?.includes(opt.value) || false}
                        onCheckedChange={() => toggleArrayItem("co_occurring", opt.value)}
                      />
                      <span className="text-xs text-foreground">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low ghost-border">
                <Label className="text-sm">Prior treatment history?</Label>
                <Switch
                  checked={answers.prior_treatment || false}
                  onCheckedChange={(v) => updateAnswer("prior_treatment", v)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-headline-lg font-semibold text-foreground">Your Preferences</h2>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Budget Range</Label>
                <RadioGroup
                  value={answers.budget || "any"}
                  onValueChange={(v) => updateAnswer("budget", v as AssessmentAnswers["budget"])}
                  className="mt-2 space-y-2"
                >
                  {BUDGET_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low ghost-border hover:bg-surface-container cursor-pointer transition-all duration-300">
                      <RadioGroupItem value={opt.value} id={`bud-${opt.value}`} />
                      <Label htmlFor={`bud-${opt.value}`} className="cursor-pointer flex-1 text-sm">{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preferred Setting</Label>
                <Select
                  value={answers.preferred_setting || "any"}
                  onValueChange={(v) => updateAnswer("preferred_setting", v as AssessmentAnswers["preferred_setting"])}
                >
                  <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">No Preference</SelectItem>
                    {SETTING_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Insurance Provider</Label>
                <Select
                  value={answers.insurance_provider || "none"}
                  onValueChange={(v) => updateAnswer("insurance_provider", v === "none" ? undefined : v)}
                >
                  <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                    <SelectValue placeholder="Select insurance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Insurance / Self-Pay</SelectItem>
                    {INSURANCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Privacy Importance</Label>
                <RadioGroup
                  value={answers.privacy_importance || "medium"}
                  onValueChange={(v) => updateAnswer("privacy_importance", v as AssessmentAnswers["privacy_importance"])}
                  className="mt-2 space-y-2"
                >
                  {PRIVACY_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-low ghost-border hover:bg-surface-container cursor-pointer transition-all duration-300">
                      <RadioGroupItem value={opt.value} id={`pri-${opt.value}`} />
                      <Label htmlFor={`pri-${opt.value}`} className="cursor-pointer flex-1 text-xs">{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 4: Urgency */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-headline-lg font-semibold text-foreground">
                Urgency &amp; Final Details
              </h2>

              <RadioGroup
                value={answers.urgency || "not_urgent"}
                onValueChange={(v) => updateAnswer("urgency", v as AssessmentAnswers["urgency"])}
                className="space-y-2"
              >
                {URGENCY_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-low ghost-border hover:bg-surface-container cursor-pointer transition-all duration-300">
                    <RadioGroupItem value={opt.value} id={`urg-${opt.value}`} />
                    <Label htmlFor={`urg-${opt.value}`} className="cursor-pointer flex-1 text-sm">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>

              {answers.urgency === "urgent" && (
                <div className="bg-destructive/5 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      If this is a medical emergency, please call your local emergency services or a crisis hotline immediately.
                    </p>
                    <a href="https://findtreatment.gov" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-1 inline-block">Find local resources</a>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low ghost-border">
                <div>
                  <Label className="text-sm">Is detox needed?</Label>
                  <p className="text-[10px] text-muted-foreground">Medical detox for substance withdrawal</p>
                </div>
                <Switch
                  checked={answers.needs_detox || false}
                  onCheckedChange={(v) => updateAnswer("needs_detox", v)}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-full px-8 gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
              >
                {isSubmitting ? "Finding matches..." : "Get My Matches"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNextStep}
                className="rounded-full px-8 gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
              >
                Next Question
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Crisis footer note */}
        <div className="mt-8 bg-surface-container-low rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            If this is a medical emergency, please call your local emergency services or a crisis hotline immediately.{" "}
            <a href="https://findtreatment.gov" target="_blank" rel="noopener noreferrer" className="text-primary underline">Find local resources</a>
          </p>
        </div>
      </div>
    </div>
  );
}
