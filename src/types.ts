export interface User {
  uid: string;
  email: string;
  role: 'user' | 'admin' | 'premium';
  credits: number;
  api_usage?: number;
  createdAt: string;
}

export interface Subscription {
  id?: string;
  user_id: string;
  plan: 'basic' | 'pro';
  status: 'active' | 'inactive';
  renewal_date: string;
}

export interface Setting {
  id?: string;
  key: string;
  value: string;
}

export interface Search {
  id?: string;
  userId: string;
  query: string;
  hasImage?: boolean;
  thumbnail?: string;
  backThumbnail?: string;
  trustScore: number;
  redFlags: string[];
  greenFlags: string[];
  idType?: string;
  reasoning?: string;
  createdAt: string;
}

export interface Report {
  id?: string;
  userId: string;
  scammerName: string;
  scammerDetails: string;
  description: string;
  status: 'pending' | 'reviewed' | 'blacklisted';
  createdAt: string;
}

export interface BlacklistEntry {
  id?: string;
  identifier: string;
  reason: string;
  addedBy: string;
  createdAt: string;
}

export interface Task {
  id?: string;
  title: string;
  status: 'pending' | 'completed';
  createdAt: string;
}
