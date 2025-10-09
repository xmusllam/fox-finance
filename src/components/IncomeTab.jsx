import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Edit2, X, Check } from 'lucide-react';

export default function IncomeTab({ userId, dateFilter, customDateFrom, customDateTo, yearStart, monthEnd }) {
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState(['راتب', 'أرباح', 'استثمار', 'هدية', 'أخرى']);
  const [categoriesDocId, setCategoriesDocId] = useState(null);
  const [newIncome, setNewIncome] = useState({
    name: '',
    amount: '',
    date: '',
    category: 'راتب',
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
      category: income.category
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editIncomeData.name || !editIncomeData.amount || !editIncomeData.date) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    await updateDoc(doc(db, 'incomes', id), {
      name: editIncomeData.name,
      amount: parseFloat(editIncomeData.amount),
      date: editIncomeData.date,
      category: editIncomeData.category
    });

    setEditingIncome(null);
    setEditIncomeData({});
  };

  const filteredIncomes = filterByDate(incomes);

  return (
    <div className="space-y-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
                    {editingIncome === income.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editIncomeData.name}
                            onChange={(e) => setEditIncomeData({ ...editIncomeData, name: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={editIncomeData.category}
                            onChange={(e) => setEditIncomeData({ ...editIncomeData, category: e.target.value })}
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
                            value={editIncomeData.amount}
                            onChange={(e) => setEditIncomeData({ ...editIncomeData, amount: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={editIncomeData.date}
                            onChange={(e) => setEditIncomeData({ ...editIncomeData, date: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(income.id)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingIncome(null)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditIncome(income)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteIncome(income.id)}
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
