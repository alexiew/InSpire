// ABOUTME: Left sidebar navigation for the app shell.
// ABOUTME: Shows nav links with active state based on current route.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Hash, Users, FolderOpen, Rss } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const navItems = [
  { href: "/recent", label: "Recent", icon: Clock },
  { href: "/", label: "Topics", icon: Hash },
  { href: "/people", label: "People", icon: Users },
  { href: "/categories", label: "Categories", icon: FolderOpen },
  { href: "/subscriptions", label: "Subscriptions", icon: Rss },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/topics");
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex w-60 flex-col border-r bg-muted/30">
      <div className="flex items-center border-b px-4 py-3">
        <Link href="/recent">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
