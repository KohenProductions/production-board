"use client";

import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

interface Props {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: Props) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 text-sm text-gray-500"
      dir="rtl"
    >
      <ol className="flex items-center gap-2 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {isLast || !item.href ? (
                <span className="text-gray-500">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:underline text-gray-500 hover:text-gray-700"
                >
                  {item.label}
                </Link>
              )}

              {!isLast ? <span className="text-gray-400">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}