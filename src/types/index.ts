export interface Course {
  id: string;
  name: string;
  description: string;
  coverImage: string | null;
  uploadDate: string;
  scormFile: string | null;
  category: string;
}

export interface CourseFormData {
  name: string;
  description: string;
  coverImage: File | null;
  scormFile: File | null;
}

export interface DownloadStatus {
  id: string;
  status: 'not-downloaded' | 'downloading' | 'downloaded';
  progress: number;
}
