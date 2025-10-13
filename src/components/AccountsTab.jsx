import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, Wallet, CreditCard, AlertCircle, Edit2, X, Check, Settings, FileText, TrendingUp, TrendingDown, ArrowRightLeft, ArrowUp, ArrowDown } from 'lucide-react';

export default function AccountsTab({ userId }) {
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState(['بنك', 'نقدي', 'محفظة إلكترونية', 'استثمار', 'مدخرات']);
  const [accountTypesDocId, setAccountTypesDocId] = useState(null);
  const [newAccount, setNewAccount] = useState({
    name: '',
    balance: '',
    type: 'بنك',
    isCredit: false,
    creditLimit: '',
    debtMonth: '',
    lastMonthDebt: 0,
    currentMonthDebt: 0
  });
  const [editingAccount, setEditingAccount] = useState(null);
  const [editAccountData, setEditAccountData] = useState({});
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState(null);
  const [editTypeValue, setEditTypeValue] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // دالة لجلب اسم الشهر
  const getMonthName = (monthOffset = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return date.toLocaleDateString('ar-EG', { month: 'long' });
  };

  const lastMonthName = getMonthName(-1);
  const currentMonthName = getMonthName(0);

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

  const fetchAccountTransactions = async (accountId, accountName) => {
    setLoadingTransactions(true);
    setSelectedAccount({ id: accountId, name: accountName });
    setShowTransactionsModal(true);

    try {
      const transactions = [];

      const incomesQuery = query(
        collection(db, 'incomes'), 
        where('userId', '==', userId),
        where('accountId', '==', accountId)
      );
      const incomesSnapshot = await getDocs(incomesQuery);
      incomesSnapshot.forEach(doc => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          type: 'income',
          name: data.name,
          amount: data.amount,
          date: data.date,
          category: data.category
        });
      });

      const expensesQuery = query(
        collection(db, 'expenses'), 
        where('userId', '==', userId),
        where('accountId', '==', accountId)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      expensesSnapshot.forEach(doc => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          type: 'expense',
          name: data.name,
          amount: data.amount,
          date: data.date,
          category: data.category
        });
      });

      const transfersFromQuery = query(
        collection(db, 'transfers'), 
        where('userId', '==', userId),
        where('fromAccountId', '==', accountId)
      );
      const transfersFromSnapshot = await getDocs(transfersFromQuery);
      transfersFromSnapshot.forEach(doc => {
        const data = doc.data();
        const toAccount = accounts.find(a => a.id === data.toAccountId);
        transactions.push({
          id: doc.id,
          type: 'transfer_out',
          name: `تحويل إلى ${toAccount?.name || 'حساب محذوف'}`,
          amount: data.amount,
          date: data.date,
          note: data.note
        });
      });

      const transfersToQuery = query(
        collection(db, 'transfers'), 
        where('userId', '==', userId),
        where('toAccountId', '==', accountId)
      );
      const transfersToSnapshot = await getDocs(transfersToQuery);
      transfersToSnapshot.forEach(doc => {
        const data = doc.data();
        const fromAccount = accounts.find(a => a.id === data.fromAccountId);
        transactions.push({
          id: doc.id,
          type: 'transfer_in',
          name: `تحويل من ${fromAccount?.name || 'حساب محذوف'}`,
          amount: data.amount,
          date: data.date,
          note: data.note
        });
      });

      transactions.sort((a, b) => b.date.localeCompare(a.date));
      setAccountTransactions(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      alert('حدث خطأ أثناء جلب المعاملات');
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Continue in Part 2...
const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.balance) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    if (newAccount.isCredit && !newAccount.creditLimit) {
      alert('يرجى إدخال الحد الأقصى للكريدت كارد');
      return;
    }

    // التحقق من اختيار الشهر للدين
    if (newAccount.isCredit && parseFloat(newAccount.balance) > 0) {
      if (!newAccount.debtMonth) {
        alert('يرجى تحديد لأي شهر تنتمي المديونية');
        return;
      }
      
      if (newAccount.debtMonth === 'split') {
        const lastDebt = parseFloat(newAccount.lastMonthDebt) || 0;
        const currentDebt = parseFloat(newAccount.currentMonthDebt) || 0;
        const totalDebt = parseFloat(newAccount.balance);
        
        if (lastDebt + currentDebt !== totalDebt) {
          alert(`مجموع التقسيم (${lastDebt + currentDebt}ج) يجب أن يساوي الدَين الكلي (${totalDebt}ج)`);
          return;
        }
      }
    }

    // حساب الديون حسب الشهر
    let lastMonthDebt = 0;
    let currentMonthDebt = 0;
    
    if (newAccount.isCredit && parseFloat(newAccount.balance) > 0) {
      const totalDebt = parseFloat(newAccount.balance);
      
      if (newAccount.debtMonth === 'last') {
        lastMonthDebt = totalDebt;
      } else if (newAccount.debtMonth === 'current') {
        currentMonthDebt = totalDebt;
      } else if (newAccount.debtMonth === 'split') {
        lastMonthDebt = parseFloat(newAccount.lastMonthDebt) || 0;
        currentMonthDebt = parseFloat(newAccount.currentMonthDebt) || 0;
      }
    }

    await addDoc(collection(db, 'accounts'), {
      name: newAccount.name,
      balance: newAccount.isCredit ? -Math.abs(parseFloat(newAccount.balance)) : parseFloat(newAccount.balance),
      type: newAccount.type,
      isCredit: newAccount.isCredit,
      creditLimit: newAccount.isCredit ? parseFloat(newAccount.creditLimit) : 0,
      lastMonthDebt: lastMonthDebt,
      currentMonthDebt: currentMonthDebt,
      order: accounts.length,
      userId
    });

    setNewAccount({
      name: '',
      balance: '',
      type: 'بنك',
      isCredit: false,
      creditLimit: '',
      debtMonth: '',
      lastMonthDebt: 0,
      currentMonthDebt: 0
    });
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account.id);
    
    // حساب debtMonth من البيانات الموجودة
    let debtMonth = '';
    if (account.isCredit) {
      const lastDebt = account.lastMonthDebt || 0;
      const currentDebt = account.currentMonthDebt || 0;
      
      if (lastDebt > 0 && currentDebt === 0) {
        debtMonth = 'last';
      } else if (currentDebt > 0 && lastDebt === 0) {
        debtMonth = 'current';
      } else if (lastDebt > 0 && currentDebt > 0) {
        debtMonth = 'split';
      }
    }
    
    setEditAccountData({
      name: account.name,
      balance: account.balance,
      type: account.type,
      creditLimit: account.creditLimit || 0,
      debtMonth: debtMonth,
      lastMonthDebt: account.lastMonthDebt || 0,
      currentMonthDebt: account.currentMonthDebt || 0
    });
  };

  const handleSaveEdit = async (accountId) => {
    if (!editAccountData.name || editAccountData.balance === '') {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    const account = accounts.find(a => a.id === accountId);
    
    // حساب الديون للكريدت كارد
    let lastMonthDebt = 0;
    let currentMonthDebt = 0;
    
    if (account.isCredit && Math.abs(parseFloat(editAccountData.balance)) > 0) {
      if (!editAccountData.debtMonth) {
        alert('يرجى تحديد لأي شهر تنتمي المديونية');
        return;
      }
      
      const totalDebt = Math.abs(parseFloat(editAccountData.balance));
      
      if (editAccountData.debtMonth === 'last') {
        lastMonthDebt = totalDebt;
      } else if (editAccountData.debtMonth === 'current') {
        currentMonthDebt = totalDebt;
      } else if (editAccountData.debtMonth === 'split') {
        lastMonthDebt = parseFloat(editAccountData.lastMonthDebt) || 0;
        currentMonthDebt = parseFloat(editAccountData.currentMonthDebt) || 0;
        
        if (lastMonthDebt + currentMonthDebt !== totalDebt) {
          alert(`مجموع التقسيم (${lastMonthDebt + currentMonthDebt}ج) يجب أن يساوي الدَين الكلي (${totalDebt}ج)`);
          return;
        }
      }
    }
    
    await updateDoc(doc(db, 'accounts', accountId), {
      name: editAccountData.name,
      balance: parseFloat(editAccountData.balance),
      type: editAccountData.type,
      creditLimit: account.isCredit ? parseFloat(editAccountData.creditLimit) : 0,
      lastMonthDebt: lastMonthDebt,
      currentMonthDebt: currentMonthDebt
    });

    setEditingAccount(null);
    setEditAccountData({});
  };

  const handleDeleteAccount = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
      await deleteDoc(doc(db, 'accounts', id));
    }
  };

  const handleMoveAccountUp = async (account, currentIndex) => {
    if (currentIndex === 0) return;
    
    const sortedAccounts = [...accounts].sort((a, b) => (a.order || 0) - (b.order || 0));
    const prevAccount = sortedAccounts[currentIndex - 1];
    
    await updateDoc(doc(db, 'accounts', account.id), { order: currentIndex - 1 });
    await updateDoc(doc(db, 'accounts', prevAccount.id), { order: currentIndex });
  };

  const handleMoveAccountDown = async (account, currentIndex) => {
    const sortedAccounts = [...accounts].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (currentIndex === sortedAccounts.length - 1) return;
    
    const nextAccount = sortedAccounts[currentIndex + 1];
    
    await updateDoc(doc(db, 'accounts', account.id), { order: currentIndex + 1 });
    await updateDoc(doc(db, 'accounts', nextAccount.id), { order: currentIndex });
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

  const handleMoveTypeUp = async (index) => {
    if (index === 0) return;
    const newTypes = [...accountTypes];
    [newTypes[index], newTypes[index - 1]] = [newTypes[index - 1], newTypes[index]];
    
    if (accountTypesDocId) {
      await updateDoc(doc(db, 'accountTypes', accountTypesDocId), {
        types: newTypes
      });
    }
  };

  const handleMoveTypeDown = async (index) => {
    if (index === accountTypes.length - 1) return;
    const newTypes = [...accountTypes];
    [newTypes[index], newTypes[index + 1]] = [newTypes[index + 1], newTypes[index]];
    
    if (accountTypesDocId) {
      await updateDoc(doc(db, 'accountTypes', accountTypesDocId), {
        types: newTypes
      });
    }
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

  const sortedAccounts = [...accounts].sort((a, b) => (a.order || 0) - (b.order || 0));
  const regularAccounts = sortedAccounts.filter(acc => !acc.isCredit);
  const creditAccounts = sortedAccounts.filter(acc => acc.isCredit);
  
  const totalRegular = regularAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalCredit = creditAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Continue in Part 3...
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
              <div className="space-y-2">
                {accountTypes.map((type, idx) => (
                  <div key={type} className="flex items-center gap-2 bg-white border-2 border-purple-300 rounded-lg p-2">
                    {editingType === type ? (
                      <>
                        <input
                          type="text"
                          value={editTypeValue}
                          onChange={(e) => setEditTypeValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-purple-400 rounded"
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
                        <span className="flex-1 font-medium text-gray-700">{type}</span>
                        <button
                          onClick={() => handleMoveTypeUp(idx)}
                          disabled={idx === 0}
                          className={`${idx === 0 ? 'text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveTypeDown(idx)}
                          disabled={idx === accountTypes.length - 1}
                          className={`${idx === accountTypes.length - 1 ? 'text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
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

        {newAccount.isCredit && parseFloat(newAccount.balance) > 0 && (
          <div className="mt-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <label className="block text-gray-700 font-semibold mb-3">
              لأي شهر تنتمي هذه المديونية؟ *
            </label>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="debtMonth"
                  value="last"
                  checked={newAccount.debtMonth === 'last'}
                  onChange={(e) => setNewAccount({ ...newAccount, debtMonth: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="font-medium">شهر {lastMonthName} (مطلوب سداده حالاً)</span>
              </label>
              
              <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="debtMonth"
                  value="current"
                  checked={newAccount.debtMonth === 'current'}
                  onChange={(e) => setNewAccount({ ...newAccount, debtMonth: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="font-medium">شهر {currentMonthName} (يؤجل للشهر القادم)</span>
              </label>
              
              <label className="flex items-start gap-2 p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="debtMonth"
                  value="split"
                  checked={newAccount.debtMonth === 'split'}
                  onChange={(e) => setNewAccount({ ...newAccount, debtMonth: e.target.value })}
                  className="w-4 h-4 mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium block mb-2">تقسيم المديونية:</span>
                  {newAccount.debtMonth === 'split' && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-32">من {lastMonthName}:</label>
                        <input
                          type="number"
                          value={newAccount.lastMonthDebt}
                          onChange={(e) => setNewAccount({ ...newAccount, lastMonthDebt: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="0"
                          min="0"
                        />
                        <span className="text-gray-600">ج.م</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-32">من {currentMonthName}:</label>
                        <input
                          type="number"
                          value={newAccount.currentMonthDebt}
                          onChange={(e) => setNewAccount({ ...newAccount, currentMonthDebt: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="0"
                          min="0"
                        />
                        <span className="text-gray-600">ج.م</span>
                      </div>
                      <div className="text-sm text-gray-600 bg-white p-2 rounded">
                        المجموع: {((parseFloat(newAccount.lastMonthDebt) || 0) + (parseFloat(newAccount.currentMonthDebt) || 0)).toLocaleString()} ج.م
                        {' / '}
                        الدَين الكلي: {parseFloat(newAccount.balance).toLocaleString()} ج.م
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}
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
            {regularAccounts.map((account, index) => (
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
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMoveAccountUp(account, index)}
                        disabled={index === 0}
                        className={`${index === 0 ? 'text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveAccountDown(account, index)}
                        disabled={index === regularAccounts.length - 1}
                        className={`${index === regularAccounts.length - 1 ? 'text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => fetchAccountTransactions(account.id, account.name)}
                        className="text-purple-600 hover:text-purple-800"
                        title="عرض المعاملات"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
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
            {creditAccounts.map((account, index) => {
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
                    
                    {Math.abs(parseFloat(editAccountData.balance)) > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                        <label className="block text-sm font-semibold mb-2">لأي شهر تنتمي المديونية؟</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`debtMonth-${account.id}`}
                              value="last"
                              checked={editAccountData.debtMonth === 'last'}
                              onChange={(e) => setEditAccountData({ ...editAccountData, debtMonth: e.target.value })}
                              className="w-3 h-3"
                            />
                            {lastMonthName}
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`debtMonth-${account.id}`}
                              value="current"
                              checked={editAccountData.debtMonth === 'current'}
                              onChange={(e) => setEditAccountData({ ...editAccountData, debtMonth: e.target.value })}
                              className="w-3 h-3"
                            />
                            {currentMonthName}
                          </label>
                          <label className="flex flex-col gap-1 text-sm">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`debtMonth-${account.id}`}
                                value="split"
                                checked={editAccountData.debtMonth === 'split'}
                                onChange={(e) => setEditAccountData({ ...editAccountData, debtMonth: e.target.value })}
                                className="w-3 h-3"
                              />
                              تقسيم
                            </div>
                            {editAccountData.debtMonth === 'split' && (
                              <div className="mr-5 space-y-1">
                                <input
                                  type="number"
                                  value={editAccountData.lastMonthDebt}
                                  onChange={(e) => setEditAccountData({ ...editAccountData, lastMonthDebt: e.target.value })}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  placeholder={lastMonthName}
                                />
                                <input
                                  type="number"
                                  value={editAccountData.currentMonthDebt}
                                  onChange={(e) => setEditAccountData({ ...editAccountData, currentMonthDebt: e.target.value })}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  placeholder={currentMonthName}
                                />
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                    
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
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMoveAccountUp(account, index + regularAccounts.length)}
                        disabled={index === 0}
                        className={`${index === 0 ? 'text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveAccountDown(account, index + regularAccounts.length)}
                        disabled={index === creditAccounts.length - 1}
                        className={`${index === creditAccounts.length - 1 ? 'text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => fetchAccountTransactions(account.id, account.name)}
                        className="text-purple-600 hover:text-purple-800"
                        title="عرض المعاملات"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
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
                    
                    {(account.lastMonthDebt > 0 || account.currentMonthDebt > 0) && (
                      <div className="mt-4 pt-4 border-t-2 border-red-300">
                        <p className="text-xs font-semibold text-gray-600 mb-2">تفاصيل المديونية:</p>
                        {account.lastMonthDebt > 0 && (
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">• من {lastMonthName}:</span>
                            <span className="font-bold text-orange-600">{account.lastMonthDebt.toLocaleString()} ج.م</span>
                          </div>
                        )}
                        {account.currentMonthDebt > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">• من {currentMonthName}:</span>
                            <span className="font-bold text-yellow-600">{account.currentMonthDebt.toLocaleString()} ج.م</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showTransactionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">معاملات الحساب</h3>
                <p className="text-purple-100 mt-1">{selectedAccount?.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowTransactionsModal(false);
                  setAccountTransactions([]);
                  setSelectedAccount(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingTransactions ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري التحميل...</p>
                </div>
              ) : accountTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 text-lg">لا توجد معاملات على هذا الحساب</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accountTransactions.map(transaction => {
                    let bgColor, textColor, icon, sign;
                    
                    if (transaction.type === 'income') {
                      bgColor = 'bg-emerald-50';
                      textColor = 'text-emerald-600';
                      icon = <TrendingUp className="w-5 h-5" />;
                      sign = '+';
                    } else if (transaction.type === 'expense') {
                      bgColor = 'bg-red-50';
                      textColor = 'text-red-600';
                      icon = <TrendingDown className="w-5 h-5" />;
                      sign = '-';
                    } else if (transaction.type === 'transfer_in') {
                      bgColor = 'bg-blue-50';
                      textColor = 'text-blue-600';
                      icon = <ArrowRightLeft className="w-5 h-5" />;
                      sign = '+';
                    } else {
                      bgColor = 'bg-orange-50';
                      textColor = 'text-orange-600';
                      icon = <ArrowRightLeft className="w-5 h-5" />;
                      sign = '-';
                    }

                    return (
                      <div
                        key={transaction.id}
                        className={`${bgColor} rounded-xl p-4 border-2`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${textColor}`}>
                              {icon}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-800">{transaction.name}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                <span>{transaction.date}</span>
                                {transaction.category && (
                                  <>
                                    <span>•</span>
                                    <span className="bg-white px-2 py-0.5 rounded">{transaction.category}</span>
                                  </>
                                )}
                                {transaction.note && (
                                  <>
                                    <span>•</span>
                                    <span>{transaction.note}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={`font-bold text-lg ${textColor}`}>
                            {sign}{transaction.amount.toLocaleString()} ج.م
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!loadingTransactions && accountTransactions.length > 0 && (
              <div className="bg-gray-50 p-4 border-t">
                <p className="text-center text-gray-600">
                  إجمالي المعاملات: <strong>{accountTransactions.length}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
