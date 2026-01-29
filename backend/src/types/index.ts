export interface Parent {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  is_admin: number;
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  birthdate: string | null;
  grade_level: number;
  pin_hash: string | null;
  created_at: string;
}

export interface ChildCoins {
  child_id: string;
  balance: number;
  total_earned: number;
  current_streak: number;
}

export interface Book {
  id: string;
  parent_id: string;
  title: string;
  author: string | null;
  source_type: 'pdf' | 'images' | 'video';
  created_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string | null;
  extracted_text: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  parent_id: string;
  child_id: string;
  assignment_type: 'math' | 'reading' | 'english';
  title: string;
  grade_level: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  completed_at: string | null;
  package_id: string | null;
  assigned_by_id: string | null;
}

export interface MathProblem {
  id: string;
  assignment_id: string;
  category_id: string | null;
  problem_number: number;
  question_text: string;
  correct_answer: string;
  answer_type: 'number' | 'text' | 'multiple_choice';
  options: string | null;
  explanation: string | null;
  hint: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  child_answer: string | null;
  is_correct: number | null;
  answered_at: string | null;
  scratch_pad_image?: string | null;
}

export interface ReadingQuestion {
  id: string;
  assignment_id: string;
  chapter_id: string | null;
  question_number: number;
  question_text: string;
  correct_answer: string;
  options: string;
  difficulty: 'easy' | 'medium' | 'hard';
  child_answer: string | null;
  is_correct: number | null;
  answered_at: string | null;
}

export interface Collectible {
  id: string;
  name: string;
  ascii_art: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret';
  pronunciation?: string | null; // Optional: text to speak instead of name
  svg_path?: string | null; // Optional: path to SVG portrait
  expansion_pack?: string | null; // Optional: expansion pack identifier (e.g., 'lotr-italian')
}

export interface ChildCollectible {
  child_id: string;
  collectible_id: string;
  acquired_at: string;
}

export interface MathPackage {
  id: string;
  parent_id: string | null;
  name: string;
  grade_level: number;
  category_id: string | null;
  assignment_type: 'math' | 'reading' | 'english';
  problem_count: number;
  difficulty_summary: string | null;
  description: string | null;
  story_text: string | null;
  is_global: number;
  created_at: string;
  is_active: number;
}

export interface PackageProblem {
  id: string;
  package_id: string;
  problem_number: number;
  question_text: string;
  correct_answer: string;
  answer_type: 'number' | 'text' | 'multiple_choice';
  options: string | null;
  explanation: string | null;
  hint: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  requires_sketch: number;  // SQLite INTEGER: 0 = false, 1 = true
}

export interface AssignmentAnswer {
  id: string;
  assignment_id: string;
  problem_id: string;
  child_answer: string | null;
  is_correct: number | null;
  answered_at: string | null;
  attempts_count?: number;
  hint_purchased?: number;
  coins_spent_on_hint?: number;
  scratch_pad_image?: string | null;
}

// Import package request types
export interface ImportPackageRequest {
  package: {
    name: string;
    grade_level: number;
    category_id?: string;
    assignment_type?: 'math' | 'reading' | 'english';
    description?: string;
    story_text?: string;
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
    lgr22_codes?: string[];
    requires_sketch?: boolean;
  }>;
  isGlobal?: boolean;
}

// Batch import for multiple chapters/packages at once
export interface BatchImportRequest {
  book_title: string;
  grade_level: number;
  packages: ImportPackageRequest[];
}

// API request/response types
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChildLoginRequest {
  childId: string;
  pin: string;
}

export interface CreateChildRequest {
  name: string;
  birthdate?: string;
  grade_level: number;
  pin?: string;
}

export interface SubmitAnswerRequest {
  questionId: string;
  answer: string;
}

export interface AuthPayload {
  id: string;
  email: string;
  type: 'parent';
  isAdmin: boolean;
}

export interface ChildAuthPayload {
  id: string;
  parentId: string;
  type: 'child';
}
