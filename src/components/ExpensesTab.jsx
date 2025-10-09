import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Edit2, X, Check } from 'lucide-react';

export default function ExpensesTab({ userId, dateFilter, customDateFrom, customDateTo, yearStart, monthEnd }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(['إيجار', 'فواتير', 'أقساط', 'طعام', 'مواصلات', 'ترفيه', 'صحة', 'مصروفات عامة']);
  const [categoriesDocId, setCategoriesDocId] = useState(null);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    date: '',
    category: 'مصروفات عامة',
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

  const addRecurringExpenses = async () => {
    const months = newExpense.recurring ? parseInt(newExpense.months) || 1 : 1;
    const startDate = new Date(newExpense.date);
    
    for (let i = 0; i < months; i++) {
      const itemDate = new Date(startDate);
      itemDate.setMonth(startDate.getMonth() + i);
      
      await addDoc(collection(db, 'expenses'), {
        name: newExpense.name,
        amount: parseFloat(newExpense.amount),
        date: itemDate.toISOString().split('T')[0],
        category: newExpense.category,
        recurring: newExpense.recurring,
        userId
      });
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.amount || !newExpense.date) {
      alert('يرجى ملء جميع الحقول');
      return;
    }
    
    await addRecurringExpenses();
    setNewExpense({
      name: '',
      amount: '',
      date: '',
      category: 'مصروفات عامة',
      recurring: false,
      months: 1
    });
  };

  const handleDeleteExpense = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      await deleteDoc(doc(db, 'expenses', id));
    }
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
      const action = confirm(`يوجد ${count} معاملة بفئة "${categoryName}".\n\nاختر:\n- OK: تحويلها لفئة "أخرى"\n- Cancel: إلغاء الحذف`);
      
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
      category: expense.category
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editExpenseData.name || !editExpenseData.amount || !editExpenseData.date) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    await updateDoc(doc(db, 'expenses', id), {
      name: editExpenseData.name,
      amount: parseFloat(editExpenseData.amount),
      date: editExpenseData.date,
      category: editExpenseData.category
    });

    setEditingExpense(null);
    setEditExpenseData({});
  };

  const filteredExpenses = filterByDate(expenses);

  return (
    <div className="space-y-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">اسم المصروف</label>
            <input
              type="text"
              value={newExpense.name}
              onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="مثال: إيجار شقة"
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
            <label className="block text-gray-700 font-semibold mb-2">الفئة</label>
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

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
                <input
                  type="number"
                  value={newExpense.months}
                  onChange={(e) => setNewExpense({ ...newExpense, months: e.target.value })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="6"
                  min="1"
                />
              )}
              {newExpense.recurring && <span className="text-sm text-gray-600">شهور</span>}
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

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">قائمة المصروفات</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-red-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المصروف</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الفئة</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المبلغ</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    لا توجد بيانات. قم بإضافة مصروف جديد!
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    {editingExpense === expense.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editExpenseData.name}
                            onChange={(e) => setEditExpenseData({ ...editExpenseData, name: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={editExpenseData.category}
                            onChange={(e) => setEditExpenseData({ ...editExpenseData, category: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={editExpenseData.amount}
                            onChange={(e) => setEditExpenseData({ ...editExpenseData, amount: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={editExpenseData.date}
                            onChange={(e) => setEditExpenseData({ ...editExpenseData, date: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(expense.id)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingExpense(null)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-gray-800 font-medium">{expense.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-red-600 font-bold">
                          {expense.amount?.toLocaleString()} ج.م
                        </td>
                        <td className="px-6 py-4 text-gray-600">{expense.date}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
