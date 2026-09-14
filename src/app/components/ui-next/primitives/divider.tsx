import type { HTMLAttributes } from "react";
import { classNames } from "../shared";
import styles from "./primitives.module.css";

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr {...props} className={classNames(styles.divider, className)} />;
}
