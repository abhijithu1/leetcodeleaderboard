"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FiRefreshCw, FiPlus } from "react-icons/fi";

// Define types for group and group member
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
}

export default function DashboardPage() {
  const { user } = useUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingGroupId, setRefreshingGroupId] = useState<string | null>(null);

  // Fetch groups from Supabase
  useEffect(() => {
    async function fetchGroups() {
      setLoading(true);
      const supabase = createClient();
      const { data: groupsData } = await supabase.from("groups").select("*, group_members(*)").eq("owner_id", user?.id);
      setGroups((groupsData as Group[]) || []);
      setLoading(false);
    }
    if (user?.id) fetchGroups();
  }, [user]);

  // Refresh stats for a specific group
  const handleRefreshGroup = async (groupId: string) => {
    setRefreshingGroupId(groupId);
    try {
      await fetch("/api/refresh-leetcode-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId }),
      });
    } catch {
      // Handle error if needed
    }
    setTimeout(() => setRefreshingGroupId(null), 1200); // Simulate refresh
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header row: title and create group button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <Link href="/dashboard/create-group">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 font-semibold hover:bg-gray-100 hover:border-gray-400 transition">
              <FiPlus className="text-lg" />
              Create New Group
            </button>
          </Link>
        </div>
        {/* Groups list */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <span className="text-gray-400 text-base">Loading your groups...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <span className="text-gray-500 text-base mb-2">No groups yet.</span>
            <Link href="/dashboard/create-group" className="text-blue-600 hover:underline font-semibold">Create your first group!</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {groups.map((group) => (
              <div key={group.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 flex flex-col gap-2 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base font-semibold text-gray-900 truncate max-w-[60%]">{group.name}</span>
                  <div className="flex gap-2 items-center">
                    {/* Refresh Stats button for this group */}
                    <button
                      onClick={() => handleRefreshGroup(group.id)}
                      className={`flex items-center gap-1 px-3 py-1 border border-gray-300 rounded bg-white text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition text-sm ${refreshingGroupId === group.id ? 'pointer-events-none opacity-60' : ''}`}
                      aria-label="Refresh Stats"
                      disabled={refreshingGroupId === group.id}
                    >
                      <FiRefreshCw className={refreshingGroupId === group.id ? 'animate-spin' : ''} />
                      {refreshingGroupId === group.id ? 'Refreshing...' : 'Refresh Stats'}
                    </button>
                    <Link href={`/dashboard/group/${group.id}/stats`} className="text-blue-600 hover:underline text-sm font-medium">Stats</Link>
                    <Link href={`/dashboard/group/${group.id}`} className="text-gray-600 hover:underline text-sm font-medium">View</Link>
                  </div>
                </div>
                <span className="text-sm text-gray-500 mb-1 truncate">{group.description || "No description"}</span>
                <span className="text-xs text-gray-400">{group.group_members?.length || 0} members</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </main>
  );
} 