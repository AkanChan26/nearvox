import React from "react";

// 10 user avatars (green outline, various styles) + 1 admin avatar (blue outline, generic stick figure)

interface AvatarIconProps {
  size?: number;
  className?: string;
}

// Helper to create SVG wrapper
const Svg = ({ children, size = 40, className = "" }: { children: React.ReactNode; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {children}
  </svg>
);

// User Avatar 1 - Short hair (masculine)
export const UserAvatar1 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="15" r="7" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M13 10c0-4 3-7 7-7s7 3 7 7" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
  </Svg>
);

// User Avatar 2 - Long hair (feminine)
export const UserAvatar2 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="14" r="6.5" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M12 12c0-5 3.5-9 8-9s8 4 8 9v6c0 0-2-1-3-1" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
    <path d="M12 12v8c0 0 2-1 3-1" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
  </Svg>
);

// User Avatar 3 - Spiky hair
export const UserAvatar3 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="15" r="6.5" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M14 11l-1-5 3 3 2-4 2 4 3-3-1 5" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
  </Svg>
);

// User Avatar 4 - Cap/hat
export const UserAvatar4 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="16" r="6" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M12 12h16" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" />
    <path d="M10 12h20v-2c0-2-4-4-10-4S10 8 10 10v2z" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
  </Svg>
);

// User Avatar 5 - Round face with glasses
export const UserAvatar5 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="15" r="7" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="17" cy="14" r="2.5" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
    <circle cx="23" cy="14" r="2.5" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
    <line x1="19.5" y1="14" x2="20.5" y2="14" stroke="hsl(145, 80%, 56%)" strokeWidth="1" />
  </Svg>
);

// User Avatar 6 - Ponytail
export const UserAvatar6 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="15" r="6.5" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M14 9c0-3 2.5-6 6-6s6 3 6 6" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
    <path d="M26 10c2 0 3 1 3 3v5c0 1-1 2-2 2" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
  </Svg>
);

// User Avatar 7 - Mohawk
export const UserAvatar7 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="16" r="6.5" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M18 10V4c0-1 1-2 2-2s2 1 2 2v6" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
  </Svg>
);

// User Avatar 8 - Curly hair
export const UserAvatar8 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="15" r="6.5" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M13 12c-1-3 1-7 4-8M27 12c1-3-1-7-4-8M15 5c1-2 3-3 5-3s4 1 5 3" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
    <circle cx="13" cy="13" r="1.5" stroke="hsl(145, 80%, 56%)" strokeWidth="0.8" fill="none" />
    <circle cx="27" cy="13" r="1.5" stroke="hsl(145, 80%, 56%)" strokeWidth="0.8" fill="none" />
  </Svg>
);

// User Avatar 9 - Headband
export const UserAvatar9 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="15" r="7" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M13 12h14" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" />
    <path d="M14 9c0-3 2.5-5 6-5s6 2 6 5" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
  </Svg>
);

// User Avatar 10 - Hoodie
export const UserAvatar10 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="15" r="6" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="hsl(145, 80%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M11 23c-2-3-1-8 2-11h14c3 3 4 8 2 11" stroke="hsl(145, 80%, 56%)" strokeWidth="1" fill="none" />
    <path d="M17 23v4M23 23v4" stroke="hsl(145, 80%, 56%)" strokeWidth="0.8" />
  </Svg>
);

// Admin Avatar - Blue outline stick figure, generic, no gender
export const AdminAvatar = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke="hsl(199, 91%, 56%)" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="14" r="5.5" stroke="hsl(199, 91%, 56%)" strokeWidth="1.5" fill="none" />
    <path d="M10 35c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="hsl(199, 91%, 56%)" strokeWidth="1.5" fill="none" />
    <line x1="17" y1="13" x2="18.5" y2="13" stroke="hsl(199, 91%, 56%)" strokeWidth="1.2" />
    <line x1="21.5" y1="13" x2="23" y2="13" stroke="hsl(199, 91%, 56%)" strokeWidth="1.2" />
    <line x1="18" y1="17" x2="22" y2="17" stroke="hsl(199, 91%, 56%)" strokeWidth="1" />
  </Svg>
);

// Avatar registry
export const USER_AVATARS = [
  { id: "user-1", label: "Short Hair", Component: UserAvatar1 },
  { id: "user-2", label: "Long Hair", Component: UserAvatar2 },
  { id: "user-3", label: "Spiky", Component: UserAvatar3 },
  { id: "user-4", label: "Cap", Component: UserAvatar4 },
  { id: "user-5", label: "Glasses", Component: UserAvatar5 },
  { id: "user-6", label: "Ponytail", Component: UserAvatar6 },
  { id: "user-7", label: "Mohawk", Component: UserAvatar7 },
  { id: "user-8", label: "Curly", Component: UserAvatar8 },
  { id: "user-9", label: "Headband", Component: UserAvatar9 },
  { id: "user-10", label: "Hoodie", Component: UserAvatar10 },
] as const;

export const ADMIN_AVATAR = { id: "admin", label: "Admin", Component: AdminAvatar };

// Helper to get avatar component by id
export function getAvatarComponent(avatarId: string | null | undefined, isAdmin: boolean = false) {
  if (isAdmin) return AdminAvatar;
  const found = USER_AVATARS.find((a) => a.id === avatarId);
  return found ? found.Component : UserAvatar1;
}

// Render helper
export function ProfileAvatar({ avatarId, isAdmin = false, size = 32, className = "" }: {
  avatarId?: string | null;
  isAdmin?: boolean;
  size?: number;
  className?: string;
}) {
  const AvatarComp = getAvatarComponent(avatarId, isAdmin);
  return <AvatarComp size={size} className={className} />;
}