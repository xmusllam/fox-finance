import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Wallet } from 'lucide-react';

export default function Auth() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleSignUp = async () => {
    if (!email || !password) {
      setAuthError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    
    setAuthError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const defaultIncomeCategories = ['راتب', 'أرباح', 'استثمار', 'هدية', 'أخرى'];
      const defaultExpenseCategories = ['إيجار', 'فواتير', 'أقساط', 'طعام', 'مواصلات', 'ترفيه', 'صحة', 'مصروفات عامة'];
      
      await addDoc(collection(db, 'categories'), {
        userId: userCredential.user.uid,
        type: 'income',
        categories: defaultIncomeCategories
      });
      
      await addDoc(collection(db, 'categories'), {
        userId: userCredential.user.uid,
        type: 'expense',
        categories: defaultExpenseCategories
      });
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('هذا البريد الإلكتروني مستخدم بالفعل');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('كلمة المرور ضعيفة. يجب أن تكون 6 أحرف على الأقل');
      } else {
        setAuthError('فشل إنشاء الحساب');
      }
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setAuthError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      authMode === 'login' ? handleSignIn() : handleSignUp();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Wallet className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Fox Finance</h1>
          <p className="text-gray-600">إدارة حياتك المالية بذكاء 🦊</p>
        </div>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setAuthMode('login');
              setAuthError('');
            }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              authMode === 'login'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => {
              setAuthMode('signup');
              setAuthError('');
            }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              authMode === 'signup'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            حساب جديد
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              placeholder="example@email.com"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-semibold mb-2">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              placeholder="••••••••"
            />
            {authMode === 'signup' && (
              <p className="text-xs text-gray-500 mt-1">يجب أن تكون 6 أحرف على الأقل</p>
            )}
          </div>
          
          {authError && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {authError}
            </div>
          )}
          
          <button
            onClick={authMode === 'login' ? handleSignIn : handleSignUp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg"
          >
            {authMode === 'login' ? '🔓 دخول' : '✨ إنشاء حساب'}
          </button>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>بياناتك آمنة ومحمية 🔒</p>
        </div>
      </div>
    </div>
  );
}