const STYLES: Record<string, { bg: string; text: string; label: string }> = {
  technical: { bg: "bg-[oklch(0.55_0.22_260_/_0.12)]", text: "text-[oklch(0.45_0.22_260)] dark:text-[oklch(0.75_0.18_260)]", label: "Technical" },
  cultural: { bg: "bg-[oklch(0.65_0.25_350_/_0.14)]", text: "text-[oklch(0.5_0.25_350)] dark:text-[oklch(0.78_0.2_350)]", label: "Cultural" },
  sports: { bg: "bg-[oklch(0.75_0.18_70_/_0.18)]", text: "text-[oklch(0.5_0.18_70)] dark:text-[oklch(0.82_0.16_70)]", label: "Sports" },
  workshop: { bg: "bg-[oklch(0.72_0.15_200_/_0.18)]", text: "text-[oklch(0.48_0.15_200)] dark:text-[oklch(0.8_0.13_200)]", label: "Workshop" },
  placement: { bg: "bg-[oklch(0.6_0.22_290_/_0.14)]", text: "text-[oklch(0.45_0.22_290)] dark:text-[oklch(0.78_0.2_290)]", label: "Placement" },
  pharmacy: { bg: "bg-[oklch(0.7_0.16_165_/_0.18)]", text: "text-[oklch(0.45_0.16_165)] dark:text-[oklch(0.8_0.14_165)]", label: "Pharmacy" },
  seminar: { bg: "bg-[oklch(0.6_0.15_30_/_0.16)]", text: "text-[oklch(0.45_0.18_30)] dark:text-[oklch(0.8_0.16_30)]", label: "Seminar" },
  other: { bg: "bg-muted", text: "text-muted-foreground", label: "Event" },
};

export function CategoryBadge({ category }: { category: string }) {
  const s = STYLES[category] ?? STYLES.other;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}
