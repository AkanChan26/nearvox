import React from "react";

// 10 user avatars (green outline, distinct identity shapes) + 1 admin avatar (blue outline)

interface AvatarIconProps {
  size?: number;
  className?: string;
}

const Svg = ({ children, size = 40, className = "" }: { children: React.ReactNode; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {children}
  </svg>
);

const C = "hsl(145, 80%, 56%)";

// 1 - Fox
export const UserAvatar1 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <path d="M10 8l5 10h10l5-10" stroke={C} strokeWidth="1.3" fill="none" />
    <path d="M15 18c0 3 2.2 6 5 6s5-3 5-6" stroke={C} strokeWidth="1.3" fill="none" />
    <circle cx="17" cy="17" r="1.2" fill={C} />
    <circle cx="23" cy="17" r="1.2" fill={C} />
    <path d="M18.5 21l1.5 1.5 1.5-1.5" stroke={C} strokeWidth="1" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={C} strokeWidth="1.5" fill="none" />
  </Svg>
);

// 2 - Owl
export const UserAvatar2 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <ellipse cx="20" cy="16" rx="8" ry="9" stroke={C} strokeWidth="1.3" fill="none" />
    <circle cx="16.5" cy="14.5" r="3" stroke={C} strokeWidth="1.2" fill="none" />
    <circle cx="23.5" cy="14.5" r="3" stroke={C} strokeWidth="1.2" fill="none" />
    <circle cx="16.5" cy="14.5" r="1" fill={C} />
    <circle cx="23.5" cy="14.5" r="1" fill={C} />
    <path d="M19 19l1 1.5 1-1.5" stroke={C} strokeWidth="1" fill="none" />
    <path d="M12 9l4 3M28 9l-4 3" stroke={C} strokeWidth="1.2" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={C} strokeWidth="1.5" fill="none" />
  </Svg>
);

// 3 - Wolf
export const UserAvatar3 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <path d="M12 7l3 11h10l3-11" stroke={C} strokeWidth="1.3" fill="none" />
    <path d="M15 18v4c0 2 2.2 4 5 4s5-2 5-4v-4" stroke={C} strokeWidth="1.3" fill="none" />
    <circle cx="17" cy="16" r="1" fill={C} />
    <circle cx="23" cy="16" r="1" fill={C} />
    <path d="M17 22h6" stroke={C} strokeWidth="0.8" />
    <path d="M16 22l-1 1M24 22l1 1" stroke={C} strokeWidth="0.8" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={C} strokeWidth="1.5" fill="none" />
  </Svg>
);

// 4 - Mask (anonymous/theatrical)
export const UserAvatar4 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <path d="M10 13c0-3 4-6 10-6s10 3 10 6v5c0 5-4 8-10 8S10 23 10 18v-5z" stroke={C} strokeWidth="1.3" fill="none" />
    <path d="M14 14h4v3h-4zM22 14h4v3h-4z" stroke={C} strokeWidth="1" fill="none" />
    <path d="M18 22c0 1 1 2 2 2s2-1 2-2" stroke={C} strokeWidth="1" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={C} strokeWidth="1.5" fill="none" />
  </Svg>
);

// 5 - Cat
export const UserAvatar5 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <path d="M12 10l2 8h12l2-8" stroke={C} strokeWidth="1.3" fill="none" />
    <ellipse cx="20" cy="18" rx="6" ry="5" stroke={C} strokeWidth="1.3" fill="none" />
    <path d="M17 17v1.5M23 17v1.5" stroke={C} strokeWidth="1.2" />
    <path d="M18.5 20l1.5 1 1.5-1" stroke={C} strokeWidth="0.8" fill="none" />
    <path d="M14 19l10 0M14 20l-3 1M26 20l3 1" stroke={C} strokeWidth="0.6" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={C} strokeWidth="1.5" fill="none" />
  </Svg>
);

// 6 - Robot
export const UserAvatar6 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <rect x="13" y="9" width="14" height="14" rx="2" stroke={C} strokeWidth="1.3" fill="none" />
    <rect x="15.5" y="13" width="3" height="3" rx="0.5" stroke={C} strokeWidth="1" fill="none" />
    <rect x="21.5" y="13" width="3" height="3" rx="0.5" stroke={C} strokeWidth="1" fill="none" />
    <path d="M17 20h6" stroke={C} strokeWidth="1" />
    <path d="M20 6v3" stroke={C} strokeWidth="1" />
    <circle cx="20" cy="5.5" r="1" stroke={C} strokeWidth="0.8" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={C} strokeWidth="1.5" fill="none" />
  </Svg>
);

// 7 - Skull
export const UserAvatar7 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <path d="M12 15c0-5 3.5-9 8-9s8 4 8 9v3c0 3-2 5-4 5.5V26h-2v-2h-4v2h-2v-2.5c-2-.5-4-2.5-4-5.5v-3z" stroke={C} strokeWidth="1.3" fill="none" />
    <circle cx="17" cy="14" r="2" stroke={C} strokeWidth="1" fill="none" />
    <circle cx="23" cy="14" r="2" stroke={C} strokeWidth="1" fill="none" />
    <path d="M18 19.5l2 1.5 2-1.5" stroke={C} strokeWidth="0.8" fill="none" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={C} strokeWidth="1.5" fill="none" />
  </Svg>
);

// 8 - Dragon
export const UserAvatar8 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <path d="M10 12l3 2v6c0 3 3 5 7 5s7-2 7-5v-6l3-2" stroke={C} strokeWidth="1.3" fill="none" />
    <path d="M10 12l-2-5 5 3M30 12l2-5-5 3" stroke={C} strokeWidth="1" fill="none" />
    <circle cx="17" cy="16" r="1.2" fill={C} />
    <circle cx="23" cy="16" r="1.2" fill={C} />
    <path d="M17 21h6" stroke={C} strokeWidth="0.8" />
    <path d="M18 21v1M20 21v1.5M22 21v1" stroke={C} strokeWidth="0.6" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={C} strokeWidth="1.5" fill="none" />
  </Svg>
);

// 9 - Phantom (ghost-like)
export const UserAvatar9 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <path d="M12 14c0-5 3.5-8 8-8s8 3 8 8v10l-3-2-2.5 2-2.5-2-2.5 2-2.5-2-3 2V14z" stroke={C} strokeWidth="1.3" fill="none" />
    <circle cx="17" cy="14" r="1.5" fill={C} />
    <circle cx="23" cy="14" r="1.5" fill={C} />
    <path d="M18 18h4" stroke={C} strokeWidth="0.8" />
  </Svg>
);

// 10 - Shield (knight/protector)
export const UserAvatar10 = ({ size, className }: AvatarIconProps) => (
  <Svg size={size} className={className}>
    <circle cx="20" cy="20" r="19" stroke={C} strokeWidth="1.5" fill="none" />
    <path d="M20 5l8 4v8c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V9l8-4z" stroke={C} strokeWidth="1.3" fill="none" />
    <circle cx="20" cy="14" r="2.5" stroke={C} strokeWidth="1" fill="none" />
    <path d="M20 17v4" stroke={C} strokeWidth="1" />
    <path d="M17 20h6" stroke={C} strokeWidth="0.8" />
    <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={C} strokeWidth="1.5" fill="none" />
  </Svg>
);

// Admin Avatar - Blue outline stick figure
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
  { id: "user-1", label: "Fox", Component: UserAvatar1 },
  { id: "user-2", label: "Owl", Component: UserAvatar2 },
  { id: "user-3", label: "Wolf", Component: UserAvatar3 },
  { id: "user-4", label: "Mask", Component: UserAvatar4 },
  { id: "user-5", label: "Cat", Component: UserAvatar5 },
  { id: "user-6", label: "Robot", Component: UserAvatar6 },
  { id: "user-7", label: "Skull", Component: UserAvatar7 },
  { id: "user-8", label: "Dragon", Component: UserAvatar8 },
  { id: "user-9", label: "Phantom", Component: UserAvatar9 },
  { id: "user-10", label: "Shield", Component: UserAvatar10 },
] as const;

export const ADMIN_AVATAR = { id: "admin", label: "Admin", Component: AdminAvatar };

export function getAvatarComponent(avatarId: string | null | undefined, isAdmin: boolean = false) {
  if (isAdmin) return AdminAvatar;
  const found = USER_AVATARS.find((a) => a.id === avatarId);
  return found ? found.Component : UserAvatar1;
}

export function ProfileAvatar({ avatarId, isAdmin = false, size = 32, className = "" }: {
  avatarId?: string | null;
  isAdmin?: boolean;
  size?: number;
  className?: string;
}) {
  const AvatarComp = getAvatarComponent(avatarId, isAdmin);
  return <AvatarComp size={size} className={className} />;
}
