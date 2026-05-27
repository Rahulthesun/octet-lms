"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg
        className="w-5.5 h-5.5 shrink-0"
        viewBox="0 0 20 20"
        fill="none"
      >
        <rect
          x="2"
          y="2"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="11"
          y="2"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="2"
          y="11"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="11"
          y="11"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    href: "/admin/content",
    label: "Content",
    icon: (
      <svg
        className="w-5.5 h-5.5 shrink-0"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M 2,8 Q 2,7 3,7 L 8.5,7 L 10,5 L 17,5 Q 18,5 18,6 L 18,15 Q 18,16 17,16 L 3,16 Q 2,16 2,15 Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M 10,9.5 L 10,13 M 8,11 L 12,11"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/admin/attendance",
    label: "Attendance",
    icon: (
      <svg
        className="w-5.5 h-5.5 shrink-0"
        viewBox="0 0 20 20"
        fill="none"
      >
        <rect
          x="3"
          y="4"
          width="14"
          height="13"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M 7,4 V 2 M 13,4 V 2 M 3,8 H 17"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="7" cy="13" r="1.2" fill="currentColor" />
        <circle cx="10" cy="13" r="1.2" fill="currentColor" />
        <circle cx="13" cy="13" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/admin/tests",
    label: "Test Results",
    icon: (
      <svg
        className="w-5.5 h-5.5 shrink-0"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M 6,2 H 4 Q 3,2 3,3 V 18 Q 3,19 4,19 H 16 Q 17,19 17,18 V 3 Q 17,2 16,2 H 14 M 6,2 Q 6,1 10,1 Q 14,1 14,2 M 6,2 Q 6,3 10,3 Q 14,3 14,2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 7,9 H 13 M 7,12 H 11"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M 7,15 L 8.5,13.5 L 10.5,15.5 L 13,12"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/admin/students",
    label: "Students",
    icon: (
      <svg
        className="w-5.5 h-5.5 shrink-0"
        viewBox="0 0 20 20"
        fill="none"
      >
        <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M 1,17 Q 1,13 7,13 Q 13,13 13,17"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle
          cx="15"
          cy="7"
          r="2.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M 14,13 Q 19,13 19,17"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({
  collapsed,
  onToggle,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div
      style={{ width: collapsed ? 64 : 256 }}
      className="h-full flex flex-col bg-white border-r border-gray-200 shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden"
    >
      {/* Header */}
      {collapsed ? (
        <div className="flex items-center justify-center h-14 shrink-0">
          <div className="w-6 h-6 shrink-0">
            <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
              <circle
                cx="18"
                cy="18"
                r="16"
                stroke="#5e4075"
                strokeWidth="1.8"
              />
              <ellipse
                cx="18"
                cy="18"
                rx="14"
                ry="6"
                stroke="#5e4075"
                strokeWidth="1.5"
                transform="rotate(60 18 18)"
              />
              <ellipse
                cx="18"
                cy="18"
                rx="14"
                ry="6"
                stroke="#5e4075"
                strokeWidth="1.5"
                transform="rotate(-60 18 18)"
              />
              <circle cx="18" cy="18" r="3" fill="#5e4075" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="flex items-center h-14 shrink-0 px-4 gap-2">
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
              <circle
                cx="18"
                cy="18"
                r="16"
                stroke="#5e4075"
                strokeWidth="1.8"
              />
              <ellipse
                cx="18"
                cy="18"
                rx="14"
                ry="6"
                stroke="#5e4075"
                strokeWidth="1.5"
                transform="rotate(60 18 18)"
              />
              <ellipse
                cx="18"
                cy="18"
                rx="14"
                ry="6"
                stroke="#5e4075"
                strokeWidth="1.5"
                transform="rotate(-60 18 18)"
              />
              <circle cx="18" cy="18" r="3" fill="#5e4075" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-base text-primary whitespace-nowrap leading-tight">
              Chemistry<span className="text-muted">@OCTET</span>
            </p>
          </div>
          <button
            onClick={onToggle}
            className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
              <path
                d="M 8,2 L 4,6 L 8,10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* MENU label */}
      {!collapsed && (
        <p className="px-4 pt-5 pb-1 text-xs text-gray-400 uppercase tracking-widest">
          Menu
        </p>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <div key={item.href} className="relative">
              <Link
                href={item.href}
                className={`relative flex items-center h-12 transition-colors group
 ${
   collapsed
     ? `w-full justify-center border-l-2 ${active ? "border-primary bg-[#f5f0fa] text-primary" : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`
     : `w-full px-4 gap-3 border-l-2 ${active ? "border-primary bg-[#f5f0fa] text-primary" : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`
 }`}
              >
                {item.icon}

                {!collapsed && (
                  <span className="text-lg whitespace-nowrap">
                    {item.label}
                  </span>
                )}

                {collapsed && (
                  <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* My Profile + Sign out */}
      <div className={`${collapsed ? "flex flex-col items-center gap-1" : ""}`}>
        {/* My Profile */}
        {collapsed ? (
          <Link
            href="/admin/profile"
            className={`relative group w-full h-12 flex items-center justify-center border-l-2 transition-colors ${
              isActive("/admin/profile")
                ? "border-primary bg-[#f5f0fa] text-primary"
                : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 1.5,18 Q 1.5,13 9,13 Q 16.5,13 16.5,18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              My Profile
            </span>
          </Link>
        ) : (
          <Link
            href="/admin/profile"
            className={`flex items-center gap-3 px-4 py-2.5 border-l-2 transition-colors group ${
              isActive("/admin/profile")
                ? "border-primary bg-[#f5f0fa] text-primary"
                : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 1.5,18 Q 1.5,13 9,13 Q 16.5,13 16.5,18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-lg whitespace-nowrap">My Profile</span>
          </Link>
        )}

        {/* Sign out */}
        {collapsed ? (
          <button
            onClick={() => router.push("/")}
            className="relative group w-12 mb-2 h-10 bg-primary flex items-center justify-center text-white font-inter text-base"
            title="Sign out"
          >
            A
            <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Sign Out
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-9 h-9 bg-primary flex items-center justify-center text-white font-inter text-base shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base text-gray-800 leading-tight truncate">
                Admin
              </p>
              <button
                onClick={() => router.push("/")}
                className="text-sm text-gray-400 hover:text-primary transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
