import clsx from "clsx";
import { PropsWithChildren } from "react";

export const BaseLabel = ({
  className,
  children,
}: { className?: string } & PropsWithChildren) => (
  <p className={clsx("text-xs text-gray-500 dark:text-gray-400", className)}>
    {children}
  </p>
);
