import type { ComponentProps, ElementType, ReactNode } from "react";

type Padding = "none" | "sm" | "md" | "lg";

const PADDING: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

type CardProps<T extends ElementType> = {
  as?: T;
  /** Hover treatment for cards that are (or contain) a link. */
  interactive?: boolean;
  padding?: Padding;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<T>, "as" | "className" | "children">;

export default function Card<T extends ElementType = "div">({
  as,
  interactive = false,
  padding = "md",
  className = "",
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={["card", interactive ? "card-interactive" : "", PADDING[padding], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
