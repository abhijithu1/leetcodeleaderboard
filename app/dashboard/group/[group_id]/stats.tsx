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
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const fetchStats = async () => {
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

  useEffect(() => {
    fetchStats();
  }, [groupId]);

  // Refresh stats handler
  const handleRefreshStats = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/refresh-leetcode-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId }),
      });
      if (!res.ok) {
        setRefreshError("Failed to refresh stats.");
        setRefreshing(false);
        return;
      }
      await fetchStats();
    } catch {
      setRefreshError("Network error. Please try again.");
    }
    setRefreshing(false);
  };

  // ...existing leaderboard/chart code...

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-white via-indigo-50 to-orange-50">
      <div className="w-full max-w-3xl mt-20 p-8 bg-white rounded-xl shadow text-center">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-indigo-700">Group Leaderboard & Stats</h1>
          <Link href={`/dashboard/group/${groupId}`} className="text-indigo-500 hover:underline">← Back</Link>
        </div>
        <div className="mb-4 flex justify-end">
          <button
            className="bg-indigo-500 text-white font-bold px-4 py-2 rounded hover:bg-indigo-600 transition"
            onClick={handleRefreshStats}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh Stats"}
          </button>
        </div>
        {refreshError && <div className="text-red-500 text-sm mb-2">{refreshError}</div>}
        {/* ...existing leaderboard/chart code... */}
      </div>
    </main>
  );
} 