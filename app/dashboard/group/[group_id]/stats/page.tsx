"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from "recharts";
import { FiArrowLeft, FiRefreshCw, FiShare2, FiAward, FiCheckCircle, FiTrendingUp, FiBarChart2, FiClock } from "react-icons/fi";
import { UserButton } from "@clerk/nextjs";

interface GroupMember {
  id: string;
  display_name: string;
  leetcode_username: string;
}
interface Group {
  id: string;
  name: string;
  description?: string;
  group_members?: GroupMember[];
  public_link?: string;
  created_at?: string;
}
interface LeetCodeStats {
  problems_solved: number;
  contest_rating: number;
  problems_solved_by_difficulty?: Record<string, number>;
  recent_submissions?: number;
  total_submissions?: number;
  acceptance_rate?: number | null;
  ranking?: number | null;
  badges?: unknown[];
  language_stats?: Record<string, number>;
  group_member_id?: string;
  created_at?: string;
}

export default function GroupStatsPage() {
  const params = useParams();
  const groupId = params.group_id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [stats, setStats] = useState<LeetCodeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSortKey, setCurrentSortKey] = useState<'problems_solved' | 'contest_rating'>('problems_solved');
  const [isAscending, setIsAscending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    
    try {
      // Fetch group
      const { data: groupData, error: groupErr } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();
      if (groupErr || !groupData) {
        throw new Error("Group not found");
      }
      setGroup(groupData);

      // Fetch members
      const { data: membersData, error: membersErr } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId);
      if (membersErr) throw new Error("Failed to fetch group members");
      setMembers(membersData || []);

      // Fetch latest stats for each member
      const memberIds = (membersData || []).map((m: GroupMember) => m.id);
      if (memberIds.length === 0) {
        setStats([]);
        return;
      }

      const statsArr: LeetCodeStats[] = [];
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
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSharePublicLink = async () => {
    setShareLoading(true);
    setShareError(null);
    try {
      let link = group?.public_link;
      if (!link) {
        link = crypto.randomUUID();
        const supabase = createClient();
        const { error } = await supabase
          .from("groups")
          .update({ public_link: link })
          .eq("id", group?.id);
        if (error) throw new Error("Failed to generate public link");
        setGroup({ ...group!, public_link: link });
      }
      const url = `${window.location.origin}/public/${link}`;
      await navigator.clipboard.writeText(url);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (err: unknown) {
      setShareError("Failed to copy link");
    }
    setShareLoading(false);
  };

  // Merge members and stats for leaderboard
  const leaderboard = members.map((m) => {
    const stat = stats.find((s) => s.group_member_id === m.id) as LeetCodeStats | undefined;
    return {
      name: m.display_name,
      username: m.leetcode_username,
      problems_solved: stat?.problems_solved ?? 0,
      contest_rating: stat?.contest_rating ?? 0,
      problems_solved_by_difficulty: stat?.problems_solved_by_difficulty ?? { easy: 0, medium: 0, hard: 0 },
      recent_submissions: stat?.recent_submissions ?? 0,
      total_submissions: stat?.total_submissions ?? 0,
      acceptance_rate: stat?.acceptance_rate ?? null,
      ranking: stat?.ranking ?? null,
      badges: stat?.badges ?? [],
    };
  });

  // Sort leaderboard
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const aVal = a[currentSortKey] ?? 0;
    const bVal = b[currentSortKey] ?? 0;
    return isAscending ? aVal - bVal : bVal - aVal;
  });

  // Calculate group totals
  const groupTotals = {
    problems_solved: leaderboard.reduce((sum, m) => sum + m.problems_solved, 0),
    easy: leaderboard.reduce((sum, m) => sum + (m.problems_solved_by_difficulty?.easy || 0), 0),
    medium: leaderboard.reduce((sum, m) => sum + (m.problems_solved_by_difficulty?.medium || 0), 0),
    hard: leaderboard.reduce((sum, m) => sum + (m.problems_solved_by_difficulty?.hard || 0), 0),
    submissions: leaderboard.reduce((sum, m) => sum + (m.total_submissions || 0), 0),
  };

  return (
    <main className="min-h-screen bg-[#F5F7FA]">
      {/* Top Navigation Bar */}
      <nav className="bg-[#1A2B50] text-white px-6 py-4 fixed top-0 w-full z-10 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-semibold">LeetBoard</span>
          </div>
          <div className="flex items-center space-x-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 px-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/dashboard" className="flex items-center text-[#0079FF] hover:underline">
              <FiArrowLeft className="mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-[#4A5568] mt-2">{group?.name || "Group Stats"}</h1>
            {group?.description && <p className="text-[#4A5568]">{group.description}</p>}
            {group?.created_at && (
              <p className="text-sm text-[#4A5568]">
                Created: {new Date(group.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="bg-white border border-[#E1E5EB] rounded-lg px-4 py-2 text-[#4A5568] hover:bg-[#F5F7FA] transition flex items-center"
              disabled={refreshing}
            >
              <FiRefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Stats'}
            </button>
            <button
              onClick={handleSharePublicLink}
              className="bg-[#0079FF] text-white rounded-lg px-4 py-2 hover:bg-[#0069D9] transition flex items-center"
              disabled={shareLoading}
            >
              <FiShare2 className="h-4 w-4 mr-2" />
              {shareLoading ? 'Generating...' : 'Share'}
            </button>
          </div>
        </div>

        {shareSuccess && (
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg mb-6">
            Public link copied to clipboard!
          </div>
        )}
        {shareError && (
          <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg mb-6">
            {shareError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="text-[#4A5568]">Loading group stats...</span>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg">
            {error}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Total Problems Solved */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[#4A5568] text-sm">Total Problems Solved</p>
                    <h2 className="text-3xl font-semibold mt-1">{groupTotals.problems_solved}</h2>
                  </div>
                  <FiCheckCircle className="h-6 w-6 text-[#00C2A8]" />
                </div>
              </div>

              {/* Easy Problems */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[#4A5568] text-sm">Easy Problems</p>
                    <h2 className="text-3xl font-semibold mt-1">{groupTotals.easy}</h2>
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    Easy
                  </div>
                </div>
              </div>

              {/* Medium Problems */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[#4A5568] text-sm">Medium Problems</p>
                    <h2 className="text-3xl font-semibold mt-1">{groupTotals.medium}</h2>
                  </div>
                  <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                    Medium
                  </div>
                </div>
              </div>

              {/* Hard Problems */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[#4A5568] text-sm">Hard Problems</p>
                    <h2 className="text-3xl font-semibold mt-1">{groupTotals.hard}</h2>
                  </div>
                  <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                    Hard
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] mb-8 overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E1E5EB] flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[#4A5568]">Leaderboard</h2>
                <div className="flex space-x-2">
                  <button
                    className={`text-sm font-medium ${currentSortKey === 'problems_solved' ? 'text-[#0079FF]' : 'text-[#4A5568]'}`}
                    onClick={() => {
                      if (currentSortKey === 'problems_solved') {
                        setIsAscending(!isAscending);
                      } else {
                        setCurrentSortKey('problems_solved');
                        setIsAscending(false);
                      }
                    }}
                  >
                    Sort by Problems {currentSortKey === 'problems_solved' ? (isAscending ? '↑' : '↓') : ''}
                  </button>
                  <button
                    className={`text-sm font-medium ${currentSortKey === 'contest_rating' ? 'text-[#0079FF]' : 'text-[#4A5568]'}`}
                    onClick={() => {
                      if (currentSortKey === 'contest_rating') {
                        setIsAscending(!isAscending);
                      } else {
                        setCurrentSortKey('contest_rating');
                        setIsAscending(false);
                      }
                    }}
                  >
                    Sort by Rating {currentSortKey === 'contest_rating' ? (isAscending ? '↑' : '↓') : ''}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E1E5EB]">
                  <thead className="bg-[#F5F7FA]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">Solved</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">Recent</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E1E5EB]">
                    {sortedLeaderboard.map((row, index) => (
                      <tr
                        key={row.username}
                        className={index < 3 ? "bg-opacity-10" : ""}
                        style={{
                          backgroundColor:
                            index === 0
                              ? "rgba(255, 215, 0, 0.05)"
                              : index === 1
                              ? "rgba(192, 192, 192, 0.05)"
                              : index === 2
                              ? "rgba(205, 127, 50, 0.05)"
                              : "",
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`rounded-full h-6 w-6 flex items-center justify-center ${
                              index === 0
                                ? "bg-[#FFD700] text-white"
                                : index === 1
                                ? "bg-[#C0C0C0] text-white"
                                : index === 2
                                ? "bg-[#CD7F32] text-white"
                                : "bg-[#E1E5EB] text-[#4A5568]"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-[#0079FF] flex items-center justify-center text-white text-xs font-medium mr-3">
                              {row.name?.charAt(0) || row.username?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-medium">{row.name || "Anonymous"}</p>
                              <p className="text-[#4A5568] text-sm">@{row.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold">{row.problems_solved}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {row.contest_rating || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#00C2A8]">
                          {row.recent_submissions ? `+${row.recent_submissions}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Problems Solved Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] mb-8 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#4A5568]">Problems Solved</h2>
                <FiBarChart2 className="text-[#0079FF]" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedLeaderboard} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                    <XAxis dataKey="name" stroke="#4A5568" />
                    <YAxis allowDecimals={false} stroke="#4A5568" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A2B50', borderColor: '#1A2B50', borderRadius: '0.5rem' }}
                      itemStyle={{ color: '#FFFFFF' }}
                      labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="problems_solved" fill="#0079FF" radius={[4, 4, 0, 0]}>
                      <LabelList 
                        dataKey="problems_solved" 
                        position="top" 
                        fill="#4A5568" 
                        formatter={(label: React.ReactNode) => typeof label === 'number' ? label.toLocaleString() : (typeof label === 'string' ? label : '')}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Problems by Difficulty Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] mb-8 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#4A5568]">Problems Solved by Difficulty</h2>
                <FiTrendingUp className="text-[#0079FF]" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaderboard} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                    <XAxis dataKey="name" stroke="#4A5568" />
                    <YAxis allowDecimals={false} stroke="#4A5568" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A2B50', borderColor: '#1A2B50', borderRadius: '0.5rem' }}
                      itemStyle={{ color: '#FFFFFF' }}
                      labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="problems_solved_by_difficulty.easy" stackId="a" fill="#60a5fa" name="Easy" radius={[4, 0, 0, 0]}>
                      <LabelList 
                        dataKey="problems_solved_by_difficulty.easy" 
                        position="top" 
                        fill="#4A5568"
                        formatter={(label: React.ReactNode) => typeof label === 'number' ? label.toLocaleString() : (typeof label === 'string' ? label : '')}
                      />
                    </Bar>
                    <Bar dataKey="problems_solved_by_difficulty.medium" stackId="a" fill="#fbbf24" name="Medium">
                      <LabelList 
                        dataKey="problems_solved_by_difficulty.medium" 
                        position="top" 
                        fill="#4A5568"
                        formatter={(label: React.ReactNode) => typeof label === 'number' ? label.toLocaleString() : (typeof label === 'string' ? label : '')}
                      />
                    </Bar>
                    <Bar dataKey="problems_solved_by_difficulty.hard" stackId="a" fill="#ef4444" name="Hard" radius={[0, 4, 0, 0]}>
                      <LabelList 
                        dataKey="problems_solved_by_difficulty.hard" 
                        position="top" 
                        fill="#4A5568"
                        formatter={(label: React.ReactNode) => typeof label === 'number' ? label.toLocaleString() : (typeof label === 'string' ? label : '')}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Additional Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Recent Submissions */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-[#4A5568]">Recent Submissions (30 Days)</h2>
                  <FiClock className="text-[#0079FF]" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaderboard} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                      <XAxis dataKey="name" stroke="#4A5568" />
                      <YAxis allowDecimals={false} stroke="#4A5568" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1A2B50', borderColor: '#1A2B50', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#FFFFFF' }}
                        labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="recent_submissions" fill="#00C2A8" radius={[4, 4, 0, 0]}>
                        <LabelList 
                          dataKey="recent_submissions" 
                          position="top" 
                          fill="#4A5568"
                          formatter={(label: React.ReactNode) => typeof label === 'number' ? label.toLocaleString() : (typeof label === 'string' ? label : '')}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Acceptance Rate */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-[#4A5568]">Acceptance Rate</h2>
                  <FiCheckCircle className="text-[#0079FF]" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaderboard.filter(m => m.acceptance_rate !== null)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                      <XAxis dataKey="name" stroke="#4A5568" />
                      <YAxis stroke="#4A5568" domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1A2B50', borderColor: '#1A2B50', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#FFFFFF' }}
                        labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                        formatter={(label: React.ReactNode) => typeof label === 'number' ? [`${Math.round(label)}%`, "Acceptance Rate"] : ['N/A', 'Acceptance Rate']}
                      />
                      <Bar dataKey="acceptance_rate" fill="#a78bfa" radius={[4, 4, 0, 0]}>
                        <LabelList 
                          dataKey="acceptance_rate" 
                          position="top" 
                          fill="#4A5568"
                          formatter={(label: React.ReactNode) => typeof label === 'number' ? `${Math.round(label)}%` : (typeof label === 'string' ? label : 'N/A')}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Badges Section */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#4A5568]">Badges Earned</h2>
                <FiAward className="text-[#0079FF]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaderboard.map((row) => (
                  <div key={row.username} className="bg-[#F5F7FA] rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <div className="h-8 w-8 rounded-full bg-[#0079FF] flex items-center justify-center text-white text-xs font-medium mr-3">
                        {row.name?.charAt(0) || row.username?.charAt(0) || "?"}
                      </div>
                      <h3 className="font-medium">{row.name || "Anonymous"}</h3>
                    </div>
                    <div className="pl-11">
                      {Array.isArray(row.badges) && row.badges.length > 0 ? (
                        <ul className="space-y-1">
                          {row.badges.map((badge: any, idx: number) => (
                            <li key={idx} className="text-sm text-[#4A5568]">
                              • {badge.displayName || badge.name || badge.id}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#4A5568]">No badges earned yet</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}