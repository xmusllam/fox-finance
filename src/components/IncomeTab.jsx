import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Edit2, X, Check, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

export default function IncomeTab({ userId, dateFilter, customDateFrom, customDateTo, yearStart, monthEnd }) {
  const [incomes, setIncomes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState(['راتب', 'أرباح', 'استثمار', 'هدية', 'أخرى']);
  const [categoriesDocId, setCategoriesDocId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [newIncome, setNewIncome] = useState({
    name: '',
    amount: '',
    date: '',
    category: 'راتب',
    accountId: '',
    recurring: false,
    months: 1
  });
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingIncome, setEditingIncome] = useState(null);
  const [editIncomeData, setEditIncomeData] = useState({});

  useEffect(() => {
    const incomesQuery = query(collection(db, 'incomes'), where('userId', '==', userId));
    const unsubIncomes = onSnapshot(incomesQuery, (snapshot) => {
      setIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', userId));
    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const categoriesQuery = query(
      collection(db, 'categories'),
      where('userId', '==', userId),
      where('type', '==', 'income')
    );
    const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setCategories(docData.data().categories);
        setCategoriesDocId(docData.id);
      }
    });

    return () => {
      unsubIncomes();
      unsubAccounts();
      unsubCategories();
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

  const addRecurringIncomes = async () => {
    const months = newIncome.recurring ? parseInt(newIncome.months) || 1 : 1;
    const startDate = new Date(newIncome.date);
    
    for (let i = 0; i < months; i++) {
      const itemDate = new Date(startDate);
      itemDate.setMonth(startDate.getMonth() + i);
      
      await addDoc(collection(db, 'incomes'), {
        name: newIncome.name,
        amount: parseFloat(newIncome.amount),
        date: itemDate.toISOString().split('T')[0],
        category: newIncome.category,
        accountId: newIncome.accountId,
        recurring: newIncome.recurring,
        userId
      });

      if (newIncome.accountId) {
        const accountRef = doc(db, 'accounts', newIncome.accountId);
        const account = accounts.find(a => a.id === newIncome.accountId);
        if (account) {
          await updateDoc(accountRef, {
            balance: (account.balance || 0) + parseFloat(newIncome.amount)
          });
        }
      }
    }
  };

  const handleAddIncome = async () => {
    if (!newIncome.name || !newIncome.amount || !newIncome.date || !newIncome.accountId) {
      alert('يرجى ملء جميع الحقول');
      return;
    }
    
    await addRecurringIncomes();
    setNewIncome({
      name: '',
      amount: '',
      date: '',
      category: 'راتب',
      accountId: '',
      recurring: false,
      months: 1
    });
  };

  const handleDeleteIncome = async (income) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدخل؟')) return;

    if (income.accountId) {
      const account = accounts.find(a => a.id === income.accountId);
      if (account) {
        await updateDoc(doc(db, 'accounts', income.accountId), {
          balance: (account.balance || 0) - income.amount
        });
      }
    }

    await deleteDoc(doc(db, 'incomes', income.id));
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
        type: 'income',
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

    const incomesQuery = query(collection(db, 'incomes'), where('userId', '==', userId), where('category', '==', oldName));
    const snapshot = await getDocs(incomesQuery);
    await Promise.all(snapshot.docs.map(d => updateDoc(doc(db, 'incomes', d.id), { category: editCategoryValue })));

    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const handleDeleteCategory = async (categoryName) => {
    const incomesQuery = query(collection(db, 'incomes'), where('userId', '==', userId), where('category', '==', categoryName));
    const snapshot = await getDocs(incomesQuery);
    const count = snapshot.size;

    if (count > 0) {
      const action = confirm(`يوجد ${count} معاملة بفئة "${categoryName}".\n\nاختر:\n- OK: تحويلها لفئة "أخرى"\n- Cancel: إلغاء الحذف`);
      
      if (!action) return;

      await Promise.all(snapshot.docs.map(d => updateDoc(doc(db, 'incomes', d.id), { category: 'أخرى' })));
    }

    const newCategories = categories.filter(cat => cat !== categoryName);
    
    if (categoriesDocId) {
      await updateDoc(doc(db, 'categories', categoriesDocId), {
        categories: newCategories
      });
    }
  };

  const handleEditIncome = (income) => {
    setEditingIncome(income.id);
    setEditIncomeData({
      name: income.name,
      amount: income.amount,
      date: income.date,
      category: income.category,
      accountId: income.accountId || ''
    });
  };

  const handleSaveEdit = async (income) => {
    if (!editIncomeData.name || !editIncomeData.amount || !editIncomeData.date || !editIncomeData.accountId) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    const oldAmount = income.amount;
    const newAmount = parseFloat(editIncomeData.amount);
    const diff = newAmount - oldAmount;

    if (income.accountId === editIncomeData.accountId && diff !== 0) {
      const account = accounts.find(a => a.id === income.accountId);
      if (account) {
        await updateDoc(doc(db, 'accounts', income.accountId), {
          balance: (account.balance || 0) + diff
        });
      }
    } else if (income.accountId !== editIncomeData.accountId) {
      if (income.accountId) {
        const oldAccount = accounts.find(a => a.id === income.accountId);
        if (oldAccount) {
          await updateDoc(doc(db, 'accounts', income.accountId), {
            balance: (oldAccount.balance || 0) - oldAmount
          });
        }
      }

      if (editIncomeData.accountId) {
        const newAccount = accounts.find(a => a.id === editIncomeData.accountId);
        if (newAccount) {
          await updateDoc(doc(db, 'accounts', editIncomeData.accountId), {
            balance: (newAccount.balance || 0) + newAmount
          });
        }
      }
    }

    await updateDoc(doc(db, 'incomes', income.id), {
      name: editIncomeData.name,
      amount: newAmount,
      date: editIncomeData.date,
      category: editIncomeData.category,
      accountId: editIncomeData.accountId
    });

    setEditingIncome(null);
    setEditIncomeData({});
  };

  const filteredIncomes = filterByDate(incomes);
  const totalIncome = filteredIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);

  const groupedIncomes = categories.map(category => {
    const categoryIncomes = filteredIncomes.filter(inc => inc.category === category);
    const total = categoryIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    return {
      category,
      incomes: categoryIncomes,
      total,
      count: categoryIncomes.length
    };
  }).filter(group => group.count > 0);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const regularAccounts = accounts.filter(acc => !acc.isCredit);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-lg mb-2">إجمالي الدخل</p>
            <p className="text-5xl font-bold">{totalIncome.toLocaleString()} ج.م</p>
            <p className="text-emerald-100 mt-2">عدد المعاملات: {filteredIncomes.length}</p>
          </div>
          <TrendingUp className="w-20 h-20 text-emerald-200" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">إضافة دخل جديد</h3>
          <button
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
          >
            <Edit2 className="w-4 h-4" />
            إدارة الفئات
          </button>
        </div>

        {showCategoryManager && (
          <div className="mb-6 p-6 bg-emerald-50 rounded-xl border-2 border-emerald-200">
            <h4 className="font-bold text-emerald-800 mb-4 text-lg">إدارة فئات الدخل</h4>
            
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
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-3">الفئات الحالية</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center gap-2 bg-white border-2 border-emerald-300 rounded-lg p-2">
                    {editingCategory === cat ? (
                      <>
                        <input
                          type="text"
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          className="px-2 py-1 border border-emerald-400 rounded w-32"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">اسم مصدر الدخل</label>
            <input
              type="text"
              value={newIncome.name}
              onChange={(e) => setNewIncome({ ...newIncome, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="مثال: راتب شهري"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">المبلغ (ج.م)</label>
            <input
              type="number"
              value={newIncome.amount}
              onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">التاريخ</label>
            <input
              type="date"
              value={newIncome.date}
              onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">الفئة</label>
            <select
              value={newIncome.category}
              onChange={(e) => setNewIncome({ ...newIncome, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">الحساب</label>
            <select
              value={newIncome.accountId}
              onChange={(e) => setNewIncome({ ...newIncome, accountId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            >
              <option value="">اختر الحساب</option>
              {regularAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">تكرار شهري؟</label>
            <div className="flex items-center gap-4 h-12">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newIncome.recurring}
                  onChange={(e) => setNewIncome({ ...newIncome, recurring: e.target.checked })}
                  className="w-5 h-5"
                />
                <span>نعم</span>
              </label>
              {newIncome.recurring && (
                <input
                  type="number"
                  value={newIncome.months}
                  onChange={(e) => setNewIncome({ ...newIncome, months: e.target.value })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="6"
                  min="1"
                />
              )}
              {newIncome.recurring && <span className="text-sm text-gray-600">شهور</span>}
            </div>
          </div>

          <div className="flex items-end lg:col-span-2">
            <button
              onClick={handleAddIncome}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              إضافة الدخل
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">قائمة الدخل</h3>
        
        {groupedIncomes.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            لا توجد بيانات. قم بإضافة دخل جديد!
          </div>
        ) : (
          <div className="space-y-4">
            {groupedIncomes.map(group => (
              <div key={group.category} className="border-2 border-emerald-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(group.category)}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 p-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {expandedCategories[group.category] ? (
                      <ChevronUp className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-emerald-600" />
                    )}
                    <span className="font-bold text-lg text-gray-800">{group.category}</span>
                    <span className="text-sm text-gray-600">({group.count} معاملة)</span>
                  </div>
                  <span className="font-bold text-emerald-600 text-lg">{group.total.toLocaleString()} ج.م</span>
                </button>

                {expandedCategories[group.category] && (
                  <div className="p-4 bg-white">
                    <div className="space-y-2">
                      {group.incomes.map(income => {
                        const account = accounts.find(a => a.id === income.accountId);
                        
                        return editingIncome === income.id ? (
                          <div key={income.id} className="grid grid-cols-6 gap-2 p-3 bg-gray-50 rounded-lg">
                            <input
                              type="text"
                              value={editIncomeData.name}
                              onChange={(e) => setEditIncomeData({ ...editIncomeData, name: e.target.value })}
                              className="px-2 py-1 border rounded"
                              placeholder="الاسم"
                            />
                            <input
                              type="number"
                              value={editIncomeData.amount}
                              onChange={(e) => setEditIncomeData({ ...editIncomeData, amount: e.target.value })}
                              className="px-2 py-1 border rounded"
                              placeholder="المبلغ"
                            />
                            <input
                              type="date"
                              value={editIncomeData.date}
                              onChange={(e) => setEditIncomeData({ ...editIncomeData, date: e.target.value })}
                              className="px-2 py-1 border rounded"
                            />
                            <select
                              value={editIncomeData.category}
                              onChange={(e) => setEditIncomeData({ ...editIncomeData, category: e.target.value })}
                              className="px-2 py-1 border rounded"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            <select
                              value={editIncomeData.accountId}
                              onChange={(e) => setEditIncomeData({ ...editIncomeData, accountId: e.target.value })}
                              className="px-2 py-1 border rounded"
                            >
                              {regularAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                            </select>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSaveEdit(income)}
                                className="flex-1 text-green-600 hover:text-green-800"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setEditingIncome(null)}
                                className="flex-1 text-red-600 hover:text-red-800"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={income.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{income.name}</p>
                              <p className="text-sm text-gray-600">{income.date} • {account?.name || 'غير محدد'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-emerald-600">{income.amount.toLocaleString()} ج.م</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditIncome(income)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteIncome(income)}
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
