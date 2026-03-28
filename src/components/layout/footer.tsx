import Link from "next/link";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";

export function Footer() {
  return (
    <footer className="bg-surface-container-low">
      <div className="container mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <span className="text-base font-semibold text-foreground">
              Rehab-<span className="font-bold">Atlas</span>
            </span>
            <p className="mt-2 text-xs text-muted-foreground max-w-xs leading-relaxed">
              A discreet sanctuary for recovery. Dedicated to connecting individuals
              with world-class rehabilitation centers through a lens of compassion and excellence.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-foreground font-medium mb-3">Platform</h3>
            <ul className="space-y-2">
              <li><Link href="/centers" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">Browse Centers</Link></li>
              <li><Link href="/assessment" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">Take Assessment</Link></li>
              <li><Link href="/blog" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">Articles & Resources</Link></li>
              <li><Link href="/inquiry" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">Submit Inquiry</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-foreground font-medium mb-3">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">About Us</Link></li>
              <li><Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">Contact Specialist</Link></li>
              <li><Link href="/partner/join" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">Center Partnership</Link></li>
              <li><Link href="/pages/hipaa" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">HIPAA Compliance</Link></li>
            </ul>
          </div>

          {/* Newsletter + Legal */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-foreground font-medium mb-3">Stay Informed</h3>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Recovery insights and resources, delivered to your inbox.
            </p>
            <NewsletterSignup />
            <ul className="space-y-2 mt-5 pt-4 border-t border-surface-container">
              <li><Link href="/pages/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">Privacy Policy</Link></li>
              <li><Link href="/pages/terms-of-use" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">Terms of Service</Link></li>
              <li><Link href="/pages/disclaimer" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">Medical Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[10px] text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Rehab-Atlas. A digital sanctuary for recovery. Your privacy is our priority.
          </p>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60">
            <span>HIPAA Aligned</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>256-bit Encrypted</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>SOC 2 Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
