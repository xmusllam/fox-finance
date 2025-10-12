import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import IncomeTab from './components/IncomeTab';
import ExpensesTab from './components/ExpensesTab';
import AccountsTab from './components/AccountsTab';
import AccountTab from './components/AccountTab';
import TransfersTab from './components/TransfersTab';
import { Wallet, LogOut, FileText, TrendingUp, TrendingDown, Calendar, User, ArrowRightLeft } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateFilter, setDateFilter] = useState('tomorrow-to-year-end');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const today = new Date();
  const currentYear = today.getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-emerald-600 mx-auto mb-4 animate-pulse" />
          <div className="text-2xl font-bold text-emerald-600">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const filterButtons = [
    { id: 'all', label: 'كل' },
    { id: 'custom', label: 'مخصص' },
    { id: 'today', label: 'اليوم' },
    { id: 'yesterday', label: 'أمس' },
    { id: 'year-to-today', label: `من بداية ${currentYear} لليوم` },
    { id: 'tomorrow-to-year-end', label: `غدًا حتى نهاية ${currentYear}` }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button 
  onClick={() => setActiveTab('dashboard')}
  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
>
  <Wallet className="w-8 h-8" />
  <span className="text-xl font-bold hidden md:inline">Fox Finance</span>
</button>
          <div className="text-lg font-semibold">
            مرحباً {user.displayName || user.email?.split('@')[0]}
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white shadow-md border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 pb-2" style={{ minWidth: 'max-content' }}>
            <Calendar className="w-5 h-5 text-gray-600 hidden md:inline flex-shrink-0" />
            {filterButtons.map(btn => (
            <button
              key={btn.id}
              onClick={() => setDateFilter(btn.id)}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all flex-shrink-0 ${
                dateFilter === btn.id
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-emerald-100'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
          
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 mt-3">
              <input 
                type="date" 
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-600 text-sm">إلى</span>
              <input 
                type="date" 
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard 
            userId={user.uid} 
            dateFilter={dateFilter}
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
            yearStart={yearStart}
            yearEnd={yearEnd}
            today={today}
            tomorrow={tomorrow}
            yesterday={yesterday}
            currentYear={currentYear}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'income' && (
          <IncomeTab 
            userId={user.uid}
            dateFilter={dateFilter}
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
            yearStart={yearStart}
            yearEnd={yearEnd}
            today={today}
            tomorrow={tomorrow}
            yesterday={yesterday}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab 
            userId={user.uid}
            dateFilter={dateFilter}
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
            yearStart={yearStart}
            yearEnd={yearEnd}
            today={today}
            tomorrow={tomorrow}
            yesterday={yesterday}
          />
        )}
        {activeTab === 'accounts' && <AccountsTab userId={user.uid} />}
        {activeTab === 'account' && <AccountTab user={user} />}
        {activeTab === 'transfers' && <TransfersTab userId={user.uid} />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-2 border-gray-200 z-50 h-20">
        <div className="container mx-auto px-2">
          <div className="flex justify-around items-center">
            {[
              { id: 'dashboard', label: 'الرئيسية', icon: FileText },
              { id: 'income', label: 'الدخل', icon: TrendingUp },
              { id: 'expenses', label: 'المصروفات', icon: TrendingDown },
              { id: 'accounts', label: 'الحسابات', icon: Wallet },
              { id: 'transfers', label: 'التحويلات', icon: ArrowRightLeft },
              { id: 'account', label: 'حسابي', icon: User }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 py-4 px-2 transition-all
                  activeTab === tab.id 
                    ? 'text-emerald-600' 
                    : 'text-gray-500 hover:text-emerald-600'
                }`}
              >
                <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'scale-110' : ''}`} />
                <span className="text-xs font-semibold hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
