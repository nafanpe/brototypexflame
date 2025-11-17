import { Home, Users, Settings, Plus, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink } from "./NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/brototype-logo.png";

export function PermanentSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (data) setUserProfile(data);

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!roleData);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handlePrimaryAction = () => {
    if (location.pathname === '/dashboard') {
      navigate("/new-complaint");
    } else if (location.pathname === '/community') {
      // TODO: Open new post dialog/modal
      navigate("/community");
    }
  };

  const getPrimaryActionConfig = () => {
    if (location.pathname === '/dashboard') {
      return { label: 'New Complaint', show: true };
    } else if (location.pathname === '/community') {
      return { label: 'New Post', show: true };
    }
    return { label: '', show: false };
  };

  const actionConfig = getPrimaryActionConfig();

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 transition-all duration-300`}>
      {/* Logo Section with Toggle */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate("/")} 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="Brototype" className="h-8 w-8" />
            {!collapsed && (
              <span className="text-lg font-semibold text-sidebar-foreground">
                Brototype Connect
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        <NavLink
          to="/dashboard"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-smooth ${collapsed ? 'justify-center' : ''}`}
          activeClassName="bg-sidebar-accent font-medium"
        >
          <Home className="h-5 w-5" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/community"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-smooth ${collapsed ? 'justify-center' : ''}`}
          activeClassName="bg-sidebar-accent font-medium"
        >
          <Users className="h-5 w-5" />
          {!collapsed && <span>Community</span>}
        </NavLink>

        <NavLink
          to="/settings"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-smooth ${collapsed ? 'justify-center' : ''}`}
          activeClassName="bg-sidebar-accent font-medium"
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {/* Admin Section */}
        {isAdmin && (
          <>
            {!collapsed && (
              <div className="px-4 py-2 mt-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</span>
              </div>
            )}
            <NavLink
              to="/admin/users"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-smooth ${collapsed ? 'justify-center' : ''}`}
              activeClassName="bg-sidebar-accent font-medium"
            >
              <Users className="h-5 w-5" />
              {!collapsed && <span>User Directory</span>}
            </NavLink>
          </>
        )}

        {/* Primary Action Button */}
        {actionConfig.show && (
          <div className="pt-4">
            <Button
              onClick={handlePrimaryAction}
              className={`w-full gap-3 ${collapsed ? 'justify-center px-2' : 'justify-start'}`}
              size="default"
            >
              <Plus className="h-5 w-5" />
              {!collapsed && <span>{actionConfig.label}</span>}
            </Button>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : 'justify-between'}`}>
          <NotificationBell />
          <ThemeToggle />
        </div>
        
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={`w-full gap-3 text-sidebar-foreground hover:bg-sidebar-accent ${collapsed ? 'justify-center px-2' : 'justify-start'}`}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
