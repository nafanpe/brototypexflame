import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, LogOut, Home, Plus, Users, UserCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import brototypeLogo from '@/assets/brototype-logo.png';
import { useState, useEffect } from 'react';

export function MobileSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

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
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <img src={brototypeLogo} alt="Brototype" className="h-8" />
            <span className="font-bold">Brototype Connect</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-grow flex flex-col gap-2 mt-8">
          <Button 
            variant="ghost" 
            className="justify-start text-base" 
            onClick={() => handleNavigate('/dashboard')}
          >
            <Home className="mr-2 h-5 w-5" />
            Dashboard
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start text-base" 
            onClick={() => handleNavigate('/community')}
          >
            <Users className="mr-2 h-5 w-5" />
            Community
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start text-base" 
            onClick={() => handleNavigate('/settings')}
          >
            <UserCircle className="mr-2 h-5 w-5" />
            Settings
          </Button>

          {/* Primary Action */}
          <div className="pt-4">
            <Button 
              className="w-full justify-start gap-3" 
              onClick={() => handleNavigate('/new-complaint')}
            >
              <Plus className="h-5 w-5" />
              New Complaint
            </Button>
          </div>
        </nav>

        <div className="mt-auto border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
