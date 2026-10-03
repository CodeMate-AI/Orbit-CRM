"use client";

import * as icons from "lucide-react";
import { LucideIcon, LucideProps } from "lucide-react";

export type IconName = keyof typeof icons;

export interface IconProps extends LucideProps {
  name: IconName;
}

export default function Icon({ name, ...props }: IconProps) {
  const LucideIcon = (icons[name] ?? icons.HelpCircle) as LucideIcon;

  if (!icons[name] && process.env.NODE_ENV === "development") {
    console.warn(`Icon "${name}" not found. Using HelpCircle.`);
  }

  return <LucideIcon {...props} />;
}
