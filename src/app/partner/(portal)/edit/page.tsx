"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Send, Upload, X, Plus, Trash2, GripVertical,
  Building2, MapPin, Phone, Globe, DollarSign,
  Stethoscope, Users, BedDouble, Heart, ExternalLink,
  HelpCircle, Check, Loader2,
} from "lucide-react";
import Link from "next/link";

interface StaffMember {
  id?: string;
  name: string;
  position: string;
  credentials: string;
  photo_url: string;
  bio: string;
  isNew?: boolean;
}

interface FAQ {
  id: string;
  center_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

const TREATMENT_FOCUS_OPTIONS = [
  "Alcohol Addiction", "Drug Addiction", "Behavioral Addiction", "Dual Diagnosis",
  "Mental Health", "Trauma & PTSD", "Eating Disorders", "Process Addictions",
  "Prescription Drug Abuse", "Opioid Addiction", "Gambling Addiction",
];

const SERVICES_OPTIONS = [
  "Medical Detox", "Inpatient/Residential", "Outpatient", "Intensive Outpatient (IOP)",
  "Partial Hospitalization (PHP)", "Sober Living", "Aftercare Planning",
  "Family Therapy", "Group Therapy", "Individual Counseling",
  "Medication-Assisted Treatment (MAT)", "Holistic Therapies", "Art/Music Therapy",
  "Adventure/Wilderness Therapy", "Telehealth", "Executive Program",
];

const TREATMENT_METHODS = [
  "Cognitive Behavioral Therapy (CBT)", "Dialectical Behavior Therapy (DBT)",
  "EMDR", "12-Step Program", "Motivational Interviewing", "Mindfulness-Based",
  "Trauma-Informed Care", "Psychodynamic Therapy", "Acceptance & Commitment Therapy",
  "Neurofeedback", "Biofeedback", "Yoga & Meditation",
];

const FACILITY_OPTIONS = [
  "Private Rooms", "Shared Rooms", "Swimming Pool", "Gym/Fitness Center",
  "Meditation Room", "Art Studio", "Gardens/Outdoor Space", "Chef-Prepared Meals",
  "Spa/Wellness Center", "Library", "Recreation Room", "Chapel/Prayer Room",
  "Beach Access", "Mountain Views", "Pet-Friendly", "On-Site Pharmacy",
];

const SETTING_TYPES = [
  { value: "luxury", label: "Luxury / Executive" },
  { value: "residential", label: "Residential" },
  { value: "outpatient", label: "Outpatient Clinic" },
  { value: "hospital", label: "Hospital-Based" },
  { value: "wilderness", label: "Wilderness / Adventure" },
  { value: "sober_living", label: "Sober Living" },
];

const inputClass = "mt-1.5 bg-surface-container-low border border-surface-container-high rounded-xl ghost-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20";

export default function PartnerEditPage() {
  const router = useRouter();
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [original, setOriginal] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activeSection, setActiveSection] = useState("basic");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const staffPhotoRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingStaffPhoto, setUploadingStaffPhoto] = useState<number | null>(null);
  const [photos, setPhotos] = useState<{ id: string; url: string; alt_text: string; is_primary: boolean }[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [savingFaqId, setSavingFaqId] = useState<string | null>(null);
  const [addingFaq, setAddingFaq] = useState(false);

  const allowedFields = [
    "short_description", "description", "phone", "email", "website_url",
    "pricing_text", "address", "city", "state_province", "country",
    "treatment_focus", "conditions", "services", "treatment_methods",
    "setting_type", "program_length", "languages", "has_detox",
    "clinical_director", "medical_director", "price_min", "price_max",
    "insurance", "accreditation", "occupancy",
  ];

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles").select("center_id").eq("id", user.id).single();
      if (!profile?.center_id) return;

      const { data } = await supabase
        .from("centers").select("*").eq("id", profile.center_id).single();
      setCenter(data as Record<string, unknown> | null);
      setOriginal(data as Record<string, unknown> | null);

      // Load staff
      const { data: staffData } = await supabase
        .from("center_staff").select("*").eq("center_id", profile.center_id).order("sort_order");
      if (staffData) setStaff(staffData as unknown as StaffMember[]);

      // Load photos
      const { data: photoData } = await supabase
        .from("center_photos").select("*").eq("center_id", profile.center_id).order("sort_order");
      if (photoData) setPhotos(photoData as { id: string; url: string; alt_text: string; is_primary: boolean }[]);

      // Load FAQs
      try {
        const faqRes = await fetch("/api/partner-faqs");
        if (faqRes.ok) {
          const faqData = await faqRes.json();
          if (faqData.faqs) setFaqs(faqData.faqs as FAQ[]);
        }
      } catch {
        // non-fatal
      }

      setLoading(false);
    }
    load();
  }, []);

  function update(key: string, value: unknown) {
    setCenter((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleArrayItem(key: string, item: string) {
    const arr = ((center?.[key] as string[]) || []);
    const newArr = arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
    update(key, newArr);
  }

  async function uploadPhoto(file: File) {
    if (!center) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("center_id", center.id as string);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // API inserts into center_photos and returns the record
      if (data.photo) {
        setPhotos((prev) => [...prev, data.photo as { id: string; url: string; alt_text: string; is_primary: boolean }]);
      }
      toast.success("Photo uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
    setUploadingPhoto(false);
  }

  async function uploadStaffPhoto(file: File, index: number) {
    if (!center) return;
    setUploadingStaffPhoto(index);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("center_id", center.id as string);
    formData.append("staff_photo", "true");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateStaff(index, "photo_url", data.url);
      toast.success("Staff photo uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
    setUploadingStaffPhoto(null);
  }

  function addStaff() {
    setStaff((prev) => [...prev, { name: "", position: "", credentials: "", photo_url: "", bio: "", isNew: true }]);
  }

  function removeStaff(index: number) {
    setStaff((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStaff(index: number, key: string, value: string) {
    setStaff((prev) => prev.map((s, i) => i === index ? { ...s, [key]: value } : s));
  }

  async function addFaq() {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      toast.error("Both question and answer are required");
      return;
    }
    setAddingFaq(true);
    try {
      const res = await fetch("/api/partner-faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          question: newFaqQuestion,
          answer: newFaqAnswer,
          sort_order: faqs.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFaqs((prev) => [...prev, data.faq as FAQ]);
      setNewFaqQuestion("");
      setNewFaqAnswer("");
      toast.success("FAQ added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add FAQ");
    }
    setAddingFaq(false);
  }

  async function updateFaq(id: string, question: string, answer: string) {
    if (!question.trim() || !answer.trim()) {
      toast.error("Both question and answer are required");
      return;
    }
    setSavingFaqId(id);
    try {
      const res = await fetch("/api/partner-faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id, question, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFaqs((prev) => prev.map((f) => f.id === id ? (data.faq as FAQ) : f));
      toast.success("FAQ updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update FAQ");
    }
    setSavingFaqId(null);
  }

  async function deleteFaq(id: string) {
    setSavingFaqId(id);
    try {
      const res = await fetch("/api/partner-faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      toast.success("FAQ removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete FAQ");
    }
    setSavingFaqId(null);
  }

  function updateFaqLocal(id: string, key: "question" | "answer", value: string) {
    setFaqs((prev) => prev.map((f) => f.id === id ? { ...f, [key]: value } : f));
  }

  async function handleSubmit() {
    if (!center || !original) return;

    const changes: Record<string, unknown> = {};
    for (const key of allowedFields) {
      const cur = JSON.stringify(center[key]);
      const orig = JSON.stringify(original[key]);
      if (cur !== orig) {
        changes[key] = center[key];
      }
    }

    if (photos.length < 3) {
      toast.error("Please upload at least 3 photos of your center");
      setActiveSection("photos");
      return;
    }

    // Include staff changes in the edit request
    const staffWithChanges = staff.filter(
      (m) => m.isNew || m.name // include new or existing modified staff
    );
    if (staffWithChanges.length > 0) {
      changes.staff = staffWithChanges.map((m) => ({
        id: m.id || undefined,
        name: m.name,
        position: m.position,
        credentials: m.credentials,
        photo_url: m.photo_url,
        bio: m.bio,
        isNew: m.isNew || false,
      }));
    }

    if (Object.keys(changes).length === 0) {
      toast.info("No changes to submit");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("center_edit_requests").insert({
      center_id: center.id as string,
      submitted_by: (await supabase.auth.getUser()).data.user!.id,
      changes,
    });
    if (error) {
      toast.error("Failed to submit changes");
      setSubmitting(false);
      return;
    }

    toast.success("All changes submitted for admin review");
    router.push("/partner");
    setSubmitting(false);
  }

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;
  if (!center) return <div className="text-center py-20 text-muted-foreground">Center not found</div>;

  const sections = [
    { id: "basic", label: "Basic Info", icon: Building2 },
    { id: "location", label: "Location", icon: MapPin },
    { id: "contact", label: "Contact", icon: Phone },
    { id: "treatment", label: "Treatment & Focus", icon: Heart },
    { id: "facilities", label: "Facilities & Program", icon: BedDouble },
    { id: "pricing", label: "Pricing & Insurance", icon: DollarSign },
    { id: "staff", label: "Clinical Team", icon: Stethoscope },
    { id: "faqs", label: "FAQs", icon: HelpCircle },
    { id: "photos", label: "Photos", icon: Upload },
  ];

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold text-foreground mb-1">Edit Your Profile</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Changes will be reviewed by our team before publishing. Fields marked <span className="text-red-500">*</span> are required.
      </p>

      {/* Section Nav */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
              activeSection === s.id
                ? "bg-[#45636b] text-white"
                : "bg-surface-container-low text-muted-foreground hover:bg-surface-container"
            }`}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        <div className="p-6 space-y-6">

          {/* ── BASIC INFO ── */}
          {activeSection === "basic" && (
            <>
              <SectionHeader title="Basic Information" desc="Your center's name and description" />
              <div>
                <Label className="text-xs text-muted-foreground">Center Name</Label>
                <Input value={(center.name as string) || ""} disabled className={`${inputClass} opacity-60`} />
                <p className="text-[10px] text-muted-foreground mt-1">Contact admin to change your center name</p>
              </div>
              <div>
                <RequiredLabel>Short Description</RequiredLabel>
                <Input
                  value={(center.short_description as string) || ""}
                  onChange={(e) => update("short_description", e.target.value)}
                  maxLength={200}
                  placeholder="Brief tagline for your center (max 200 chars)"
                  className={inputClass}
                />
              </div>
              <div>
                <RequiredLabel>Full Description</RequiredLabel>
                <Textarea
                  value={(center.description as string) || ""}
                  onChange={(e) => update("description", e.target.value)}
                  rows={6}
                  placeholder="Detailed description of your center, programs, philosophy..."
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Setting Type</Label>
                <p className="text-[10px] text-muted-foreground mb-2">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {SETTING_TYPES.map((s) => {
                    const currentSettings = (center.setting_type as string) || "";
                    const settingsArr = currentSettings ? currentSettings.split(",").map(v => v.trim()) : [];
                    const isSelected = settingsArr.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => {
                          const newArr = isSelected
                            ? settingsArr.filter(v => v !== s.value)
                            : [...settingsArr, s.value];
                          update("setting_type", newArr.join(", "));
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
                          isSelected
                            ? "bg-[#45636b] text-white border-[#45636b]"
                            : "bg-surface-container-low text-muted-foreground border-surface-container-high hover:border-primary/30"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                {/* Other setting type input */}
                {(() => {
                  const currentSettings = (center.setting_type as string) || "";
                  const settingsArr = currentSettings ? currentSettings.split(",").map(v => v.trim()) : [];
                  const knownValues = SETTING_TYPES.map(s => s.value);
                  const customValues = settingsArr.filter(v => v && !knownValues.includes(v));
                  const hasOther = customValues.length > 0;
                  return (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!hasOther) {
                            const newArr = [...settingsArr, ""];
                            update("setting_type", newArr.join(", "));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
                          hasOther
                            ? "bg-[#45636b] text-white border-[#45636b]"
                            : "bg-surface-container-low text-muted-foreground border-surface-container-high hover:border-primary/30"
                        }`}
                      >
                        Other
                      </button>
                      {hasOther && (
                        <Input
                          value={customValues.join(", ")}
                          onChange={(e) => {
                            const known = settingsArr.filter(v => knownValues.includes(v));
                            const custom = e.target.value ? [e.target.value] : [];
                            update("setting_type", [...known, ...custom].join(", "));
                          }}
                          placeholder="Type your setting type..."
                          className={`${inputClass} text-sm h-8 max-w-xs`}
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Program Length</Label>
                  <Input
                    value={(center.program_length as string) || ""}
                    onChange={(e) => update("program_length", e.target.value)}
                    placeholder="e.g., 30, 60, 90 days"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Capacity / No. of Beds</Label>
                  <Input
                    value={(center.occupancy as string) || ""}
                    onChange={(e) => update("occupancy", e.target.value)}
                    placeholder="e.g., 24 beds, 50 clients"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!center.has_detox}
                  onChange={(e) => update("has_detox", e.target.checked)}
                  className="h-4 w-4 rounded text-primary"
                />
                <Label className="text-sm text-foreground">On-site medical detox available</Label>
              </div>
            </>
          )}

          {/* ── LOCATION ── */}
          {activeSection === "location" && (
            <>
              <SectionHeader title="Location" desc="Where your center is located" />
              <div>
                <RequiredLabel>Street Address</RequiredLabel>
                <Input
                  value={(center.address as string) || ""}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Full street address"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <RequiredLabel>City</RequiredLabel>
                  <Input
                    value={(center.city as string) || ""}
                    onChange={(e) => update("city", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">State / Province</Label>
                  <Input
                    value={(center.state_province as string) || ""}
                    onChange={(e) => update("state_province", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <RequiredLabel>Country</RequiredLabel>
                <Input
                  value={(center.country as string) || ""}
                  onChange={(e) => update("country", e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* ── CONTACT ── */}
          {activeSection === "contact" && (
            <>
              <SectionHeader title="Contact Information" desc="How clients can reach you" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <RequiredLabel>Phone</RequiredLabel>
                  <Input
                    value={(center.phone as string) || ""}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <RequiredLabel>Email</RequiredLabel>
                  <Input
                    value={(center.email as string) || ""}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="contact@yourcenter.com"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <RequiredLabel>Website</RequiredLabel>
                <Input
                  value={(center.website_url as string) || ""}
                  onChange={(e) => update("website_url", e.target.value)}
                  placeholder="https://www.yourcenter.com"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Clinical Director</Label>
                  <Input
                    value={(center.clinical_director as string) || ""}
                    onChange={(e) => update("clinical_director", e.target.value)}
                    placeholder="Dr. Name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Medical Director</Label>
                  <Input
                    value={(center.medical_director as string) || ""}
                    onChange={(e) => update("medical_director", e.target.value)}
                    placeholder="Dr. Name"
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── TREATMENT & FOCUS ── */}
          {activeSection === "treatment" && (
            <>
              <SectionHeader title="Treatment & Focus" desc="What your center specializes in" />
              <div>
                <RequiredLabel>Treatment Focus</RequiredLabel>
                <p className="text-[10px] text-muted-foreground mb-2">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {TREATMENT_FOCUS_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("treatment_focus", item)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
                        ((center.treatment_focus as string[]) || []).includes(item)
                          ? "bg-[#45636b] text-white border-[#45636b]"
                          : "bg-surface-container-low text-muted-foreground border-surface-container-high hover:border-primary/30"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Treatment Methods</Label>
                <p className="text-[10px] text-muted-foreground mb-2">Select all therapeutic approaches you use</p>
                <div className="flex flex-wrap gap-2">
                  {TREATMENT_METHODS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("treatment_methods", item)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
                        ((center.treatment_methods as string[]) || []).includes(item)
                          ? "bg-[#45636b] text-white border-[#45636b]"
                          : "bg-surface-container-low text-muted-foreground border-surface-container-high hover:border-primary/30"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Languages Spoken</Label>
                <Input
                  value={((center.languages as string[]) || []).join(", ")}
                  onChange={(e) => update("languages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="English, Spanish, Thai..."
                  className={inputClass}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Separate with commas</p>
              </div>
            </>
          )}

          {/* ── FACILITIES & PROGRAM ── */}
          {activeSection === "facilities" && (
            <>
              <SectionHeader title="Facilities & Program" desc="What your center offers" />
              <div>
                <Label className="text-xs text-muted-foreground">Services Offered</Label>
                <p className="text-[10px] text-muted-foreground mb-2">Select all programs and services available</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICES_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("services", item)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
                        ((center.services as string[]) || []).includes(item)
                          ? "bg-[#45636b] text-white border-[#45636b]"
                          : "bg-surface-container-low text-muted-foreground border-surface-container-high hover:border-primary/30"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Facilities & Amenities</Label>
                <p className="text-[10px] text-muted-foreground mb-2">Select available amenities</p>
                <div className="flex flex-wrap gap-2">
                  {FACILITY_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("conditions", item)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
                        ((center.conditions as string[]) || []).includes(item)
                          ? "bg-[#45636b] text-white border-[#45636b]"
                          : "bg-surface-container-low text-muted-foreground border-surface-container-high hover:border-primary/30"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Accreditation / Certifications</Label>
                <Input
                  value={((center.accreditation as string[]) || []).join(", ")}
                  onChange={(e) => update("accreditation", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="JCAHO, CARF, LegitScript..."
                  className={inputClass}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Separate with commas</p>
              </div>
            </>
          )}

          {/* ── PRICING ── */}
          {activeSection === "pricing" && (
            <>
              <SectionHeader title="Pricing & Insurance" desc="Cost and payment information" />
              <div>
                <RequiredLabel>Pricing Description</RequiredLabel>
                <Textarea
                  value={(center.pricing_text as string) || ""}
                  onChange={(e) => update("pricing_text", e.target.value)}
                  rows={3}
                  placeholder="Describe your pricing structure, what's included..."
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Price From (USD/month)</Label>
                  <Input
                    type="number"
                    value={(center.price_min as number) || ""}
                    onChange={(e) => update("price_min", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="e.g., 5000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Price To (USD/month)</Label>
                  <Input
                    type="number"
                    value={(center.price_max as number) || ""}
                    onChange={(e) => update("price_max", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="e.g., 30000"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Insurance Accepted</Label>
                <Input
                  value={((center.insurance as string[]) || []).join(", ")}
                  onChange={(e) => update("insurance", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="Aetna, BlueCross, Cigna, United..."
                  className={inputClass}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Separate with commas. Leave blank if self-pay only.</p>
              </div>
            </>
          )}

          {/* ── CLINICAL TEAM ── */}
          {activeSection === "staff" && (
            <>
              <SectionHeader title="Clinical Team" desc="Add your doctors, psychiatrists, psychotherapists, and key staff" />
              {staff.map((member, i) => (
                <div key={i} className="border border-surface-container-high rounded-xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GripVertical className="h-3.5 w-3.5" />
                      <span>Team Member {i + 1}</span>
                    </div>
                    <button onClick={() => removeStaff(i)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex gap-4">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-20 h-20 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => {
                          staffPhotoRef.current?.setAttribute("data-index", String(i));
                          staffPhotoRef.current?.click();
                        }}
                      >
                        {uploadingStaffPhoto === i ? (
                          <div className="text-xs text-muted-foreground">Uploading...</div>
                        ) : member.photo_url ? (
                          <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <Upload className="h-4 w-4 mx-auto text-muted-foreground" />
                            <span className="text-[9px] text-muted-foreground">Photo</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Name <span className="text-red-500">*</span></Label>
                          <Input
                            value={member.name}
                            onChange={(e) => updateStaff(i, "name", e.target.value)}
                            placeholder="Dr. John Smith"
                            className={`${inputClass} text-sm h-8`}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Position <span className="text-red-500">*</span></Label>
                          <Input
                            value={member.position}
                            onChange={(e) => updateStaff(i, "position", e.target.value)}
                            placeholder="Psychiatrist, Psychotherapist..."
                            className={`${inputClass} text-sm h-8`}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Credentials</Label>
                        <Input
                          value={member.credentials}
                          onChange={(e) => updateStaff(i, "credentials", e.target.value)}
                          placeholder="MD, Ph.D., LCSW, LPC..."
                          className={`${inputClass} text-sm h-8`}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] text-muted-foreground">Bio</Label>
                    <Textarea
                      value={member.bio}
                      onChange={(e) => updateStaff(i, "bio", e.target.value)}
                      rows={2}
                      placeholder="Brief professional background..."
                      className={`${inputClass} text-sm`}
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={addStaff}
                className="w-full border-2 border-dashed border-surface-container-high rounded-xl py-4 text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Team Member
              </button>
            </>
          )}

          {/* ── FAQs ── */}
          {activeSection === "faqs" && (
            <>
              <SectionHeader title="Frequently Asked Questions" desc="Add common questions and answers that appear on your center's page" />

              {/* Existing FAQs */}
              {faqs.map((faq) => (
                <div key={faq.id} className="border border-surface-container-high rounded-xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>FAQ</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateFaq(faq.id, faq.question, faq.answer)}
                        disabled={savingFaqId === faq.id}
                        className="text-emerald-500 hover:text-emerald-600 transition-colors p-1"
                        title="Save changes"
                      >
                        {savingFaqId === faq.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteFaq(faq.id)}
                        disabled={savingFaqId === faq.id}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Delete FAQ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Question</Label>
                    <Input
                      value={faq.question}
                      onChange={(e) => updateFaqLocal(faq.id, "question", e.target.value)}
                      placeholder="e.g., What is your admission process?"
                      className={`${inputClass} text-sm`}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Answer</Label>
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => updateFaqLocal(faq.id, "answer", e.target.value)}
                      rows={3}
                      placeholder="Provide a clear, helpful answer..."
                      className={`${inputClass} text-sm`}
                    />
                  </div>
                </div>
              ))}

              {/* Add new FAQ form */}
              <div className="border-2 border-dashed border-surface-container-high rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New FAQ</span>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Question <span className="text-red-500">*</span></Label>
                  <Input
                    value={newFaqQuestion}
                    onChange={(e) => setNewFaqQuestion(e.target.value)}
                    placeholder="e.g., Do you accept insurance?"
                    className={`${inputClass} text-sm`}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Answer <span className="text-red-500">*</span></Label>
                  <Textarea
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    rows={3}
                    placeholder="Provide a clear, helpful answer..."
                    className={`${inputClass} text-sm`}
                  />
                </div>
                <Button
                  onClick={addFaq}
                  disabled={addingFaq || !newFaqQuestion.trim() || !newFaqAnswer.trim()}
                  className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300 h-9 text-sm"
                >
                  {addingFaq ? (
                    <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Adding...</>
                  ) : (
                    <><Plus className="mr-2 h-3.5 w-3.5" /> Add FAQ</>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* ── PHOTOS ── */}
          {activeSection === "photos" && (
            <>
              <SectionHeader title="Center Photos" desc="Upload photos of your facility, rooms, and amenities" />

              {/* Minimum requirement notice */}
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
                photos.length >= 3
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                {photos.length >= 3 ? (
                  <><span className="font-medium">{photos.length} photos uploaded</span></>
                ) : (
                  <><span className="text-red-500">*</span> <span>Minimum 3 photos required ({photos.length}/3 uploaded)</span></>
                )}
              </div>

              {/* Existing photos grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-surface-container-high">
                      <img src={photo.url} alt={photo.alt_text || ""} className="w-full aspect-square object-cover" />

                      {/* Always-visible X delete button */}
                      <button
                        onClick={async () => {
                          const res = await fetch("/api/photos/delete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ photoId: photo.id }),
                          });
                          if (res.ok) {
                            setPhotos(prev => prev.filter(p => p.id !== photo.id));
                            toast.success("Photo removed");
                          }
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors duration-200 z-10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      {/* Set primary on click */}
                      <button
                        onClick={async () => {
                          if (photo.is_primary) return;
                          const res = await fetch("/api/photos/set-primary", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ photoId: photo.id, centerId: center.id }),
                          });
                          if (res.ok) {
                            setPhotos(prev => prev.map(p => ({ ...p, is_primary: p.id === photo.id })));
                            toast.success("Set as primary photo");
                          }
                        }}
                        className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                          photo.is_primary
                            ? "bg-emerald-500 text-white"
                            : "bg-black/50 text-white/80 hover:bg-[#45636b] hover:text-white cursor-pointer"
                        }`}
                      >
                        {photo.is_primary ? "Primary" : "Set as Primary"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              <div
                className="border-2 border-dashed border-surface-container-high rounded-xl py-8 text-center cursor-pointer hover:border-primary/30 transition-colors duration-200"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingPhoto ? (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-foreground font-medium">Click to upload photos</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — max 10MB per file</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) Array.from(files).forEach((f) => uploadPhoto(f));
                  e.target.value = "";
                }}
              />
            </>
          )}

          {/* Hidden staff photo input */}
          <input
            ref={staffPhotoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              const index = parseInt(staffPhotoRef.current?.getAttribute("data-index") || "0");
              if (file) uploadStaffPhoto(file, index);
              e.target.value = "";
            }}
          />
        </div>

        {/* Submit bar */}
        <div className="border-t border-surface-container-high px-6 py-4 bg-surface-container/30">
          {activeSection === "photos" ? (
            <div className="text-center py-2">
              <p className="text-sm text-emerald-600 font-medium">Photos are saved automatically</p>
              <p className="text-xs text-muted-foreground mt-0.5">Upload, delete, and set primary — changes apply instantly.</p>
            </div>
          ) : activeSection === "faqs" ? (
            <div className="text-center py-2">
              <p className="text-sm text-emerald-600 font-medium">FAQs are saved automatically</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add, edit (click the checkmark to save), and delete — changes apply instantly.</p>
            </div>
          ) : activeSection === "staff" ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300 h-11"
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Saving..." : "Save Team Members"}
            </Button>
          ) : (
            <div className="flex gap-3">
              {typeof center?.slug === "string" && center.slug && (
                <Button
                  variant="outline"
                  asChild
                  className="rounded-full ghost-border border-0 h-11"
                >
                  <Link href={`/centers/${center.slug}?preview=1`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Preview
                  </Link>
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300 h-11"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Submitting..." : "Submit Changes for Review"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-xs text-muted-foreground">
      {children} <span className="text-red-500">*</span>
    </Label>
  );
}
