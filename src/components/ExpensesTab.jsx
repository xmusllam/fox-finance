import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Edit2, X, Check, ChevronDown, ChevronUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function ExpensesTab({ userId, dateFilter, customDateFrom, customDateTo, yearStart, yearEnd, today, tomorrow, yesterday }) {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState(['إيجار','فواتير','أقساط','طعام','مواصلات','ترفيه','صحة','مصروفات عامة']);
  const [categoriesDocId, setCategoriesDocId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const todayStr = today.toISOString().split('T')[0];
  const [newExpense, setNewExpense] = useState({ name:'', amount:'', date:todayStr, category:'مصروفات عامة', accountId:'', affectsAccount:true, recurring:false, months:1 });
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [editExpenseData, setEditExpenseData] = useState({});

  useEffect(() => {
    const q1 = query(collection(db,'expenses'), where('userId','==',userId));
    const u1 = onSnapshot(q1, s => setExpenses(s.docs.map(d=>({id:d.id,...d.data()}))));
    const q2 = query(collection(db,'accounts'), where('userId','==',userId));
    const u2 = onSnapshot(q2, s => setAccounts(s.docs.map(d=>({id:d.id,...d.data()}))));
    const q3 = query(collection(db,'categories'), where('userId','==',userId), where('type','==','expense'));
    const u3 = onSnapshot(q3, s => { if(!s.empty){ const d=s.docs[0]; setCategories(d.data().categories); setCategoriesDocId(d.id); } });
    return () => { u1(); u2(); u3(); };
  }, [userId]);

  const filterByDate = (items) => {
    if (dateFilter==='all') return items;
    const todayStart=new Date(today); todayStart.setHours(0,0,0,0);
    const todayEnd=new Date(today); todayEnd.setHours(23,59,59,999);
    const yesterdayStart=new Date(yesterday); yesterdayStart.setHours(0,0,0,0);
    const yesterdayEnd=new Date(yesterday); yesterdayEnd.setHours(23,59,59,999);
    const tomorrowStart=new Date(tomorrow); tomorrowStart.setHours(0,0,0,0);
    if (dateFilter==='today') return items.filter(i=>{const d=new Date(i.date);return d>=todayStart&&d<=todayEnd;});
    if (dateFilter==='yesterday') return items.filter(i=>{const d=new Date(i.date);return d>=yesterdayStart&&d<=yesterdayEnd;});
    if (dateFilter==='year-to-today') return items.filter(i=>{const d=new Date(i.date);return d>=yearStart&&d<=todayEnd;});
    if (dateFilter==='tomorrow-to-year-end') return items.filter(i=>{const d=new Date(i.date);return d>=tomorrowStart&&d<=yearEnd;});
    if (dateFilter==='custom') {
      if(!customDateFrom||!customDateTo) return items;
      const from=new Date(customDateFrom); from.setHours(0,0,0,0);
      const to=new Date(customDateTo); to.setHours(23,59,59,999);
      return items.filter(i=>{const d=new Date(i.date);return d>=from&&d<=to;});
    }
    return items;
  };

  const scheduleAccountUpdate = async (accountId, amount, transactionDate) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    const transactionDateTime = new Date(transactionDate + 'T00:00:00');
    const now = new Date();
    const delay = transactionDateTime - now;
    const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
    const transactionMonth = transactionDateTime.getMonth(); const transactionYear = transactionDateTime.getFullYear();
    if (delay <= 0) {
      if (account.isCredit) {
        let lastMonthDebt = account.lastMonthDebt || 0;
        let currentMonthDebt = account.currentMonthDebt || 0;
        if (transactionMonth===currentMonth&&transactionYear===currentYear) { currentMonthDebt+=amount; }
        else if (transactionYear<currentYear||(transactionYear===currentYear&&transactionMonth<currentMonth)) { lastMonthDebt+=amount; }
        else { currentMonthDebt+=amount; }
        await updateDoc(doc(db,'accounts',accountId), { balance:(account.balance||0)-amount, lastMonthDebt, currentMonthDebt });
      } else {
        await updateDoc(doc(db,'accounts',accountId), { balance:(account.balance||0)-amount });
      }
    } else {
      await addDoc(collection(db,'scheduledTransactions'), { type:'expense', accountId, amount, scheduledDate:transactionDate, userId, createdAt:new Date().toISOString() });
    }
  };

  const addRecurringExpenses = async () => {
    const months = newExpense.recurring ? parseInt(newExpense.months)||1 : 1;
    const startDate = new Date(newExpense.date);
    for (let i=0; i<months; i++) {
      const itemDate = new Date(startDate);
      itemDate.setMonth(startDate.getMonth()+i);
      const dateString = itemDate.toISOString().split('T')[0];
      const expenseName = newExpense.name || newExpense.category;
      // المعاملات المكررة المستقبلية (i > 0) تُحفظ بـ applied: false ولا تؤثر على الحساب تلقائياً
      const isFutureRecurring = newExpense.recurring && i > 0;
      await addDoc(collection(db,'expenses'), {
        name: expenseName,
        amount: parseFloat(newExpense.amount),
        date: dateString,
        category: newExpense.category,
        accountId: newExpense.affectsAccount ? newExpense.accountId : null,
        affectsAccount: newExpense.affectsAccount,
        recurring: newExpense.recurring,
        applied: isFutureRecurring ? false : true,
        userId
      });
      // فقط الشهر الأول يؤثر على الحساب فوراً
      if (newExpense.affectsAccount && newExpense.accountId && !isFutureRecurring) {
        await scheduleAccountUpdate(newExpense.accountId, parseFloat(newExpense.amount), dateString);
      }
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount||!newExpense.date) { alert('يرجى ملء الحقول المطلوبة'); return; }
    if (newExpense.affectsAccount&&!newExpense.accountId) { alert('يرجى اختيار الحساب'); return; }
    await addRecurringExpenses();
    setNewExpense({ name:'', amount:'', date:todayStr, category:'مصروفات عامة', accountId:'', affectsAccount:true, recurring:false, months:1 });
  };

  const handleDeleteExpense = async (expense) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    // نعكس التأثير على الحساب فقط لو المعاملة مطبقة فعلاً
    if (expense.affectsAccount && expense.accountId && expense.applied !== false) {
      const account = accounts.find(a => a.id === expense.accountId);
      if (account) {
        if (account.isCredit) {
          const now = new Date();
          const expenseDate = new Date(expense.date + 'T00:00:00');
          const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
          const expenseMonth = expenseDate.getMonth(); const expenseYear = expenseDate.getFullYear();
          let lastMonthDebt = account.lastMonthDebt || 0;
          let currentMonthDebt = account.currentMonthDebt || 0;
          if (expenseMonth===currentMonth&&expenseYear===currentYear) { currentMonthDebt=Math.max(0,currentMonthDebt-expense.amount); }
          else if (expenseYear<currentYear||(expenseYear===currentYear&&expenseMonth<currentMonth)) { lastMonthDebt=Math.max(0,lastMonthDebt-expense.amount); }
          else { currentMonthDebt=Math.max(0,currentMonthDebt-expense.amount); }
          await updateDoc(doc(db,'accounts',expense.accountId), { balance:(account.balance||0)+expense.amount, lastMonthDebt, currentMonthDebt });
        } else {
          await updateDoc(doc(db,'accounts',expense.accountId), { balance:(account.balance||0)+expense.amount });
        }
      }
    }
    await deleteDoc(doc(db,'expenses',expense.id));
  };

  const handleAddCategory = async () => {
    if (!newCategoryName||categories.includes(newCategoryName)) { alert('الفئة موجودة بالفعل أو فارغة'); return; }
    const newCats = [...categories, newCategoryName];
    if (categoriesDocId) { await updateDoc(doc(db,'categories',categoriesDocId), {categories:newCats}); }
    else { await addDoc(collection(db,'categories'), {userId, type:'expense', categories:newCats}); }
    setNewCategoryName('');
  };
  const handleMoveCategoryUp = async (index) => {
    if (index===0) return;
    const c=[...categories]; [c[index],c[index-1]]=[c[index-1],c[index]];
    if (categoriesDocId) await updateDoc(doc(db,'categories',categoriesDocId), {categories:c});
  };
  const handleMoveCategoryDown = async (index) => {
    if (index===categories.length-1) return;
    const c=[...categories]; [c[index],c[index+1]]=[c[index+1],c[index]];
    if (categoriesDocId) await updateDoc(doc(db,'categories',categoriesDocId), {categories:c});
  };
  const handleEditCategory = async (oldName) => {
    if (!editCategoryValue||editCategoryValue===oldName) { setEditingCategory(null); return; }
    if (categories.includes(editCategoryValue)) { alert('هذا الاسم مستخدم بالفعل'); return; }
    const newCats = categories.map(c=>c===oldName?editCategoryValue:c);
    if (categoriesDocId) await updateDoc(doc(db,'categories',categoriesDocId), {categories:newCats});
    const snap = await getDocs(query(collection(db,'expenses'), where('userId','==',userId), where('category','==',oldName)));
    await Promise.all(snap.docs.map(d=>updateDoc(doc(db,'expenses',d.id), {category:editCategoryValue})));
    setEditingCategory(null); setEditCategoryValue('');
  };
  const handleDeleteCategory = async (categoryName) => {
    const snap = await getDocs(query(collection(db,'expenses'), where('userId','==',userId), where('category','==',categoryName)));
    if (snap.size>0) {
      if (!confirm(`يوجد ${snap.size} معاملة بفئة "${categoryName}".\n\nاختر:\n- OK: تحويلها لفئة "مصروفات عامة"\n- Cancel: إلغاء الحذف`)) return;
      await Promise.all(snap.docs.map(d=>updateDoc(doc(db,'expenses',d.id), {category:'مصروفات عامة'})));
    }
    const newCats = categories.filter(c=>c!==categoryName);
    if (categoriesDocId) await updateDoc(doc(db,'categories',categoriesDocId), {categories:newCats});
  };
  const handleEditExpense = (expense) => {
    setEditingExpense(expense.id);
    setEditExpenseData({ name:expense.name, amount:expense.amount, date:expense.date, category:expense.category, accountId:expense.accountId||'' });
  };
  const handleSaveEdit = async (expense) => {
    if (!editExpenseData.amount||!editExpenseData.date) { alert('يرجى ملء جميع الحقول'); return; }
    const oldAmount = expense.amount;
    const newAmount = parseFloat(editExpenseData.amount);
    const diff = newAmount - oldAmount;
    if (expense.affectsAccount && expense.applied !== false) {
      if (expense.accountId===editExpenseData.accountId && diff!==0) {
        const account = accounts.find(a=>a.id===expense.accountId);
        if (account) {
          if (account.isCredit) {
            const now=new Date();
            const oldDate=new Date(expense.date+'T00:00:00'); const newDate=new Date(editExpenseData.date+'T00:00:00');
            const curMonth=now.getMonth(); const curYear=now.getFullYear();
            let lastMonthDebt=account.lastMonthDebt||0; let currentMonthDebt=account.currentMonthDebt||0;
            if (oldDate.getMonth()===curMonth&&oldDate.getFullYear()===curYear) { currentMonthDebt=Math.max(0,currentMonthDebt-oldAmount); }
            else if (oldDate.getFullYear()<curYear||(oldDate.getFullYear()===curYear&&oldDate.getMonth()<curMonth)) { lastMonthDebt=Math.max(0,lastMonthDebt-oldAmount); }
            else { currentMonthDebt=Math.max(0,currentMonthDebt-oldAmount); }
            if (newDate.getMonth()===curMonth&&newDate.getFullYear()===curYear) { currentMonthDebt+=newAmount; }
            else if (newDate.getFullYear()<curYear||(newDate.getFullYear()===curYear&&newDate.getMonth()<curMonth)) { lastMonthDebt+=newAmount; }
            else { currentMonthDebt+=newAmount; }
            await updateDoc(doc(db,'accounts',expense.accountId), { balance:(account.balance||0)-diff, lastMonthDebt, currentMonthDebt });
          } else {
            await updateDoc(doc(db,'accounts',expense.accountId), { balance:(account.balance||0)-diff });
          }
        }
      } else if (expense.accountId!==editExpenseData.accountId) {
        if (expense.accountId) {
          const oldAcc=accounts.find(a=>a.id===expense.accountId);
          if (oldAcc) {
            if (oldAcc.isCredit) {
              const now=new Date(); const expDate=new Date(expense.date+'T00:00:00');
              const curMonth=now.getMonth(); const curYear=now.getFullYear();
              let lmd=oldAcc.lastMonthDebt||0; let cmd=oldAcc.currentMonthDebt||0;
              if (expDate.getMonth()===curMonth&&expDate.getFullYear()===curYear) { cmd=Math.max(0,cmd-oldAmount); }
              else if (expDate.getFullYear()<curYear||(expDate.getFullYear()===curYear&&expDate.getMonth()<curMonth)) { lmd=Math.max(0,lmd-oldAmount); }
              else { cmd=Math.max(0,cmd-oldAmount); }
              await updateDoc(doc(db,'accounts',expense.accountId), { balance:(oldAcc.balance||0)+oldAmount, lastMonthDebt:lmd, currentMonthDebt:cmd });
            } else {
              await updateDoc(doc(db,'accounts',expense.accountId), { balance:(oldAcc.balance||0)+oldAmount });
            }
          }
        }
        if (editExpenseData.accountId) {
          const newAcc=accounts.find(a=>a.id===editExpenseData.accountId);
          if (newAcc) {
            if (newAcc.isCredit) {
              const now=new Date(); const newExpDate=new Date(editExpenseData.date+'T00:00:00');
              const curMonth=now.getMonth(); const curYear=now.getFullYear();
              let lmd=newAcc.lastMonthDebt||0; let cmd=newAcc.currentMonthDebt||0;
              if (newExpDate.getMonth()===curMonth&&newExpDate.getFullYear()===curYear) { cmd+=newAmount; }
              else if (newExpDate.getFullYear()<curYear||(newExpDate.getFullYear()===curYear&&newExpDate.getMonth()<curMonth)) { lmd+=newAmount; }
              else { cmd+=newAmount; }
              await updateDoc(doc(db,'accounts',editExpenseData.accountId), { balance:(newAcc.balance||0)-newAmount, lastMonthDebt:lmd, currentMonthDebt:cmd });
            } else {
              await updateDoc(doc(db,'accounts',editExpenseData.accountId), { balance:(newAcc.balance||0)-newAmount });
            }
          }
        }
      }
    }
    await updateDoc(doc(db,'expenses',expense.id), {
      name: editExpenseData.name||editExpenseData.category, amount:newAmount,
      date: editExpenseData.date, category:editExpenseData.category, accountId:editExpenseData.accountId
    });
    setEditingExpense(null); setEditExpenseData({});
  };

  const filteredExpenses = filterByDate(expenses);
  const totalExpenses = filteredExpenses.reduce((s,i)=>s+(i.amount||0),0);
  const groupedExpenses = categories.map(category => {
    const catExpenses = filteredExpenses.filter(e=>e.category===category).sort((a,b)=>b.date.localeCompare(a.date));
    return { category, expenses:catExpenses, total:catExpenses.reduce((s,e)=>s+e.amount,0), count:catExpenses.length };
  }).filter(g=>g.count>0);
  const toggleCategory = (cat) => setExpandedCategories(p=>({...p,[cat]:!p[cat]}));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">إضافة مصروف جديد</h3>
          <button onClick={()=>setShowCategoryManager(!showCategoryManager)} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
            <Edit2 className="w-4 h-4"/>إدارة الفئات
          </button>
        </div>
        {showCategoryManager && (
          <div className="mb-6 p-6 bg-red-50 rounded-xl border-2 border-red-200">
            <h4 className="font-bold text-red-800 mb-4 text-lg">إدارة فئات المصروفات</h4>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">إضافة فئة جديدة</label>
              <div className="flex gap-2">
                <input type="text" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" placeholder="اسم الفئة الجديدة"/>
                <button onClick={handleAddCategory} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"><PlusCircle className="w-5 h-5"/></button>
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-3">الفئات الحالية</label>
              <div className="space-y-2">
                {categories.map((cat,idx)=>(
                  <div key={cat} className="flex items-center gap-2 bg-white border-2 border-red-300 rounded-lg p-2">
                    {editingCategory===cat?(
                      <>
                        <input type="text" value={editCategoryValue} onChange={e=>setEditCategoryValue(e.target.value)} className="flex-1 px-2 py-1 border border-red-400 rounded" autoFocus/>
                        <button onClick={()=>handleEditCategory(cat)} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4"/></button>
                        <button onClick={()=>setEditingCategory(null)} className="text-red-600 hover:text-red-800"><X className="w-4 h-4"/></button>
                      </>
                    ):(
                      <>
                        <span className="flex-1 font-medium text-gray-700">{cat}</span>
                        <button onClick={()=>handleMoveCategoryUp(idx)} disabled={idx===0} className={idx===0?'text-gray-300':'text-blue-600 hover:text-blue-800'}><ArrowUp className="w-4 h-4"/></button>
                        <button onClick={()=>handleMoveCategoryDown(idx)} disabled={idx===categories.length-1} className={idx===categories.length-1?'text-gray-300':'text-blue-600 hover:text-blue-800'}><ArrowDown className="w-4 h-4"/></button>
                        <button onClick={()=>{setEditingCategory(cat);setEditCategoryValue(cat);}} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={()=>handleDeleteCategory(cat)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4"/></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">التاريخ</label>
              <input type="date" value={newExpense.date} onChange={e=>setNewExpense({...newExpense,date:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg"/>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">المبلغ (ج.م)</label>
              <input type="number" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense,amount:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="0"/>
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">الفئة</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat=>(
                <button key={cat} onClick={()=>setNewExpense({...newExpense,category:cat})} className={`px-4 py-2 rounded-lg font-semibold transition-all ${newExpense.category===cat?'bg-red-600 text-white shadow-lg scale-105':'bg-gray-100 text-gray-700 hover:bg-red-100'}`}>{cat}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">⭐ عايز المعاملة دي تسمع في حساب؟</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newExpense.affectsAccount} onChange={e=>setNewExpense({...newExpense,affectsAccount:e.target.checked})} className="w-5 h-5"/>
              <span className="font-medium">نعم، تسمع في حساب</span>
            </label>
          </div>
          {newExpense.affectsAccount && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">دفعت من</label>
              <div className="flex flex-wrap gap-2">
                {accounts.sort((a,b)=>(a.order||0)-(b.order||0)).map(acc=>(
                  <button key={acc.id} onClick={()=>setNewExpense({...newExpense,accountId:acc.id})} className={`px-4 py-2 rounded-lg font-semibold transition-all ${newExpense.accountId===acc.id?'bg-red-600 text-white shadow-lg scale-105':'bg-gray-100 text-gray-700 hover:bg-red-100'}`}>{acc.name}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">اسم المصروف (اختياري)</label>
            <input type="text" value={newExpense.name} onChange={e=>setNewExpense({...newExpense,name:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder={`افتراضي: ${newExpense.category}`}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">تكرار شهري؟</label>
              <div className="flex items-center gap-4 h-12">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newExpense.recurring} onChange={e=>setNewExpense({...newExpense,recurring:e.target.checked})} className="w-5 h-5"/>
                  <span>نعم</span>
                </label>
                {newExpense.recurring && (
                  <>
                    <input type="number" value={newExpense.months} onChange={e=>setNewExpense({...newExpense,months:e.target.value})} className="w-20 px-3 py-2 border border-gray-300 rounded-lg" placeholder="6" min="1"/>
                    <span className="text-sm text-gray-600">شهور</span>
                  </>
                )}
              </div>
              {newExpense.recurring && (
                <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
                  الشهر الأول يؤثر على الحساب فوراً. الشهور التالية تظهر في "رؤية السنة" للتطبيق اليدوي.
                </p>
              )}
            </div>
            <div className="flex items-end">
              <button onClick={handleAddExpense} className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                <PlusCircle className="w-5 h-5"/>إضافة المصروف
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-100 text-lg mb-2">إجمالي المصروفات</p>
            <p className="text-3xl md:text-5xl font-bold whitespace-nowrap overflow-hidden text-ellipsis">{totalExpenses.toLocaleString()} ج.م</p>
            <p className="text-red-100 mt-2">عدد المعاملات: {filteredExpenses.length}</p>
          </div>
          <TrendingDown className="w-20 h-20 text-red-200"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">قائمة المصروفات</h3>
        {groupedExpenses.length===0 ? (
          <div className="text-center text-gray-500 py-12">لا توجد بيانات. قم بإضافة مصروف جديد!</div>
        ) : (
          <div className="space-y-4">
            {groupedExpenses.map(group=>(
              <div key={group.category} className="border-2 border-red-200 rounded-xl overflow-hidden">
                <button onClick={()=>toggleCategory(group.category)} className="w-full bg-red-50 hover:bg-red-100 p-4 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-4">
                    {expandedCategories[group.category]?<ChevronUp className="w-5 h-5 text-red-600"/>:<ChevronDown className="w-5 h-5 text-red-600"/>}
                    <span className="font-bold text-lg text-gray-800">{group.category}</span>
                    <span className="text-sm text-gray-600">({group.count} معاملة)</span>
                  </div>
                  <span className="font-bold text-red-600 text-lg">{group.total.toLocaleString()} ج.م</span>
                </button>
                {expandedCategories[group.category] && (
                  <div className="p-4 bg-white">
                    <div className="space-y-2">
                      {group.expenses.map(expense=>{
                        const account = accounts.find(a=>a.id===expense.accountId);
                        return editingExpense===expense.id ? (
                          <div key={expense.id} className="grid grid-cols-6 gap-2 p-3 bg-gray-50 rounded-lg">
                            <input type="text" value={editExpenseData.name} onChange={e=>setEditExpenseData({...editExpenseData,name:e.target.value})} className="px-2 py-1 border rounded" placeholder="الاسم"/>
                            <input type="number" value={editExpenseData.amount} onChange={e=>setEditExpenseData({...editExpenseData,amount:e.target.value})} className="px-2 py-1 border rounded" placeholder="المبلغ"/>
                            <input type="date" value={editExpenseData.date} onChange={e=>setEditExpenseData({...editExpenseData,date:e.target.value})} className="px-2 py-1 border rounded"/>
                            <select value={editExpenseData.category} onChange={e=>setEditExpenseData({...editExpenseData,category:e.target.value})} className="px-2 py-1 border rounded">
                              {categories.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={editExpenseData.accountId} onChange={e=>setEditExpenseData({...editExpenseData,accountId:e.target.value})} className="px-2 py-1 border rounded">
                              {accounts.sort((a,b)=>(a.order||0)-(b.order||0)).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <div className="flex gap-1">
                              <button onClick={()=>handleSaveEdit(expense)} className="flex-1 text-green-600 hover:text-green-800"><Check className="w-5 h-5"/></button>
                              <button onClick={()=>setEditingExpense(null)} className="flex-1 text-red-600 hover:text-red-800"><X className="w-5 h-5"/></button>
                            </div>
                          </div>
                        ) : (
                          <div key={expense.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-800">{expense.name}</p>
                                {expense.applied===false && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">لم يطبق بعد</span>}
                              </div>
                              <p className="text-sm text-gray-600">{expense.date} • {account?.name||(expense.affectsAccount?'غير محدد':'لا يؤثر على حساب')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-red-600">{expense.amount.toLocaleString()} ج.م</span>
                              <div className="flex gap-2">
                                <button onClick={()=>handleEditExpense(expense)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-5 h-5"/></button>
                                <button onClick={()=>handleDeleteExpense(expense)} className="text-red-600 hover:text-red-800"><Trash2 className="w-5 h-5"/></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
