import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Edit2, X, Check, ChevronDown, ChevronUp, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

export default function IncomeTab({ userId, dateFilter, customDateFrom, customDateTo, yearStart, yearEnd, today, tomorrow, yesterday }) {
  const [incomes, setIncomes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState(['راتب', 'أرباح', 'استثمار', 'هدية', 'أخرى']);
  const [categoriesDocId, setCategoriesDocId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const todayStr = today.toISOString().split('T')[0];
  const [newIncome, setNewIncome] = useState({ name:'', amount:'', date:todayStr, category:'راتب', accountId:'', affectsAccount:true, recurring:false, months:1 });
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingIncome, setEditingIncome] = useState(null);
  const [editIncomeData, setEditIncomeData] = useState({});

  useEffect(() => {
    const q1 = query(collection(db,'incomes'), where('userId','==',userId));
    const u1 = onSnapshot(q1, s => setIncomes(s.docs.map(d=>({id:d.id,...d.data()}))));
    const q2 = query(collection(db,'accounts'), where('userId','==',userId));
    const u2 = onSnapshot(q2, s => setAccounts(s.docs.map(d=>({id:d.id,...d.data()}))));
    const q3 = query(collection(db,'categories'), where('userId','==',userId), where('type','==','income'));
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
    const transactionDateTime = new Date(transactionDate + 'T00:00:00');
    const now = new Date();
    if (transactionDateTime - now <= 0) {
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        await updateDoc(doc(db, 'accounts', accountId), { balance: (account.balance || 0) + amount });
      }
    } else {
      await addDoc(collection(db, 'scheduledTransactions'), {
        type: 'income', accountId, amount, scheduledDate: transactionDate, userId, createdAt: new Date().toISOString()
      });
    }
  };

  const addRecurringIncomes = async () => {
    const months = newIncome.recurring ? parseInt(newIncome.months) || 1 : 1;
    const startDate = new Date(newIncome.date);
    for (let i = 0; i < months; i++) {
      const itemDate = new Date(startDate);
      itemDate.setMonth(startDate.getMonth() + i);
      const dateString = itemDate.toISOString().split('T')[0];
      const incomeName = newIncome.name || newIncome.category;
      // المعاملات المكررة المستقبلية (i > 0) تُحفظ بـ applied: false ولا تؤثر على الحساب تلقائياً
      const isFutureRecurring = newIncome.recurring && i > 0;
      await addDoc(collection(db, 'incomes'), {
        name: incomeName,
        amount: parseFloat(newIncome.amount),
        date: dateString,
        category: newIncome.category,
        accountId: newIncome.affectsAccount ? newIncome.accountId : null,
        affectsAccount: newIncome.affectsAccount,
        recurring: newIncome.recurring,
        applied: isFutureRecurring ? false : true,
        userId
      });
      // فقط الشهر الأول يؤثر على الحساب فوراً
      if (newIncome.affectsAccount && newIncome.accountId && !isFutureRecurring) {
        await scheduleAccountUpdate(newIncome.accountId, parseFloat(newIncome.amount), dateString);
      }
    }
  };

  const handleAddIncome = async () => {
    if (!newIncome.amount || !newIncome.date) { alert('يرجى ملء الحقول المطلوبة'); return; }
    if (newIncome.affectsAccount && !newIncome.accountId) { alert('يرجى اختيار الحساب'); return; }
    await addRecurringIncomes();
    setNewIncome({ name:'', amount:'', date:todayStr, category:'راتب', accountId:'', affectsAccount:true, recurring:false, months:1 });
  };

  const handleDeleteIncome = async (income) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدخل؟')) return;
    // نعكس التأثير على الحساب فقط لو المعاملة مطبقة فعلاً
    if (income.affectsAccount && income.accountId && income.applied !== false) {
      const account = accounts.find(a => a.id === income.accountId);
      if (account) {
        await updateDoc(doc(db, 'accounts', income.accountId), { balance: (account.balance || 0) - income.amount });
      }
    }
    await deleteDoc(doc(db, 'incomes', income.id));
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || categories.includes(newCategoryName)) { alert('الفئة موجودة بالفعل أو فارغة'); return; }
    const newCats = [...categories, newCategoryName];
    if (categoriesDocId) { await updateDoc(doc(db,'categories',categoriesDocId), {categories:newCats}); }
    else { await addDoc(collection(db,'categories'), {userId, type:'income', categories:newCats}); }
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
    const snap = await getDocs(query(collection(db,'incomes'), where('userId','==',userId), where('category','==',oldName)));
    await Promise.all(snap.docs.map(d=>updateDoc(doc(db,'incomes',d.id), {category:editCategoryValue})));
    setEditingCategory(null); setEditCategoryValue('');
  };
  const handleDeleteCategory = async (categoryName) => {
    const snap = await getDocs(query(collection(db,'incomes'), where('userId','==',userId), where('category','==',categoryName)));
    if (snap.size > 0) {
      if (!confirm(`يوجد ${snap.size} معاملة بفئة "${categoryName}".\n\nاختر:\n- OK: تحويلها لفئة "أخرى"\n- Cancel: إلغاء الحذف`)) return;
      await Promise.all(snap.docs.map(d=>updateDoc(doc(db,'incomes',d.id), {category:'أخرى'})));
    }
    const newCats = categories.filter(c=>c!==categoryName);
    if (categoriesDocId) await updateDoc(doc(db,'categories',categoriesDocId), {categories:newCats});
  };
  const handleEditIncome = (income) => {
    setEditingIncome(income.id);
    setEditIncomeData({ name:income.name, amount:income.amount, date:income.date, category:income.category, accountId:income.accountId||'' });
  };
  const handleSaveEdit = async (income) => {
    if (!editIncomeData.amount||!editIncomeData.date) { alert('يرجى ملء جميع الحقول'); return; }
    const oldAmount = income.amount;
    const newAmount = parseFloat(editIncomeData.amount);
    const diff = newAmount - oldAmount;
    if (income.affectsAccount && income.applied !== false) {
      if (income.accountId===editIncomeData.accountId && diff!==0) {
        const account = accounts.find(a=>a.id===income.accountId);
        if (account) await updateDoc(doc(db,'accounts',income.accountId), {balance:(account.balance||0)+diff});
      } else if (income.accountId!==editIncomeData.accountId) {
        if (income.accountId) {
          const oldAcc = accounts.find(a=>a.id===income.accountId);
          if (oldAcc) await updateDoc(doc(db,'accounts',income.accountId), {balance:(oldAcc.balance||0)-oldAmount});
        }
        if (editIncomeData.accountId) {
          const newAcc = accounts.find(a=>a.id===editIncomeData.accountId);
          if (newAcc) await updateDoc(doc(db,'accounts',editIncomeData.accountId), {balance:(newAcc.balance||0)+newAmount});
        }
      }
    }
    await updateDoc(doc(db,'incomes',income.id), {
      name: editIncomeData.name||editIncomeData.category, amount:newAmount,
      date: editIncomeData.date, category:editIncomeData.category, accountId:editIncomeData.accountId
    });
    setEditingIncome(null); setEditIncomeData({});
  };

  const filteredIncomes = filterByDate(incomes);
  const totalIncome = filteredIncomes.reduce((s,i)=>s+(i.amount||0),0);
  const groupedIncomes = categories.map(category => {
    const catIncomes = filteredIncomes.filter(i=>i.category===category).sort((a,b)=>b.date.localeCompare(a.date));
    return { category, incomes:catIncomes, total:catIncomes.reduce((s,i)=>s+i.amount,0), count:catIncomes.length };
  }).filter(g=>g.count>0);
  const toggleCategory = (cat) => setExpandedCategories(p=>({...p,[cat]:!p[cat]}));
  const regularAccounts = accounts.filter(a=>!a.isCredit).sort((a,b)=>(a.order||0)-(b.order||0));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">إضافة دخل جديد</h3>
          <button onClick={()=>setShowCategoryManager(!showCategoryManager)} className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">
            <Edit2 className="w-4 h-4"/>إدارة الفئات
          </button>
        </div>
        {showCategoryManager && (
          <div className="mb-6 p-6 bg-emerald-50 rounded-xl border-2 border-emerald-200">
            <h4 className="font-bold text-emerald-800 mb-4 text-lg">إدارة فئات الدخل</h4>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">إضافة فئة جديدة</label>
              <div className="flex gap-2">
                <input type="text" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" placeholder="اسم الفئة الجديدة"/>
                <button onClick={handleAddCategory} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"><PlusCircle className="w-5 h-5"/></button>
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-3">الفئات الحالية</label>
              <div className="space-y-2">
                {categories.map((cat,idx)=>(
                  <div key={cat} className="flex items-center gap-2 bg-white border-2 border-emerald-300 rounded-lg p-2">
                    {editingCategory===cat?(
                      <>
                        <input type="text" value={editCategoryValue} onChange={e=>setEditCategoryValue(e.target.value)} className="flex-1 px-2 py-1 border border-emerald-400 rounded" autoFocus/>
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
              <input type="date" value={newIncome.date} onChange={e=>setNewIncome({...newIncome,date:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg"/>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">المبلغ (ج.م)</label>
              <input type="number" value={newIncome.amount} onChange={e=>setNewIncome({...newIncome,amount:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="0"/>
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">الفئة</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat=>(
                <button key={cat} onClick={()=>setNewIncome({...newIncome,category:cat})} className={`px-4 py-2 rounded-lg font-semibold transition-all ${newIncome.category===cat?'bg-emerald-600 text-white shadow-lg scale-105':'bg-gray-100 text-gray-700 hover:bg-emerald-100'}`}>{cat}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">⭐ عايز المعاملة دي تسمع في حساب؟</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newIncome.affectsAccount} onChange={e=>setNewIncome({...newIncome,affectsAccount:e.target.checked})} className="w-5 h-5"/>
              <span className="font-medium">نعم، تسمع في حساب</span>
            </label>
          </div>
          {newIncome.affectsAccount && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">الحساب</label>
              <div className="flex flex-wrap gap-2">
                {regularAccounts.map(acc=>(
                  <button key={acc.id} onClick={()=>setNewIncome({...newIncome,accountId:acc.id})} className={`px-4 py-2 rounded-lg font-semibold transition-all ${newIncome.accountId===acc.id?'bg-emerald-600 text-white shadow-lg scale-105':'bg-gray-100 text-gray-700 hover:bg-emerald-100'}`}>{acc.name}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">اسم مصدر الدخل (اختياري)</label>
            <input type="text" value={newIncome.name} onChange={e=>setNewIncome({...newIncome,name:e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder={`افتراضي: ${newIncome.category}`}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">تكرار شهري؟</label>
              <div className="flex items-center gap-4 h-12">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newIncome.recurring} onChange={e=>setNewIncome({...newIncome,recurring:e.target.checked})} className="w-5 h-5"/>
                  <span>نعم</span>
                </label>
                {newIncome.recurring && (
                  <>
                    <input type="number" value={newIncome.months} onChange={e=>setNewIncome({...newIncome,months:e.target.value})} className="w-20 px-3 py-2 border border-gray-300 rounded-lg" placeholder="6" min="1"/>
                    <span className="text-sm text-gray-600">شهور</span>
                  </>
                )}
              </div>
              {newIncome.recurring && (
                <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
                  الشهر الأول يؤثر على الحساب فوراً. الشهور التالية تظهر في "رؤية السنة" للتطبيق اليدوي.
                </p>
              )}
            </div>
            <div className="flex items-end">
              <button onClick={handleAddIncome} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                <PlusCircle className="w-5 h-5"/>إضافة الدخل
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-lg mb-2">إجمالي الدخل</p>
            <p className="text-3xl md:text-5xl font-bold whitespace-nowrap overflow-hidden text-ellipsis">{totalIncome.toLocaleString()} ج.م</p>
            <p className="text-emerald-100 mt-2">عدد المعاملات: {filteredIncomes.length}</p>
          </div>
          <TrendingUp className="w-20 h-20 text-emerald-200"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">قائمة الدخل</h3>
        {groupedIncomes.length===0 ? (
          <div className="text-center text-gray-500 py-12">لا توجد بيانات. قم بإضافة دخل جديد!</div>
        ) : (
          <div className="space-y-4">
            {groupedIncomes.map(group=>(
              <div key={group.category} className="border-2 border-emerald-200 rounded-xl overflow-hidden">
                <button onClick={()=>toggleCategory(group.category)} className="w-full bg-emerald-50 hover:bg-emerald-100 p-4 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-4">
                    {expandedCategories[group.category]?<ChevronUp className="w-5 h-5 text-emerald-600"/>:<ChevronDown className="w-5 h-5 text-emerald-600"/>}
                    <span className="font-bold text-lg text-gray-800">{group.category}</span>
                    <span className="text-sm text-gray-600">({group.count} معاملة)</span>
                  </div>
                  <span className="font-bold text-emerald-600 text-lg">{group.total.toLocaleString()} ج.م</span>
                </button>
                {expandedCategories[group.category] && (
                  <div className="p-4 bg-white">
                    <div className="space-y-2">
                      {group.incomes.map(income=>{
                        const account = accounts.find(a=>a.id===income.accountId);
                        return editingIncome===income.id ? (
                          <div key={income.id} className="grid grid-cols-6 gap-2 p-3 bg-gray-50 rounded-lg">
                            <input type="text" value={editIncomeData.name} onChange={e=>setEditIncomeData({...editIncomeData,name:e.target.value})} className="px-2 py-1 border rounded" placeholder="الاسم"/>
                            <input type="number" value={editIncomeData.amount} onChange={e=>setEditIncomeData({...editIncomeData,amount:e.target.value})} className="px-2 py-1 border rounded" placeholder="المبلغ"/>
                            <input type="date" value={editIncomeData.date} onChange={e=>setEditIncomeData({...editIncomeData,date:e.target.value})} className="px-2 py-1 border rounded"/>
                            <select value={editIncomeData.category} onChange={e=>setEditIncomeData({...editIncomeData,category:e.target.value})} className="px-2 py-1 border rounded">
                              {categories.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={editIncomeData.accountId} onChange={e=>setEditIncomeData({...editIncomeData,accountId:e.target.value})} className="px-2 py-1 border rounded">
                              {regularAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <div className="flex gap-1">
                              <button onClick={()=>handleSaveEdit(income)} className="flex-1 text-green-600 hover:text-green-800"><Check className="w-5 h-5"/></button>
                              <button onClick={()=>setEditingIncome(null)} className="flex-1 text-red-600 hover:text-red-800"><X className="w-5 h-5"/></button>
                            </div>
                          </div>
                        ) : (
                          <div key={income.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-800">{income.name}</p>
                                {income.applied===false && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">لم يطبق بعد</span>}
                              </div>
                              <p className="text-sm text-gray-600">{income.date} • {account?.name||(income.affectsAccount?'غير محدد':'لا يؤثر على حساب')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-emerald-600">{income.amount.toLocaleString()} ج.م</span>
                              <div className="flex gap-2">
                                <button onClick={()=>handleEditIncome(income)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-5 h-5"/></button>
                                <button onClick={()=>handleDeleteIncome(income)} className="text-red-600 hover:text-red-800"><Trash2 className="w-5 h-5"/></button>
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
