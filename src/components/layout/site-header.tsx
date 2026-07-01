"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Moon, Sun, LogOut, User as UserIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import type { UserRole } from "@prisma/client";

interface SiteHeaderProps {
  title: string;
  description?: string;
  user: { name: string | null; email: string; role: UserRole };
  actions?: React.ReactNode;
}

export function SiteHeader({ title, description, user, actions }: SiteHeaderProps) {
  const { theme, setTheme } = useTheme();
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 border-b bg-background/80 backdrop-blur-sm px-4 py-3">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">{title}</h1>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0 transition-transform absolute" />
          <Moon className="size-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100 transition-transform" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-medium">{user.name ?? user.email}</span>
              <span className="text-xs font-normal text-muted-foreground">{ROLE_LABELS[user.role]}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings">
                <UserIcon /> Account settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/auth/signout">
                <LogOut /> Sign out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 pl-1">{actions}</div>}
    </header>
  );
}
