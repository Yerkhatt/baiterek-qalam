type TimelineItem = {
  title: string;
  status: string;
  date: string;
  statusTone?: "draft" | "review" | "success" | "wait";
};

const toneClass: Record<NonNullable<TimelineItem["statusTone"]>, string> = {
  draft: "status-chip status-chip--draft",
  review: "status-chip status-chip--review",
  success: "status-chip status-chip--success",
  wait: "status-chip status-chip--wait"
};

export default function StatusTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="timeline">
      {items.map((item) => {
        const tone = item.statusTone ?? "review";
        return (
          <div className="timeline-item" key={`${item.title}-${item.date}`}>
            <span className={toneClass[tone]}>{item.status}</span>
            <div className="h3">{item.title}</div>
            <div className="text-muted">{item.date}</div>
          </div>
        );
      })}
    </div>
  );
}
