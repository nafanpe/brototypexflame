import { ReactNode } from "react";
import { PermanentSidebar } from "./PermanentSidebar";
import { MobileSidebar } from "./MobileSidebar";

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

      {/* Mobile Sidebar - visible below md */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <MobileSidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
