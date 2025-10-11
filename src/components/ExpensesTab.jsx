import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Edit2, X, Check, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react';

export default function ExpensesTab({ userId, dateFilter, customDateFrom, customDateTo, yearStart, monthEnd }) {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState(['إيجار', 'فواتير', 'أقساط', 'طعام', 'مواصلات', 'ترفيه', 'صحة', 'مصروفات عامة']);
  const [categoriesDocId, setCategoriesDocId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // التاريخ الافتراضي = اليوم
  const today = new Date().toISOString().split('T')[0];
  
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    date: today, // ⭐ التاريخ الافتراضي
    category: 'مصروفات عامة',
    accountId: '',
    affectsAccount: true, // ⭐ تسمع في حساب؟ (افتراضي: نعم)
    recurring: false,
    months: 1
  });
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [editExpenseData, setEditExpenseData] = useState({});

  useEffect(() => {
    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', userId));
    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', userId));
    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const categoriesQuery = query(
      collection(db, 'categories'),
      where('userId', '==', userId),
      where('type', '==', 'expense')
    );
    const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setCategories(docData.data().categories);
        setCategoriesDocId(docData.id);
      }
    });

    return () => {
      unsubExpenses();
      unsubAccounts();
      unsubCategories();
    };
  }, [userId]);
  const filterByDate = (items) => {
    // ⭐ تصفية المعاملات المستقبلية فقط (اليوم وما بعده)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureItems = items.filter(item => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate >= today;
    });

    if (dateFilter === 'all') return futureItems;
    
    const now = new Date();
    
    if (dateFilter === 'year-to-date') {
      const from = yearStart;
      const to = monthEnd;
      return futureItems.filter(item => {
        const date = new Date(item.date);
        return date >= from && date <= to;
      });
    }
    
    if (dateFilter === 'custom') {
      if (!customDateFrom || !customDateTo) return futureItems;
      const from = new Date(customDateFrom);
      const to = new Date(customDateTo);
      return futureItems.filter(item => {
        const date = new Date(item.date);
        return date >= from && date <= to;
      });
    }
    
    return futureItems.filter(item => {
      const date = new Date(item.date);
      const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
      
      if (dateFilter === 'week') return daysDiff <= 7;
      if (dateFilter === 'month') return daysDiff <= 30;
      if (dateFilter === 'year') return daysDiff <= 365;
      return true;
    });
  };
    
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

  // ⭐ دالة جدولة تطبيق المعاملة على الحساب
  const scheduleAccountUpdate = async (accountId, amount, transactionDate) => {
    const transactionDateTime = new Date(transactionDate + 'T00:00:00');
    const now = new Date();
    const delay = transactionDateTime - now;

    if (delay <= 0) {
      // إذا التاريخ في الماضي أو اليوم، نفذ فورًا
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        if (account.isCredit) {
          await updateDoc(doc(db, 'accounts', accountId), {
            balance: (account.balance || 0) - amount
          });
        } else {
          await updateDoc(doc(db, 'accounts', accountId), {
            balance: (account.balance || 0) - amount
          });
        }
      }
    } else {
      // إذا في المستقبل، احفظ كـ "معاملة مجدولة"
      await addDoc(collection(db, 'scheduledTransactions'), {
        type: 'expense',
        accountId: accountId,
        amount: amount,
        scheduledDate: transactionDate,
        userId: userId,
        createdAt: new Date().toISOString()
      });
    }
  };

  const addRecurringExpenses = async () => {
    const months = newExpense.recurring ? parseInt(newExpense.months) || 1 : 1;
    const startDate = new Date(newExpense.date);
    
    for (let i = 0; i < months; i++) {
      const itemDate = new Date(startDate);
      itemDate.setMonth(startDate.getMonth() + i);
      const dateString = itemDate.toISOString().split('T')[0];
      
      await addDoc(collection(db, 'expenses'), {
        name: newExpense.name,
        amount: parseFloat(newExpense.amount),
        date: dateString,
        category: newExpense.category,
        accountId: newExpense.affectsAccount ? newExpense.accountId : null,
        affectsAccount: newExpense.affectsAccount,
        recurring: newExpense.recurring,
        userId
      });

      // ⭐ تطبيق على الحساب فقط إذا affectsAccount = true
      if (newExpense.affectsAccount && newExpense.accountId) {
        await scheduleAccountUpdate(newExpense.accountId, parseFloat(newExpense.amount), dateString);
      }
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.amount || !newExpense.date) {
      alert('يرجى ملء الحقول المطلوبة');
      return;
    }

    if (newExpense.affectsAccount && !newExpense.accountId) {
      alert('يرجى اختيار الحساب');
      return;
    }
    
    await addRecurringExpenses();
    setNewExpense({
      name: '',
      amount: '',
      date: today,
      category: 'مصروفات عامة',
      accountId: '',
      affectsAccount: true,
      recurring: false,
      months: 1
    });
  };

  const handleDeleteExpense = async (expense) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;

    if (expense.affectsAccount && expense.accountId) {
      const account = accounts.find(a => a.id === expense.accountId);
      if (account) {
        if (account.isCredit) {
          await updateDoc(doc(db, 'accounts', expense.accountId), {
            balance: (account.balance || 0) + expense.amount
          });
        } else {
          await updateDoc(doc(db, 'accounts', expense.accountId), {
            balance: (account.balance || 0) + expense.amount
          });
        }
      }
    }

    await deleteDoc(doc(db, 'expenses', expense.id));
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || categories.includes(newCategoryName)) {
      alert('الفئة موجودة بالفعل أو فارغة');
      return;
    }

    const newCategories = [...categories, newCategoryName];
    
    if (categoriesDocId) {
      await updateDoc(doc(db, 'categories', categoriesDocId), {
        categories: newCategories
      });
    } else {
      await addDoc(collection(db, 'categories'), {
        userId,
        type: 'expense',
        categories: newCategories
      });
    }

    setNewCategoryName('');
  };

  const handleEditCategory = async (oldName) => {
    if (!editCategoryValue || editCategoryValue === oldName) {
      setEditingCategory(null);
      return;
    }

    if (categories.includes(editCategoryValue)) {
      alert('هذا الاسم مستخدم بالفعل');
      return;
    }

    const newCategories = categories.map(cat => cat === oldName ? editCategoryValue : cat);
    
    if (categoriesDocId) {
      await updateDoc(doc(db, 'categories', categoriesDocId), {
        categories: newCategories
      });
    }

    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', userId), where('category', '==', oldName));
    const snapshot = await getDocs(expensesQuery);
    await Promise.all(snapshot.docs.map(d => updateDoc(doc(db, 'expenses', d.id), { category: editCategoryValue })));

    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const handleDeleteCategory = async (categoryName) => {
    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', userId), where('category', '==', categoryName));
    const snapshot = await getDocs(expensesQuery);
    const count = snapshot.size;

    if (count > 0) {
      const action = confirm(`يوجد ${count} معاملة بفئة "${categoryName}".\n\nاختر:\n- OK: تحويلها لفئة "مصروفات عامة"\n- Cancel: إلغاء الحذف`);
      
      if (!action) return;

      await Promise.all(snapshot.docs.map(d => updateDoc(doc(db, 'expenses', d.id), { category: 'مصروفات عامة' })));
    }

    const newCategories = categories.filter(cat => cat !== categoryName);
    
    if (categoriesDocId) {
      await updateDoc(doc(db, 'categories', categoriesDocId), {
        categories: newCategories
      });
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense.id);
    setEditExpenseData({
      name: expense.name,
      amount: expense.amount,
      date: expense.date,
      category: expense.category,
      accountId: expense.accountId || ''
    });
  };

  const handleSaveEdit = async (expense) => {
    if (!editExpenseData.name || !editExpenseData.amount || !editExpenseData.date) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    const oldAmount = expense.amount;
    const newAmount = parseFloat(editExpenseData.amount);
    const diff = newAmount - oldAmount;

    if (expense.affectsAccount) {
      if (expense.accountId === editExpenseData.accountId && diff !== 0) {
        const account = accounts.find(a => a.id === expense.accountId);
        if (account) {
          await updateDoc(doc(db, 'accounts', expense.accountId), {
            balance: (account.balance || 0) - diff
          });
        }
      } else if (expense.accountId !== editExpenseData.accountId) {
        if (expense.accountId) {
          const oldAccount = accounts.find(a => a.id === expense.accountId);
          if (oldAccount) {
            await updateDoc(doc(db, 'accounts', expense.accountId), {
              balance: (oldAccount.balance || 0) + oldAmount
            });
          }
        }

        if (editExpenseData.accountId) {
          const newAccount = accounts.find(a => a.id === editExpenseData.accountId);
          if (newAccount) {
            await updateDoc(doc(db, 'accounts', editExpenseData.accountId), {
              balance: (newAccount.balance || 0) - newAmount
            });
          }
        }
      }
    }

    await updateDoc(doc(db, 'expenses', expense.id), {
      name: editExpenseData.name,
      amount: newAmount,
      date: editExpenseData.date,
      category: editExpenseData.category,
      accountId: editExpenseData.accountId
    });

    setEditingExpense(null);
    setEditExpenseData({});
  };

  const filteredExpenses = filterByDate(expenses);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  const groupedExpenses = categories.map(category => {
    const categoryExpenses = filteredExpenses.filter(exp => exp.category === category);
    // ⭐ ترتيب حسب التاريخ (الأقرب أولاً)
    const sortedExpenses = categoryExpenses.sort((a, b) => a.date.localeCompare(b.date));
    const total = sortedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    return {
      category,
      expenses: sortedExpenses,
      total,
      count: sortedExpenses.length
    };
  }).filter(group => group.count > 0);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-100 text-lg mb-2">المصروفات القادمة</p>
            <p className="text-5xl font-bold">{totalExpenses.toLocaleString()} ج.م</p>
            <p className="text-red-100 mt-2">عدد المعاملات: {filteredExpenses.length}</p>
          </div>
          <TrendingDown className="w-20 h-20 text-red-200" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">إضافة مصروف جديد</h3>
          <button
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            <Edit2 className="w-4 h-4" />
            إدارة الفئات
          </button>
        </div>

        {showCategoryManager && (
          <div className="mb-6 p-6 bg-red-50 rounded-xl border-2 border-red-200">
            <h4 className="font-bold text-red-800 mb-4 text-lg">إدارة فئات المصروفات</h4>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">إضافة فئة جديدة</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="اسم الفئة الجديدة"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-3">الفئات الحالية</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center gap-2 bg-white border-2 border-red-300 rounded-lg p-2">
                    {editingCategory === cat ? (
                      <>
                        <input
                          type="text"
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          className="px-2 py-1 border border-red-400 rounded w-32"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditCategory(cat)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-gray-700">{cat}</span>
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCategoryValue(cat);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
              <label className="block text-gray-700 font-semibold mb-2">اسم المصروف</label>
              <input
                type="text"
                value={newExpense.name}
                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="طـعـام"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">المبلغ (ج.م)</label>
              <input
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">التاريخ</label>
              <input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                ⭐ عايز المعاملة دي تسمع في حساب؟
              </label>
              <div className="flex items-center gap-4 h-12">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newExpense.affectsAccount}
                    onChange={(e) => setNewExpense({ ...newExpense, affectsAccount: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="font-medium">نعم، تسمع في حساب</span>
                </label>
              </div>
            </div>
          </div>

          {/* ⭐ أزرار الفئات بدلاً من القائمة المنسدلة */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">الفئة</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setNewExpense({ ...newExpense, category: cat })}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    newExpense.category === cat
                      ? 'bg-red-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ⭐ إظهار اختيار الحساب فقط إذا affectsAccount = true */}
          {newExpense.affectsAccount && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">دفعت من</label>
              <select
                value={newExpense.accountId}
                onChange={(e) => setNewExpense({ ...newExpense, accountId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              >
                <option value="">اختر الحساب</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.isCredit ? 'كريدت كارد' : acc.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">تكرار شهري؟</label>
              <div className="flex items-center gap-4 h-12">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newExpense.recurring}
                    onChange={(e) => setNewExpense({ ...newExpense, recurring: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span>نعم</span>
                </label>
                {newExpense.recurring && (
                  <>
                    <input
                      type="number"
                      value={newExpense.months}
                      onChange={(e) => setNewExpense({ ...newExpense, months: e.target.value })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="6"
                      min="1"
                    />
                    <span className="text-sm text-gray-600">شهور</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAddExpense}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                إضافة المصروف
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">قائمة المصروفات</h3>
        
        {groupedExpenses.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            لا توجد بيانات. قم بإضافة مصروف جديد!
          </div>
        ) : (
          <div className="space-y-4">
            {groupedExpenses.map(group => (
              <div key={group.category} className="border-2 border-red-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(group.category)}
                  className="w-full bg-red-50 hover:bg-red-100 p-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {expandedCategories[group.category] ? (
                      <ChevronUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-bold text-lg text-gray-800">{group.category}</span>
                    <span className="text-sm text-gray-600">({group.count} معاملة)</span>
                  </div>
                  <span className="font-bold text-red-600 text-lg">{group.total.toLocaleString()} ج.م</span>
                </button>

                {expandedCategories[group.category] && (
                  <div className="p-4 bg-white">
                    <div className="space-y-2">
                      {group.expenses.map(expense => {
                        const account = accounts.find(a => a.id === expense.accountId);
                        
                        return editingExpense === expense.id ? (
                          <div key={expense.id} className="grid grid-cols-6 gap-2 p-3 bg-gray-50 rounded-lg">
                            <input
                              type="text"
                              value={editExpenseData.name}
                              onChange={(e) => setEditExpenseData({ ...editExpenseData, name: e.target.value })}
                              className="px-2 py-1 border rounded"
                              placeholder="الاسم"
                            />
                            <input
                              type="number"
                              value={editExpenseData.amount}
                              onChange={(e) => setEditExpenseData({ ...editExpenseData, amount: e.target.value })}
                              className="px-2 py-1 border rounded"
                              placeholder="المبلغ"
                            />
                            <input
                              type="date"
                              value={editExpenseData.date}
                              onChange={(e) => setEditExpenseData({ ...editExpenseData, date: e.target.value })}
                              className="px-2 py-1 border rounded"
                            />
                            <select
                              value={editExpenseData.category}
                              onChange={(e) => setEditExpenseData({ ...editExpenseData, category: e.target.value })}
                              className="px-2 py-1 border rounded"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            <select
                              value={editExpenseData.accountId}
                              onChange={(e) => setEditExpenseData({ ...editExpenseData, accountId: e.target.value })}
                              className="px-2 py-1 border rounded"
                            >
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                            </select>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSaveEdit(expense)}
                                className="flex-1 text-green-600 hover:text-green-800"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setEditingExpense(null)}
                                className="flex-1 text-red-600 hover:text-red-800"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={expense.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{expense.name}</p>
                              <p className="text-sm text-gray-600">
                                {expense.date} • {account?.name || (expense.affectsAccount ? 'غير محدد' : 'لا يؤثر على حساب')}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-red-600">{expense.amount.toLocaleString()} ج.م</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditExpense(expense)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(expense)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
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
