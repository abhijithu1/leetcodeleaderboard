"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from "recharts";

export default function GroupStatsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.group_id as string;
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'problems_solved' | 'contest_rating'>('problems_solved');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      // Fetch group
      const { data: groupData, error: groupErr } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();
      if (groupErr || !groupData) {
        setError("Group not found.");
        setLoading(false);
        return;
      }
      setGroup(groupData);
      // Fetch members
      const { data: membersData, error: membersErr } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId);
      if (membersErr) {
        setError("Failed to fetch group members.");
        setLoading(false);
        return;
      }
      setMembers(membersData || []);
      // Fetch latest stats for each member
      const memberIds = (membersData || []).map((m: any) => m.id);
      if (memberIds.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }
      // For each member, get the latest leetcode_stats
      const statsArr: any[] = [];
      for (const memberId of memberIds) {
        const { data: statRows } = await supabase
          .from("leetcode_stats")
          .select("*")
          .eq("group_member_id", memberId)
          .order("fetched_at", { ascending: false })
          .limit(1);
        if (statRows && statRows.length > 0) {
          statsArr.push({ ...statRows[0], group_member_id: memberId });
        }
      }
      setStats(statsArr);
      setLoading(false);
    };
    fetchData();
  }, [groupId]);

  const handleSharePublicLink = async () => {
    setShareLoading(true);
    setShareError(null);
    try {
      let link = group.public_link;
      if (!link) {
        // Generate a unique link (e.g., uuid or nanoid)
        link = crypto.randomUUID();
        const supabase = createClient();
        const { error } = await supabase
          .from("groups")
          .update({ public_link: link })
          .eq("id", group.id);
        if (error) throw new Error("Failed to generate public link");
      }
      const url = `${window.location.origin}/public/${link}`;
      await navigator.clipboard.writeText(url);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (err) {
      setShareError("Failed to copy link.");
    }
    setShareLoading(false);
  };

  // Merge members and stats for leaderboard
  const leaderboard = members.map((m) => {
    const stat = stats.find((s) => s.group_member_id === m.id) || {};
    return {
      name: m.display_name,
      username: m.leetcode_username,
      problems_solved: stat.problems_solved ?? 0,
      contest_rating: stat.contest_rating ?? 0,
      problems_solved_by_difficulty: stat.problems_solved_by_difficulty ?? { easy: 0, medium: 0, hard: 0 },
      recent_submissions: stat.recent_submissions ?? 0,
      total_submissions: stat.total_submissions ?? 0,
      acceptance_rate: stat.acceptance_rate ?? null,
      ranking: stat.ranking ?? null,
      badges: stat.badges ?? [],
    };
  });

  // Sort leaderboard
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b[sortKey] - a[sortKey];
    } else {
      return a[sortKey] - b[sortKey];
    }
  });

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-white via-indigo-50 to-orange-50">
      <div className="w-full max-w-3xl mt-20 p-8 bg-white rounded-xl shadow text-center">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-indigo-700">Group Leaderboard & Stats</h1>
          <Link href={`/dashboard/group/${groupId}`} className="text-indigo-500 hover:underline">← Back</Link>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <>
            <div className="mb-6 text-left">
              <div className="font-bold text-lg">{group.name}</div>
              <div className="text-xs text-gray-500 mb-2">Created: {new Date(group.created_at).toLocaleString()}</div>
            </div>
            <div className="mb-8">
              <h2 className="font-semibold mb-2 text-left">Leaderboard</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded">
                  <thead>
                    <tr className="bg-indigo-100">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Username</th>
                      <th className="px-4 py-2 text-left cursor-pointer" onClick={() => setSortKey('problems_solved')}>Problems Solved {sortKey === 'problems_solved' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</th>
                      <th className="px-4 py-2 text-left cursor-pointer" onClick={() => setSortKey('contest_rating')}>Contest Rating {sortKey === 'contest_rating' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLeaderboard.map((row, idx) => (
                      <tr key={row.username} className={idx === 0 ? "bg-yellow-100 font-bold" : idx % 2 === 0 ? "bg-white" : "bg-indigo-50"}>
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2">{row.username}</td>
                        <td className="px-4 py-2">{row.problems_solved}</td>
                        <td className="px-4 py-2">{row.contest_rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mb-8">
              <h2 className="font-semibold mb-2 text-left">Problems Solved (Bar Chart)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sortedLeaderboard} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="problems_solved" fill="#6366f1">
                    <LabelList dataKey="problems_solved" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mb-8">
              <h2 className="font-semibold mb-2 text-left">Problems Solved by Difficulty</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leaderboard} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="problems_solved_by_difficulty.easy" stackId="a" fill="#60a5fa" name="Easy">
                    <LabelList dataKey="problems_solved_by_difficulty.easy" position="top" />
                  </Bar>
                  <Bar dataKey="problems_solved_by_difficulty.medium" stackId="a" fill="#fbbf24" name="Medium">
                    <LabelList dataKey="problems_solved_by_difficulty.medium" position="top" />
                  </Bar>
                  <Bar dataKey="problems_solved_by_difficulty.hard" stackId="a" fill="#ef4444" name="Hard">
                    <LabelList dataKey="problems_solved_by_difficulty.hard" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mb-8">
              <h2 className="font-semibold mb-2 text-left">Recent Submissions (Last 30 Days)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={leaderboard} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="recent_submissions" fill="#6366f1">
                    <LabelList dataKey="recent_submissions" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mb-8">
              <h2 className="font-semibold mb-2 text-left">Total Submissions</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={leaderboard} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total_submissions" fill="#10b981">
                    <LabelList dataKey="total_submissions" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mb-8">
              <h2 className="font-semibold mb-2 text-left">Acceptance Rate (%)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={leaderboard} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="acceptance_rate" fill="#f472b6">
                    <LabelList dataKey="acceptance_rate" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mb-8">
              <h2 className="font-semibold mb-2 text-left">Ranking</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={leaderboard} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} reversed={true} />
                  <Tooltip />
                  <Bar dataKey="ranking" fill="#a78bfa">
                    <LabelList dataKey="ranking" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mb-8">
              <h2 className="font-semibold mb-2 text-left">Badges</h2>
              <ul className="flex flex-wrap gap-4 justify-center">
                {leaderboard.map((row) => (
                  <li key={row.username} className="bg-indigo-100 rounded px-4 py-2 shadow text-sm">
                    <span className="font-bold">{row.name}:</span> {Array.isArray(row.badges) && row.badges.length > 0 ? row.badges.map((b: any) => b.name || b.displayName || b.id).join(", ") : "No badges"}
                  </li>
                ))}
              </ul>
            </div>
            {/* More analytics/charts can go here! */}
            <div className="mt-8 text-right">
              <button
                className="bg-orange-500 text-white font-bold px-4 py-2 rounded hover:bg-orange-600 transition"
                onClick={handleSharePublicLink}
                disabled={shareLoading}
              >
                {shareLoading ? "Generating..." : "Share Public Link"}
              </button>
              {shareSuccess && <span className="ml-2 text-green-600">Link copied!</span>}
              {shareError && <span className="ml-2 text-red-500">{shareError}</span>}
            </div>
          </>
        )}
      </div>
    </main>
  );
} 