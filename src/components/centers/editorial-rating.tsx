interface EditorialRatingProps {
  label: string;
  value: number | null;
}

function RatingBar({ label, value }: EditorialRatingProps) {
  if (value === null) return null;
  const percentage = (value / 5) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
        <div
          className="h-full gradient-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground w-8 text-right">
        {Number(value).toFixed(1)}
      </span>
    </div>
  );
}

interface EditorialRatingsProps {
  overall: number | null;
  staff: number | null;
  facility: number | null;
  program: number | null;
  privacy: number | null;
  value: number | null;
}

export function EditorialRatings(props: EditorialRatingsProps) {
  const ratings = [
    { label: "Overall", value: props.overall },
    { label: "Staff", value: props.staff },
    { label: "Facility", value: props.facility },
    { label: "Program Quality", value: props.program },
    { label: "Privacy", value: props.privacy },
    { label: "Value", value: props.value },
  ];

  const hasAnyRating = ratings.some((r) => r.value !== null);
  if (!hasAnyRating) return null;

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
        Rehab-Atlas Editorial Ratings
      </h3>
      <div className="space-y-3">
        {ratings.map((r) => (
          <RatingBar key={r.label} label={r.label} value={r.value} />
        ))}
      </div>
    </section>
  );
}
