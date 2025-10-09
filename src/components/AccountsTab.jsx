import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Wallet } from 'lucide-react';

export default function AccountsTab({ userId }) {
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({
    name: '',
    balance: '',
    type: 'بنك'
  });

  useEffect(() => {
    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', userId));
    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubAccounts();
  }, [userId]);

  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.balance) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    await addDoc(collection(db, 'accounts'), {
      name: newAccount.name,
      balance: parseFloat(newAccount.balance),
      type: newAccount.type,
      userId
    });

    setNewAccount({
      name: '',
      balance: '',
      type: 'بنك'
    });
  };

  const handleDeleteAccount = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
      await deleteDoc(doc(db, 'accounts', id));
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">إضافة حساب جديد</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">اسم الحساب</label>
            <input
              type="text"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="مثال: حساب جاري"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">الرصيد الحالي (ج.م)</label>
            <input
              type="number"
              value={newAccount.balance}
              onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">نوع الحساب</label>
            <select
              value={newAccount.type}
              onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="بنك">حساب بنكي</option>
              <option value="نقدي">نقدي</option>
              <option value="محفظة إلكترونية">محفظة إلكترونية</option>
              <option value="استثمار">استثمار</option>
              <option value="مدخرات">مدخرات</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddAccount}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              إضافة الحساب
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-lg mb-2">إجمالي الأرصدة</p>
            <p className="text-5xl font-bold">{totalBalance.toLocaleString()} ج.م</p>
            <p className="text-purple-100 mt-2">عدد الحسابات: {accounts.length}</p>
          </div>
          <Wallet className="w-20 h-20 text-purple-200" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <h3 className="text-2xl font-bold text-gray-800 p-6 border-b">الحسابات والأرصدة</h3>
        {accounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">لا توجد حسابات. قم بإضافة حساب جديد!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {accounts.map(account => (
              <div
                key={account.id}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-purple-700" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">{account.name}</h4>
                      <span className="text-sm text-purple-600 font-medium">{account.type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-3xl font-bold text-purple-700">
                  {account.balance?.toLocaleString()} ج.م
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}