import type { HTMLAttributes } from "react";
import { classNames } from "../shared";

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      {...props}
      className={classNames("ui-next-divider border-0 border-t border-ui-border m-0", className)}
    />
  );
}
