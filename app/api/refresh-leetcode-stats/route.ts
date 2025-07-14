import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { LeetCode } from 'leetcode-query';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const leetcode = new LeetCode();

  let group_id: string | undefined = undefined;
  let member_id: string | undefined = undefined;
  try {
    const body = await req.json();
    group_id = body.group_id;
    member_id = body.member_id;
  } catch {}

  // Fetch group members
  let membersQuery = supabase.from('group_members').select('*');
  if (group_id) membersQuery = membersQuery.eq('group_id', group_id);
  if (member_id) membersQuery = membersQuery.eq('id', member_id);

  const { data: members, error } = await membersQuery;
  if (error) return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });

  let updated = 0;
  for (const member of members) {
    try {
      const user = await leetcode.user(member.leetcode_username);
      if (!user || !user.matchedUser || !user.matchedUser.username) continue;

      // Problems solved by difficulty
      const acStats = user.matchedUser.submitStats?.acSubmissionNum || [];
      const problemsSolvedByDifficulty = {
        easy: acStats.find((x: { difficulty: string }) => x.difficulty === 'Easy')?.count || 0,
        medium: acStats.find((x: { difficulty: string }) => x.difficulty === 'Medium')?.count || 0,
        hard: acStats.find((x: { difficulty: string }) => x.difficulty === 'Hard')?.count || 0,
      };
      // Total problems solved (existing)
      const problemsSolved = acStats.find((x: { difficulty: string }) => x.difficulty === 'All')?.count || 0;
      // Contest rating (existing)
      const contestRating = user.matchedUser.profile?.starRating || 0;
      // Total submissions
      const totalSubmissions = user.matchedUser.submitStats?.totalSubmissionNum?.find((x: { difficulty: string }) => x.difficulty === 'All')?.submissions || 0;
      // Acceptance rate (try profile.acceptanceRate, else null)
      const acceptanceRate = (user.matchedUser.profile && 'acceptanceRate' in user.matchedUser.profile)
        ? (user.matchedUser.profile.acceptanceRate as number | null)
        : null;
      // Ranking
      const ranking = user.matchedUser.profile?.ranking || null;
      // Badges
      const badges = user.matchedUser.badges || null;
      // Recent submissions (last 30 days)
      let recentSubmissions = null;
      if (user.matchedUser.submissionCalendar) {
        // submissionCalendar is a stringified JSON: { "timestamp": count, ... }
        try {
          const calendar = JSON.parse(user.matchedUser.submissionCalendar);
          const now = Math.floor(Date.now() / 1000);
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
          recentSubmissions = Object.entries(calendar)
            .filter(([ts]) => Number(ts) >= thirtyDaysAgo)
            .reduce((sum, [, count]) => sum + Number(count), 0);
        } catch {}
      }
      // Fetch language stats and skill stats using alfa-leetcode-api
      let languageStats = null;
      let skillStats = null;
      try {
        const langRes = await fetch(`https://alfa-leetcode-api.onrender.com/languageStats?username=${encodeURIComponent(member.leetcode_username)}`);
        if (langRes.ok) languageStats = await langRes.json();
      } catch {}
      try {
        const skillRes = await fetch(`https://alfa-leetcode-api.onrender.com/skillStats/${encodeURIComponent(member.leetcode_username)}`);
        if (skillRes.ok) skillStats = await skillRes.json();
      } catch {}
      // Submission calendar (raw)
      const submissionCalendar = user.matchedUser.submissionCalendar || null;

      await supabase.from('leetcode_stats').insert({
        group_member_id: member.id,
        fetched_at: new Date().toISOString(),
        profile_data: user,
        problems_solved: problemsSolved,
        contest_rating: contestRating,
        language_stats: languageStats,
        skill_stats: skillStats,
        submission_calendar: submissionCalendar,
        problems_solved_by_difficulty: problemsSolvedByDifficulty,
        recent_submissions: recentSubmissions,
        total_submissions: totalSubmissions,
        acceptance_rate: acceptanceRate,
        ranking: ranking,
        badges: badges,
      });
      updated++;
    } catch {
      // Log error, skip this user
      continue;
    }
  }

  return NextResponse.json({ updated });
}