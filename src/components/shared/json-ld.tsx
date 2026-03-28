const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.vercel.app";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Rehab-Atlas",
    url: BASE_URL,
    logo: `${BASE_URL}/icon.svg`,
    description:
      "A discreet sanctuary for recovery. Rehab-Atlas connects individuals with world-class rehabilitation centers through a lens of compassion and excellence.",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "info@rehabatlas.com",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface ArticleJsonLdProps {
  title: string;
  description?: string;
  image?: string;
  datePublished?: string;
  author?: string;
  url: string;
}

export function ArticleJsonLd({
  title,
  description,
  image,
  datePublished,
  author = "Rehab-Atlas Editorial Team",
  url,
}: ArticleJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(datePublished ? { datePublished } : {}),
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: "Rehab-Atlas",
      url: BASE_URL,
    },
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQJsonLdProps {
  faqs: FAQItem[];
}

export function FAQJsonLd({ faqs }: FAQJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

/* ─── LocalBusiness Schema for Rehab Centers ─── */

interface LocalBusinessJsonLdProps {
  name: string;
  description?: string;
  url: string;
  image?: string;
  address?: { street?: string; city?: string; region?: string; country?: string };
  phone?: string;
  email?: string;
  priceRange?: string;
  rating?: { value: number; count?: number };
}

export function LocalBusinessJsonLd({
  name, description, url, image, address, phone, email, priceRange, rating,
}: LocalBusinessJsonLdProps) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name,
    url,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(priceRange ? { priceRange } : {}),
    ...(address ? {
      address: {
        "@type": "PostalAddress",
        ...(address.street ? { streetAddress: address.street } : {}),
        ...(address.city ? { addressLocality: address.city } : {}),
        ...(address.region ? { addressRegion: address.region } : {}),
        ...(address.country ? { addressCountry: address.country } : {}),
      },
    } : {}),
    ...(rating ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.value,
        bestRating: 5,
        ...(rating.count ? { ratingCount: rating.count } : {}),
      },
    } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/* ─── MedicalWebPage Schema for Health Articles ─── */

interface MedicalWebPageJsonLdProps {
  title: string;
  description?: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}

export function MedicalWebPageJsonLd({
  title, description, url, datePublished, dateModified,
}: MedicalWebPageJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: title,
    ...(description ? { description } : {}),
    url,
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    publisher: { "@type": "Organization", name: "Rehab-Atlas", url: BASE_URL },
    about: { "@type": "MedicalCondition", name: "Substance Use Disorders" },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
