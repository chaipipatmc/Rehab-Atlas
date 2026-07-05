import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock } from "lucide-react";

interface MobileInquiryBarProps {
  centerId: string;
  centerName: string;
}

/**
 * Persistent bottom inquiry bar for mobile center-profile readers. The desktop
 * inquiry card lives in a sticky sidebar that doesn't exist on small screens —
 * without this, a mobile user finishing a long profile has no visible CTA.
 * Hidden on lg+ where the sidebar takes over.
 */
export function MobileInquiryBar({ centerId, centerName }: MobileInquiryBarProps) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-nav border-t border-black/5 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 max-w-xl mx-auto">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">{centerName}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Lock className="h-2.5 w-2.5 text-primary" />
            Confidential &middot; response in 2&ndash;4h
          </p>
        </div>
        <Button
          className="rounded-full px-5 h-10 gradient-primary text-white hover:opacity-90 transition-opacity duration-300 flex-shrink-0"
          asChild
        >
          <Link href={`/inquiry?center=${centerId}`}>
            Inquire
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
