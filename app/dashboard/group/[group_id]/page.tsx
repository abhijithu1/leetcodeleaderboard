"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function GroupDetailsPage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const groupId = params.group_id as string;
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  // Fetch group and members
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
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
      const { data: membersData, error: membersErr } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });
      if (membersErr) {
        setError("Failed to fetch group members.");
        setLoading(false);
        return;
      }
      setMembers(membersData || []);
      setLoading(false);
    };
    fetchData();
  }, [groupId]);

  const isOwner = user && group && user.id === group.owner_id;

  // Add member logic
  const handleAddMember = async () => {
    setAddError(null);
    if (!addName.trim() || !addUsername.trim()) return;
    setAdding(true);
    // Validate LeetCode user
    try {
      const res = await fetch(`/api/leetcode-user?username=${encodeURIComponent(addUsername.trim())}`);
      if (!res.ok) {
        setAddError("Could not verify user. Please try again.");
        setAdding(false);
        return;
      }
      const data = await res.json();
      if (!data.matchedUser || !data.matchedUser.username) {
        setAddError("LeetCode user not found.");
        setAdding(false);
        return;
      }
    } catch {
      setAddError("Network error. Please try again.");
      setAdding(false);
      return;
    }
    // Insert member
    const supabase = createClient();
    const { error: insertErr, data: newMember } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        display_name: addName.trim(),
        leetcode_username: addUsername.trim(),
      })
      .select()
      .single();
    if (insertErr || !newMember) {
      setAddError("Failed to add member.");
      setAdding(false);
      return;
    }
    setMembers(prev => [...prev, newMember]);
    setAddName("");
    setAddUsername("");
    setAdding(false);
  };

  // Edit member logic
  const handleEditMember = (idx: number) => {
    setEditIdx(idx);
    setEditName(members[idx].display_name);
    setEditUsername(members[idx].leetcode_username);
    setEditError(null);
  };
  const handleSaveEdit = async (idx: number) => {
    setSavingEdit(true);
    setEditError(null);
    // Validate LeetCode user
    try {
      const res = await fetch(`/api/leetcode-user?username=${encodeURIComponent(editUsername.trim())}`);
      if (!res.ok) {
        setEditError("Could not verify user. Please try again.");
        setSavingEdit(false);
        return;
      }
      const data = await res.json();
      if (!data.matchedUser || !data.matchedUser.username) {
        setEditError("LeetCode user not found.");
        setSavingEdit(false);
        return;
      }
    } catch {
      setEditError("Network error. Please try again.");
      setSavingEdit(false);
      return;
    }
    // Update member
    const supabase = createClient();
    const memberId = members[idx].id;
    const { error: updateErr } = await supabase
      .from("group_members")
      .update({
        display_name: editName.trim(),
        leetcode_username: editUsername.trim(),
      })
      .eq("id", memberId);
    if (updateErr) {
      setEditError("Failed to update member.");
      setSavingEdit(false);
      return;
    }
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, display_name: editName.trim(), leetcode_username: editUsername.trim() } : m));
    setEditIdx(null);
    setEditName("");
    setEditUsername("");
    setSavingEdit(false);
  };
  const handleCancelEdit = () => {
    setEditIdx(null);
    setEditName("");
    setEditUsername("");
    setEditError(null);
  };

  // Delete member logic
  const handleDeleteMember = async (idx: number) => {
    setDeletingIdx(idx);
    const supabase = createClient();
    const memberId = members[idx].id;
    const { error: deleteErr } = await supabase
      .from("group_members")
      .delete()
      .eq("id", memberId);
    if (!deleteErr) {
      setMembers(prev => prev.filter((_, i) => i !== idx));
    }
    setDeletingIdx(null);
  };

  // Excel/CSV file processing for batch member add
  const handleFileChange = (f: File | null) => {
    setFileError(null);
    if (!f) return;
    setFileLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        if (!json.length || !("name" in json[0]) || !("username" in json[0])) {
          setFileError('Excel/CSV must have "name" and "username" columns.');
          setFileLoading(false);
          return;
        }
        const newMembers = json
          .filter(row => row.name && row.username)
          .map(row => ({ name: String(row.name).trim(), username: String(row.username).trim() }));

        if (newMembers.length === 0) {
          setFileError("No valid members found in file.");
          setFileLoading(false);
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

        const validMembers = checkedMembers.filter(Boolean) as { name: string; username: string }[];
        // Filter out duplicates already in the group
        const existingUsernames = new Set(members.map(m => m.leetcode_username));
        const uniqueValidMembers = validMembers.filter(m => !existingUsernames.has(m.username));
        if (uniqueValidMembers.length === 0) {
          setFileError("No new valid LeetCode users found in file.");
          setFileLoading(false);
          return;
        }

        // Insert unique valid members into Supabase
        const supabase = createClient();
        const membersToInsert = uniqueValidMembers.map(m => ({
          group_id: groupId,
          display_name: m.name,
          leetcode_username: m.username,
        }));
        const { data: inserted, error } = await supabase
          .from("group_members")
          .insert(membersToInsert)
          .select();

        if (error) {
          setFileError("Failed to add members to group.");
          setFileLoading(false);
          return;
        }
        setMembers(prev => [...prev, ...(inserted || [])]);
        setFileLoading(false);
      } catch (err) {
        setFileError("Failed to parse file. Please upload a valid Excel or CSV file.");
        setFileLoading(false);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-white via-indigo-50 to-orange-50">
      <div className="w-full max-w-2xl mt-20 p-8 bg-white rounded-xl shadow text-center">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-indigo-700">Group Details</h1>
          <Link href="/dashboard" className="text-indigo-500 hover:underline">← Back</Link>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <>
            <div className="mb-4 text-left">
              <div className="font-bold text-lg">{group.name}</div>
              <div className="text-xs text-gray-500 mb-2">Created: {new Date(group.created_at).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Owner: {group.owner_id}</div>
            </div>
            {isOwner && (
              <div className="mb-4 text-left">
                <h3 className="font-semibold mb-2">Add Members from Excel/CSV</h3>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="border rounded px-4 py-2"
                  onChange={e => handleFileChange(e.target.files?.[0] || null)}
                  disabled={fileLoading}
                />
                {fileError && <div className="text-red-500 text-xs mt-1">{fileError}</div>}
                {fileLoading && <div className="text-indigo-500 text-xs mt-1">Processing file...</div>}
              </div>
            )}
            <div className="mb-6 text-left">
              <h2 className="font-semibold mb-2">Members</h2>
              <ul className="space-y-1">
                {members.map((m, idx) => (
                  <li key={m.id} className="flex justify-between items-center bg-indigo-50 rounded px-3 py-1">
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
                          disabled={savingEdit}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="text-gray-500 text-xs font-bold"
                          onClick={handleCancelEdit}
                          disabled={savingEdit}
                        >
                          Cancel
                        </button>
                        {editError && <div className="text-red-500 text-xs mt-1">{editError}</div>}
                      </>
                    ) : (
                      <>
                        <span>{m.display_name} ({m.leetcode_username})</span>
                        {isOwner && (
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
                              onClick={() => handleDeleteMember(idx)}
                              disabled={deletingIdx === idx}
                            >
                              {deletingIdx === idx ? "Deleting..." : "Remove"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {isOwner && (
              <div className="mb-4 text-left">
                <h3 className="font-semibold mb-2">Add Member</h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="Name"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="LeetCode Username"
                    value={addUsername}
                    onChange={e => setAddUsername(e.target.value)}
                  />
                  <button
                    type="button"
                    className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 transition"
                    onClick={handleAddMember}
                    disabled={adding}
                  >
                    {adding ? "Adding..." : "Add"}
                  </button>
                </div>
                {addError && <div className="text-red-500 text-xs mt-1">{addError}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
} 