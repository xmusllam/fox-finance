import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Wallet, CreditCard, AlertCircle } from 'lucide-react';

export default function AccountsTab({ userId }) {
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({
    name: '',
    balance: '',
    type: 'بنك',
    isCredit: false,
    creditLimit: ''
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

    if (newAccount.isCredit && !newAccount.creditLimit) {
      alert('يرجى إدخال الحد الأقصى للكريدت كارد');
      return;
    }

    await addDoc(collection(db, 'accounts'), {
      name: newAccount.name,
      balance: parseFloat(newAccount.balance),
      type: newAccount.type,
      isCredit: newAccount.isCredit,
      creditLimit: newAccount.isCredit ? parseFloat(newAccount.creditLimit) : 0,
      userId
    });

    setNewAccount({
      name: '',
      balance: '',
      type: 'بنك',
      isCredit: false,
      creditLimit: ''
    });
  };

  const handleDeleteAccount = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
      await deleteDoc(doc(db, 'accounts', id));
    }
  };

  const regularAccounts = accounts.filter(acc => !acc.isCredit);
  const creditAccounts = accounts.filter(acc => acc.isCredit);
  
  const totalRegular = regularAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalCredit = creditAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">إضافة حساب جديد</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">اسم الحساب</label>
            <input
              type="text"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="مثال: حساب جاري"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">نوع الحساب</label>
            <select
              value={newAccount.type}
              onChange={(e) => {
                const isCreditCard = e.target.value === 'كريدت كارد';
                setNewAccount({ 
                  ...newAccount, 
                  type: e.target.value,
                  isCredit: isCreditCard,
                  balance: isCreditCard ? '0' : newAccount.balance
                });
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            >
              <option value="بنك">حساب بنكي</option>
              <option value="محفظة إلكترونية">محفظة إلكترونية</option>
              <option value="نقدي">نقدي</option>
              <option value="سلفة لصديق">سلفة لصديق</option>
              <option value="استثمار">استثمار</option>
              <option value="مدخرات">مدخرات</option>
              <option value="كريدت كارد">كريدت كارد</option>
            </select>
          </div>

          {!newAccount.isCredit ? (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">الرصيد الحالي (ج.م)</label>
              <input
                type="number"
                value={newAccount.balance}
                onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">الدَين الحالي (ج.م)</label>
                <input
                  type="number"
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">الحد الأقصى (ج.م)</label>
                <input
                  type="number"
                  value={newAccount.creditLimit}
                  onChange={(e) => setNewAccount({ ...newAccount, creditLimit: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  placeholder="50000"
                />
              </div>
            </>
          )}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-lg mb-2">إجمالي الأرصدة</p>
              <p className="text-5xl font-bold">{totalRegular.toLocaleString()} ج.م</p>
              <p className="text-purple-100 mt-2">عدد الحسابات: {regularAccounts.length}</p>
            </div>
            <Wallet className="w-20 h-20 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-lg mb-2">إجمالي الديون</p>
              <p className="text-5xl font-bold">{Math.abs(totalCredit).toLocaleString()} ج.م</p>
              <p className="text-red-100 mt-2">عدد البطاقات: {creditAccounts.length}</p>
            </div>
            <CreditCard className="w-20 h-20 text-red-200" />
          </div>
        </div>
      </div>

      {regularAccounts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <h3 className="text-2xl font-bold text-gray-800 p-6 border-b">الحسابات العادية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {regularAccounts.map(account => (
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
        </div>
      )}

      {creditAccounts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <h3 className="text-2xl font-bold text-gray-800 p-6 border-b flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            بطاقات الائتمان
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {creditAccounts.map(account => {
              const debt = Math.abs(account.balance || 0);
              const limit = account.creditLimit || 0;
              const available = limit - debt;
              const usagePercent = limit > 0 ? (debt / limit) * 100 : 0;
              
              return (
                <div
                  key={account.id}
                  className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-200 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-red-700" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">{account.name}</h4>
                        <span className="text-sm text-red-600 font-medium">كريدت كارد</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>الدَين</span>
                        <span className="font-bold text-red-600">{debt.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>المتاح</span>
                        <span className="font-bold text-green-600">{available.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>الحد الأقصى</span>
                        <span className="font-bold">{limit.toLocaleString()} ج.م</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all ${
                            usagePercent > 80 ? 'bg-red-600' : 
                            usagePercent > 50 ? 'bg-orange-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1 text-center">
                        استخدام {usagePercent.toFixed(1)}%
                      </p>
                    </div>
                    
                    {usagePercent > 80 && (
                      <div className="flex items-center gap-2 bg-red-100 text-red-700 p-2 rounded-lg text-xs">
                        <AlertCircle className="w-4 h-4" />
                        <span>تحذير: استخدام عالي</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
