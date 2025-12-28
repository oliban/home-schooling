import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { ObjectiveData } from '@/types/curriculum';

// Mock the handleToggleObjective logic
function useHandleToggleObjective() {
  const [selectedObjectives, setSelectedObjectives] = useState<Set<number>>(new Set());
  const [objectiveDetails, setObjectiveDetails] = useState<Map<number, ObjectiveData>>(new Map());

  const handleToggleObjective = (objectiveId: number, objective: ObjectiveData) => {
    // If removing an objective, allow it
    if (selectedObjectives.has(objectiveId)) {
      setSelectedObjectives(prev => {
        const next = new Set(prev);
        next.delete(objectiveId);
        return next;
      });

      setObjectiveDetails(prev => {
        const next = new Map(prev);
        next.delete(objectiveId);
        return next;
      });
      return;
    }

    // Adding a new objective - check if it would mix subjects
    // Use updater function to read CURRENT state (not stale React state)
    let shouldAdd = true;

    setSelectedObjectives(prev => {
      setObjectiveDetails(prevDetails => {
        // Check subjects based on CURRENT state, not stale closures
        const currentSubjects = Array.from(prev)
          .map(id => prevDetails.get(id))
          .filter((obj): obj is ObjectiveData => obj !== undefined)
          .map(obj => obj.subject);

        const uniqueCurrentSubjects = new Set(currentSubjects);

        if (uniqueCurrentSubjects.size > 0 && !uniqueCurrentSubjects.has(objective.subject)) {
          // Would cause mixing - prevent addition
          shouldAdd = false;
          return prevDetails; // No change
        }

        // OK to add
        const next = new Map(prevDetails);
        next.set(objectiveId, objective);
        return next;
      });

      if (!shouldAdd) {
        return prev; // No change
      }

      const next = new Set(prev);
      next.add(objectiveId);
      return next;
    });
  };

  return { selectedObjectives, objectiveDetails, handleToggleObjective };
}

describe('handleToggleObjective', () => {
  const mathObjective1: ObjectiveData = {
    id: 1,
    code: 'MA-TAL-01',
    description: 'Test math objective 1',
    categoryId: 'algebra',
    categoryName: 'Algebra',
    subject: 'math',
  };

  const mathObjective2: ObjectiveData = {
    id: 2,
    code: 'MA-GEO-01',
    description: 'Test math objective 2',
    categoryId: 'geometri',
    categoryName: 'Geometri',
    subject: 'math',
  };

  const readingObjective1: ObjectiveData = {
    id: 3,
    code: 'SV-LITERAL',
    description: 'Test reading objective 1',
    categoryId: 'lasforstaelse',
    categoryName: 'Läsförståelse',
    subject: 'reading',
  };

  const readingObjective2: ObjectiveData = {
    id: 4,
    code: 'SV-INFERENCE',
    description: 'Test reading objective 2',
    categoryId: 'lasforstaelse',
    categoryName: 'Läsförståelse',
    subject: 'reading',
  };

  it('should add a single objective', () => {
    const { result } = renderHook(() => useHandleToggleObjective());

    act(() => {
      result.current.handleToggleObjective(mathObjective1.id, mathObjective1);
    });

    expect(result.current.selectedObjectives.has(mathObjective1.id)).toBe(true);
    expect(result.current.objectiveDetails.get(mathObjective1.id)).toEqual(mathObjective1);
  });

  it('should remove an objective that is already selected', () => {
    const { result } = renderHook(() => useHandleToggleObjective());

    act(() => {
      result.current.handleToggleObjective(mathObjective1.id, mathObjective1);
    });

    expect(result.current.selectedObjectives.has(mathObjective1.id)).toBe(true);

    act(() => {
      result.current.handleToggleObjective(mathObjective1.id, mathObjective1);
    });

    expect(result.current.selectedObjectives.has(mathObjective1.id)).toBe(false);
    expect(result.current.objectiveDetails.has(mathObjective1.id)).toBe(false);
  });

  it('should allow switching from math to reading in one operation (remove all math, add reading)', () => {
    const { result } = renderHook(() => useHandleToggleObjective());

    // Add two math objectives
    act(() => {
      result.current.handleToggleObjective(mathObjective1.id, mathObjective1);
      result.current.handleToggleObjective(mathObjective2.id, mathObjective2);
    });

    expect(result.current.selectedObjectives.size).toBe(2);

    // Remove both math objectives and add two reading objectives in one batch
    act(() => {
      result.current.handleToggleObjective(mathObjective1.id, mathObjective1); // Remove
      result.current.handleToggleObjective(mathObjective2.id, mathObjective2); // Remove
      result.current.handleToggleObjective(readingObjective1.id, readingObjective1); // Add
      result.current.handleToggleObjective(readingObjective2.id, readingObjective2); // Add
    });

    // Should have successfully switched to reading objectives
    expect(result.current.selectedObjectives.size).toBe(2);
    expect(result.current.selectedObjectives.has(readingObjective1.id)).toBe(true);
    expect(result.current.selectedObjectives.has(readingObjective2.id)).toBe(true);
    expect(result.current.selectedObjectives.has(mathObjective1.id)).toBe(false);
    expect(result.current.selectedObjectives.has(mathObjective2.id)).toBe(false);
  });

  it('should allow adding multiple objectives of the same subject', () => {
    const { result } = renderHook(() => useHandleToggleObjective());

    act(() => {
      result.current.handleToggleObjective(mathObjective1.id, mathObjective1);
      result.current.handleToggleObjective(mathObjective2.id, mathObjective2);
    });

    expect(result.current.selectedObjectives.size).toBe(2);
    expect(result.current.selectedObjectives.has(mathObjective1.id)).toBe(true);
    expect(result.current.selectedObjectives.has(mathObjective2.id)).toBe(true);
  });
});
