import { createClient } from "@/lib/supabase/server";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default async function PartnerHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("center_id")
    .eq("id", user!.id)
    .single();

  const { data: editRequests } = await supabase
    .from("center_edit_requests")
    .select("*")
    .eq("center_id", profile!.center_id!)
    .order("created_at", { ascending: false })
    .limit(50);

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "approved": return { text: "Approved", className: "text-emerald-700 bg-emerald-50" };
      case "rejected": return { text: "Rejected", className: "text-destructive bg-red-50" };
      default: return { text: "Pending Review", className: "text-amber-700 bg-amber-50" };
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-headline-lg font-semibold text-foreground mb-2">Change Log</h1>
      <p className="text-sm text-muted-foreground mb-8">
        History of all changes you&apos;ve submitted for your center profile.
      </p>

      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        {editRequests && editRequests.length > 0 ? (
          <div className="divide-y divide-surface-container-low">
            {editRequests.map((req) => {
              const sl = statusLabel(req.status);
              const changes = req.changes as Record<string, unknown>;
              const changeKeys = Object.keys(changes);

              return (
                <div key={req.id} className="p-5 hover:bg-surface-container-low/30 transition-colors duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {statusIcon(req.status)}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {changeKeys.map((k) => k.replace(/_/g, " ")).join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(req.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                        {req.review_note && (
                          <p className="text-xs text-muted-foreground mt-2 bg-surface-container-low rounded-lg p-2">
                            <span className="font-medium text-foreground">Admin note:</span> {req.review_note}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-medium rounded-full px-2 py-0.5 whitespace-nowrap ${sl.className}`}>
                      {sl.text}
                    </span>
                  </div>

                  {/* Show what changed */}
                  <div className="mt-3 ml-7 space-y-1">
                    {changeKeys.map((key) => (
                      <div key={key} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                        {typeof changes[key] === "string"
                          ? (changes[key] as string).length > 100
                            ? (changes[key] as string).slice(0, 100) + "..."
                            : (changes[key] as string)
                          : JSON.stringify(changes[key])
                        }
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No changes submitted yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Changes you make to your center profile will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
