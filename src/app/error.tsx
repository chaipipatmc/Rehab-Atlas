"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console (or an error tracking service)
    console.error(error);
  }, [error]);

  return (
    <div className="bg-surface min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center py-16">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>

        <h1 className="text-headline-lg font-semibold text-foreground">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          We encountered an unexpected error. Please try again — if the problem
          persists, contact our support team.
        </p>

        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            className="rounded-full ghost-border border-0 hover:bg-surface-container transition-colors duration-300"
            onClick={() => (window.location.href = "/")}
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    </div>
  );
}
