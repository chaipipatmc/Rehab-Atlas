import { describe, expect, it } from "vitest";
import { pageUpdateSchema, pathsForPage, withPublishDate } from "@/lib/content/page-update";

describe("pageUpdateSchema", () => {
  it("accepts the editor's full save payload (DB timestamp format)", () => {
    const r = pageUpdateSchema.safeParse({
      title: "Inpatient vs outpatient rehab",
      slug: "inpatient-vs-outpatient-rehab",
      content: "## Heading\n\nBody",
      page_type: "blog",
      status: "published",
      meta_title: "Inpatient vs outpatient",
      meta_description: null,
      tags: ["family", "treatment"],
      published_at: "2026-11-28T02:31:30.31842+00:00",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown fields (no writing author_type, created_by, id ...)", () => {
    expect(pageUpdateSchema.safeParse({ author_type: "partner" }).success).toBe(false);
    expect(pageUpdateSchema.safeParse({ id: "x" }).success).toBe(false);
  });

  it("rejects values outside the DB constraints", () => {
    expect(pageUpdateSchema.safeParse({ status: "deleted" }).success).toBe(false);
    expect(pageUpdateSchema.safeParse({ page_type: "news" }).success).toBe(false);
    expect(pageUpdateSchema.safeParse({ slug: "Bad Slug!" }).success).toBe(false);
  });
});

describe("withPublishDate", () => {
  const now = new Date("2026-11-28T10:00:00Z");
  it("stamps now when publishing without a date", () => {
    expect(withPublishDate({ status: "published" }, { published_at: null }, now).published_at).toBe(now.toISOString());
  });
  it("keeps an existing publish date", () => {
    expect(withPublishDate({ status: "published" }, { published_at: "2026-01-01T00:00:00Z" }, now).published_at).toBe("2026-01-01T00:00:00Z");
  });
  it("leaves non-publish updates alone", () => {
    expect(withPublishDate({ status: "draft" }, { published_at: null }, now)).toEqual({ status: "draft" });
  });
});

describe("pathsForPage", () => {
  it("revalidates the article, the blog list and home for blog posts", () => {
    expect(pathsForPage("blog", "abc")).toEqual(["/blog/abc", "/blog", "/"]);
  });
  it("revalidates /pages/<slug> for other page types", () => {
    expect(pathsForPage("legal", "privacy-policy")).toEqual(["/pages/privacy-policy"]);
    expect(pathsForPage("blog", null)).toEqual([]);
  });
});
