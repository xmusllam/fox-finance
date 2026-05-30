import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, TrendingDown, Wallet, DollarSign, Briefcase, CreditCard, Calendar, ChevronDown, ChevronUp, ChevronRight, ChevronLeft } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard({ userId, dateFilter, customDateFrom, customDateTo, yearStart, yearEnd, today, tomorrow, yesterday, currentYear, onNavigate, userSettings }) {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [applyingId, setApplyingId] = useState(null);
  const [applyingMonthIndex, setApplyingMonthIndex] = useState(null);

  useEffect(() => {
    const q1 = query(collection(db, 'incomes'), where('userId', '==', userId));
    const u1 = onSnapshot(q1, s => setIncomes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q2 = query(collection(db, 'expenses'), where('userId', '==', userId));
    const u2 = onSnapshot(q2, s => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q3 = query(collection(db, 'accounts'), where('userId', '==', userId));
    const u3 = onSnapshot(q3, s => setAccounts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q4 = query(collection(db, 'transfers'), where('userId', '==', userId));
    const u4 = onSnapshot(q4, s => setTransfers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); };
  }, [userId]);

  // ---- تطبيق معاملة واحدة على الحساب ----
  const handleApplyTransaction = async (transaction, type) => {
    if (transaction.applied !== false) return;
    if (!transaction.accountId) return;
    setApplyingId(transaction.id);
    try {
      const account = accounts.find(a => a.id === transaction.accountId);
      if (!account) return;
      if (type === 'income') {
        await updateDoc(doc(db, 'accounts', transaction.accountId), {
          balance: (account.balance || 0) + transaction.amount
        });
        await updateDoc(doc(db, 'incomes', transaction.id), { applied: true });
      } else {
        if (account.isCredit) {
          const now = new Date();
          const expDate = new Date(transaction.date + 'T00:00:00');
          const curMonth = now.getMonth(); const curYear = now.getFullYear();
          const expMonth = expDate.getMonth(); const expYear = expDate.getFullYear();
          let lastMonthDebt = account.lastMonthDebt || 0;
          let currentMonthDebt = account.currentMonthDebt || 0;
          if (expMonth === curMonth && expYear === curYear) { currentMonthDebt += transaction.amount; }
          else if (expYear < curYear || (expYear === curYear && expMonth < curMonth)) { lastMonthDebt += transaction.amount; }
          else { currentMonthDebt += transaction.amount; }
          await updateDoc(doc(db, 'accounts', transaction.accountId), {
            balance: (account.balance || 0) - transaction.amount, lastMonthDebt, currentMonthDebt
          });
        } else {
          await updateDoc(doc(db, 'accounts', transaction.accountId), {
            balance: (account.balance || 0) - transaction.amount
          });
        }
        await updateDoc(doc(db, 'expenses', transaction.id), { applied: true });
      }
    } finally { setApplyingId(null); }
  };

  // ---- تطبيق كل معاملات الشهر ----
  const handleApplyMonth = async (monthData, monthIndex) => {
    setApplyingMonthIndex(monthIndex);
    // نتتبع التعديلات محلياً لتفادي قراءة أرصدة قديمة في نفس الـ batch
    const balanceAdj = {};
    const creditAdj = {};
    const getBalance = (accountId) => {
      const acc = accounts.find(a => a.id === accountId);
      if (!acc) return null;
      return (acc.balance || 0) + (balanceAdj[accountId] || 0);
    };
    try {
      for (const dayData of monthData.days) {
        for (const inc of dayData.incomes) {
          if (inc.applied !== false || !inc.accountId || !inc.affectsAccount) continue;
          const curBal = getBalance(inc.accountId);
          if (curBal === null) continue;
          balanceAdj[inc.accountId] = (balanceAdj[inc.accountId] || 0) + inc.amount;
          await updateDoc(doc(db, 'accounts', inc.accountId), { balance: curBal + inc.amount });
          await updateDoc(doc(db, 'incomes', inc.id), { applied: true });
        }
        for (const exp of dayData.expenses) {
          if (exp.applied !== false || !exp.accountId || !exp.affectsAccount) continue;
          const account = accounts.find(a => a.id === exp.accountId);
          if (!account) continue;
          const curBal = getBalance(exp.accountId);
          if (account.isCredit) {
            if (!creditAdj[exp.accountId]) {
              creditAdj[exp.accountId] = { lastMonthDebt: account.lastMonthDebt || 0, currentMonthDebt: account.currentMonthDebt || 0 };
            }
            const now = new Date();
            const expDate = new Date(exp.date + 'T00:00:00');
            const curMonth = now.getMonth(); const curYear = now.getFullYear();
            const expMonth = expDate.getMonth(); const expYear = expDate.getFullYear();
            let { lastMonthDebt, currentMonthDebt } = creditAdj[exp.accountId];
            if (expMonth === curMonth && expYear === curYear) { currentMonthDebt += exp.amount; }
            else if (expYear < curYear || (expYear === curYear && expMonth < curMonth)) { lastMonthDebt += exp.amount; }
            else { currentMonthDebt += exp.amount; }
            creditAdj[exp.accountId] = { lastMonthDebt, currentMonthDebt };
            balanceAdj[exp.accountId] = (balanceAdj[exp.accountId] || 0) - exp.amount;
            await updateDoc(doc(db, 'accounts', exp.accountId), { balance: curBal - exp.amount, lastMonthDebt, currentMonthDebt });
          } else {
            balanceAdj[exp.accountId] = (balanceAdj[exp.accountId] || 0) - exp.amount;
            await updateDoc(doc(db, 'accounts', exp.accountId), { balance: curBal - exp.amount });
          }
          await updateDoc(doc(db, 'expenses', exp.id), { applied: true });
        }
      }
    } finally { setApplyingMonthIndex(null); }
  };

  const filterByDate = (items) => {
    if (dateFilter === 'all') return items;
    const todayStart = new Date(today); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(today); todayEnd.setHours(23,59,59,999);
    const yesterdayStart = new Date(yesterday); yesterdayStart.setHours(0,0,0,0);
    const yesterdayEnd = new Date(yesterday); yesterdayEnd.setHours(23,59,59,999);
    const tomorrowStart = new Date(tomorrow); tomorrowStart.setHours(0,0,0,0);
    if (dateFilter === 'today') return items.filter(i => { const d=new Date(i.date); return d>=todayStart&&d<=todayEnd; });
    if (dateFilter === 'yesterday') return items.filter(i => { const d=new Date(i.date); return d>=yesterdayStart&&d<=yesterdayEnd; });
    if (dateFilter === 'year-to-today') return items.filter(i => { const d=new Date(i.date); return d>=yearStart&&d<=todayEnd; });
    if (dateFilter === 'tomorrow-to-year-end') return items.filter(i => { const d=new Date(i.date); return d>=tomorrowStart&&d<=yearEnd; });
    if (dateFilter === 'custom') {
      if (!customDateFrom || !customDateTo) return items;
      const from = new Date(customDateFrom); from.setHours(0,0,0,0);
      const to = new Date(customDateTo); to.setHours(23,59,59,999);
      return items.filter(i => { const d=new Date(i.date); return d>=from&&d<=to; });
    }
    return items;
  };

  const filteredIncomes = filterByDate(incomes);
  const filteredExpenses = filterByDate(expenses);
  const totalIncome = filteredIncomes.reduce((s,i)=>s+(i.amount||0),0);
  const totalExpenses = filteredExpenses.reduce((s,i)=>s+(i.amount||0),0);
  const regularAccounts = accounts.filter(a=>!a.isCredit);
  const creditAccounts = accounts.filter(a=>a.isCredit);
  const totalAccounts = regularAccounts.reduce((s,a)=>s+(a.balance||0),0);
  const totalDebts = Math.abs(creditAccounts.reduce((s,a)=>s+Math.abs(a.balance||0),0));
  const totalCapital = totalIncome - totalExpenses;
  const netBalance = totalAccounts - totalDebts;
  const grandTotal = totalCapital + netBalance;
  let totalLastMonthDebt=0, totalCurrentMonthDebt=0;
  creditAccounts.forEach(a=>{ totalLastMonthDebt+=a.lastMonthDebt||0; totalCurrentMonthDebt+=a.currentMonthDebt||0; });
  const nextMonth = today.getMonth()===11?'يناير':new Date(today.getFullYear(),today.getMonth()+1).toLocaleDateString('ar-EG',{month:'long'});

  const toggleMonth = (mi) => setExpandedMonths(p=>({...p,[mi]:!p[mi]}));
  const toggleDay = (mi,day) => { const k=`${mi}-${day}`; setExpandedDays(p=>({...p,[k]:!p[k]})); };
  const changeYear = (dir) => {
    setSelectedYear(y=>y+dir);
    setExpandedMonths({});
    setExpandedDays({});
  };

  // ---- جدول رؤية السنة ----
  const yearlyOverview = useMemo(() => {
    const months = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return months.map((monthName, index) => {
      const mInc = incomes.filter(i => { const d=new Date(i.date); return d.getMonth()===index&&d.getFullYear()===selectedYear; });
      const mExp = expenses.filter(i => { const d=new Date(i.date); return d.getMonth()===index&&d.getFullYear()===selectedYear; });
      const income = mInc.reduce((s,i)=>s+(i.amount||0),0);
      const expense = mExp.reduce((s,i)=>s+(i.amount||0),0);
      const surplus = income - expense;
      const daysInMonth = new Date(selectedYear, index+1, 0).getDate();
      const days = [];
      for (let day=1; day<=daysInMonth; day++) {
        const dInc = incomes.filter(i => { const d=new Date(i.date); return d.getDate()===day&&d.getMonth()===index&&d.getFullYear()===selectedYear; });
        const dExp = expenses.filter(i => { const d=new Date(i.date); return d.getDate()===day&&d.getMonth()===index&&d.getFullYear()===selectedYear; });
        const di = dInc.reduce((s,i)=>s+(i.amount||0),0);
        const de = dExp.reduce((s,i)=>s+(i.amount||0),0);
        if (di>0||de>0) days.push({ day, income:di, expense:de, surplus:di-de, incomes:dInc, expenses:dExp });
      }
      return { month:monthName, monthIndex:index, income, expense, surplus, days };
    });
  }, [incomes, expenses, selectedYear]);

  const categoryExpenses = useMemo(() => {
    const c={}; filteredExpenses.forEach(e=>{c[e.category]=(c[e.category]||0)+e.amount;});
    return Object.entries(c).map(([name,value])=>({name,value}));
  }, [filteredExpenses]);
  const categoryIncomes = useMemo(() => {
    const c={}; filteredIncomes.forEach(i=>{c[i.category]=(c[i.category]||0)+i.amount;});
    return Object.entries(c).map(([name,value])=>({name,value}));
  }, [filteredIncomes]);
  const monthlyData = useMemo(() => {
    const m={};
    [...filteredIncomes,...filteredExpenses].forEach(item=>{ const mo=item.date?.substring(0,7); if(mo&&!m[mo]) m[mo]={month:mo,income:0,expenses:0}; });
    filteredIncomes.forEach(item=>{ const mo=item.date?.substring(0,7); if(mo&&m[mo]) m[mo].income+=item.amount; });
    filteredExpenses.forEach(item=>{ const mo=item.date?.substring(0,7); if(mo&&m[mo]) m[mo].expenses+=item.amount; });
    return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month));
  }, [filteredIncomes,filteredExpenses]);

  const COLORS=['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6'];

  return (
    <div className="space-y-6">
      {/* ---- البطاقات ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button onClick={()=>onNavigate('income')} className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right">
          <div className="flex items-center justify-between"><div><p className="text-emerald-100 text-sm mb-1">الدخل</p><p className="text-3xl md:text-4xl font-bold">{totalIncome.toLocaleString()} ج.م</p></div><TrendingUp className="w-10 h-10 md:w-12 md:h-12 text-emerald-200"/></div>
        </button>
        <button onClick={()=>onNavigate('expenses')} className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right">
          <div className="flex items-center justify-between"><div><p className="text-red-100 text-sm mb-1">المصروفات</p><p className="text-3xl md:text-4xl font-bold">{totalExpenses.toLocaleString()} ج.م</p></div><TrendingDown className="w-10 h-10 md:w-12 md:h-12 text-red-200"/></div>
        </button>
        <div className={`bg-gradient-to-br ${totalCapital>=0?'from-blue-500 to-blue-600':'from-gray-500 to-gray-600'} rounded-2xl shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between"><div><p className="text-blue-100 text-sm mb-1">الدخل بعد المصروفات</p><p className="text-3xl md:text-4xl font-bold">{totalCapital.toLocaleString()} ج.م</p></div><Wallet className="w-10 h-10 md:w-12 md:h-12 text-blue-200"/></div>
        </div>
        <button onClick={()=>onNavigate('accounts')} className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right">
          <div className="flex items-center justify-between"><div><p className="text-indigo-100 text-sm mb-1">الحسابات والأرصدة</p><p className="text-3xl md:text-4xl font-bold">{totalAccounts.toLocaleString()} ج.م</p></div><Briefcase className="w-10 h-10 md:w-12 md:h-12 text-indigo-200"/></div>
        </button>
        <button onClick={()=>onNavigate('accounts')} className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right">
          <div className="flex items-center justify-between"><div><p className="text-orange-100 text-sm mb-1">المديونيات</p><p className="text-3xl md:text-4xl font-bold">{totalDebts.toLocaleString()} ج.م</p></div><CreditCard className="w-10 h-10 md:w-12 md:h-12 text-orange-200"/></div>
        </button>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between"><div><p className="text-purple-100 text-sm mb-1">الأرصدة بعد المديونيات</p><p className="text-3xl md:text-4xl font-bold">{netBalance.toLocaleString()} ج.م</p></div><DollarSign className="w-10 h-10 md:w-12 md:h-12 text-purple-200"/></div>
        </div>
        <button onClick={()=>onNavigate('accounts')} className="bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right">
          <div className="flex items-center justify-between"><div><p className="text-red-100 text-sm mb-1">مديونية 25 الشهر الحالى</p><p className="text-3xl md:text-4xl font-bold">{totalLastMonthDebt.toLocaleString()} ج.م</p></div><CreditCard className="w-10 h-10 md:w-12 md:h-12 text-red-200"/></div>
        </button>
        <button onClick={()=>onNavigate('accounts')} className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 text-right">
          <div className="flex items-center justify-between"><div><p className="text-yellow-100 text-sm mb-1">مديونية 25 {nextMonth}</p><p className="text-3xl md:text-4xl font-bold">{totalCurrentMonthDebt.toLocaleString()} ج.م</p></div><Calendar className="w-10 h-10 md:w-12 md:h-12 text-yellow-200"/></div>
        </button>
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between"><div><p className="text-teal-100 text-sm mb-1">إجمالى الأرصدة والدخل</p><p className="text-3xl md:text-4xl font-bold">{grandTotal.toLocaleString()} ج.م</p></div><DollarSign className="w-10 h-10 md:w-12 md:h-12 text-teal-200"/></div>
        </div>
      </div>

      {/* ---- الرسوم البيانية ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">فئات الدخل</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart><Pie data={categoryIncomes} cx="50%" cy="50%" labelLine={false} label={e=>e.name} outerRadius={100} dataKey="value">{categoryIncomes.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">فئات المصروفات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart><Pie data={categoryExpenses} cx="50%" cy="50%" labelLine={false} label={e=>e.name} outerRadius={100} dataKey="value">{categoryExpenses.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">الدخل والمصروفات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Legend/><Bar dataKey="income" fill="#10b981" name="الدخل"/><Bar dataKey="expenses" fill="#ef4444" name="المصروفات"/></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">اتجاه الرصيد</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} name="الدخل"/><Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} name="المصروفات"/></LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- جدول رؤية السنة ---- */}
      <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
        {/* تنقل السنوات */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={()=>changeYear(-1)} className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-emerald-100 rounded-xl font-bold text-gray-700 transition-colors">
            <ChevronRight className="w-5 h-5"/>{selectedYear-1}
          </button>
          <h3 className="text-xl font-bold text-gray-800">رؤية السنة {selectedYear}</h3>
          <button onClick={()=>changeYear(1)} className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-emerald-100 rounded-xl font-bold text-gray-700 transition-colors">
            {selectedYear+1}<ChevronLeft className="w-5 h-5"/>
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-right font-bold w-10"></th>
              <th className="p-3 text-right font-bold">الشهر</th>
              <th className="p-3 text-right font-bold text-emerald-600">الدخل</th>
              <th className="p-3 text-right font-bold text-red-600">المصروفات</th>
              <th className="p-3 text-right font-bold text-blue-600">الفائض</th>
              <th className="p-3 text-center font-bold text-purple-600">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {yearlyOverview.map((row, idx) => {
              const hasUnapplied = row.days.some(d =>
                [...d.incomes, ...d.expenses].some(t => t.applied === false && t.accountId && t.affectsAccount)
              );
              return (
                <React.Fragment key={idx}>
                  {/* صف الشهر */}
                  <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={()=>toggleMonth(row.monthIndex)}>
                    <td className="p-3">
                      <button className="text-blue-600 hover:text-blue-800">
                        {expandedMonths[row.monthIndex] ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                      </button>
                    </td>
                    <td className="p-3 font-semibold">{row.month}</td>
                    <td className="p-3 text-emerald-600">{row.income.toLocaleString()} ج.م</td>
                    <td className="p-3 text-red-600">{row.expense.toLocaleString()} ج.م</td>
                    <td className={`p-3 font-bold ${row.surplus>=0?'text-blue-600':'text-red-600'}`}>{row.surplus.toLocaleString()} ج.م</td>
                    <td className="p-3 text-center" onClick={e=>e.stopPropagation()}>
                      {hasUnapplied && (
                        <button
                          onClick={()=>handleApplyMonth(row, row.monthIndex)}
                          disabled={applyingMonthIndex===row.monthIndex}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 whitespace-nowrap transition-colors"
                        >
                          {applyingMonthIndex===row.monthIndex ? 'جاري...' : 'تطبيق الكل'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* أيام الشهر */}
                  {expandedMonths[row.monthIndex] && row.days.length > 0 && (
                    <tr>
                      <td colSpan="6" className="p-0">
                        <div className="bg-gray-50 p-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-200">
                                <th className="p-2 text-right font-semibold w-10"></th>
                                <th className="p-2 text-right font-semibold">اليوم</th>
                                <th className="p-2 text-right font-semibold text-emerald-600">الدخل</th>
                                <th className="p-2 text-right font-semibold text-red-600">المصروفات</th>
                                <th className="p-2 text-right font-semibold text-blue-600">الفائض</th>
                                <th className="p-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.days.map((dayData, dayIdx) => (
                                <React.Fragment key={dayIdx}>
                                  <tr className="border-b hover:bg-gray-100 cursor-pointer" onClick={()=>toggleDay(row.monthIndex, dayData.day)}>
                                    <td className="p-2">
                                      <button className="text-purple-600 hover:text-purple-800">
                                        {expandedDays[`${row.monthIndex}-${dayData.day}`] ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                      </button>
                                    </td>
                                    <td className="p-2 font-medium">{dayData.day} {row.month}</td>
                                    <td className="p-2 text-emerald-600">{dayData.income.toLocaleString()} ج.م</td>
                                    <td className="p-2 text-red-600">{dayData.expense.toLocaleString()} ج.م</td>
                                    <td className={`p-2 font-semibold ${dayData.surplus>=0?'text-blue-600':'text-red-600'}`}>{dayData.surplus.toLocaleString()} ج.م</td>
                                    <td className="p-2"></td>
                                  </tr>

                                  {/* تفاصيل المعاملات مع زر تطبيق */}
                                  {expandedDays[`${row.monthIndex}-${dayData.day}`] && (
                                    <tr>
                                      <td colSpan="6" className="p-0">
                                        <div className="bg-white p-4 border-r-4 border-purple-400">
                                          <div className="space-y-3">
                                            {/* الدخل */}
                                            {dayData.incomes.length > 0 && (
                                              <div>
                                                <h5 className="font-bold text-emerald-700 mb-2 flex items-center gap-2">
                                                  <TrendingUp className="w-4 h-4"/>الدخل ({dayData.incomes.length})
                                                </h5>
                                                <div className="space-y-2">
                                                  {dayData.incomes.map(inc => {
                                                    const account = accounts.find(a=>a.id===inc.accountId);
                                                    const isUnapplied = inc.applied === false;
                                                    return (
                                                      <div key={inc.id} className={`p-3 rounded-lg border ${isUnapplied?'bg-blue-50 border-blue-200':'bg-emerald-50 border-emerald-200'}`}>
                                                        <div className="flex justify-between items-center gap-2 flex-wrap">
                                                          <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-800">{inc.name}</p>
                                                            <p className="text-xs text-gray-600 mt-1">
                                                              {inc.category} • {account?.name || 'لا يؤثر على حساب'}
                                                            </p>
                                                          </div>
                                                          <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="font-bold text-emerald-600 whitespace-nowrap">+{inc.amount.toLocaleString()} ج.م</span>
                                                            {inc.affectsAccount && inc.accountId && (
                                                              isUnapplied ? (
                                                                <button
                                                                  onClick={()=>handleApplyTransaction(inc,'income')}
                                                                  disabled={applyingId===inc.id}
                                                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-bold disabled:opacity-50 whitespace-nowrap transition-colors"
                                                                >
                                                                  {applyingId===inc.id ? '...' : 'تطبيق'}
                                                                </button>
                                                              ) : (
                                                                <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg font-semibold whitespace-nowrap">مطبق</span>
                                                              )
                                                            )}
                                                          </div>
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
                                                  <TrendingDown className="w-4 h-4"/>المصروفات ({dayData.expenses.length})
                                                </h5>
                                                <div className="space-y-2">
                                                  {dayData.expenses.map(exp => {
                                                    const account = accounts.find(a=>a.id===exp.accountId);
                                                    const isUnapplied = exp.applied === false;
                                                    return (
                                                      <div key={exp.id} className={`p-3 rounded-lg border ${isUnapplied?'bg-orange-50 border-orange-200':'bg-red-50 border-red-200'}`}>
                                                        <div className="flex justify-between items-center gap-2 flex-wrap">
                                                          <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-800">{exp.name}</p>
                                                            <p className="text-xs text-gray-600 mt-1">
                                                              {exp.category} • {account?.name || 'لا يؤثر على حساب'}
                                                            </p>
                                                          </div>
                                                          <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="font-bold text-red-600 whitespace-nowrap">-{exp.amount.toLocaleString()} ج.م</span>
                                                            {exp.affectsAccount && exp.accountId && (
                                                              isUnapplied ? (
                                                                <button
                                                                  onClick={()=>handleApplyTransaction(exp,'expense')}
                                                                  disabled={applyingId===exp.id}
                                                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-bold disabled:opacity-50 whitespace-nowrap transition-colors"
                                                                >
                                                                  {applyingId===exp.id ? '...' : 'تطبيق'}
                                                                </button>
                                                              ) : (
                                                                <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg font-semibold whitespace-nowrap">مطبق</span>
                                                              )
                                                            )}
                                                          </div>
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
                    <tr><td colSpan="6" className="p-4 bg-gray-50 text-center text-gray-500">لا توجد معاملات في هذا الشهر</td></tr>
                  )}
                </React.Fragment>
              );
            })}
            <tr className="bg-gray-100 font-bold">
              <td className="p-3"></td>
              <td className="p-3">الإجمالي</td>
              <td className="p-3 text-emerald-600">{yearlyOverview.reduce((s,r)=>s+r.income,0).toLocaleString()} ج.م</td>
              <td className="p-3 text-red-600">{yearlyOverview.reduce((s,r)=>s+r.expense,0).toLocaleString()} ج.م</td>
              <td className="p-3 text-blue-600">{yearlyOverview.reduce((s,r)=>s+r.surplus,0).toLocaleString()} ج.م</td>
              <td className="p-3"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
