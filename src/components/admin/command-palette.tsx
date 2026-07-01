import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  QrCode,
  GraduationCap,
  BarChart3,
  Settings,
  Plus,
  FileDown,
  Award,
  Megaphone,
} from "lucide-react";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search events, students, payments… or jump to a page" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/admin/events/new")}><Plus className="mr-2 h-4 w-4" />Create event</CommandItem>
          <CommandItem onSelect={() => go("/admin/scanner")}><QrCode className="mr-2 h-4 w-4" />Scan QR</CommandItem>
          <CommandItem onSelect={() => go("/admin/registrations")}><FileDown className="mr-2 h-4 w-4" />Export registrations</CommandItem>
          <CommandItem onSelect={() => go("/admin")}><Megaphone className="mr-2 h-4 w-4" />Send notice</CommandItem>
          <CommandItem onSelect={() => go("/admin")}><Award className="mr-2 h-4 w-4" />Generate certificates</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/admin")}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/admin/events")}><Calendar className="mr-2 h-4 w-4" />Events</CommandItem>
          <CommandItem onSelect={() => go("/admin/registrations")}><Users className="mr-2 h-4 w-4" />Registrations</CommandItem>
          <CommandItem onSelect={() => go("/admin/scanner")}><QrCode className="mr-2 h-4 w-4" />QR Check-in</CommandItem>
          <CommandItem onSelect={() => go("/admin/students")}><GraduationCap className="mr-2 h-4 w-4" />Students</CommandItem>
          <CommandItem onSelect={() => go("/admin/payments")}><CreditCard className="mr-2 h-4 w-4" />Payments</CommandItem>
          <CommandItem onSelect={() => go("/admin/analytics")}><BarChart3 className="mr-2 h-4 w-4" />Analytics</CommandItem>
          <CommandItem onSelect={() => go("/admin/settings")}><Settings className="mr-2 h-4 w-4" />Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
