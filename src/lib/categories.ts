import {
  Briefcase, Megaphone, MessageSquare, Heart, HandHelping,
  ShoppingBag, CalendarDays, AlertTriangle, Lightbulb, Shuffle,
} from "lucide-react";

export const TOPIC_CATEGORIES = [
  { value: "job_hunting", label: "Job Hunting & Hiring", icon: Briefcase, cmd: "01" },
  { value: "promotions", label: "Promotions & Marketing", icon: Megaphone, cmd: "02" },
  { value: "discussions", label: "Discussions", icon: MessageSquare, cmd: "03" },
  { value: "confessions", label: "Confessions", icon: Heart, cmd: "04" },
  { value: "local_help", label: "Local Help", icon: HandHelping, cmd: "05" },
  { value: "marketplace", label: "Marketplace", icon: ShoppingBag, cmd: "06" },
  { value: "events", label: "Events & Meetups", icon: CalendarDays, cmd: "07" },
  { value: "alerts", label: "Alerts & Warnings", icon: AlertTriangle, cmd: "08" },
  { value: "ideas", label: "Ideas & Startups", icon: Lightbulb, cmd: "09" },
  { value: "random", label: "Random", icon: Shuffle, cmd: "10" },
] as const;

export type TopicCategoryValue = typeof TOPIC_CATEGORIES[number]["value"];

export const getCategoryLabel = (value: string) =>
  TOPIC_CATEGORIES.find((c) => c.value === value)?.label || value;

export const getCategoryIcon = (value: string) =>
  TOPIC_CATEGORIES.find((c) => c.value === value)?.icon || MessageSquare;
