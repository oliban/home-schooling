const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001/api';

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
    }[]>(`/assignments${query}`, { token });
  },

  get: (token: string, id: string) =>
    fetchApi<{
      id: string;
      assignment_type: 'math' | 'reading';
      title: string;
      grade_level: number;
      status: string;
      questions: Array<{
        id: string;
        question_text: string;
        answer_type?: string;
        options?: string;
        child_answer: string | null;
        is_correct: number | null;
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

  submit: (token: string, assignmentId: string, data: { questionId: string; answer: string }) =>
    fetchApi<{
      isCorrect: boolean;
      correctAnswer?: string;
      coinsEarned: number;
      totalCoins: number;
      streak: number;
    }>(`/assignments/${assignmentId}/submit`, { method: 'POST', body: data, token }),

  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean }>(`/assignments/${id}`, { method: 'DELETE', token }),
};

// Collectibles
export const collectibles = {
  list: (token: string) =>
    fetchApi<{
      id: string;
      name: string;
      ascii_art: string;
      price: number;
      rarity: string;
      owned: boolean;
    }[]>('/collectibles', { token }),

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
