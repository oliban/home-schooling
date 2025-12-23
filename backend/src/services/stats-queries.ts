/**
 * Stats Query Service
 *
 * Provides reusable query builders for child statistics.
 * Consolidates duplicated SQL query patterns from children routes
 * for querying math/reading stats from package-based and legacy data sources.
 */

/**
 * Aggregated stats result with correct/incorrect counts
 */
export interface StatsResult {
  correct: number;
  incorrect: number;
}

/**
 * Stats result grouped by date
 */
export interface DateStatsResult {
  date: string;
  correct: number;
  incorrect: number;
}

/**
 * Subject type for filtering queries
 */
export type SubjectType = 'math' | 'reading';

/**
 * Data source type for distinguishing between:
 * - 'package': Package-based assignments (assignment_answers table, package_id IS NOT NULL)
 * - 'legacy': Legacy embedded questions (math_problems/reading_questions tables, package_id IS NULL)
 */
export type DataSourceType = 'package' | 'legacy';

/**
 * Configuration for parameterizing stats queries
 */
export interface StatsQueryConfig {
  /** The child ID to query stats for */
  childId: string;
  /** The subject to filter by (math or reading) */
  subject: SubjectType;
  /** The data source to query (package-based or legacy) */
  dataSource: DataSourceType;
  /** Optional date filter SQL clause (e.g., "AND answered_at >= datetime('now', '-7 days')") */
  dateFilter?: string;
}

/**
 * Period type for date-based filtering
 */
export type PeriodType = '7d' | '30d' | 'all';

/**
 * Database interface matching the HomeSchoolingDatabase methods used
 */
export interface DatabaseInterface {
  get<T>(sql: string, params: unknown[]): T | undefined;
  all<T>(sql: string, params: unknown[]): T[];
}

/**
 * Build a date filter SQL clause for the given period and column alias
 * @param period - The period type ('7d', '30d', 'all')
 * @param columnAlias - The table alias to prefix the answered_at column (e.g., 'aa', 'mp', 'rq')
 * @returns SQL clause for date filtering (e.g., "AND aa.answered_at >= datetime('now', '-7 days')")
 */
export function buildDateFilter(period: PeriodType, columnAlias: string): string {
  if (period === '7d') {
    return `AND ${columnAlias}.answered_at >= datetime('now', '-7 days')`;
  } else if (period === '30d') {
    return `AND ${columnAlias}.answered_at >= datetime('now', '-30 days')`;
  }
  return '';
}

/**
 * Get the table and alias for a given subject and data source
 */
function getTableConfig(subject: SubjectType, dataSource: DataSourceType): {
  table: string;
  alias: string;
  joinColumn: string;
} {
  if (dataSource === 'package') {
    return {
      table: 'assignment_answers',
      alias: 'aa',
      joinColumn: 'assignment_id'
    };
  }
  // Legacy data source
  if (subject === 'math') {
    return {
      table: 'math_problems',
      alias: 'mp',
      joinColumn: 'assignment_id'
    };
  }
  return {
    table: 'reading_questions',
    alias: 'rq',
    joinColumn: 'assignment_id'
  };
}

/**
 * Get aggregated stats for a child filtered by subject and data source
 *
 * @param db - Database instance
 * @param config - Query configuration
 * @returns Aggregated stats with correct/incorrect counts
 */
export function getAggregatedStats(
  db: DatabaseInterface,
  config: StatsQueryConfig
): StatsResult {
  const { childId, subject, dataSource, dateFilter = '' } = config;
  const { table, alias, joinColumn } = getTableConfig(subject, dataSource);

  const packageCondition = dataSource === 'package'
    ? 'AND a.package_id IS NOT NULL'
    : 'AND a.package_id IS NULL';

  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN ${alias}.is_correct = 1 THEN 1 ELSE 0 END), 0) as correct,
      COALESCE(SUM(CASE WHEN ${alias}.is_correct = 0 THEN 1 ELSE 0 END), 0) as incorrect
    FROM assignments a
    JOIN ${table} ${alias} ON a.id = ${alias}.${joinColumn}
    WHERE a.child_id = ?
      AND a.assignment_type = ?
      ${packageCondition}
      ${dateFilter}
  `;

  const result = db.get<{ correct: number; incorrect: number }>(sql, [childId, subject]);

  return {
    correct: result?.correct ?? 0,
    incorrect: result?.incorrect ?? 0
  };
}

/**
 * Get stats grouped by date for a child filtered by subject and data source
 *
 * @param db - Database instance
 * @param config - Query configuration
 * @returns Array of stats grouped by date
 */
export function getStatsByDate(
  db: DatabaseInterface,
  config: StatsQueryConfig
): DateStatsResult[] {
  const { childId, subject, dataSource, dateFilter = '' } = config;
  const { table, alias, joinColumn } = getTableConfig(subject, dataSource);

  const packageCondition = dataSource === 'package'
    ? 'AND a.package_id IS NOT NULL'
    : 'AND a.package_id IS NULL';

  const sql = `
    SELECT
      date(${alias}.answered_at) as date,
      SUM(CASE WHEN ${alias}.is_correct = 1 THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN ${alias}.is_correct = 0 THEN 1 ELSE 0 END) as incorrect
    FROM assignments a
    JOIN ${table} ${alias} ON a.id = ${alias}.${joinColumn}
    WHERE a.child_id = ?
      AND a.assignment_type = ?
      ${packageCondition}
      AND ${alias}.answered_at IS NOT NULL
      ${dateFilter}
    GROUP BY date(${alias}.answered_at)
  `;

  const results = db.all<{ date: string; correct: number; incorrect: number }>(sql, [childId, subject]);

  return results.map(row => ({
    date: row.date,
    correct: row.correct,
    incorrect: row.incorrect
  }));
}

/**
 * Combined stats for a child with math and reading totals
 */
export interface ChildStats {
  math: StatsResult;
  reading: StatsResult;
}

/**
 * Combined date-grouped stats for a child with math and reading arrays
 */
export interface ChildStatsByDate {
  math: DateStatsResult[];
  reading: DateStatsResult[];
}

/**
 * Get the column alias for a given subject and data source
 * Used to build the correct date filter for each query
 */
function getColumnAlias(subject: SubjectType, dataSource: DataSourceType): string {
  if (dataSource === 'package') {
    return 'aa';
  }
  return subject === 'math' ? 'mp' : 'rq';
}

/**
 * Get combined aggregated stats for a child (math + reading, package + legacy)
 *
 * Calls getAggregatedStats for all 4 data source combinations and merges results
 * by subject (math and reading), combining package-based and legacy data.
 *
 * @param db - Database instance
 * @param childId - The child ID to query stats for
 * @param period - Optional period type for date filtering ('7d', '30d', 'all')
 * @returns Combined stats with math and reading totals
 */
export function getChildStats(
  db: DatabaseInterface,
  childId: string,
  period: PeriodType = 'all'
): ChildStats {
  // Get math stats (package + legacy)
  const mathPackage = getAggregatedStats(db, {
    childId,
    subject: 'math',
    dataSource: 'package',
    dateFilter: buildDateFilter(period, getColumnAlias('math', 'package'))
  });
  const mathLegacy = getAggregatedStats(db, {
    childId,
    subject: 'math',
    dataSource: 'legacy',
    dateFilter: buildDateFilter(period, getColumnAlias('math', 'legacy'))
  });

  // Get reading stats (package + legacy)
  const readingPackage = getAggregatedStats(db, {
    childId,
    subject: 'reading',
    dataSource: 'package',
    dateFilter: buildDateFilter(period, getColumnAlias('reading', 'package'))
  });
  const readingLegacy = getAggregatedStats(db, {
    childId,
    subject: 'reading',
    dataSource: 'legacy',
    dateFilter: buildDateFilter(period, getColumnAlias('reading', 'legacy'))
  });

  return {
    math: {
      correct: mathPackage.correct + mathLegacy.correct,
      incorrect: mathPackage.incorrect + mathLegacy.incorrect
    },
    reading: {
      correct: readingPackage.correct + readingLegacy.correct,
      incorrect: readingPackage.incorrect + readingLegacy.incorrect
    }
  };
}

/**
 * Merge date-grouped stats by combining entries with the same date
 *
 * @param arrays - Arrays of DateStatsResult to merge
 * @returns Merged array with combined stats for each date
 */
function mergeDateStats(...arrays: DateStatsResult[][]): DateStatsResult[] {
  const byDate = new Map<string, { correct: number; incorrect: number }>();

  for (const arr of arrays) {
    for (const row of arr) {
      const existing = byDate.get(row.date) || { correct: 0, incorrect: 0 };
      byDate.set(row.date, {
        correct: existing.correct + row.correct,
        incorrect: existing.incorrect + row.incorrect
      });
    }
  }

  return Array.from(byDate.entries()).map(([date, stats]) => ({
    date,
    correct: stats.correct,
    incorrect: stats.incorrect
  }));
}

/**
 * Get combined date-grouped stats for a child (math + reading, package + legacy)
 *
 * Calls getStatsByDate for all 4 data source combinations and merges results
 * by subject (math and reading), combining package-based and legacy data for
 * each date.
 *
 * @param db - Database instance
 * @param childId - The child ID to query stats for
 * @param period - Optional period type for date filtering ('7d', '30d', 'all')
 * @returns Combined stats with math and reading arrays, each merged by date
 */
export function getChildStatsByDate(
  db: DatabaseInterface,
  childId: string,
  period: PeriodType = 'all'
): ChildStatsByDate {
  // Get math stats by date (package + legacy)
  const mathPackageByDate = getStatsByDate(db, {
    childId,
    subject: 'math',
    dataSource: 'package',
    dateFilter: buildDateFilter(period, getColumnAlias('math', 'package'))
  });
  const mathLegacyByDate = getStatsByDate(db, {
    childId,
    subject: 'math',
    dataSource: 'legacy',
    dateFilter: buildDateFilter(period, getColumnAlias('math', 'legacy'))
  });

  // Get reading stats by date (package + legacy)
  const readingPackageByDate = getStatsByDate(db, {
    childId,
    subject: 'reading',
    dataSource: 'package',
    dateFilter: buildDateFilter(period, getColumnAlias('reading', 'package'))
  });
  const readingLegacyByDate = getStatsByDate(db, {
    childId,
    subject: 'reading',
    dataSource: 'legacy',
    dateFilter: buildDateFilter(period, getColumnAlias('reading', 'legacy'))
  });

  return {
    math: mergeDateStats(mathPackageByDate, mathLegacyByDate),
    reading: mergeDateStats(readingPackageByDate, readingLegacyByDate)
  };
}