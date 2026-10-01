"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/defter", icon: "📖", label: "İçindekiler" },
  { href: "/defter/kategoriler", icon: "🗂️", label: "Kategoriler" },
  { href: "/tarif/yeni", icon: "✍️", label: "Elle ekle" },
  { href: "/alisveris", icon: "🧺", label: "Alışveriş" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Ana menü">
      {TABS.map((t) => {
        const active = t.href === "/defter" ? path === "/defter" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}>
            <span aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
