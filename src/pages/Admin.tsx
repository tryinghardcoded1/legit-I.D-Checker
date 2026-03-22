import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, addDoc, setDoc } from 'firebase/firestore';
import { User, Subscription, Setting, Task } from '../types';
import { ShieldAlert, Users, CreditCard, Settings, LayoutDashboard, Loader2, Trash2, Edit2, Check, X, Search as SearchIcon, CheckSquare, ArrowUpDown, ArrowUp, ArrowDown, UserCheck } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../services/firestore';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { isAdmin, user, impersonateUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'subscriptions' | 'settings' | 'tasks'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortField, setSortField] = useState<'email' | 'role' | 'credits' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  const [showAddSub, setShowAddSub] = useState(false);
  const [newSubUserId, setNewSubUserId] = useState('');
  const [newSubPlan, setNewSubPlan] = useState('basic');

  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [subToDelete, setSubToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAuthorized = isAdmin || (user?.email === 'cerezvincent1@gmail.com');

  useEffect(() => {
    if (!isAuthorized) return;

    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const subsQuery = query(collection(db, 'subscriptions'));
    const settingsQuery = query(collection(db, 'settings'));
    const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const results: User[] = [];
      snapshot.forEach((doc) => {
        results.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(results);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubscribeSubs = onSnapshot(subsQuery, (snapshot) => {
      const results: Subscription[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Subscription);
      });
      setSubscriptions(results);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'subscriptions'));

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const results: Task[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(results);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    const unsubscribeSettings = onSnapshot(settingsQuery, (snapshot) => {
      const results: Setting[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Setting);
      });
      
      // Initialize default settings if empty
      if (results.length === 0) {
        const defaultSettings = [
          { key: 'max_requests', value: '100' },
          { key: 'pricing', value: '0.05' },
          { key: 'feature_flags', value: '{"beta_features": true}' }
        ];
        defaultSettings.forEach(async (setting) => {
          try {
            await addDoc(collection(db, 'settings'), setting);
          } catch (e) {
            console.error("Error adding default setting", e);
          }
        });
      } else {
        setSettings(results);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'settings'));

    return () => {
      unsubscribeUsers();
      unsubscribeSubs();
      unsubscribeTasks();
      unsubscribeSettings();
    };
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 text-stone-900">
        <ShieldAlert className="w-16 h-16 text-red-600 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Unauthorized Access</h1>
        <p className="text-stone-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="w-12 h-12 text-emerald-600 animate-spin" /></div>;
  }

  const totalApiUsage = users.reduce((sum, u) => sum + (u.api_usage || 0), 0);
  const activeSubsCount = subscriptions.filter(s => s.status === 'active').length;

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.uid.includes(searchQuery)).sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'email' | 'role' | 'credits') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleUpdateUserRole = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleUpdateCredits = async (uid: string, currentCredits: number, amount: number) => {
    try {
      await updateDoc(doc(db, 'users', uid), { credits: Math.max(0, currentCredits + amount) });
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      setUserToDelete(null);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleUpdateSubscription = async (id: string, field: string, value: string) => {
    try {
      await updateDoc(doc(db, 'subscriptions', id), { [field]: value });
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleUpdateSetting = async (id: string, value: string) => {
    try {
      await updateDoc(doc(db, 'settings', id), { value });
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) return;
    
    const validRoles = ['user', 'admin', 'premium'];
    if (!validRoles.includes(newUserRole)) {
      setError('Invalid role. Must be user, admin, or premium.');
      return;
    }

    try {
      const newUid = 'user_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        email: newUserEmail,
        role: newUserRole,
        credits: 5,
        api_usage: 0,
        createdAt: new Date().toISOString()
      });
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserRole('user');
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    
    const validRoles = ['user', 'admin', 'premium'];
    if (!validRoles.includes(userToEdit.role)) {
      setError('Invalid role. Must be user, admin, or premium.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userToEdit.uid), {
        email: userToEdit.email,
        role: userToEdit.role,
        credits: userToEdit.credits,
      });
      setUserToEdit(null);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        title: newTaskTitle.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setNewTaskTitle('');
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleUpdateTask = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { status: currentStatus === 'pending' ? 'completed' : 'pending' });
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubUserId) return;
    try {
      await addDoc(collection(db, 'subscriptions'), {
        user_id: newSubUserId,
        plan: newSubPlan,
        status: 'active',
        renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      setShowAddSub(false);
      setNewSubUserId('');
      setNewSubPlan('basic');
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const confirmDeleteSubscription = async () => {
    if (!subToDelete) return;
    try {
      await deleteDoc(doc(db, 'subscriptions', subToDelete));
      setSubToDelete(null);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-stone-900 text-stone-300 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <ShieldAlert className="w-6 h-6 mr-2 text-emerald-500" />
            Admin Panel
          </h2>
        </div>
        <nav className="mt-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'dashboard' ? 'bg-stone-800 text-white border-l-4 border-emerald-500' : 'hover:bg-stone-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'users' ? 'bg-stone-800 text-white border-l-4 border-emerald-500' : 'hover:bg-stone-800 hover:text-white'}`}
          >
            <Users className="w-5 h-5 mr-3" /> Users
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'subscriptions' ? 'bg-stone-800 text-white border-l-4 border-emerald-500' : 'hover:bg-stone-800 hover:text-white'}`}
          >
            <CreditCard className="w-5 h-5 mr-3" /> Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'settings' ? 'bg-stone-800 text-white border-l-4 border-emerald-500' : 'hover:bg-stone-800 hover:text-white'}`}
          >
            <Settings className="w-5 h-5 mr-3" /> Settings
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'tasks' ? 'bg-stone-800 text-white border-l-4 border-emerald-500' : 'hover:bg-stone-800 hover:text-white'}`}
          >
            <CheckSquare className="w-5 h-5 mr-3" /> Tasks
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold text-stone-900">Dashboard Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex items-center text-stone-500 mb-2">
                  <Users className="w-5 h-5 mr-2" /> Total Users
                </div>
                <div className="text-4xl font-bold text-stone-900">{users.length}</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex items-center text-stone-500 mb-2">
                  <CreditCard className="w-5 h-5 mr-2" /> Active Subscriptions
                </div>
                <div className="text-4xl font-bold text-stone-900">{activeSubsCount}</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex items-center text-stone-500 mb-2">
                  <LayoutDashboard className="w-5 h-5 mr-2" /> Total API Usage
                </div>
                <div className="text-4xl font-bold text-stone-900">{totalApiUsage}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold text-stone-900">Users Management</h1>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  Add User
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-medium cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => handleSort('email')}>
                        <div className="flex items-center">
                          Email
                          {sortField === 'email' ? (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />) : <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />}
                        </div>
                      </th>
                      <th className="p-4 font-medium cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => handleSort('role')}>
                        <div className="flex items-center">
                          Role
                          {sortField === 'role' ? (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />) : <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />}
                        </div>
                      </th>
                      <th className="p-4 font-medium cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => handleSort('credits')}>
                        <div className="flex items-center">
                          Credits
                          {sortField === 'credits' ? (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />) : <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />}
                        </div>
                      </th>
                      <th className="p-4 font-medium">API Usage</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filteredUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4 text-stone-900 font-medium">{u.email}</td>
                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.uid, e.target.value)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer ${
                              u.role === 'admin'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300'
                                : u.role === 'premium'
                                ? 'bg-purple-50 text-purple-800 border-purple-200 hover:border-purple-300'
                                : 'bg-stone-50 text-stone-800 border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <option value="user">USER</option>
                            <option value="premium">PREMIUM</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        </td>
                        <td className="p-4 text-stone-600">
                          <div className="flex items-center space-x-2">
                            <span>{u.credits}</span>
                            <button onClick={() => handleUpdateCredits(u.uid, u.credits, 10)} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-2 py-1 bg-emerald-50 rounded">+10</button>
                            <button onClick={() => handleUpdateCredits(u.uid, u.credits, -10)} className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 bg-red-50 rounded">-10</button>
                          </div>
                        </td>
                        <td className="p-4 text-stone-600">{u.api_usage || 0}</td>
                        <td className="p-4 text-right space-x-2">
                          <button 
                            onClick={() => {
                              impersonateUser(u);
                              navigate('/');
                            }} 
                            className="text-stone-500 hover:text-emerald-600 transition-colors p-2" 
                            title="Login As User"
                          >
                            <UserCheck className="w-5 h-5 inline" />
                          </button>
                          <button onClick={() => setUserToEdit(u)} className="text-stone-500 hover:text-blue-600 transition-colors p-2" title="Edit User">
                            <Edit2 className="w-5 h-5 inline" />
                          </button>
                          <button onClick={() => setUserToDelete(u.uid)} className="text-stone-500 hover:text-red-600 transition-colors p-2" title="Delete User">
                            <Trash2 className="w-5 h-5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-stone-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold text-stone-900">Subscriptions Management</h1>
              <button
                onClick={() => setShowAddSub(true)}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add Subscription
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-medium">User ID</th>
                      <th className="p-4 font-medium">Plan</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Renewal Date</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {subscriptions.map(sub => (
                      <tr key={sub.id} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4 text-stone-900 font-mono text-sm">{sub.user_id.substring(0, 8)}...</td>
                        <td className="p-4">
                          <select
                            value={sub.plan}
                            onChange={(e) => handleUpdateSubscription(sub.id!, 'plan', e.target.value)}
                            className="bg-stone-50 border border-stone-300 rounded px-2 py-1 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleUpdateSubscription(sub.id!, 'status', sub.status === 'active' ? 'inactive' : 'active')}
                            className={`px-2 py-1 text-xs font-bold rounded-full transition-colors ${sub.status === 'active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                          >
                            {sub.status.toUpperCase()}
                          </button>
                        </td>
                        <td className="p-4 text-stone-600">{new Date(sub.renewal_date).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => setSubToDelete(sub.id!)} className="text-stone-500 hover:text-red-600 transition-colors p-2" title="Delete Subscription">
                            <Trash2 className="w-5 h-5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {subscriptions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-stone-500">No subscriptions found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold text-stone-900">System Settings</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <div className="space-y-6 max-w-2xl">
                {settings.map(setting => (
                  <div key={setting.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <h3 className="font-bold text-stone-900 font-mono">{setting.key}</h3>
                    </div>
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        defaultValue={setting.value}
                        onBlur={(e) => {
                          if (e.target.value !== setting.value) {
                            handleUpdateSetting(setting.id!, e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <Check className="w-5 h-5 text-emerald-500 opacity-0 focus-within:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
                {settings.length === 0 && (
                  <p className="text-stone-500 italic">No settings found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold text-stone-900">Tasks Management</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <form onSubmit={handleAddTask} className="flex gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Enter new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  Add Task
                </button>
              </form>
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleUpdateTask(task.id!, task.status)}
                        className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 text-transparent hover:border-emerald-500'}`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <span className={`font-medium ${task.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                        {task.title}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(task.id!)}
                      className="text-stone-400 hover:text-red-600 transition-colors p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-stone-500 italic text-center py-4">No tasks found. Add one above.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-stone-900">Add New User</h3>
                <button onClick={() => setShowAddUser(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="user">User</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 bg-stone-100 text-stone-700 font-medium rounded-lg hover:bg-stone-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                  >
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-stone-900">Edit User</h3>
                <button onClick={() => setUserToEdit(null)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={userToEdit.email}
                    onChange={(e) => setUserToEdit({ ...userToEdit, email: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Role</label>
                  <select
                    value={userToEdit.role}
                    onChange={(e) => setUserToEdit({ ...userToEdit, role: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="user">User</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Credits</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={userToEdit.credits}
                    onChange={(e) => setUserToEdit({ ...userToEdit, credits: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setUserToEdit(null)}
                    className="px-4 py-2 bg-stone-100 text-stone-700 font-medium rounded-lg hover:bg-stone-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Subscription Modal */}
      {showAddSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-stone-900">Add Subscription</h3>
                <button onClick={() => setShowAddSub(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddSubscription} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">User ID</label>
                  <input
                    type="text"
                    required
                    value={newSubUserId}
                    onChange={(e) => setNewSubUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Plan</label>
                  <select
                    value={newSubPlan}
                    onChange={(e) => setNewSubPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddSub(false)}
                    className="px-4 py-2 bg-stone-100 text-stone-700 font-medium rounded-lg hover:bg-stone-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                  >
                    Add Subscription
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6">
            <h3 className="text-xl font-bold text-stone-900 mb-2">Delete User</h3>
            <p className="text-stone-600 mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setUserToDelete(null)} className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={confirmDeleteUser} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subscription Modal */}
      {subToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6">
            <h3 className="text-xl font-bold text-stone-900 mb-2">Delete Subscription</h3>
            <p className="text-stone-600 mb-6">Are you sure you want to delete this subscription? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setSubToDelete(null)} className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={confirmDeleteSubscription} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6">
            <div className="flex items-center text-red-600 mb-4">
              <ShieldAlert className="w-6 h-6 mr-2" />
              <h3 className="text-xl font-bold">Error</h3>
            </div>
            <p className="text-stone-600 mb-6">{error}</p>
            <div className="flex justify-end">
              <button onClick={() => setError(null)} className="px-4 py-2 bg-stone-900 text-white font-medium rounded-lg hover:bg-stone-800 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
