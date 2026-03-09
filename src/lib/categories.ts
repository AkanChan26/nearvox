import {
  Briefcase, Megaphone, MessageSquare, Heart, HandHelping,
  ShoppingBag, CalendarDays, AlertTriangle, Lightbulb, Shuffle,
} from "lucide-react";

export const TOPIC_CATEGORIES = [
  { value: "job_hunting", label: "Job Hunting & Hiring", icon: Briefcase, cmd: "01", color: "45 90% 50%" },
  { value: "promotions", label: "Promotions & Marketing", icon: Megaphone, cmd: "02", color: "280 70% 55%" },
  { value: "discussions", label: "Discussions", icon: MessageSquare, cmd: "03", color: "145 80% 56%" },
  { value: "confessions", label: "Confessions", icon: Heart, cmd: "04", color: "340 75% 55%" },
  { value: "local_help", label: "Local Help", icon: HandHelping, cmd: "05", color: "199 91% 56%" },
  { value: "marketplace", label: "Marketplace", icon: ShoppingBag, cmd: "06", color: "25 90% 55%" },
  { value: "events", label: "Events & Meetups", icon: CalendarDays, cmd: "07", color: "170 70% 50%" },
  { value: "alerts", label: "Alerts & Warnings", icon: AlertTriangle, cmd: "08", color: "0 85% 55%" },
  { value: "ideas", label: "Ideas & Startups", icon: Lightbulb, cmd: "09", color: "55 85% 55%" },
  { value: "random", label: "Random", icon: Shuffle, cmd: "10", color: "145 50% 40%" },
] as const;

export type TopicCategoryValue = typeof TOPIC_CATEGORIES[number]["value"];

export const getCategoryLabel = (value: string) =>
  TOPIC_CATEGORIES.find((c) => c.value === value)?.label || value;

export const getCategoryIcon = (value: string) =>
  TOPIC_CATEGORIES.find((c) => c.value === value)?.icon || MessageSquare;

export const getCategoryColor = (value: string) =>
  TOPIC_CATEGORIES.find((c) => c.value === value)?.color || "145 80% 56%";
