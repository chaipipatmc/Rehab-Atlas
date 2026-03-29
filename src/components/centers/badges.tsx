import { CheckCircle, Shield, AlertCircle } from "lucide-react";

interface CenterBadgesProps {
  verifiedProfile: boolean;
  trustedPartner: boolean;
  isSponsored?: boolean;
  isUnclaimed?: boolean;
}

export function CenterBadges({
  verifiedProfile,
  trustedPartner,
  isSponsored,
  isUnclaimed,
}: CenterBadgesProps) {
  if (!verifiedProfile && !trustedPartner && !isSponsored && !isUnclaimed) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {isUnclaimed && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-2.5 py-0.5">
          <AlertCircle className="h-3.5 w-3.5" />
          Unclaimed Listing - Data sourced from public records
        </span>
      )}
      {verifiedProfile && !isUnclaimed && (
        <span className="inline-flex items-center gap-1 text-xs text-primary">
          <CheckCircle className="h-3.5 w-3.5" />
          Verified
        </span>
      )}
      {trustedPartner && !isUnclaimed && (
        <span className="inline-flex items-center gap-1 text-xs text-primary">
          <Shield className="h-3.5 w-3.5" />
          Trusted Partner
        </span>
      )}
      {isSponsored && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Sponsored
        </span>
      )}
    </div>
  );
}
