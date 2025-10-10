import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, TrendingDown, Wallet, DollarSign, Briefcase, CreditCard } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard({ userId, dateFilter, customDateFrom, customDateTo, yearStart, monthEnd, onNavigate }) {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    const incomesQuery = query(collection(db, 'incomes'), where('userId', '==', userId));
    const unsubIncomes = onSnapshot(incomesQuery, (snapshot) => {
      setIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', userId));
    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', userId));
    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubIncomes();
      unsubExpenses();
      unsubAccounts();
    };
  }, [userId]);

  const filterByDate = (items) => {
    if (dateFilter === 'all') return items;
    
    const now = new Date();
    
    if (dateFilter === 'year-to-date') {
      const from = yearStart;
      const to = monthEnd;
      return items.filter(item => {
        const date = new Date(item.date);
        return date >= from && date <= to;
      });
    }
    
    if (dateFilter === 'custom') {
      if (!customDateFrom || !customDateTo) return items;
      const from = new Date(customDateFrom);
      const to = new Date(customDateTo);
      return items.filter(item => {
        const date = new Date(item.date);
        return date >= from && date <= to;
      });
    }
    
    return items.filter(item => {
      const date = new Date(item.date);
      const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
      
      if (dateFilter === 'week') return daysDiff <= 7;
      if (dateFilter === 'month') return daysDiff <= 30;
      if (dateFilter === 'year') return daysDiff <= 365;
      return true;
    });
  };

  const filteredIncomes = filterByDate(incomes);
  const filteredExpenses = filterByDate(expenses);
  
  const totalIncome = filteredIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  const regularAccounts = accounts.filter(acc => !acc.isCredit);
  const creditAccounts = accounts.filter(acc => acc.isCredit);
  
  const totalAccounts = regularAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalDebts = Math.abs(creditAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0));
  
  const totalCapital = totalIncome;
  const netBalance = totalAccounts - totalDebts;

  const categoryExpenses = useMemo(() => {
    const categories = {};
    filteredExpenses.forEach(exp => {
      categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const categoryIncomes = useMemo(() => {
    const categories = {};
    filteredIncomes.forEach(inc => {
      categories[inc.category] = (categories[inc.category] || 0) + inc.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredIncomes]);

  const monthlyData = useMemo(() => {
    const months = {};
    [...filteredIncomes, ...filteredExpenses].forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month && !months[month]) months[month] = { month, income: 0, expenses: 0 };
    });
    
    filteredIncomes.forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month && months[month]) months[month].income += item.amount;
    });
    
    filteredExpenses.forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month && months[month]) months[month].expenses += item.amount;
    });
    
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredIncomes, filteredExpenses]);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => onNavigate('income')}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm mb-1">الدخل</p>
              <p className="text-4xl font-bold">{totalIncome.toLocaleString()} ج.م</p>
            </div>
            <TrendingUp className="w-12 h-12 text-emerald-200" />
          </div>
        </button>

<button
          onClick={() => onNavigate('expenses')}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm mb-1">المصروفات</p>
              <p className="text-4xl font-bold">{totalExpenses.toLocaleString()} ج.م</p>
            </div>
            <TrendingDown className="w-12 h-12 text-red-200" />
          </div>
        </button>
        
        <div className={`bg-gradient-to-br ${netBalance >= 0 ? 'from-blue-500 to-blue-600' : 'from-gray-500 to-gray-600'} rounded-2xl shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">رأس المال</p>
              <p className="text-4xl font-bold">{(totalCapital - totalExpenses).toLocaleString()} ج.م</p>
            </div>
            <Wallet className="w-12 h-12 text-blue-200" />
          </div>
        </div>
        
        <button
          onClick={() => onNavigate('accounts')}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm mb-1">الأرصدة</p>
              <p className="text-4xl font-bold">{totalAccounts.toLocaleString()} ج.م</p>
            </div>
            <Briefcase className="w-12 h-12 text-indigo-200" />
          </div>
        </button>
        
        <button
          onClick={() => onNavigate('accounts')}
          className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">ديون الكريدت كارد</p>
              <p className="text-4xl font-bold">{totalDebts.toLocaleString()} ج.م</p>
            </div>
            <CreditCard className="w-12 h-12 text-orange-200" />
          </div>
        </button>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">النهائى بعد الديون</p>
              <p className="text-4xl font-bold">{netBalance.toLocaleString()} ج.م</p>
            </div>
            <DollarSign className="w-12 h-12 text-purple-200" />
          </div>
        </div>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">فئات الدخل</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryIncomes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryIncomes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">فئات المصروفات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryExpenses}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryExpenses.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">الدخل والمصروفات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="الدخل" />
              <Bar dataKey="expenses" fill="#ef4444" name="المصروفات" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">اتجاه الرصيد</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} name="الدخل" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} name="المصروفات" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
