import { Home, Users, UserCircle, Plus, LogOut } from "lucide-react";
import { NavLink } from "./NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/brototype-logo.png";

export function PermanentSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleNewComplaint = () => {
    navigate("/new-complaint");
  };

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0">
      {/* Logo Section */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Brototype" className="h-8 w-8" />
          <span className="text-lg font-semibold text-sidebar-foreground">
            Brototype Connect
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-smooth"
          activeClassName="bg-sidebar-accent font-medium"
        >
          <Home className="h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/community"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-smooth"
          activeClassName="bg-sidebar-accent font-medium"
        >
          <Users className="h-5 w-5" />
          <span>Community</span>
        </NavLink>

        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-smooth"
          activeClassName="bg-sidebar-accent font-medium"
        >
          <UserCircle className="h-5 w-5" />
          <span>Profile</span>
        </NavLink>

        {/* Primary Action Button */}
        <div className="pt-4">
          <Button
            onClick={handleNewComplaint}
            className="w-full justify-start gap-3"
            size="default"
          >
            <Plus className="h-5 w-5" />
            <span>New Complaint</span>
          </Button>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}
