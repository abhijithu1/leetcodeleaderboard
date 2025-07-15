"use client";

import { useState } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Remove unused variable 'file'
// Replace all 'any' with explicit types or Record<string, unknown> as a fallback
// Remove unused variables (e.g., 'err')
interface GroupMember {
  name: string;
  username: string;
}

export default function CreateGroupPage() {
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const { user } = useUser();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Excel/CSV file processing
  const handleFileChange = (f: File | null) => {
    setFileError(null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: GroupMember[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        // Validate columns
        if (!json.length || !("name" in json[0]) || !("username" in json[0])) {
          setFileError('Excel/CSV must have "name" and "username" columns.');
          return;
        }
        // Filter valid rows
        const newMembers = json
          .filter(row => row.name && row.username)
          .map(row => ({ name: String(row.name).trim(), username: String(row.username).trim() }));

        if (newMembers.length === 0) {
          setFileError("No valid members found in file.");
          return;
        }

        // Check LeetCode existence for each username
        const checkedMembers = await Promise.all(
          newMembers.map(async (m) => {
            try {
              const res = await fetch(`/api/leetcode-user?username=${encodeURIComponent(m.username)}`);
              if (!res.ok) return null;
              const data = await res.json();
              if (!data.matchedUser || !data.matchedUser.username) return null;
              return m;
            } catch {
              return null;
            }
          })
        );

        const validMembers = checkedMembers.filter(Boolean) as GroupMember[];
        // Filter out duplicates already in the preview list
        const existingUsernames = new Set(members.map(m => m.username));
        const uniqueValidMembers = validMembers.filter(m => !existingUsernames.has(m.username));
        if (uniqueValidMembers.length === 0) {
          setFileError("No new valid LeetCode users found in file.");
          return;
        }
        setMembers(prev => [
          ...prev,
          ...uniqueValidMembers
        ]);
      } catch {
        setFileError("Failed to parse file. Please upload a valid Excel or CSV file.");
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleAddManualMember = async () => {
    setManualError(null);
    if (!manualName.trim() || !manualUsername.trim()) return;
    setManualLoading(true);
    try {
      const res = await fetch(`/api/leetcode-user?username=${encodeURIComponent(manualUsername.trim())}`);
      if (!res.ok) {
        setManualError("Could not verify user. Please try again.");
        setManualLoading(false);
        return;
      }
      const data = await res.json();
      if (!data.matchedUser || !data.matchedUser.username) {
        setManualError("LeetCode user not found.");
      } else {
        setMembers(prev => [
          ...prev,
          { name: manualName.trim(), username: manualUsername.trim() }
        ]);
        setManualName("");
        setManualUsername("");
      }
    } catch {
      setManualError("Network error. Please try again.");
    }
    setManualLoading(false);
  };

  const handleRemoveMember = (idx: number) => {
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEditMember = (idx: number) => {
    setEditIdx(idx);
    setEditName(members[idx].name);
    setEditUsername(members[idx].username);
  };

  const handleSaveEdit = (idx: number) => {
    setMembers(prev => prev.map((m, i) => i === idx ? { name: editName.trim(), username: editUsername.trim() } : m));
    setEditIdx(null);
    setEditName("");
    setEditUsername("");
  };

  const handleCancelEdit = () => {
    setEditIdx(null);
    setEditName("");
    setEditUsername("");
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const supabase = createClient();

    // 1. Insert group
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert([
        {
          name: groupName,
          owner_id: user?.id,
          is_public: false,
        }
      ])
      .select()
      .single();

    if (groupError || !group) {
      setCreateError("Failed to create group.");
      setCreating(false);
      return;
    }

    // 2. Insert group members
    const membersToInsert = members.map(m => ({
      group_id: group.id,
      display_name: m.name,
      leetcode_username: m.username,
    }));

    const { error: membersError } = await supabase
      .from("group_members")
      .insert(membersToInsert);

    if (membersError) {
      setCreateError("Failed to add group members.");
      setCreating(false);
      return;
    }

    // 3. Refresh LeetCode stats for the new group
    try {
      await fetch("/api/refresh-leetcode-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: group.id }),
      });
    } catch {}

    setCreating(false);
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      {/* Header bar with profile button */}
      <div className="w-full flex justify-end items-center px-4 mb-4">
        <UserButton afterSignOutUrl="/" />
      </div>
      <div className="max-w-2xl mx-auto px-4">
        <SignedIn>
          <div className="w-full max-w-xl mt-20 p-8 bg-white rounded-xl shadow text-center">
            <h1 className="text-3xl font-extrabold mb-6 text-indigo-700">Create a New Group</h1>
            <form
              className="flex flex-col gap-6"
              onSubmit={handleCreateGroup}
            >
              <input
                type="text"
                className="border rounded px-4 py-2"
                placeholder="Group Name"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                required
              />
              <div className="flex flex-col gap-2 items-start">
                <label className="font-medium">Upload Excel/CSV (optional):</label>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="border rounded px-4 py-2"
                  onChange={e => handleFileChange(e.target.files?.[0] || null)}
                />
                {fileError && <div className="text-red-500 text-sm">{fileError}</div>}
              </div>
              <div className="flex flex-col gap-2 items-start">
                <label className="font-medium">Add Member Manually:</label>
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="Name"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="LeetCode Username"
                    value={manualUsername}
                    onChange={e => setManualUsername(e.target.value)}
                  />
                  <button
                    type="button"
                    className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 transition"
                    onClick={handleAddManualMember}
                    disabled={manualLoading}
                  >
                    {manualLoading ? "Checking..." : "Add"}
                  </button>
                </div>
                {manualError && (
                  <div className="text-red-500 text-xs mt-1">{manualError}</div>
                )}
              </div>
              <div className="text-left w-full">
                <h3 className="font-semibold mb-2">Members Preview:</h3>
                {members.length === 0 ? (
                  <div className="text-gray-500 text-sm">No members added yet.</div>
                ) : (
                  <ul className="space-y-1">
                    {members.map((m, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-indigo-50 rounded px-3 py-1">
                        {editIdx === idx ? (
                          <>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 mr-2"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                            />
                            <input
                              type="text"
                              className="border rounded px-2 py-1 mr-2"
                              value={editUsername}
                              onChange={e => setEditUsername(e.target.value)}
                            />
                            <button
                              type="button"
                              className="text-green-600 text-xs font-bold mr-2"
                              onClick={() => handleSaveEdit(idx)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="text-gray-500 text-xs font-bold"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span>{m.name} ({m.username})</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="text-blue-500 text-xs hover:underline"
                                onClick={() => handleEditMember(idx)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-red-500 text-xs hover:underline"
                                onClick={() => handleRemoveMember(idx)}
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="submit"
                className="bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700 transition"
                disabled={creating || !groupName || members.length === 0}
              >
                {creating ? "Creating..." : "Create Group"}
              </button>
              {createError && <div className="text-red-500 text-sm mt-2">{createError}</div>}
            </form>
            <div className="mt-6">
              <Link href="/dashboard" className="text-indigo-500 hover:underline">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </SignedIn>
        <SignedOut>
          <div className="w-full max-w-xl mt-32 p-8 bg-white rounded-xl shadow text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-600">You must be signed in to create a group.</h2>
          </div>
        </SignedOut>
      </div>
    </main>
  );
}