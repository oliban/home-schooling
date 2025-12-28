import { getRandomThemes, getThemesForGrade } from '../lib/themes-expanded';

describe('themes-expanded', () => {
  describe('getThemesForGrade', () => {
    it('should return 500 themes for each grade level', () => {
      for (let grade = 1; grade <= 9; grade++) {
        const themes = getThemesForGrade(grade);
        expect(themes).toHaveLength(500);
      }
    });

    it('should include creative themes like minecraft, dinosaurier, superhjältar', () => {
      const themes = getThemesForGrade(3);
      const creativeThemes = themes.filter(t =>
        t.includes('minecraft') ||
        t.includes('dinosaurier') ||
        t.includes('superhjältar') ||
        t.includes('drakar')
      );
      expect(creativeThemes.length).toBeGreaterThan(0);
    });

    it('should not include boring themes with large numbers', () => {
      const themes = getThemesForGrade(5);
      // Should not have themes like "343 hamstrar" or "läsa 549 böcker"
      const badThemes = themes.filter(t => {
        const match = t.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          return num > 20; // Numbers should be 1-20
        }
        return false;
      });
      expect(badThemes).toHaveLength(0);
    });

    it('should not include boring everyday scenarios', () => {
      const themes = getThemesForGrade(4);
      const boringThemes = themes.filter(t =>
        t === 'flytta hus' ||
        t === 'höst och väder' ||
        t === 'gå till tandläkaren'
      );
      expect(boringThemes).toHaveLength(0);
    });

    it('should include age-appropriate pop culture for grade 2+', () => {
      const grade2Themes = getThemesForGrade(2);
      const popCulture = grade2Themes.filter(t =>
        t.includes('minecraft') ||
        t.includes('roblox') ||
        t.includes('pokemon')
      );
      expect(popCulture.length).toBeGreaterThan(0);
    });

    it('should include quirky themes for grade 3+', () => {
      const grade3Themes = getThemesForGrade(3);
      const quirkyThemes = grade3Themes.filter(t =>
        t.includes('toalett') ||
        t.includes('Kjell-Gunbritt') ||
        t.includes('bajs')
      );
      expect(quirkyThemes.length).toBeGreaterThan(0);
    });
  });

  describe('getRandomThemes', () => {
    it('should return requested number of themes', () => {
      const themes = getRandomThemes(5, 12);
      expect(themes).toHaveLength(12);
    });

    it('should return different themes on multiple calls (randomized)', () => {
      const themes1 = getRandomThemes(3, 10);
      const themes2 = getRandomThemes(3, 10);

      // At least some should be different (not guaranteed but very likely)
      const isDifferent = themes1.some((t, i) => t !== themes2[i]);
      expect(isDifferent).toBe(true);
    });

    it('should handle requesting more themes than available', () => {
      const themes = getRandomThemes(2, 1000);
      expect(themes.length).toBeLessThanOrEqual(500);
    });

    it('should default to grade 6 for invalid grade levels', () => {
      const themes = getRandomThemes(99, 5);
      expect(themes).toHaveLength(5);
    });
  });
});
