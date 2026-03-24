import { CheckCircle, Shield } from "lucide-react";

interface CenterBadgesProps {
  verifiedProfile: boolean;
  trustedPartner: boolean;
  isSponsored?: boolean;
}

export function CenterBadges({
  verifiedProfile,
  trustedPartner,
  isSponsored,
}: CenterBadgesProps) {
  if (!verifiedProfile && !trustedPartner && !isSponsored) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {verifiedProfile && (
        <span className="inline-flex items-center gap-1 text-xs text-primary">
          <CheckCircle className="h-3.5 w-3.5" />
          Verified
        </span>
      )}
      {trustedPartner && (
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
