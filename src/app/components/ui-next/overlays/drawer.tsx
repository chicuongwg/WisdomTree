"use client";

import type { ComponentProps } from "react";
import { Dialog } from "./dialog";

export function Drawer(props: Omit<ComponentProps<typeof Dialog>, "placement">) {
  return <Dialog {...props} placement="end" />;
}
