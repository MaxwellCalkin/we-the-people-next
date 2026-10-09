"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookOpen,
  ChevronDown,
  FileText,
  Landmark,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  User,
  Vote,
  X,
} from "lucide-react";
import SearchBar from "@/components/ui/SearchBar";
import Avatar from "@/components/ui/Avatar";
import Logo from "@/components/ui/Logo";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";

interface NavbarProps {
  /** Empty or missing when nobody is signed in. */
  userName?: string;
  userImage?: string | null;
  /** e.g. "PA-12"; shown in the account menu. */
  district?: string;
}

export const NAV_LINKS = [
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/members", label: "Members", icon: Landmark },
  { href: "/elections", label: "Elections", icon: Vote },
  { href: "/proposals", label: "Proposals", icon: Megaphone },
  { href: "/how-it-works", label: "How It Works", icon: BookOpen },
];

function isActive(pathname: string, href: string) {
  if (href === "/proposals") return pathname === "/proposals" || pathname.startsWith("/proposal");
  if (href === "/bills") return pathname.startsWith("/bills") || pathname.startsWith("/vote");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar({ userName, userImage, district }: NavbarProps) {
  const pathname = usePathname() ?? "";
  const signedIn = Boolean(userName);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close menus whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const hamburger = hamburgerRef.current;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      hamburger?.focus();
    };
  }, [mobileOpen]);

  const logOut = () => signOut({ callbackUrl: "/" });

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Logo href={signedIn ? "/profile" : "/"} className="shrink-0" />

          <nav aria-label="Main" className="ml-4 hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active ? "bg-white/[0.07] text-ink" : "text-ink-2 hover:bg-white/[0.04] hover:text-ink"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <SearchBar className="w-44 xl:w-60" size="sm" shortcut />

            {signedIn ? (
              <>
                <ButtonLink href="/proposals/new" variant="outline" size="sm" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                  Propose a Bill
                </ButtonLink>
                <div className="relative" ref={menuRef}>
                  <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label="User menu"
                    aria-expanded={menuOpen}
                    aria-controls="account-menu"
                    className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 text-ink-3 transition-colors hover:bg-white/[0.06] hover:text-ink"
                  >
                    <Avatar src={userImage} name={userName || "You"} size={32} />
                    <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>

                  {menuOpen && (
                    <div
                      id="account-menu"
                      className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-line-strong bg-surface-2 shadow-pop animate-fade-in"
                    >
                      <div className="border-b border-line px-4 py-3">
                        <p className="truncate text-sm font-semibold text-ink">{userName}</p>
                        {district && <p className="text-xs text-ink-3">Voting district {district}</p>}
                      </div>
                      <div className="p-1.5">
                        <Link
                          href="/profile"
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
                        >
                          <User className="h-4 w-4" aria-hidden="true" />
                          Profile
                        </Link>
                        <Link
                          href="/proposals/new"
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Propose a bill
                        </Link>
                      </div>
                      <div className="border-t border-line p-1.5">
                        <button
                          type="button"
                          onClick={logOut}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-nay/10 hover:text-nay"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">
                  Log in
                </ButtonLink>
                <ButtonLink href="/signup" size="sm">
                  Sign up
                </ButtonLink>
              </>
            )}
          </div>

          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            className="ml-auto -mr-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-white/[0.06] lg:hidden"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col border-l border-line bg-surface shadow-pop animate-fade-in">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <span className="text-sm font-semibold text-ink-2">Menu</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-white/[0.06]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <SearchBar className="mb-5" />
              <nav aria-label="Mobile">
                <ul className="space-y-1">
                  {NAV_LINKS.map((link) => {
                    const active = isActive(pathname, link.href);
                    const Icon = link.icon;
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors ${
                            active ? "bg-white/[0.07] text-ink" : "text-ink-2 hover:bg-white/[0.04] hover:text-ink"
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${active ? "text-gold-bright" : "text-ink-3"}`} aria-hidden="true" />
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            <div className="border-t border-line p-4">
              {signedIn ? (
                <div className="space-y-3">
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.04]"
                  >
                    <Avatar src={userImage} name={userName || "You"} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{userName}</span>
                      <span className="block text-xs text-ink-3">View profile{district ? ` · ${district}` : ""}</span>
                    </span>
                  </Link>
                  <ButtonLink href="/proposals/new" fullWidth onClick={() => setMobileOpen(false)} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                    Propose a Bill
                  </ButtonLink>
                  <button type="button" onClick={logOut} className={buttonClasses({ variant: "ghost", fullWidth: true })}>
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Log out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <ButtonLink href="/login" variant="secondary" onClick={() => setMobileOpen(false)}>
                    Log in
                  </ButtonLink>
                  <ButtonLink href="/signup" onClick={() => setMobileOpen(false)}>
                    Sign up
                  </ButtonLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
