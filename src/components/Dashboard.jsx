import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, TrendingDown, Wallet, DollarSign, Briefcase, CreditCard, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard({ userId, dateFilter, customDateFrom, customDateTo, yearStart, yearEnd, today, tomorrow, yesterday, currentYear, onNavigate, userSettings }) {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedDays, setExpandedDays] = useState({});

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

    const transfersQuery = query(collection(db, 'transfers'), where('userId', '==', userId));
    const unsubTransfers = onSnapshot(transfersQuery, (snapshot) => {
      setTransfers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubIncomes();
      unsubExpenses();
      unsubAccounts();
      unsubTransfers();
    };
  }, [userId]);

  const filterByDate = (items) => {
    if (dateFilter === 'all') return items;
    
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    
    if (dateFilter === 'today') {
      return items.filter(item => {
        const date = new Date(item.date);
        return date >= todayStart && date <= todayEnd;
      });
    }
    
    if (dateFilter === 'yesterday') {
      return items.filter(item => {
        const date = new Date(item.date);
        return date >= yesterdayStart && date <= yesterdayEnd;
      });
    }
    
    if (dateFilter === 'year-to-today') {
      return items.filter(item => {
        const date = new Date(item.date);
        return date >= yearStart && date <= todayEnd;
      });
    }
    
    if (dateFilter === 'tomorrow-to-year-end') {
      return items.filter(item => {
        const date = new Date(item.date);
        return date >= tomorrowStart && date <= yearEnd;
      });
    }
    
    if (dateFilter === 'custom') {
      if (!customDateFrom || !customDateTo) return items;
      const from = new Date(customDateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(customDateTo);
      to.setHours(23, 59, 59, 999);
      return items.filter(item => {
        const date = new Date(item.date);
        return date >= from && date <= to;
      });
    }
    
    return items;
  };

  const filteredIncomes = filterByDate(incomes);
  const filteredExpenses = filterByDate(expenses);
  
  const totalIncome = filteredIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  const regularAccounts = accounts.filter(acc => !acc.isCredit);
  const creditAccounts = accounts.filter(acc => acc.isCredit);
  
  const totalAccounts = regularAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalDebts = Math.abs(creditAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0));
  
  const totalCapital = totalIncome - totalExpenses;
  const netBalance = totalAccounts - totalDebts;
  const grandTotal = totalCapital + netBalance;

  let totalLastMonthDebt = 0;
  let totalCurrentMonthDebt = 0;

  creditAccounts.forEach(account => {
    totalLastMonthDebt += account.lastMonthDebt || 0;
    totalCurrentMonthDebt += account.currentMonthDebt || 0;
  });

  const debtDueThisMonth = totalLastMonthDebt;
  const debtPostponedToNextMonth = totalCurrentMonthDebt;

  const nextMonth = today.getMonth() === 11 ? 'يناير' : new Date(today.getFullYear(), today.getMonth() + 1).toLocaleDateString('ar-EG', { month: 'long' });

  const toggleMonth = (monthIndex) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthIndex]: !prev[monthIndex]
    }));
  };

  const toggleDay = (monthIndex, day) => {
    const key = `${monthIndex}-${day}`;
    setExpandedDays(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // جدول رؤية السنة مع الأيام
  const yearlyOverview = useMemo(() => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    return months.map((monthName, index) => {
      const monthIncomes = incomes.filter(inc => {
        const date = new Date(inc.date);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      });
      
      const monthExpenses = expenses.filter(exp => {
        const date = new Date(exp.date);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      });
      
      const income = monthIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
      const expense = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const surplus = income - expense;

      // حساب عدد أيام الشهر
      const daysInMonth = new Date(currentYear, index + 1, 0).getDate();
      const days = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dayIncomes = incomes.filter(inc => {
          const date = new Date(inc.date);
          return date.getDate() === day && date.getMonth() === index && date.getFullYear() === currentYear;
        });

        const dayExpenses = expenses.filter(exp => {
          const date = new Date(exp.date);
          return date.getDate() === day && date.getMonth() === index && date.getFullYear() === currentYear;
        });

        const dayIncome = dayIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
        const dayExpense = dayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const daySurplus = dayIncome - dayExpense;

        if (dayIncome > 0 || dayExpense > 0) {
          days.push({
            day,
            income: dayIncome,
            expense: dayExpense,
            surplus: daySurplus,
            incomes: dayIncomes,
            expenses: dayExpenses
          });
        }
      }
      
      return { 
        month: monthName, 
        monthIndex: index,
        income, 
        expense, 
        surplus,
        days 
      };
    });
  }, [incomes, expenses, currentYear]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('income')}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm mb-1">الدخل</p>
              <p className="text-3xl md:text-4xl font-bold">{totalIncome.toLocaleString()} ج.م</p>
            </div>
            <TrendingUp className="w-10 h-10 md:w-12 md:h-12 text-emerald-200" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('expenses')}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm mb-1">المصروفات</p>
              <p className="text-3xl md:text-4xl font-bold">{totalExpenses.toLocaleString()} ج.م</p>
            </div>
            <TrendingDown className="w-10 h-10 md:w-12 md:h-12 text-red-200" />
          </div>
        </button>
        
        <div className={`bg-gradient-to-br ${totalCapital >= 0 ? 'from-blue-500 to-blue-600' : 'from-gray-500 to-gray-600'} rounded-2xl shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">الدخل بعد المصروفات</p>
              <p className="text-3xl md:text-4xl font-bold">{totalCapital.toLocaleString()} ج.م</p>
            </div>
            <Wallet className="w-10 h-10 md:w-12 md:h-12 text-blue-200" />
          </div>
        </div>
        
        <button
          onClick={() => onNavigate('accounts')}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm mb-1">الحسابات والأرصدة</p>
              <p className="text-3xl md:text-4xl font-bold">{totalAccounts.toLocaleString()} ج.م</p>
            </div>
            <Briefcase className="w-10 h-10 md:w-12 md:h-12 text-indigo-200" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('accounts')}
          className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">المديونيات</p>
              <p className="text-3xl md:text-4xl font-bold">{totalDebts.toLocaleString()} ج.م</p>
            </div>
            <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-orange-200" />
          </div>
        </button>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">الأرصدة بعد المديونيات</p>
              <p className="text-3xl md:text-4xl font-bold">{netBalance.toLocaleString()} ج.م</p>
            </div>
            <DollarSign className="w-10 h-10 md:w-12 md:h-12 text-purple-200" />
          </div>
        </div>

        <button
          onClick={() => onNavigate('accounts')}
          className="bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm mb-1">مديونية 25 الشهر الحالى</p>
              <p className="text-3xl md:text-4xl font-bold">{debtDueThisMonth.toLocaleString()} ج.م</p>
            </div>
            <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-red-200" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('accounts')}
          className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm mb-1">مديونية 25 {nextMonth}</p>
              <p className="text-3xl md:text-4xl font-bold">{debtPostponedToNextMonth.toLocaleString()} ج.م</p>
            </div>
            <Calendar className="w-10 h-10 md:w-12 md:h-12 text-yellow-200" />
          </div>
        </button>

        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm mb-1">إجمالى الأرصدة والدخل</p>
              <p className="text-3xl md:text-4xl font-bold">{grandTotal.toLocaleString()} ج.م</p>
            </div>
            <DollarSign className="w-10 h-10 md:w-12 md:h-12 text-teal-200" />
          </div>
        </div>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">فئات الدخل</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryIncomes} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.name} outerRadius={100} fill="#8884d8" dataKey="value">
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
              <Pie data={categoryExpenses} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.name} outerRadius={100} fill="#8884d8" dataKey="value">
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
      <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-6">رؤية السنة {currentYear}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-right font-bold w-10"></th>
              <th className="p-3 text-right font-bold">الشهر</th>
              <th className="p-3 text-right font-bold text-emerald-600">الدخل</th>
              <th className="p-3 text-right font-bold text-red-600">المصروفات</th>
              <th className="p-3 text-right font-bold text-blue-600">الفائض</th>
            </tr>
          </thead>
          <tbody>
            {yearlyOverview.map((row, idx) => (
              <React.Fragment key={idx}>
                <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => toggleMonth(row.monthIndex)}>
                  <td className="p-3">
                    <button className="text-blue-600 hover:text-blue-800">
                      {expandedMonths[row.monthIndex] ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="p-3 font-semibold">{row.month}</td>
                  <td className="p-3 text-emerald-600">{row.income.toLocaleString()} ج.م</td>
                  <td className="p-3 text-red-600">{row.expense.toLocaleString()} ج.م</td>
                  <td className={`p-3 font-bold ${row.surplus >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {row.surplus.toLocaleString()} ج.م
                  </td>
                </tr>

                {/* أيام الشهر */}
                {expandedMonths[row.monthIndex] && row.days.length > 0 && (
                  <tr>
                    <td colSpan="5" className="p-0">
                      <div className="bg-gray-50 p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="p-2 text-right font-semibold w-10"></th>
                              <th className="p-2 text-right font-semibold">اليوم</th>
                              <th className="p-2 text-right font-semibold text-emerald-600">الدخل</th>
                              <th className="p-2 text-right font-semibold text-red-600">المصروفات</th>
                              <th className="p-2 text-right font-semibold text-blue-600">الفائض</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.days.map((dayData, dayIdx) => (
                              <React.Fragment key={dayIdx}>
                                <tr 
                                  className="border-b hover:bg-gray-100 cursor-pointer"
                                  onClick={() => toggleDay(row.monthIndex, dayData.day)}
                                >
                                  <td className="p-2">
                                    <button className="text-purple-600 hover:text-purple-800">
                                      {expandedDays[`${row.monthIndex}-${dayData.day}`] ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="p-2 font-medium">{dayData.day} {row.month}</td>
                                  <td className="p-2 text-emerald-600">{dayData.income.toLocaleString()} ج.م</td>
                                  <td className="p-2 text-red-600">{dayData.expense.toLocaleString()} ج.م</td>
                                  <td className={`p-2 font-semibold ${dayData.surplus >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {dayData.surplus.toLocaleString()} ج.م
                                  </td>
                                </tr>

                                {/* تفاصيل المعاملات */}
                                {expandedDays[`${row.monthIndex}-${dayData.day}`] && (
                                  <tr>
                                    <td colSpan="5" className="p-0">
                                      <div className="bg-white p-4 border-l-4 border-purple-400">
                                        <div className="space-y-3">
                                          {/* الدخل */}
                                          {dayData.incomes.length > 0 && (
                                            <div>
                                              <h5 className="font-bold text-emerald-700 mb-2 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" />
                                                الدخل ({dayData.incomes.length})
                                              </h5>
                                              <div className="space-y-2">
                                                {dayData.incomes.map(inc => {
                                                  const account = accounts.find(a => a.id === inc.accountId);
                                                  return (
                                                    <div key={inc.id} className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                                                      <div className="flex justify-between items-start">
                                                        <div>
                                                          <p className="font-semibold text-gray-800">{inc.name}</p>
                                                          <p className="text-xs text-gray-600 mt-1">
                                                            {inc.category} • {account?.name || 'لا يؤثر على حساب'}
                                                          </p>
                                                        </div>
                                                        <span className="font-bold text-emerald-600">
                                                          +{inc.amount.toLocaleString()} ج.م
                                                        </span>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}

                                          {/* المصروفات */}
                                          {dayData.expenses.length > 0 && (
                                            <div>
                                              <h5 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                                                <TrendingDown className="w-4 h-4" />
                                                المصروفات ({dayData.expenses.length})
                                              </h5>
                                              <div className="space-y-2">
                                                {dayData.expenses.map(exp => {
                                                  const account = accounts.find(a => a.id === exp.accountId);
                                                  return (
                                                    <div key={exp.id} className="bg-red-50 p-3 rounded-lg border border-red-200">
                                                      <div className="flex justify-between items-start">
                                                        <div>
                                                          <p className="font-semibold text-gray-800">{exp.name}</p>
                                                          <p className="text-xs text-gray-600 mt-1">
                                                            {exp.category} • {account?.name || 'لا يؤثر على حساب'}
                                                          </p>
                                                        </div>
                                                        <span className="font-bold text-red-600">
                                                          -{exp.amount.toLocaleString()} ج.م
                                                        </span>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}

                {expandedMonths[row.monthIndex] && row.days.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-4 bg-gray-50 text-center text-gray-500">
                      لا توجد معاملات في هذا الشهر
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            
            <tr className="bg-gray-100 font-bold">
              <td className="p-3"></td>
              <td className="p-3">الإجمالي</td>
              <td className="p-3 text-emerald-600">
                {yearlyOverview.reduce((s, r) => s + r.income, 0).toLocaleString()} ج.م
              </td>
              <td className="p-3 text-red-600">
                {yearlyOverview.reduce((s, r) => s + r.expense, 0).toLocaleString()} ج.م
              </td>
              <td className="p-3 text-blue-600">
                {yearlyOverview.reduce((s, r) => s + r.surplus, 0).toLocaleString()} ج.م
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
