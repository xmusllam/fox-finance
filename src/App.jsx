import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import IncomeTab from './components/IncomeTab';
import ExpensesTab from './components/ExpensesTab';
import AccountsTab from './components/AccountsTab';
import { Wallet, LogOut, FileText, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="w-10 h-10" />
              Fox Finance
            </h1>
            <p className="text-emerald-100 mt-1">مرحباً {user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </div>

      <div className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-700">فترة التقرير:</span>
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">كل الفترات</option>
              <option value="week">آخر أسبوع</option>
              <option value="month">آخر شهر</option>
              <option value="year">آخر سنة</option>
              <option value="custom">فترة مخصصة</option>
            </select>
            
            {dateFilter === 'custom' && (
              <>
                <input 
                  type="date" 
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <span className="text-gray-600">إلى</span>
                <input 
                  type="date" 
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'لوحة التحكم', icon: FileText },
              { id: 'income', label: 'الدخل', icon: TrendingUp },
              { id: 'expenses', label: 'المصروفات', icon: TrendingDown },
              { id: 'accounts', label: 'الحسابات', icon: Wallet }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all border-b-4 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-emerald-600 text-emerald-600 bg-emerald-50' 
                    : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard 
            userId={user.uid} 
            dateFilter={dateFilter}
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
          />
        )}
        {activeTab === 'income' && (
          <IncomeTab 
            userId={user.uid}
            dateFilter={dateFilter}
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab 
            userId={user.uid}
            dateFilter={dateFilter}
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
          />
        )}
        {activeTab === 'accounts' && <AccountsTab userId={user.uid} />}
      </div>
    </div>
  );
}

export default App;