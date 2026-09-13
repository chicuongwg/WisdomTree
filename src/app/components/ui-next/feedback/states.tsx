import type { ReactNode } from "react";
import { Surface } from "../primitives/surface";

interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: 2 | 3;
}

function MessageState({
  title,
  description,
  action,
  role,
  headingLevel = 2,
}: StateProps & { role?: "alert" }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <Surface className="ui-next-message-state" role={role}>
      <Heading className="ui-next-message-state__title">{title}</Heading>
      {description ? <p className="ui-next-message-state__description">{description}</p> : null}
      {action ? <div className="ui-next-message-state__action">{action}</div> : null}
    </Surface>
  );
}

export function EmptyState(props: StateProps) {
  return <MessageState {...props} />;
}

export function ErrorState(props: StateProps) {
  return <MessageState {...props} role="alert" />;
}

export function Skeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="ui-next-skeleton-group" role="status" aria-label={label}>
      <span className="ui-next-skeleton ui-next-skeleton--title" aria-hidden="true" />
      <span className="ui-next-skeleton" aria-hidden="true" />
      <span className="ui-next-skeleton ui-next-skeleton--short" aria-hidden="true" />
    </div>
  );
}

export interface ProgressProps {
  label: string;
  value?: number;
  max?: number;
}

export function Progress({ label, value, max = 100 }: ProgressProps) {
  const determinate = typeof value === "number";
  return (
    <div className="ui-next-progress">
      <span className="ui-next-progress__label">{label}</span>
      <progress className="ui-next-progress__bar" value={determinate ? value : undefined} max={max}>
        {determinate ? `${Math.round((value / max) * 100)}%` : label}
      </progress>
    </div>
  );
}
