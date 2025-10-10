import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Wallet, CreditCard, AlertCircle, Edit2, X, Check, Settings } from 'lucide-react';

export default function AccountsTab({ userId }) {
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState(['بنك', 'نقدي', 'محفظة إلكترونية', 'استثمار', 'مدخرات']);
  const [accountTypesDocId, setAccountTypesDocId] = useState(null);
  const [newAccount, setNewAccount] = useState({
    name: '',
    balance: '',
    type: 'بنك',
    isCredit: false,
    creditLimit: ''
  });
  const [editingAccount, setEditingAccount] = useState(null);
  const [editAccountData, setEditAccountData] = useState({});
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState(null);
  const [editTypeValue, setEditTypeValue] = useState('');

  useEffect(() => {
    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', userId));
    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const typesQuery = query(collection(db, 'accountTypes'), where('userId', '==', userId));
    const unsubTypes = onSnapshot(typesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setAccountTypes(docData.data().types || ['بنك', 'نقدي', 'محفظة إلكترونية', 'استثمار', 'مدخرات']);
        setAccountTypesDocId(docData.id);
      }
    });

    return () => {
      unsubAccounts();
      unsubTypes();
    };
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

  const handleEditAccount = (account) => {
    setEditingAccount(account.id);
    setEditAccountData({
      name: account.name,
      balance: account.balance,
      type: account.type,
      creditLimit: account.creditLimit || 0
    });
  };

  const handleSaveEdit = async (accountId) => {
    if (!editAccountData.name || editAccountData.balance === '') {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    const account = accounts.find(a => a.id === accountId);
    
    await updateDoc(doc(db, 'accounts', accountId), {
      name: editAccountData.name,
      balance: parseFloat(editAccountData.balance),
      type: editAccountData.type,
      creditLimit: account.isCredit ? parseFloat(editAccountData.creditLimit) : 0
    });

    setEditingAccount(null);
    setEditAccountData({});
  };

  const handleDeleteAccount = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
      await deleteDoc(doc(db, 'accounts', id));
    }
  };

  const handleAddType = async () => {
    if (!newTypeName || accountTypes.includes(newTypeName)) {
      alert('النوع موجود بالفعل أو فارغ');
      return;
    }

    const newTypes = [...accountTypes, newTypeName];
    
    if (accountTypesDocId) {
      await updateDoc(doc(db, 'accountTypes', accountTypesDocId), {
        types: newTypes
      });
    } else {
      await addDoc(collection(db, 'accountTypes'), {
        userId,
        types: newTypes
      });
    }

    setNewTypeName('');
  };

  const handleEditType = async (oldName) => {
    if (!editTypeValue || editTypeValue === oldName) {
      setEditingType(null);
      return;
    }

    if (accountTypes.includes(editTypeValue)) {
      alert('هذا الاسم مستخدم بالفعل');
      return;
    }

    const newTypes = accountTypes.map(t => t === oldName ? editTypeValue : t);
    
    if (accountTypesDocId) {
      await updateDoc(doc(db, 'accountTypes', accountTypesDocId), {
        types: newTypes
      });
    }

    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', userId), where('type', '==', oldName));
    const snapshot = await getDocs(accountsQuery);
    await Promise.all(snapshot.docs.map(d => updateDoc(doc(db, 'accounts', d.id), { type: editTypeValue })));

    setEditingType(null);
    setEditTypeValue('');
  };

  const handleDeleteType = async (typeName) => {
    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', userId), where('type', '==', typeName));
    const snapshot = await getDocs(accountsQuery);
    const count = snapshot.size;

    if (count > 0) {
      const action = confirm(`يوجد ${count} حساب بنوع "${typeName}".\n\nاختر:\n- OK: تحويلها لنوع "بنك"\n- Cancel: إلغاء الحذف`);
      
      if (!action) return;

      await Promise.all(snapshot.docs.map(d => updateDoc(doc(db, 'accounts', d.id), { type: 'بنك' })));
    }

    const newTypes = accountTypes.filter(t => t !== typeName);
    
    if (accountTypesDocId) {
      await updateDoc(doc(db, 'accountTypes', accountTypesDocId), {
        types: newTypes
      });
    }
  };

  const regularAccounts = accounts.filter(acc => !acc.isCredit);
  const creditAccounts = accounts.filter(acc => acc.isCredit);
  
  const totalRegular = regularAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalCredit = creditAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">إضافة حساب جديد</h3>
          <button
            onClick={() => setShowTypeManager(!showTypeManager)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
          >
            <Settings className="w-4 h-4" />
            إدارة الأنواع
          </button>
        </div>

        {showTypeManager && (
          <div className="mb-6 p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
            <h4 className="font-bold text-purple-800 mb-4 text-lg">إدارة أنواع الحسابات</h4>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">إضافة نوع جديد</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="اسم النوع الجديد"
                />
                <button
                  onClick={handleAddType}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-3">الأنواع الحالية</label>
              <div className="flex flex-wrap gap-2">
                {accountTypes.map(type => (
                  <div key={type} className="flex items-center gap-2 bg-white border-2 border-purple-300 rounded-lg p-2">
                    {editingType === type ? (
                      <>
                        <input
                          type="text"
                          value={editTypeValue}
                          onChange={(e) => setEditTypeValue(e.target.value)}
                          className="px-2 py-1 border border-purple-400 rounded w-32"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditType(type)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingType(null)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-gray-700">{type}</span>
                        <button
                          onClick={() => {
                            setEditingType(type);
                            setEditTypeValue(type);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(type)}
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
              {accountTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
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
              editingAccount === account.id ? (
                <div key={account.id} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-300">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editAccountData.name}
                      onChange={(e) => setEditAccountData({ ...editAccountData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="اسم الحساب"
                    />
                    <select
                      value={editAccountData.type}
                      onChange={(e) => setEditAccountData({ ...editAccountData, type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {accountTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={editAccountData.balance}
                      onChange={(e) => setEditAccountData({ ...editAccountData, balance: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="الرصيد"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(account.id)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                      >
                        <Check className="w-5 h-5 mx-auto" />
                      </button>
                      <button
                        onClick={() => setEditingAccount(null)}
                        className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500"
                      >
                        <X className="w-5 h-5 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-purple-700">
                    {account.balance?.toLocaleString()} ج.م
                  </div>
                </div>
              )
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
              
              return editingAccount === account.id ? (
                <div key={account.id} className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-300">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editAccountData.name}
                      onChange={(e) => setEditAccountData({ ...editAccountData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="اسم البطاقة"
                    />
                    <input
                      type="number"
                      value={Math.abs(editAccountData.balance)}
                      onChange={(e) => setEditAccountData({ ...editAccountData, balance: -Math.abs(parseFloat(e.target.value)) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="الدَين"
                    />
                    <input
                      type="number"
                      value={editAccountData.creditLimit}
                      onChange={(e) => setEditAccountData({ ...editAccountData, creditLimit: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="الحد الأقصى"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(account.id)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                      >
                        <Check className="w-5 h-5 mx-auto" />
                      </button>
                      <button
                        onClick={() => setEditingAccount(null)}
                        className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500"
                      >
                        <X className="w-5 h-5 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
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
