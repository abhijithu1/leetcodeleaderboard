"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FiRefreshCw, FiPlus, FiTrendingUp, FiAward, FiClock, FiZap } from "react-icons/fi";
import { UserButton } from "@clerk/nextjs";

// Define types for group and group member
interface GroupMember {
  id: string;
  display_name: string;
  leetcode_username: string;
  problems_solved: number;
  recent_ac_count: number;
  current_streak: number;
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
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  // Fetch groups from Supabase
  useEffect(() => {
    async function ensureUserInDB() {
      if (!user?.id) return;
      const supabase = createClient();
      // Check if user exists
      const { data: existing, error: fetchError } = await supabase
  .from("users")
  .select("id")
  .eq("id", user.id)
  .single();

if (fetchError) {
  console.error("Error checking user existence:", fetchError);
}

      if (!existing) {
        // Insert new user
        await supabase.from("users").insert({
          id: user.id,
          name: user.fullName || user.username || user.firstName || "",
          email: user.emailAddresses?.[0]?.emailAddress || "",
          created_at: new Date().toISOString(),
        });
      }
    }

    ensureUserInDB();

    async function fetchGroups() {
      setLoading(true);
      const supabase = createClient();
      const { data: groupsData } = await supabase
        .from("groups")
        .select("*, group_members(*)")
        .eq("owner_id", user?.id);
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
      // Refetch the group data
      const supabase = createClient();
      const { data: groupData } = await supabase
        .from("groups")
        .select("*, group_members(*)")
        .eq("id", groupId)
        .single();
      if (groupData) {
        setGroups(groups.map(g => g.id === groupId ? groupData as Group : g));
        if (activeGroup?.id === groupId) {
          setActiveGroup(groupData as Group);
        }
      }
    } catch {
      // Handle error if needed
    }
    setTimeout(() => setRefreshingGroupId(null), 1200); // Simulate refresh
  };

  // Calculate total problems solved by all members
  const totalProblemsSolved = activeGroup?.group_members?.reduce(
    (sum, member) => sum + (member.problems_solved || 0),
    0
  ) || 0;

  // Calculate average problems solved
  const averageProblemsSolved = activeGroup?.group_members?.length
    ? Math.round(totalProblemsSolved / activeGroup.group_members.length)
    : 0;

  // Sort members by problems solved for leaderboard
  const sortedMembers = activeGroup?.group_members
    ? [...activeGroup.group_members].sort((a, b) => (b.problems_solved || 0) - (a.problems_solved || 0))
    : [];

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

      {/* Main Dashboard Content */}
      <div className="pt-24 px-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <span className="text-gray-400 text-base">Loading your groups...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <span className="text-gray-500 text-base mb-2">No groups yet.</span>
            <Link href="/dashboard/create-group" className="text-[#0079FF] hover:underline font-semibold">
              Create your first group!
            </Link>
          </div>
        ) : (
          <>
            {/* Group Selection */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#4A5568] mb-3">Select a Group</h2>
              <div className="flex flex-wrap gap-3">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setActiveGroup(group)}
                    className={`px-4 py-2 rounded-lg ${activeGroup?.id === group.id ? 'bg-[#0079FF] text-white' : 'bg-white text-[#4A5568] border border-[#E1E5EB] hover:bg-gray-50'}`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </div>

            {activeGroup && (
              <>
                {/* Dashboard Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold text-[#4A5568]">{activeGroup.name}</h1>
                    <p className="text-[#4A5568]">{activeGroup.description || "No description"}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleRefreshGroup(activeGroup.id)}
                      className="bg-white border border-[#E1E5EB] rounded-lg px-4 py-2 text-[#4A5568] hover:bg-[#F5F7FA] transition flex items-center"
                      disabled={refreshingGroupId === activeGroup.id}
                    >
                      <FiRefreshCw className={`h-4 w-4 mr-2 ${refreshingGroupId === activeGroup.id ? 'animate-spin' : ''}`} />
                      {refreshingGroupId === activeGroup.id ? 'Refreshing...' : 'Refresh Stats'}
                    </button>
                    <Link
                      href={`/dashboard/group/${activeGroup.id}`}
                      className="bg-white border border-[#E1E5EB] rounded-lg px-4 py-2 text-[#4A5568] hover:bg-[#F5F7FA] transition flex items-center"
                    >
                      Edit Group
                    </Link>
                    <Link
                      href={`/dashboard/group/${activeGroup.id}/stats`}
                      className="bg-[#0079FF] text-white rounded-lg px-4 py-2 hover:bg-[#0069D9] transition"
                    >
                      Stats View
                    </Link>
                  </div>
                </div>

                {/* Stats Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Problems Solved Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[#4A5568] text-sm">Problems Solved</p>
                        <h2 className="text-3xl font-semibold mt-1">{totalProblemsSolved}</h2>
                      </div>
                      <div className="bg-[#00C2A8] bg-opacity-10 text-[#00C2A8] px-3 py-1 rounded-full text-xs font-medium">
                        <FiTrendingUp className="inline mr-1" />
                        {averageProblemsSolved} avg
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 bg-[#E1E5EB] rounded-full">
                        <div
                          className="h-2 bg-[#00C2A8] rounded-full"
                          style={{ width: `${Math.min(100, (totalProblemsSolved / 500) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[#4A5568] text-xs mt-2">Group total</p>
                    </div>
                  </div>

                  {/* Top Performer Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-[#4A5568] text-sm">Top Performer</p>
                        {sortedMembers.length > 0 ? (
                          <>
                            <h2 className="text-3xl font-semibold mt-1">{sortedMembers[0].problems_solved || 0}</h2>
                            <p className="text-[#4A5568] text-sm mt-1">
                              {sortedMembers[0].display_name || sortedMembers[0].leetcode_username}
                            </p>
                          </>
                        ) : (
                          <p className="text-[#4A5568] text-sm mt-4">No data</p>
                        )}
                      </div>
                      <FiAward className="h-8 w-8 text-[#FFD700]" />
                    </div>
                  </div>

                  {/* Group Members Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] p-6">
                    <div>
                      <p className="text-[#4A5568] text-sm">Group Members</p>
                      <h2 className="text-3xl font-semibold mt-1">{activeGroup.group_members?.length || 0}</h2>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex -space-x-2">
                          {activeGroup.group_members?.slice(0, 3).map((member) => (
                            <div
                              key={member.id}
                              className="h-8 w-8 rounded-full bg-[#0079FF] flex items-center justify-center text-white text-xs font-medium"
                            >
                              {member.display_name?.charAt(0) || member.leetcode_username?.charAt(0) || "?"}
                            </div>
                          ))}
                        </div>
                        {activeGroup.group_members && activeGroup.group_members.length > 3 && (
                          <p className="text-[#4A5568] text-sm">
                            +{activeGroup.group_members.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leaderboard Table */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] mb-8 overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E1E5EB] flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-[#4A5568]">Group Leaderboard</h2>
                    <Link
                      href={`/dashboard/group/${activeGroup.id}`}
                      className="text-[#0079FF] text-sm font-medium"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#E1E5EB]">
                      <thead className="bg-[#F5F7FA]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">
                            Member
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">
                            Solved
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">
                            Recent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#4A5568] uppercase tracking-wider">
                            Streak
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#E1E5EB]">
                        {sortedMembers.slice(0, 5).map((member, index) => (
                          <tr
                            key={member.id}
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
                                  {member.display_name?.charAt(0) || member.leetcode_username?.charAt(0) || "?"}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {member.display_name || member.leetcode_username || "Anonymous"}
                                  </p>
                                  {member.leetcode_username && (
                                    <p className="text-[#4A5568] text-sm">@{member.leetcode_username}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold">{member.problems_solved || 0}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-[#00C2A8]">
                              {member.recent_ac_count ? `+${member.recent_ac_count} today` : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {member.current_streak ? (
                                <span className="inline-flex items-center">
                                  <FiZap className="h-4 w-4 text-orange-500 mr-1" />
                                  {member.current_streak}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E1E5EB] mb-8">
                  <div className="px-6 py-4 border-b border-[#E1E5EB]">
                    <h2 className="text-xl font-semibold text-[#4A5568]">Recent Activity</h2>
                  </div>
                  <div className="divide-y divide-[#E1E5EB]">
                    {sortedMembers.slice(0, 3).map((member) => (
                      <div key={member.id} className="px-6 py-4">
                        <div className="flex items-start">
                          <div className="h-10 w-10 rounded-full bg-[#0079FF] flex items-center justify-center text-white text-sm font-medium mr-3">
                            {member.display_name?.charAt(0) || member.leetcode_username?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.display_name || member.leetcode_username || "Anonymous"}{" "}
                              <span className="text-[#0079FF]">solved a problem</span>
                            </p>
                            <p className="text-[#4A5568] text-sm mt-1">
                              <FiClock className="inline mr-1" />
                              Recently · LeetCode
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="px-6 py-4 text-center">
                      <Link
                        href={`/dashboard/group/${activeGroup.id}`}
                        className="text-[#0079FF] hover:underline font-medium"
                      >
                        View all activity
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Create Group Floating Button */}
      <Link href="/dashboard/create-group" className="fixed bottom-8 right-8">
        <button className="bg-[#0079FF] text-white rounded-full p-4 shadow-lg hover:bg-[#0069D9] transition transform hover:scale-105 flex items-center">
          <FiPlus className="h-6 w-6" />
          <span className="ml-2">Create New Group</span>
        </button>
      </Link>

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