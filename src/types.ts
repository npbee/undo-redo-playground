export type Priority = "low" | "medium" | "high";
export type IssueStatus = "todo" | "in-progress" | "completed";

export interface Issue {
  id: string;
  publicId: string;
  status: IssueStatus;
  title: string;
  priority: Priority;
  isArchived: boolean;
}
