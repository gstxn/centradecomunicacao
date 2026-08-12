export interface User {
  name: string;
  role: string;
  avatar: string;
}

export const currentUser: User = {
  name: "Administrador Geral",
  role: "Sistema SaaS",
  avatar: "https://i.pravatar.cc/150?u=admin"
};

export interface UrgentNotice {
  id: string;
  tag: string;
  title: string;
  description: string;
  date: string;
  imageUrl?: string;
}

export const urgentNotice: UrgentNotice | null = null;

export interface PendingMetrics {
  unread: number;
  mandatory: number;
  nearestDeadlineDays: number;
  nearestDeadlineDate: string;
  readingProgress: number;
}

export const metrics: PendingMetrics = {
  unread: 0,
  mandatory: 0,
  nearestDeadlineDays: 0,
  nearestDeadlineDate: "-",
  readingProgress: 0
};

export interface QuickAccessItem {
  id: string;
  name: string;
  icon: string;
  url: string;
}

export const quickAccess: QuickAccessItem[] = [];

export interface UpdateItem {
  id: string;
  title: string;
  category: string;
  department: string;
  date: string;
  target: string;
  iconType: 'document' | 'server' | 'shield' | 'report';
  tagColor: 'green' | 'gray' | 'purple' | 'orange';
}

export const latestUpdates: UpdateItem[] = [];

export interface CalendarEvent {
  id: string;
  day: string;
  month: string;
  title: string;
  time: string;
  location: string;
  color: string;
}

export const calendarEvents: CalendarEvent[] = [];
