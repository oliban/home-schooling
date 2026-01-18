// Use relative path in production (when env var not set), absolute path in development
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

type FetchOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; name: string }) =>
    fetchApi<{ token: string; user: { id: string; email: string; name: string } }>('/auth/register', {
      method: 'POST',
      body: data,
    }),

  login: (data: { email: string; password: string }) =>
    fetchApi<{ token: string; user: { id: string; email: string; name: string } }>('/auth/login', {
      method: 'POST',
      body: data,
    }),

  childLogin: (data: { childId: string; pin: string }) =>
    fetchApi<{
      token: string;
      child: { id: string; name: string; grade_level: number; coins: number; streak: number };
    }>('/auth/child-login', {
      method: 'POST',
      body: data,
    }),

  getChildren: (parentId: string) =>
    fetchApi<{ id: string; name: string }[]>(`/auth/children/${parentId}`),
};

// Children (for parent)
export const children = {
  list: (token: string) =>
    fetchApi<{
      id: string;
      name: string;
      birthdate: string | null;
      grade_level: number;
      coins: number;
      hasPin: boolean;
      brainrotCount: number;
      brainrotValue: number;
      activeAssignments: number;
      completedAssignments: number;
    }[]>('/children', { token }),

  create: (token: string, data: { name: string; birthdate?: string; grade_level: number; pin?: string }) =>
    fetchApi<{ id: string }>('/children', { method: 'POST', body: data, token }),

  get: (token: string, id: string) =>
    fetchApi<{
      id: string;
      name: string;
      grade_level: number;
      coins: number;
      totalEarned: number;
      currentStreak: number;
    }>(`/children/${id}`, { token }),

  update: (token: string, id: string, data: Partial<{ name: string; grade_level: number; pin: string | null }>) =>
    fetchApi<{ success: boolean }>(`/children/${id}`, { method: 'PUT', body: data, token }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean }>(`/children/${id}`, { method: 'DELETE', token }),

  getProgress: (token: string, id: string) =>
    fetchApi<{
      childName: string;
      total_assignments: number;
      completed_assignments: number;
      math_correct: number;
      math_total: number;
      reading_correct: number;
      reading_total: number;
    }>(`/children/${id}/progress`, { token }),

  getStats: (token: string, period?: '7d' | '30d' | 'all') =>
    fetchApi<{
      childId: string;
      childName: string;
      math: { correct: number; incorrect: number };
      reading: { correct: number; incorrect: number };
    }[]>(`/children/stats${period ? `?period=${period}` : ''}`, { token }),

  getStatsByDate: (token: string, period?: '7d' | '30d' | 'all') =>
    fetchApi<{
      date: string;
      childId: string;
      childName: string;
      subject: 'math' | 'reading';
      correct: number;
      incorrect: number;
    }[]>(`/children/stats-by-date${period ? `?period=${period}` : ''}`, { token }),
};

// Assignments
export const assignments = {
  list: (token: string, filters?: { status?: string; type?: string; childId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.childId) params.set('childId', filters.childId);
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<{
      id: string;
      child_id: string;
      child_name: string;
      assignment_type: 'math' | 'reading';
      title: string;
      status: string;
      created_at: string;
      completed_at: string | null;
      correct_count: number;
      total_count: number;
    }[]>(`/assignments${query}`, { token });
  },

  get: (token: string, id: string) =>
    fetchApi<{
      id: string;
      parent_id: string;
      child_id: string;
      assignment_type: 'math' | 'reading';
      title: string;
      grade_level: number;
      status: string;
      package_id: string | null;
      hints_allowed?: number;
      created_at: string;
      completed_at: string | null;
      questions: Array<{
        id: string;
        problem_number?: number;
        question_number?: number;
        question_text: string;
        correct_answer: string;
        answer_type: string;
        options: string | null;
        explanation: string | null;
        hint: string | null;
        difficulty?: string;
        child_answer: string | null;
        is_correct: number | null;
        answered_at?: string | null;
        attempts_count?: number;
        hint_purchased?: number;
        scratch_pad_image?: string | null;
      }>;
    }>(`/assignments/${id}`, { token }),

  create: (
    token: string,
    data: {
      childId: string;
      type: 'math' | 'reading';
      title: string;
      gradeLevel?: number;
      problems?: Array<{
        question_text: string;
        correct_answer: string;
        answer_type?: string;
        options?: string[];
        explanation?: string;
        hint?: string;
        difficulty?: string;
        category_id?: string;
      }>;
      questions?: Array<{
        question_text: string;
        correct_answer: string;
        options: string[];
        difficulty?: string;
        chapter_id?: string;
      }>;
    }
  ) => fetchApi<{ id: string }>('/assignments', { method: 'POST', body: data, token }),

  submit: (token: string, assignmentId: string, data: { questionId: string; answer: string; scratchPadImages?: string[]; scratchPadImage?: string | null }) =>
    fetchApi<{
      isCorrect: boolean;
      correctAnswer?: string;
      coinsEarned: number;
      totalCoins: number;
      streak: number;
      // Multi-attempt fields
      attemptNumber: number;
      canRetry: boolean;
      maxAttempts: number;
      potentialReward: number;
      canBuyHint: boolean;
      hintCost: number;
      explanation?: string;
      questionComplete: boolean;
    }>(`/assignments/${assignmentId}/submit`, { method: 'POST', body: data, token }),

  buyHint: (token: string, assignmentId: string, questionId: string) =>
    fetchApi<{
      success: boolean;
      hint: string;
      coinsCost: number;
      newBalance: number;
    }>(`/assignments/${assignmentId}/hint/${questionId}`, { method: 'POST', token }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean }>(`/assignments/${id}`, { method: 'DELETE', token }),

  reorder: (token: string, orderedIds: string[], statusUpdates?: Record<string, string>) =>
    fetchApi<{ success: boolean }>('/assignments/reorder', { method: 'PATCH', body: { assignmentIds: orderedIds, statusUpdates }, token }),
};

// Collectibles
export const collectibles = {
  list: (token: string) =>
    fetchApi<{
      collectibles: {
        id: string;
        name: string;
        ascii_art: string;
        price: number;
        rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret';
        owned: boolean;
        pronunciation?: string | null;
      }[];
      unlockedCount: number;
      totalCount: number;
    }>('/collectibles', { token }),

  owned: (token: string) =>
    fetchApi<{
      id: string;
      name: string;
      ascii_art: string;
      price: number;
      rarity: string;
      acquired_at: string;
    }[]>('/collectibles/owned', { token }),

  buy: (token: string, id: string) =>
    fetchApi<{
      success: boolean;
      collectible: { id: string; name: string; ascii_art: string };
      newBalance: number;
    }>(`/collectibles/${id}/buy`, { method: 'POST', token }),
};

// Curriculum
export const curriculum = {
  getCoverage: (token: string, childId: string) =>
    fetchApi<{
      childId: string;
      childGradeLevel: number;
      categories: {
        categoryId: string;
        categoryName: string;
        totalObjectives: number;
        coveredObjectives: number;
        coveragePercentage: number;
        objectives: {
          id: number;
          code: string;
          description: string;
          isCovered: boolean;
          completedAt: string | null;
        }[];
      }[];
      totalObjectives: number;
      coveredObjectives: number;
      coveragePercentage: number;
    }>(`/curriculum/coverage/${childId}`, { token }),

  getMatchingPackages: (token: string, childId: string, objectiveIds: number[]) =>
    fetchApi<{
      packages: Array<{
        id: string;
        name: string;
        gradeLevel: number;
        problemCount: number;
        assignmentType: 'math' | 'reading';
        description: string | null;
        isGlobal: boolean;
        matchingObjectives: string[];
      }>;
    }>(`/curriculum/matching-packages/${childId}?objectiveIds=${objectiveIds.join(',')}`, { token }),
};

// Packages
export const packages = {
  import: (
    token: string,
    data: {
      package: {
        name: string;
        grade_level: number;
        category_id?: string;
        description?: string;
        global?: boolean;
      };
      problems: Array<{
        question_text: string;
        correct_answer: string;
        answer_type?: 'number' | 'text' | 'multiple_choice';
        options?: string[];
        explanation?: string;
        hint?: string;
        difficulty?: 'easy' | 'medium' | 'hard';
      }>;
      isGlobal?: boolean;
    }
  ) => fetchApi<{ id: string; problemCount: number }>('/packages/import', { method: 'POST', body: data, token }),

  list: (token: string, filters?: { grade?: number; category?: string; scope?: 'private' | 'global'; type?: 'math' | 'reading' }) => {
    const params = new URLSearchParams();
    if (filters?.grade) params.set('grade', String(filters.grade));
    if (filters?.category) params.set('category', filters.category);
    if (filters?.scope) params.set('scope', filters.scope);
    if (filters?.type) params.set('type', filters.type);
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<{
      id: string;
      name: string;
      grade_level: number;
      category_id: string | null;
      category_name: string | null;
      problem_count: number;
      difficulty_summary: string | null;
      description: string | null;
      is_global: number;
      created_at: string;
      isOwner: boolean;
      childAssignments: Array<{
        childId: string;
        childName: string;
        status: 'pending' | 'in_progress' | 'completed';
      }>;
    }[]>(`/packages${query}`, { token });
  },

  get: (token: string, id: string) =>
    fetchApi<{
      id: string;
      name: string;
      grade_level: number;
      category_id: string | null;
      category_name: string | null;
      problem_count: number;
      difficulty_summary: string | null;
      description: string | null;
      is_global: number;
      isOwner: boolean;
      problems: Array<{
        id: string;
        problem_number: number;
        question_text: string;
        correct_answer: string;
        answer_type: string;
        options: string | null;
        explanation: string | null;
        hint: string | null;
        difficulty: string;
      }>;
    }>(`/packages/${id}`, { token }),

  assign: (token: string, packageId: string, data: { childId: string; title?: string; hintsAllowed?: boolean }) =>
    fetchApi<{ id: string }>(`/packages/${packageId}/assign`, { method: 'POST', body: data, token }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean }>(`/packages/${id}`, { method: 'DELETE', token }),
};

// Adventures
export const adventures = {
  generateForParent: (
    token: string,
    data: {
      childId: string;
      contentType: 'math' | 'reading';
      theme: string;
      questionCount: number;
      objectives: Array<{ code: string; description: string }>;
    }
  ) =>
    fetchApi<{
      success: boolean;
      assignmentId: string;
      packageId: string;
      title: string;
      questionCount: number;
      objectiveCodes: string[];
    }>('/adventures/generate-for-parent', { method: 'POST', body: data, token }),
};

// Compare (peer comparison)
export const compare = {
  getPeers: (token: string) =>
    fetchApi<{
      siblings: { id: string; name: string; grade_level: number }[];
      classmates: { id: string; name: string; grade_level: number }[];
    }>('/compare/peers', { token }),

  getPeerCollection: (token: string, childId: string) =>
    fetchApi<{
      childName: string;
      collection: {
        id: string;
        name: string;
        ascii_art: string;
        rarity: string;
        pronunciation: string | null;
      }[];
      totalCount: number;
    }>(`/compare/${childId}/collection`, { token }),

  getPeerStats: (token: string, childId: string) =>
    fetchApi<{
      childName: string;
      gradeLevel: number;
      stats: {
        coins: number;
        totalEarned: number;
        streak: number;
        collectibleCount: number;
        completedAssignments: number;
        totalAssignments: number;
      };
    }>(`/compare/${childId}/stats`, { token }),
};

// Admin (development only)
export const admin = {
  getBackupStatus: (token: string) =>
    fetchApi<{
      lastBackup: number | null;
      lastSync: number | null;
      backupFiles: number;
    }>('/admin/backup-status', { token }),

  triggerBackup: (token: string) =>
    fetchApi<{ jobId: string; status: string }>('/admin/backup', {
      method: 'POST',
      token,
    }),

  triggerSync: (token: string) =>
    fetchApi<{ jobId: string; status: string }>('/admin/sync', {
      method: 'POST',
      token,
    }),

  getActiveJob: (token: string) =>
    fetchApi<{
      job: {
        id: string;
        type: 'backup' | 'sync';
        status: 'running' | 'completed' | 'failed';
        output: string;
        error?: string;
        startedAt: number;
        completedAt?: number;
      } | null;
    }>('/admin/active-job', { token }),

  getJob: (token: string, jobId: string) =>
    fetchApi<{
      job: {
        id: string;
        type: 'backup' | 'sync';
        status: 'running' | 'completed' | 'failed';
        output: string;
        error?: string;
        startedAt: number;
        completedAt?: number;
      } | null;
    }>(`/admin/job/${jobId}`, { token }),

  // Admin-only: List all parents
  listParents: (token: string) =>
    fetchApi<Array<{
      id: string;
      email: string;
      name: string;
      family_code: string;
      is_admin: number;
      created_at: string;
    }>>('/admin/parents', { token }),

  // Admin-only: List all children with assignment counts
  listChildren: (token: string) =>
    fetchApi<Array<{
      id: string;
      parent_id: string;
      parent_name: string;
      parent_email: string;
      name: string;
      grade_level: number;
      birthdate: string | null;
      created_at: string;
      active_assignments: number;
      completed_assignments: number;
      coins: number;
      collectibles_count: number;
    }>>('/admin/children', { token }),

  // Get sync info (no auth required - used after logout)
  getSyncInfo: () =>
    fetchApi<{
      syncedAt: number | null;
      sourceFile: string | null;
      syncedAtHuman: string | null;
    }>('/admin/sync-info'),
};