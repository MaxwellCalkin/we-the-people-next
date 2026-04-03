"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, X, LogOut, User } from "lucide-react";
import SearchBar from "@/components/ui/SearchBar";
import Avatar from "@/components/ui/Avatar";

interface NavbarProps {
  userName?: string;
  userImage?: string | null;
}

export default function Navbar({ userName, userImage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(e.target as Node)
      ) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/bills", label: "Bills" },
    { href: "/members", label: "Members" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/feed", label: "Feed" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-dark-flat shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              href="/profile"
              className="font-brand text-xl font-bold text-cream tracking-wider"
            >
              Heard
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-cream/80 hover:text-gold transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Search + Avatar Menu (Desktop) */}
            <div className="hidden md:flex items-center gap-4">
              <SearchBar className="w-52" />

              {/* Avatar dropdown */}
              <div className="relative" ref={avatarMenuRef}>
                <button
                  onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  className="rounded-full ring-2 ring-transparent hover:ring-gold/50 transition-all"
                  aria-label="User menu"
                >
                  <Avatar
                    src={userImage}
                    name={userName || "U"}
                    size={32}
                  />
                </button>

                {avatarMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg bg-navy-800 border border-white/10 shadow-xl py-1 z-50">
                    <Link
                      href="/profile"
                      onClick={() => setAvatarMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-cream/80 hover:text-gold hover:bg-white/5 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-cream/70 hover:text-red-accent hover:bg-white/5 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-cream p-2"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar */}
          <div className="absolute right-0 top-0 h-full w-72 glass-dark p-6 flex flex-col gap-6">
            <div className="flex justify-end">
              <button
                onClick={() => setMobileOpen(false)}
                className="text-cream p-2"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <SearchBar className="w-full" />

            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-cream/80 hover:text-gold transition-colors text-lg"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="text-cream/80 hover:text-gold transition-colors text-lg"
              >
                Profile
              </Link>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-auto flex items-center gap-2 text-cream/70 hover:text-red-accent transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
