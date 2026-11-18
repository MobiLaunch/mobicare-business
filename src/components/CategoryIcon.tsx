import { iconFor } from "@/lib/icons";

export default function CategoryIcon({
  iconId,
  className,
}: {
  iconId: string;
  className?: string;
}) {
  const Icon = iconFor(iconId);

  return <Icon aria-hidden="true" className={className} />;
}
