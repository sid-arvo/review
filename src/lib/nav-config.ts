import type { Permission } from "@/lib/auth/rbac";
import {
  LayoutDashboard,
  Compass,
  Radar,
  SmilePlus,
  Tags,
  MessagesSquare,
  Lightbulb,
  Users,
  Globe2,
  TrendingUp,
  Sparkles,
  FileText,
  ShieldCheck,
  Clock,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  description: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Insights",
    items: [
      { title: "Executive Overview", href: "/overview", icon: LayoutDashboard, description: "Top-line health metrics" },
      { title: "Music Discovery", href: "/discovery-insights", icon: Compass, description: "Why users struggle to discover new music" },
      { title: "Recommendation Health", href: "/recommendation-health", icon: Radar, description: "Surface-level sentiment & repetition" },
      { title: "Sentiment Analysis", href: "/sentiment", icon: SmilePlus, description: "Sentiment & emotion breakdown" },
      { title: "Topic Explorer", href: "/topics", icon: Tags, description: "Topic & subtopic drill-down" },
      { title: "Trend Analysis", href: "/trends", icon: TrendingUp, description: "What's rising and falling over time" },
      { title: "Geographic Trends", href: "/geography", icon: Globe2, description: "Feedback by country & language" },
    ],
  },
  {
    label: "Voice of Customer",
    items: [
      { title: "Review Explorer", href: "/reviews", icon: MessagesSquare, description: "Search & filter raw feedback" },
      { title: "Feature Requests", href: "/feature-requests", icon: Lightbulb, description: "Most requested improvements" },
      { title: "Personas", href: "/personas", icon: Users, description: "Discovery pain points by persona" },
    ],
  },
  {
    label: "AI & Reporting",
    items: [
      { title: "AI Chat", href: "/chat", icon: Sparkles, permission: "use:chat", description: "Ask questions grounded in reviews" },
      { title: "Reports", href: "/reports", icon: FileText, permission: "export:reports", description: "Executive summaries & exports" },
    ],
  },
  {
    label: "Platform",
    items: [
      { title: "Admin", href: "/admin", icon: ShieldCheck, permission: "view:admin", description: "Users, roles & taxonomy" },
      { title: "Cron Monitoring", href: "/cron", icon: Clock, permission: "view:cron", description: "ETL pipeline run history" },
      { title: "Settings", href: "/settings", icon: Settings, description: "Notifications & preferences" },
    ],
  },
];
