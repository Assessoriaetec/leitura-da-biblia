
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  streak: number;
  progress: number;
  lastReading: string;
}

export interface ReadingDay {
  day: number;
  date: string;
  passage: string;
  estimatedTime: string;
  theme: string;
  category: string;
  book: string;
  content: string[];
}

export interface Post {
  id: string;
  user: Partial<User>;
  timestamp: string;
  category: string;
  content: string;
  likes: number;
  comments: number;
  image?: string;
  location?: string;
}
