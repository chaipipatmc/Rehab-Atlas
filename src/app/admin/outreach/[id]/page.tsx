"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Send, MessageSquare, FileSignature, CheckCircle2,
  Globe, Mail, MapPin, Clock, Pencil, AlertTriangle, User,
  TrendingUp, FileText,
} from "lucide-react";

interface PipelineDetail {
  id: string;
  center_id: string;
  stage: string;
  research_data: Record<string, unknown> | null;
  research_completed_at: string | null;
  outreach_sent_at: string | null;
  outreach_persona: string;
  follow_up_count: number;
  last_follow_up_at: string | null;
  next_follow_up_at: string | null;
  responded_at: string | null;
  response_summary: string | null;
  response_sentiment: string | null;
  proposed_commission_rate: number;
  agreed_commission_rate: number | null;
  agreed_commission_type: string;
  blog_tier: string | null;
  special_terms: string | null;
  agreement_document_url: string | null;
  esign_status: string | null;
  agreement_sent_at: string | null;
  agreement_signed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CenterInfo {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  city: string | null;
  email: string | null;
  inquiry_email: string | null;
  website_url: string | null;
  description: string | null;
  short_description: string | null;
  phone: string | null;
  address: string | null;
  treatment_focus: string[] | null;
  conditions: string[] | null;
  services: string[] | null;
  treatment_methods: string[] | null;
  setting_type: string | null;
  program_length: string | null;
  languages: string[] | null;
  pricing_text: string | null;
  insurance: string | null;
  accreditation: string | null;
  has_detox: boolean | null;
  status: string;
  updated_at: string | null;
}

interface ProfileCompleteness {
  score: number;
  total: number;
  fields: { label: string; done: boolean }[];
}

function calculateCompleteness(center: CenterInfo, photoCount: number, staffCount: number): ProfileCompleteness {
  const fields = [
    { label: "Name", done: !!center.name },
    { label: "Description", done: !!center.description && center.description.length > 50 },
    { label: "Short Description", done: !!center.short_description },
    { label: "Country", done: !!center.country },
    { label: "City", done: !!center.city },
    { label: "Address", done: !!center.address },
    { label: "Phone", done: !!center.phone },
    { label: "Email", done: !!center.email },
    { label: "Website", done: !!center.website_url },
    { label: "Treatment Focus", done: !!(center.treatment_focus && center.treatment_focus.length > 0) },
    { label: "Conditions Treated", done: !!(center.conditions && center.conditions.length > 0) },
    { label: "Services", done: !!(center.services && center.services.length > 0) },
    { label: "Treatment Methods", done: !!(center.treatment_methods && center.treatment_methods.length > 0) },
    { label: "Setting Type", done: !!center.setting_type },
    { label: "Program Length", done: !!center.program_length },
    { label: "Languages", done: !!(center.languages && center.languages.length > 0) },
    { label: "Pricing", done: !!center.pricing_text },
    { label: "Photos (3+)", done: photoCount >= 3 },
    { label: "Staff (1+)", done: staffCount >= 1 },
    { label: "Accreditation", done: !!center.accreditation },
  ];
  const score = fields.filter(f => f.done).length;
  return { score, total: fields.length, fields };
}

interface EmailRecord {
  id: string;
  direction: string;
  subject: string;
  body_text: string | null;
  email_type: string;
  from_email: string;
  to_email: string;
  sent_at: string;
}

const STAGE_TIMELINE = [
  "new", "researching", "research_complete", "outreach_drafted",
  "outreach_sent", "followed_up", "responded", "negotiating", "terms_agreed",
  "agreement_drafted", "agreement_sent", "agreement_signed", "active",
];

const STAGE_LABELS: Record<string, string> = {
  new: "New", researching: "Researching", research_complete: "Researched",
  outreach_drafted: "Draft Ready", outreach_sent: "Contacted",
  followed_up: "Followed Up", responded: "Responded", negotiating: "Negotiating",
  terms_agreed: "Terms Agreed", agreement_drafted: "Agreement Draft",
  agreement_sent: "Agreement Sent", agreement_signed: "Signed", active: "Active",
  stalled: "Stalled", declined: "Declined",
};

export default function OutreachDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pipelineId = params.id as string;

  const [pipeline, setPipeline] = useState<PipelineDetail | null>(null);
  const [center, setCenter] = useState<CenterInfo | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Load pipeline
      const { data: p } = await supabase
        .from("outreach_pipeline")
        .select("*")
        .eq("id", pipelineId)
        .single();

      if (!p) {
        router.push("/admin/outreach");
        return;
      }

      setPipeline(p as unknown as PipelineDetail);
      setNotes(p.notes as string || "");

      // Load center with all fields for completeness check
      const { data: c } = await supabase
        .from("centers")
        .select("id, name, slug, country, city, email, inquiry_email, website_url, description, short_description, phone, address, treatment_focus, conditions, services, treatment_methods, setting_type, program_length, languages, pricing_text, insurance, accreditation, has_detox, status, updated_at")
        .eq("id", p.center_id)
        .single();
      setCenter(c as unknown as CenterInfo);

      // Load photo and staff counts for completeness
      if (c) {
        const [{ count: photoCount }, { count: staffCount }] = await Promise.all([
          supabase.from("center_photos").select("id", { count: "exact", head: true }).eq("center_id", c.id),
          supabase.from("center_staff").select("id", { count: "exact", head: true }).eq("center_id", c.id),
        ]);
        setCompleteness(calculateCompleteness(c as unknown as CenterInfo, photoCount || 0, staffCount || 0));
      }

      // Load emails
      const { data: e } = await supabase
        .from("outreach_emails")
        .select("id, direction, subject, body_text, email_type, from_email, to_email, sent_at")
        .eq("pipeline_id", pipelineId)
        .order("sent_at", { ascending: true });
      setEmails((e || []) as EmailRecord[]);

      setLoading(false);
    }
    load();
  }, [pipelineId, router]);

  async function saveNotes() {
    const res = await fetch("/api/agents/outreach/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", pipeline_id: pipelineId, notes }),
    });
    if (res.ok) {
      toast.success("Notes saved");
      setEditingNotes(false);
    } else {
      toast.error("Failed to save notes");
    }
  }

  async function updateStage(newStage: string) {
    const res = await fetch("/api/agents/outreach/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", pipeline_id: pipelineId, stage: newStage }),
    });
    if (res.ok) {
      toast.success(`Stage updated to ${STAGE_LABELS[newStage] || newStage}`);
      setPipeline((prev) => prev ? { ...prev, stage: newStage } : prev);
    } else {
      toast.error("Failed to update stage");
    }
  }

  async function triggerResearch() {
    const res = await fetch("/api/agents/outreach/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ center_id: pipeline?.center_id }),
    });
    if (res.ok) {
      toast.success("Research started");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to start research");
    }
  }

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;
  if (!pipeline || !center) return null;

  const research = pipeline.research_data as {
    programs?: string[];
    specialties?: string[];
    target_audience?: string;
    website_summary?: string;
    unique_selling_points?: string[];
    tone_analysis?: string;
    contact_person_name?: string;
  } | null;

  const currentStageIndex = STAGE_TIMELINE.indexOf(pipeline.stage);

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <Link href="/admin/outreach" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Pipeline
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-headline-lg font-semibold text-foreground">{center.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {center.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{center.city}, {center.country}</span>}
              {center.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{center.email}</span>}
              {center.website_url && (
                <a href={center.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                  <Globe className="h-3 w-3" />Website
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/admin/centers/${pipeline.center_id}`}>
              <Button variant="outline" size="sm" className="rounded-full ghost-border border-0">
                <Pencil className="mr-1 h-3 w-3" />
                Edit Center
              </Button>
            </Link>
            <Badge className={`text-sm ${pipeline.stage === "active" ? "bg-emerald-100 text-emerald-800" : pipeline.stage === "declined" ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"}`}>
              {STAGE_LABELS[pipeline.stage] || pipeline.stage}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline Progress</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STAGE_TIMELINE.map((stage, i) => {
            const isCompleted = i < currentStageIndex;
            const isCurrent = stage === pipeline.stage;
            const isFuture = i > currentStageIndex;

            return (
              <div key={stage} className="flex items-center gap-1">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${
                  isCurrent ? "bg-primary text-white" :
                  isCompleted ? "bg-emerald-100 text-emerald-700" :
                  "bg-surface-container text-muted-foreground"
                }`}>
                  {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                  {STAGE_LABELS[stage]}
                </div>
                {i < STAGE_TIMELINE.length - 1 && (
                  <div className={`w-4 h-0.5 ${isCompleted ? "bg-emerald-300" : "bg-surface-container"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info Cards */}
        <div className="lg:col-span-1 space-y-6">
          {/* Commission */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Commission
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proposed</span>
                <span className="font-medium">{pipeline.proposed_commission_rate}%</span>
              </div>
              {pipeline.agreed_commission_rate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agreed</span>
                  <span className="font-medium text-emerald-700">{pipeline.agreed_commission_rate}%</span>
                </div>
              )}
              {pipeline.blog_tier && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blog Tier</span>
                  <span className="font-medium capitalize">{pipeline.blog_tier}</span>
                </div>
              )}
            </div>
          </div>

          {/* Profile Completeness */}
          {completeness && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Profile Completeness
              </h3>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-2xl font-semibold ${completeness.score >= 16 ? "text-emerald-600" : completeness.score >= 10 ? "text-amber-600" : "text-red-600"}`}>
                    {Math.round((completeness.score / completeness.total) * 100)}%
                  </span>
                  <span className="text-xs text-muted-foreground">{completeness.score}/{completeness.total} fields</span>
                </div>
                <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${completeness.score >= 16 ? "bg-emerald-500" : completeness.score >= 10 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${(completeness.score / completeness.total) * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                {completeness.fields.map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-xs">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${f.done ? "bg-emerald-100 text-emerald-600" : "bg-red-50 text-red-400"}`}>
                      {f.done ? "✓" : "×"}
                    </div>
                    <span className={f.done ? "text-muted-foreground" : "text-foreground font-medium"}>{f.label}</span>
                  </div>
                ))}
              </div>
              {center?.status === "draft" && (
                <p className="text-[10px] text-amber-600 mt-3 font-medium">Center is still in draft — not visible to public</p>
              )}
              {center?.updated_at && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Last updated: {new Date(center.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
              <Link
                href={`/admin/centers/${center?.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                View Center <Globe className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Research Data */}
          {research && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Research
              </h3>
              <div className="space-y-3 text-xs">
                {research.website_summary && (
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Summary</p>
                    <p className="text-foreground leading-relaxed">{research.website_summary}</p>
                  </div>
                )}
                {research.specialties?.length ? (
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Specialties</p>
                    <div className="flex flex-wrap gap-1">
                      {research.specialties.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {research.contact_person_name && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3 w-3" /> Contact: {research.contact_person_name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Notes</h3>
              <button onClick={() => setEditingNotes(!editingNotes)} className="text-xs text-primary hover:text-primary/80">
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm border rounded-lg p-2 ghost-border bg-surface-container-low min-h-[80px]"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="rounded-full text-xs" onClick={saveNotes}>Save</Button>
                  <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => setEditingNotes(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{pipeline.notes || "No notes yet."}</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {pipeline.stage === "new" && (
                <Button size="sm" className="rounded-full text-xs w-full" onClick={triggerResearch}>
                  <Send className="h-3 w-3 mr-1" /> Start Research
                </Button>
              )}
              {pipeline.stage === "responded" && (
                <Button size="sm" className="rounded-full text-xs w-full" onClick={() => updateStage("terms_agreed")}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Terms Agreed
                </Button>
              )}
              {!["declined", "stalled", "active"].includes(pipeline.stage) && (
                <>
                  <Button variant="outline" size="sm" className="rounded-full text-xs w-full" onClick={() => updateStage("stalled")}>
                    <AlertTriangle className="h-3 w-3 mr-1" /> Mark Stalled
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full text-xs w-full text-red-600" onClick={() => updateStage("declined")}>
                    Mark Declined
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Email Thread */}
        <div className="lg:col-span-2">
          <div className="bg-surface-container-lowest rounded-2xl shadow-ambient">
            <div className="px-6 py-4 border-b border-surface-container-low">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Email Thread
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{emails.length} emails in this conversation</p>
            </div>

            <div className="divide-y divide-surface-container-low max-h-[600px] overflow-y-auto">
              {emails.map((email) => (
                <div key={email.id} className={`px-6 py-4 ${email.direction === "inbound" ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                        email.direction === "inbound" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
                      }`}>
                        {email.direction === "inbound" ? "C" : "S"}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{email.direction === "inbound" ? email.from_email : `Sarah (${email.from_email})`}</p>
                        <p className="text-[10px] text-muted-foreground">{email.email_type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(email.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground mb-1">{email.subject}</p>
                  {email.body_text && (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans max-h-40 overflow-y-auto">
                      {email.body_text}
                    </pre>
                  )}
                </div>
              ))}
              {emails.length === 0 && (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No emails yet. Research and outreach have not started.
                </div>
              )}
            </div>
          </div>

          {/* Agreement Status */}
          {pipeline.agreement_document_url && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-violet-600" /> Agreement
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="capitalize">{pipeline.esign_status || "unknown"}</Badge>
                </div>
                {pipeline.agreement_sent_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent</span>
                    <span>{new Date(pipeline.agreement_sent_at).toLocaleDateString()}</span>
                  </div>
                )}
                {pipeline.agreement_signed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Signed</span>
                    <span className="text-emerald-700 font-medium">{new Date(pipeline.agreement_signed_at).toLocaleDateString()}</span>
                  </div>
                )}
                <a
                  href={pipeline.agreement_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2"
                >
                  View in PandaDoc <Globe className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
