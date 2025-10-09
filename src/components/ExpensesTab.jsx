import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Edit2 } from 'lucide-react';

export default function ExpensesTab({ userId, dateFilter, customDateFrom, customDateTo }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(['إيجار', 'فواتير', 'أقساط', 'طعام', 'مواصلات', 'ترفيه', 'صحة', 'مصروفات عامة']);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    date: '',
    category: 'مصروفات عامة',
    recurring: false,
    months: 1
  });
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

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
        setCategories(snapshot.docs[0].data().categories);
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
    if (!newCategory || categories.includes(newCategory)) {
      alert('الفئة موجودة بالفعل أو فارغة');
      return;
    }

    const newCategories = [...categories, newCategory];
    
    const categoriesQuery = query(
      collection(db, 'categories'),
      where('userId', '==', userId),
      where('type', '==', 'expense')
    );
    
    const snapshot = await getDocs(categoriesQuery);
    
    if (!snapshot.empty) {
      await updateDoc(doc(db, 'categories', snapshot.docs[0].id), {
        categories: newCategories
      });
    } else {
      await addDoc(collection(db, 'categories'), {
        userId,
        type: 'expense',
        categories: newCategories
      });
    }

    setNewCategory('');
    setShowAddCategory(false);
  };

  const filteredExpenses = filterByDate(expenses);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">إضافة مصروف جديد</h3>
          <button
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            <Edit2 className="w-4 h-4" />
            إدارة الفئات
          </button>
        </div>

        {showAddCategory && (
          <div className="mb-4 p-4 bg-red-50 rounded-xl">
            <label className="block text-gray-700 font-semibold mb-2">إضافة فئة جديدة</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="اسم الفئة الجديدة"
              />
              <button
                onClick={handleAddCategory}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                إضافة
              </button>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="مثال: إيجار شقة"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">المبلغ (ج.م)</label>
            <input
              type="number"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">التاريخ</label>
            <input
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">الفئة</label>
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
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
                  className="w-5 h-5 text-red-600"
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
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
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