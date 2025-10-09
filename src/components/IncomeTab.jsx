import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Edit2 } from 'lucide-react';

export default function IncomeTab({ userId, dateFilter, customDateFrom, customDateTo }) {
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState(['راتب', 'أرباح', 'استثمار', 'هدية', 'أخرى']);
  const [newIncome, setNewIncome] = useState({
    name: '',
    amount: '',
    date: '',
    category: 'راتب',
    recurring: false,
    months: 1
  });
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    const incomesQuery = query(collection(db, 'incomes'), where('userId', '==', userId));
    const unsubIncomes = onSnapshot(incomesQuery, (snapshot) => {
      setIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const categoriesQuery = query(
      collection(db, 'categories'),
      where('userId', '==', userId),
      where('type', '==', 'income')
    );
    const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
      if (!snapshot.empty) {
        setCategories(snapshot.docs[0].data().categories);
      }
    });

    return () => {
      unsubIncomes();
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
        recurring: newIncome.recurring,
        userId
      });
    }
  };

  const handleAddIncome = async () => {
    if (!newIncome.name || !newIncome.amount || !newIncome.date) {
      alert('يرجى ملء جميع الحقول');
      return;
    }
    
    await addRecurringIncomes();
    setNewIncome({
      name: '',
      amount: '',
      date: '',
      category: 'راتب',
      recurring: false,
      months: 1
    });
  };

  const handleDeleteIncome = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الدخل؟')) {
      await deleteDoc(doc(db, 'incomes', id));
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
      where('type', '==', 'income')
    );
    
    const snapshot = await categoriesQuery.get();
    
    if (!snapshot.empty) {
      await updateDoc(doc(db, 'categories', snapshot.docs[0].id), {
        categories: newCategories
      });
    } else {
      await addDoc(collection(db, 'categories'), {
        userId,
        type: 'income',
        categories: newCategories
      });
    }

    setNewCategory('');
    setShowAddCategory(false);
  };

  const filteredIncomes = filterByDate(incomes);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">إضافة دخل جديد</h3>
          <button
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
          >
            <Edit2 className="w-4 h-4" />
            إدارة الفئات
          </button>
        </div>

        {showAddCategory && (
          <div className="mb-4 p-4 bg-emerald-50 rounded-xl">
            <label className="block text-gray-700 font-semibold mb-2">إضافة فئة جديدة</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="اسم الفئة الجديدة"
              />
              <button
                onClick={handleAddCategory}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                إضافة
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">اسم مصدر الدخل</label>
            <input
              type="text"
              value={newIncome.name}
              onChange={(e) => setNewIncome({ ...newIncome, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="مثال: راتب شهري"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">المبلغ (ج.م)</label>
            <input
              type="number"
              value={newIncome.amount}
              onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">التاريخ</label>
            <input
              type="date"
              value={newIncome.date}
              onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">الفئة</label>
            <select
              value={newIncome.category}
              onChange={(e) => setNewIncome({ ...newIncome, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                  checked={newIncome.recurring}
                  onChange={(e) => setNewIncome({ ...newIncome, recurring: e.target.checked })}
                  className="w-5 h-5 text-emerald-600"
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

          <div className="flex items-end">
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-emerald-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المصدر</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الفئة</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المبلغ</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    لا توجد بيانات. قم بإضافة دخل جديد!
                  </td>
                </tr>
              ) : (
                filteredIncomes.map(income => (
                  <tr key={income.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-800 font-medium">{income.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                        {income.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">
                      {income.amount?.toLocaleString()} ج.م
                    </td>
                    <td className="px-6 py-4 text-gray-600">{income.date}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteIncome(income.id)}
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