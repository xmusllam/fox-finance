import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import IncomeTab from './components/IncomeTab';
import ExpensesTab from './components/ExpensesTab';
import AccountsTab from './components/AccountsTab';
import AccountTab from './components/AccountTab';
import TransfersTab from './components/TransfersTab';
import { Wallet, Home, TrendingUp, TrendingDown, ArrowRightLeft, User } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateFilter, setDateFilter] = useState('tomorrow-to-year-end');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [userSettings, setUserSettings] = useState({
    defaultPage: 'dashboard',
    dateFilters: [
      { id: 'all', label: 'كل' },
      { id: 'custom', label: 'مخصص' },
      { id: 'today', label: 'اليوم' },
      { id: 'yesterday', label: 'أمس' },
      { id: 'year-to-today', label: 'من بداية السنة لليوم' },
      { id: 'tomorrow-to-year-end', label: 'غدًا حتى نهاية السنة' }
    ]
  });

  const today = new Date();
  const currentYear = today.getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const settingsDoc = await getDoc(doc(db, 'userSettings', currentUser.uid));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          setUserSettings(settings);
          setActiveTab(settings.defaultPage || 'dashboard');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateUserSettings = async (newSettings) => {
    if (user) {
      await setDoc(doc(db, 'userSettings', user.uid), newSettings);
      setUserSettings(newSettings);
    }
  };

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

  const filterButtons = userSettings.dateFilters.map(filter => ({
    ...filter,
    label: filter.label.replace('السنة', currentYear.toString())
  }));

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
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">
              مرحباً {user.displayName || user.email?.split('@')[0]}
            </div>
            <button
              onClick={() => setActiveTab('account')}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              title="حسابي"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white shadow-md border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 pb-2" style={{ minWidth: 'max-content' }}>
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
            userSettings={userSettings}
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
        {activeTab === 'account' && (
          <AccountTab 
            user={user} 
            userSettings={userSettings}
            updateUserSettings={updateUserSettings}
          />
        )}
        {activeTab === 'transfers' && <TransfersTab userId={user.uid} />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-2 border-gray-200 z-50">
        <div className="container mx-auto px-2">
          <div className="flex justify-around items-center relative py-3">
            {[
              { id: 'dashboard', label: 'الرئيسية', icon: Home, color: 'emerald' },
              { id: 'income', label: 'الدخل', icon: TrendingUp, color: 'green', elevated: true, sign: '+' },
              { id: 'accounts', label: 'الحسابات', icon: Wallet, color: 'emerald' },
              { id: 'expenses', label: 'المصروفات', icon: TrendingDown, color: 'red', elevated: true, sign: '-' },
              { id: 'transfers', label: 'التحويلات', icon: ArrowRightLeft, color: 'emerald' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-2 transition-all relative ${
                  tab.elevated ? '-mt-6' : 'py-2'
                } ${
                  activeTab === tab.id 
                    ? `text-${tab.color}-600` 
                    : 'text-gray-500 hover:text-emerald-600'
                }`}
              >
                {tab.elevated ? (
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                    tab.id === 'income' ? 'bg-green-500' : 'bg-red-500'
                  } ${activeTab === tab.id ? 'scale-110' : ''} transition-transform`}>
                    <span className="text-white text-3xl font-bold">{tab.sign}</span>
                  </div>
                ) : (
                  <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'scale-110' : ''}`} />
                )}
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
