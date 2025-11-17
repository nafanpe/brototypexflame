import { ReactNode } from "react";
import { PermanentSidebar } from "./PermanentSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import logo from "@/assets/brototype-logo.png";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop Sidebar - visible on md and up */}
      <div className="hidden md:block">
        <PermanentSidebar />
      </div>

      {/* Mobile Header - visible below md */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <MobileSidebar />
            <img src={logo} alt="Brototype" className="h-7 w-7" />
            <span className="text-base font-semibold text-sidebar-foreground">
              Brototype Connect
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full md:pt-0 pt-[60px]">
        {children}
      </main>
    </div>
  );
}
