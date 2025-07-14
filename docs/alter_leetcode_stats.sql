-- Add new columns for richer analytics to leetcode_stats
ALTER TABLE leetcode_stats
ADD COLUMN problems_solved_by_difficulty JSONB,
ADD COLUMN recent_submissions INT,
ADD COLUMN total_submissions INT,
ADD COLUMN acceptance_rate FLOAT8,
ADD COLUMN ranking INT,
ADD COLUMN badges JSONB;

-- Optionally, add comments for documentation
COMMENT ON COLUMN leetcode_stats.problems_solved_by_difficulty IS 'Problems solved breakdown by difficulty (easy, medium, hard)';
COMMENT ON COLUMN leetcode_stats.recent_submissions IS 'Number of submissions in the last 7/30 days';
COMMENT ON COLUMN leetcode_stats.total_submissions IS 'Total number of submissions';
COMMENT ON COLUMN leetcode_stats.acceptance_rate IS 'Acceptance rate (percentage of accepted submissions)';
COMMENT ON COLUMN leetcode_stats.ranking IS 'Global LeetCode ranking';
COMMENT ON COLUMN leetcode_stats.badges IS 'List of badge names/ids'; 