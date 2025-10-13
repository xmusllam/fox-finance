import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Trash2, ArrowRightLeft, CreditCard, Wallet } from 'lucide-react';

export default function TransfersTab({ userId }) {
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const today = new Date().toISOString().split('T')[0];
  
  const [newTransfer, setNewTransfer] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    date: today,
    note: ''
  });

  useEffect(() => {
    const transfersQuery = query(collection(db, 'transfers'), where('userId', '==', userId));
    const unsubTransfers = onSnapshot(transfersQuery, (snapshot) => {
      setTransfers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', userId));
    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTransfers();
      unsubAccounts();
    };
  }, [userId]);

  const handleAddTransfer = async () => {
    if (!newTransfer.fromAccountId || !newTransfer.toAccountId || !newTransfer.amount || !newTransfer.date) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (newTransfer.fromAccountId === newTransfer.toAccountId) {
      alert('لا يمكن التحويل من وإلى نفس الحساب!');
      return;
    }

    const amount = parseFloat(newTransfer.amount);
    const fromAccount = accounts.find(a => a.id === newTransfer.fromAccountId);
    const toAccount = accounts.find(a => a.id === newTransfer.toAccountId);

    if (!fromAccount || !toAccount) {
      alert('حدث خطأ في تحديد الحسابات');
      return;
    }

    if (!fromAccount.isCredit && fromAccount.balance < amount) {
      alert('الرصيد غير كافي في الحساب المحول منه!');
      return;
    }

    // Update from account
    if (fromAccount.isCredit) {
      await updateDoc(doc(db, 'accounts', fromAccount.id), {
        balance: (fromAccount.balance || 0) - amount
      });
    } else {
      await updateDoc(doc(db, 'accounts', fromAccount.id), {
        balance: (fromAccount.balance || 0) - amount
      });
    }

    // Update to account
    if (toAccount.isCredit) {
      let lastMonthDebt = toAccount.lastMonthDebt || 0;
      let currentMonthDebt = toAccount.currentMonthDebt || 0;
      let remainingPayment = amount;

      if (lastMonthDebt > 0) {
        if (remainingPayment >= lastMonthDebt) {
          remainingPayment -= lastMonthDebt;
          lastMonthDebt = 0;
        } else {
          lastMonthDebt -= remainingPayment;
          remainingPayment = 0;
        }
      }

      if (remainingPayment > 0 && currentMonthDebt > 0) {
        if (remainingPayment >= currentMonthDebt) {
          remainingPayment -= currentMonthDebt;
          currentMonthDebt = 0;
        } else {
          currentMonthDebt -= remainingPayment;
          remainingPayment = 0;
        }
      }

      await updateDoc(doc(db, 'accounts', toAccount.id), {
        balance: (toAccount.balance || 0) + amount,
        lastMonthDebt: lastMonthDebt,
        currentMonthDebt: currentMonthDebt
      });
    } else {
      await updateDoc(doc(db, 'accounts', toAccount.id), {
        balance: (toAccount.balance || 0) + amount
      });
    }

    await addDoc(collection(db, 'transfers'), {
      fromAccountId: newTransfer.fromAccountId,
      toAccountId: newTransfer.toAccountId,
      amount: amount,
      date: newTransfer.date,
      note: newTransfer.note,
      userId
    });

    setNewTransfer({
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      date: today,
      note: ''
    });

    alert('تم التحويل بنجاح! ✅');
  };

  const handleDeleteTransfer = async (transfer) => {
    if (!confirm('هل أنت متأكد من حذف هذا التحويل؟\n\nسيتم إلغاء تأثيره على الحسابات.')) return;

    const fromAccount = accounts.find(a => a.id === transfer.fromAccountId);
    const toAccount = accounts.find(a => a.id === transfer.toAccountId);

    if (fromAccount) {
      await updateDoc(doc(db, 'accounts', fromAccount.id), {
        balance: (fromAccount.balance || 0) + transfer.amount
      });
    }

    if (toAccount) {
      if (toAccount.isCredit) {
        let lastMonthDebt = toAccount.lastMonthDebt || 0;
        let currentMonthDebt = toAccount.currentMonthDebt || 0;
        let remainingAmount = transfer.amount;

        if (currentMonthDebt < (toAccount.currentMonthDebt || 0)) {
          const paidFromCurrent = (toAccount.currentMonthDebt || 0) - currentMonthDebt;
          if (remainingAmount <= paidFromCurrent) {
            currentMonthDebt += remainingAmount;
            remainingAmount = 0;
          } else {
            currentMonthDebt = toAccount.currentMonthDebt || 0;
            remainingAmount -= paidFromCurrent;
          }
        }

        if (remainingAmount > 0) {
          lastMonthDebt += remainingAmount;
        }

        await updateDoc(doc(db, 'accounts', toAccount.id), {
          balance: (toAccount.balance || 0) - transfer.amount,
          lastMonthDebt: lastMonthDebt,
          currentMonthDebt: currentMonthDebt
        });
      } else {
        await updateDoc(doc(db, 'accounts', toAccount.id), {
          balance: (toAccount.balance || 0) - transfer.amount
        });
      }
    }

    await deleteDoc(doc(db, 'transfers', transfer.id));
  };

  const getAccountName = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.name} (${account.isCredit ? 'كريدت كارد' : account.type})` : 'حساب محذوف';
  };

  const sortedTransfers = [...transfers].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-lg mb-2">التحويلات بين الحسابات</p>
            <p className="text-5xl font-bold">{transfers.length}</p>
            <p className="text-blue-100 mt-2">إجمالي العمليات</p>
          </div>
          <ArrowRightLeft className="w-20 h-20 text-blue-200" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">إضافة تحويل جديد</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">من حساب *</label>
            <select
              value={newTransfer.fromAccountId}
              onChange={(e) => setNewTransfer({ ...newTransfer, fromAccountId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر الحساب المحول منه</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.isCredit ? 'كريدت كارد' : acc.type}) - {acc.balance?.toLocaleString()} ج.م
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">إلى حساب *</label>
            <select
              value={newTransfer.toAccountId}
              onChange={(e) => setNewTransfer({ ...newTransfer, toAccountId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر الحساب المحول إليه</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.isCredit ? 'كريدت كارد' : acc.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">المبلغ (ج.م) *</label>
            <input
              type="number"
              value={newTransfer.amount}
              onChange={(e) => setNewTransfer({ ...newTransfer, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">التاريخ *</label>
            <input
              type="date"
              value={newTransfer.date}
              onChange={(e) => setNewTransfer({ ...newTransfer, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-gray-700 font-semibold mb-2">ملاحظات (اختياري)</label>
            <input
              type="text"
              value={newTransfer.note}
              onChange={(e) => setNewTransfer({ ...newTransfer, note: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="مثال: سداد فاتورة الفيزا"
            />
          </div>
        </div>

        <button
          onClick={handleAddTransfer}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
        >
          <ArrowRightLeft className="w-5 h-5" />
          تنفيذ التحويل
        </button>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>💡 نصائح:</strong>
            <br />• لسداد الكريدت كارد: اختار حساب بنكي في "من" والكريدت كارد في "إلى"
            <br />• للسحب نقدي: اختار حساب بنكي في "من" والمحفظة النقدية في "إلى"
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">سجل التحويلات</h3>
        
        {sortedTransfers.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <ArrowRightLeft className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">لا توجد تحويلات. قم بإضافة تحويل جديد!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTransfers.map(transfer => {
              const fromAccount = accounts.find(a => a.id === transfer.fromAccountId);
              const toAccount = accounts.find(a => a.id === transfer.toAccountId);
              
              return (
                <div
                  key={transfer.id}
                  className="border-2 border-blue-200 rounded-xl p-4 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {fromAccount?.isCredit ? (
                              <CreditCard className="w-4 h-4 text-red-600" />
                            ) : (
                              <Wallet className="w-4 h-4 text-green-600" />
                            )}
                            <span className="font-semibold text-gray-800">
                              {fromAccount?.name || 'حساب محذوف'}
                            </span>
                          </div>
                          
                          <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                          
                          <div className="flex items-center gap-2">
                            {toAccount?.isCredit ? (
                              <CreditCard className="w-4 h-4 text-red-600" />
                            ) : (
                              <Wallet className="w-4 h-4 text-green-600" />
                            )}
                            <span className="font-semibold text-gray-800">
                              {toAccount?.name || 'حساب محذوف'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{transfer.date}</span>
                          {transfer.note && (
                            <>
                              <span>•</span>
                              <span>{transfer.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-blue-600 text-lg">
                        {transfer.amount?.toLocaleString()} ج.م
                      </span>
                      <button
                        onClick={() => handleDeleteTransfer(transfer)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
