import { Checkbox } from "@/components/ui/checkbox";
import { formatBRL } from "@/lib/masks";
import { ORDER_BUMPS } from "./order-bumps";

type Props = {
  selected: string[];
  onToggle: (id: string) => void;
};

export function OrderBumpList({ selected, onToggle }: Props) {
  return (
    <div className="space-y-3">
      {ORDER_BUMPS.map((bump) => {
        const checked = selected.includes(bump.id);
        return (
          <div
            key={bump.id}
            className="overflow-hidden rounded-lg border border-dashed border-border bg-card"
          >
            <label className="flex cursor-pointer items-center gap-2 bg-secondary px-3 py-2">
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(bump.id)}
                className="h-4 w-4 shrink-0 border-muted-foreground/50 data-[state=checked]:border-brand data-[state=checked]:bg-brand"
              />
              <span className="text-xs font-bold text-warn">{bump.ctaLabel}</span>
            </label>

            <div className="flex gap-3 px-3 py-3">
              <img
                src={bump.image}
                alt={bump.alt}
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-tight text-foreground">{bump.title}</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {bump.description}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  De <s>{formatBRL(bump.from)}</s> por{" "}
                  <strong className="text-sm font-bold text-price">{formatBRL(bump.price)}</strong>
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
