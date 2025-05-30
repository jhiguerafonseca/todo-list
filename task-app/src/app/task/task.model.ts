export interface Task {
  id?: string; // Optional as Firestore will generate it on creation
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt?: Date; // Optional: for ordering or display
}
