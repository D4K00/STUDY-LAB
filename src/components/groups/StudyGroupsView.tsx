import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import { StudyGroup, GroupMember, Lecture } from '../../types/index.ts';
import {
  Users,
  Plus,
  KeyRound,
  Trash2,
  LogOut,
  X,
  Share2,
  Copy,
  Check,
  BookOpen,
  Shield,
  User,
} from 'lucide-react';

export const StudyGroupsView: React.FC = () => {
  const { currentUser, userProfile, t } = useAuth();

  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [groupDesc, setGroupDesc] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Load groups that the user is an owner or member of
  const loadGroups = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const uid = currentUser.uid;

      // Fetch groups owned by current user
      const ownedSnap = await getDocs(
        query(collection(db, 'study_groups'), where('ownerId', '==', uid))
      );
      const groupMap = new Map<string, StudyGroup>();
      ownedSnap.forEach((d) => groupMap.set(d.id, { id: d.id, ...d.data() } as StudyGroup));

      setGroups(Array.from(groupMap.values()));
    } catch (err) {
      console.warn('Error loading study groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [currentUser]);

  // Load group members when a group is selected
  const handleOpenGroup = async (group: StudyGroup) => {
    setSelectedGroup(group);
    try {
      const memSnap = await getDocs(collection(db, 'study_groups', group.id, 'members'));
      const memList: GroupMember[] = [];
      memSnap.forEach((d) => memList.push({ id: d.id, ...d.data() } as GroupMember));
      setMembers(memList);
    } catch (err) {
      console.warn('Error loading members:', err);
    }
  };

  // Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !groupName.trim()) return;

    // Generate unique 6-character uppercase join code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const displayName =
      userProfile?.displayName || currentUser.displayName || 'Student';

    try {
      const groupDoc = {
        name: groupName.trim(),
        description: groupDesc.trim() || undefined,
        ownerId: currentUser.uid,
        joinCode,
        memberCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'study_groups'), groupDoc);
      const newGroup: StudyGroup = { id: docRef.id, ...groupDoc };

      // Add owner as first member in subcollection
      const memberDoc = {
        groupId: newGroup.id,
        userId: currentUser.uid,
        role: 'owner' as const,
        displayName,
        joinedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'study_groups', newGroup.id, 'members'), memberDoc);

      setGroups((prev) => [newGroup, ...prev]);
      setSelectedGroup(newGroup);
      setMembers([{ id: 'owner', ...memberDoc }]);

      setGroupName('');
      setGroupDesc('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create study group:', err);
    }
  };

  // Join Group with code
  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !joinCodeInput.trim()) return;

    const code = joinCodeInput.trim().toUpperCase();
    try {
      const q = query(collection(db, 'study_groups'), where('joinCode', '==', code));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert('Invalid join code. Please check with the group owner.');
        return;
      }

      const targetGroupDoc = snap.docs[0];
      const targetGroup = { id: targetGroupDoc.id, ...targetGroupDoc.data() } as StudyGroup;

      const displayName =
        userProfile?.displayName || currentUser.displayName || 'Student';

      // Add member to group's members subcollection
      const memberDoc = {
        groupId: targetGroup.id,
        userId: currentUser.uid,
        role: 'member' as const,
        displayName,
        joinedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'study_groups', targetGroup.id, 'members'), memberDoc);

      // Increment count
      await updateDoc(doc(db, 'study_groups', targetGroup.id), {
        memberCount: (targetGroup.memberCount || 1) + 1,
        updatedAt: new Date().toISOString(),
      });

      setGroups((prev) => [targetGroup, ...prev]);
      setSelectedGroup(targetGroup);
      setShowJoinModal(false);
      setJoinCodeInput('');
      alert(`Successfully joined ${targetGroup.name}!`);
    } catch (err) {
      console.error('Join group error:', err);
      alert('Could not join group. Ensure code is correct.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.studyGroups}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Collaborate securely with study peers without exposing personal info
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{t.joinGroup}</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createGroup}</span>
          </button>
        </div>
      </div>

      {selectedGroup ? (
        /* Group Workspace */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-800 mb-1"
              >
                ← Back to Groups
              </button>
              <h2 className="text-xl font-bold text-slate-900">{selectedGroup.name}</h2>
              {selectedGroup.description && (
                <p className="text-xs text-slate-500 mt-1">{selectedGroup.description}</p>
              )}
            </div>

            {/* Join Code Box */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">Join Code:</span>
              <span className="font-mono font-bold text-slate-900 tracking-wider">
                {selectedGroup.joinCode}
              </span>
              <button
                onClick={() => handleCopyCode(selectedGroup.joinCode)}
                className="p-1 hover:text-slate-900 text-slate-500"
                title="Copy code"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Group Members ({members.length || 1})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {members.length > 0 ? (
                members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center gap-3 text-xs"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">
                      {m.displayName ? m.displayName.charAt(0) : 'S'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{m.displayName || 'Peer'}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{m.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center gap-3 text-xs">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">
                    You
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {userProfile?.displayName || 'Owner'}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">Owner</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Groups Master List */
        <div>
          {groups.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{t.noGroupsTitle}</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{t.noGroupsDesc}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.createGroup}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => handleOpenGroup(group)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-semibold text-slate-500">
                        {group.memberCount || 1} {t.members}
                      </span>
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold">
                        {group.joinCode}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{group.name}</h3>
                    {group.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {group.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>Open Group Workspace →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">{t.createGroup}</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.groupName}</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Molecular Biology Study Circle"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.groupDesc}</label>
                <textarea
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Focus topics, meeting times..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base">{t.joinGroup}</h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleJoinWithCode} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.enterJoinCode}
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. AB12CD"
                  className="w-full px-3 py-2 text-center font-mono font-bold tracking-widest text-lg border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 uppercase"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
