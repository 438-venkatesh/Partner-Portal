import { apiClient } from './client';

// ---- service catalog ----

export interface CatalogService {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceCategory: string;
  description: string | null;
  requiredDocuments: string[];
  isActive: boolean;
}

export interface CreateServiceInput {
  serviceCode: string;
  serviceName: string;
  serviceCategory: string;
  description?: string;
  requiredDocuments?: string[];
  isActive?: boolean;
}

export interface ServiceImportReport {
  total: number;
  succeeded: number;
  failed: number;
  rows: Array<{ row: number; status: 'created' | 'error'; serviceId?: string; error?: string }>;
}

// ---- training ----

export interface TrainingCourse {
  courseId: string;
  title: string;
  description: string | null;
  partnerType: string | null;
  minTier: string | null;
  estimatedMinutes: number | null;
  passingScorePercent: number;
  sortOrder: number;
  isActive: boolean;
}

export interface TrainingLesson {
  lessonId: string;
  courseId: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  sortOrder: number;
}

export interface TrainingQuizQuestion {
  questionId: string;
  courseId: string;
  questionText: string;
  options: string[];
  correctOptionIndex?: number;
  sortOrder: number;
}

export interface LearningPath {
  pathId: string;
  name: string;
  description: string | null;
  partnerType: string | null;
  minTier: string | null;
  courseIds: string[];
  isActive: boolean;
}

export interface TrainingEnrollment {
  enrollmentId: string;
  courseId: string;
  accountId: string;
  partnerId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  completedLessonIds: string[];
  quizScorePercent: number | null;
  quizAttempts: number;
  certificateIssuedAt: string | null;
  course?: TrainingCourse;
}

// ---- enablement content ----

export interface SalesPlaybook {
  playbookId: string;
  title: string;
  dealStage: string | null;
  partnerType: string | null;
  content: string;
  recommendedAssetIds: string[];
  isActive: boolean;
}

export interface MarketingAsset {
  assetId: string;
  title: string;
  description: string | null;
  category: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  partnerType: string | null;
  minTier: string | null;
  tags: string[];
  downloadCount: number;
  isActive: boolean;
}

export const enablementApi = {
  // ---- admin: service catalog ----
  listAllServices: async () => {
    const { data } = await apiClient.get<{ services: CatalogService[] }>('/services/catalog/all');
    return data.services;
  },
  createService: async (input: CreateServiceInput) => {
    const { data } = await apiClient.post<{ service: CatalogService }>('/services/catalog', input);
    return data.service;
  },
  updateService: async (serviceId: string, patch: Partial<CreateServiceInput>) => {
    const { data } = await apiClient.patch<{ service: CatalogService }>(`/services/catalog/${serviceId}`, patch);
    return data.service;
  },
  deleteService: async (serviceId: string) => {
    await apiClient.delete(`/services/catalog/${serviceId}`);
  },
  importServicesCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<ServiceImportReport>('/services/catalog/import', formData);
    return data;
  },

  // ---- admin: training ----
  listCourses: async () => {
    const { data } = await apiClient.get<{ courses: TrainingCourse[] }>('/training/courses');
    return data.courses;
  },
  getCourseWithContent: async (courseId: string) => {
    const { data } = await apiClient.get<{
      course: TrainingCourse;
      lessons: TrainingLesson[];
      questions: TrainingQuizQuestion[];
    }>(`/training/courses/${courseId}`);
    return data;
  },
  createCourse: async (input: Partial<TrainingCourse>) => {
    const { data } = await apiClient.post<{ course: TrainingCourse }>('/training/courses', input);
    return data.course;
  },
  updateCourse: async (courseId: string, patch: Partial<TrainingCourse>) => {
    const { data } = await apiClient.patch<{ course: TrainingCourse }>(`/training/courses/${courseId}`, patch);
    return data.course;
  },
  deleteCourse: async (courseId: string) => {
    await apiClient.delete(`/training/courses/${courseId}`);
  },
  addLesson: async (courseId: string, input: { title: string; content?: string; videoUrl?: string; sortOrder?: number }) => {
    const { data } = await apiClient.post<{ lesson: TrainingLesson }>(`/training/courses/${courseId}/lessons`, input);
    return data.lesson;
  },
  deleteLesson: async (lessonId: string) => {
    await apiClient.delete(`/training/lessons/${lessonId}`);
  },
  setQuizQuestions: async (
    courseId: string,
    questions: Array<{ questionText: string; options: string[]; correctOptionIndex: number; sortOrder?: number }>
  ) => {
    const { data } = await apiClient.put<{ questions: TrainingQuizQuestion[] }>(`/training/courses/${courseId}/quiz`, {
      questions,
    });
    return data.questions;
  },
  listLearningPaths: async () => {
    const { data } = await apiClient.get<{ paths: LearningPath[] }>('/training/paths');
    return data.paths;
  },
  createLearningPath: async (input: { name: string; description?: string; partnerType?: string; minTier?: string; courseIds: string[] }) => {
    const { data } = await apiClient.post<{ path: LearningPath }>('/training/paths', input);
    return data.path;
  },
  updateLearningPath: async (pathId: string, patch: Partial<LearningPath>) => {
    const { data } = await apiClient.patch<{ path: LearningPath }>(`/training/paths/${pathId}`, patch);
    return data.path;
  },
  deleteLearningPath: async (pathId: string) => {
    await apiClient.delete(`/training/paths/${pathId}`);
  },

  // ---- admin: playbooks & assets ----
  listPlaybooks: async () => {
    const { data } = await apiClient.get<{ playbooks: SalesPlaybook[] }>('/enablement/playbooks');
    return data.playbooks;
  },
  createPlaybook: async (input: Partial<SalesPlaybook>) => {
    const { data } = await apiClient.post<{ playbook: SalesPlaybook }>('/enablement/playbooks', input);
    return data.playbook;
  },
  updatePlaybook: async (playbookId: string, patch: Partial<SalesPlaybook>) => {
    const { data } = await apiClient.patch<{ playbook: SalesPlaybook }>(`/enablement/playbooks/${playbookId}`, patch);
    return data.playbook;
  },
  deletePlaybook: async (playbookId: string) => {
    await apiClient.delete(`/enablement/playbooks/${playbookId}`);
  },
  listAssets: async () => {
    const { data } = await apiClient.get<{ assets: MarketingAsset[] }>('/enablement/assets');
    return data.assets;
  },
  uploadAsset: async (file: File, meta: { title: string; description?: string; category?: string; partnerType?: string; minTier?: string; tags?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', meta.title);
    if (meta.description) formData.append('description', meta.description);
    if (meta.category) formData.append('category', meta.category);
    if (meta.partnerType) formData.append('partnerType', meta.partnerType);
    if (meta.minTier) formData.append('minTier', meta.minTier);
    if (meta.tags) formData.append('tags', meta.tags);
    const { data } = await apiClient.post<{ asset: MarketingAsset }>('/enablement/assets', formData);
    return data.asset;
  },
  updateAsset: async (assetId: string, patch: Partial<MarketingAsset>) => {
    const { data } = await apiClient.patch<{ asset: MarketingAsset }>(`/enablement/assets/${assetId}`, patch);
    return data.asset;
  },
  deleteAsset: async (assetId: string) => {
    await apiClient.delete(`/enablement/assets/${assetId}`);
  },

  // ---- partner-facing: training ----
  listAvailableTraining: async () => {
    const { data } = await apiClient.get<{ courses: TrainingCourse[]; paths: LearningPath[] }>('/partner-training');
    return data;
  },
  getCourseForPartner: async (courseId: string) => {
    const { data } = await apiClient.get<{
      course: TrainingCourse;
      lessons: TrainingLesson[];
      questions: TrainingQuizQuestion[];
    }>(`/partner-training/courses/${courseId}`);
    return data;
  },
  completeLesson: async (courseId: string, lessonId: string) => {
    const { data } = await apiClient.post<{ enrollment: TrainingEnrollment }>(
      `/partner-training/courses/${courseId}/lessons/${lessonId}/complete`
    );
    return data.enrollment;
  },
  submitQuiz: async (courseId: string, answers: number[]) => {
    const { data } = await apiClient.post<{ enrollment: TrainingEnrollment; scorePercent: number; passed: boolean }>(
      `/partner-training/courses/${courseId}/quiz`,
      { answers }
    );
    return data;
  },
  getMyProgress: async () => {
    const { data } = await apiClient.get<{ progress: TrainingEnrollment[] }>('/partner-training/my-progress');
    return data.progress;
  },

  // ---- partner-facing: playbooks & assets ----
  listPlaybooksForPartner: async (dealStage?: string) => {
    const { data } = await apiClient.get<{ playbooks: SalesPlaybook[] }>('/partner-enablement/playbooks', {
      params: { dealStage },
    });
    return data.playbooks;
  },
  listAssetsForPartner: async () => {
    const { data } = await apiClient.get<{ assets: MarketingAsset[] }>('/partner-enablement/assets');
    return data.assets;
  },
  recordAssetDownload: async (assetId: string) => {
    const { data } = await apiClient.post<{ asset: MarketingAsset }>(`/partner-enablement/assets/${assetId}/download`);
    return data.asset;
  },
};
