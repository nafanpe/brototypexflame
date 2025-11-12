import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, User, LogOut, Home, PlusCircle, Users } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import brototypeLogo from '@/assets/brototype-logo.png';
import { useState } from 'react';

export function MobileSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start text-base" 
            onClick={() => handleNavigate('/community')}
          >
            <Users className="mr-2 h-4 w-4" />
            Community
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start text-base" 
            onClick={() => handleNavigate('/new-complaint')}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Complaint
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start text-base" 
            onClick={() => handleNavigate('/profile')}
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </Button>
        </nav>

        <div className="mt-auto border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <NotificationBell />
            <ThemeToggle />
          </div>
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
