import React, { useState } from 'react';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db, storage } from '../firebase';
import { User, Lock, Image, Trash2, AlertTriangle, LogOut } from 'lucide-react';

export default function AccountTab({ user }) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    incomes: false,
    expenses: false,
    accounts: false,
    categories: false
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSignOut = async () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      await signOut(auth);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await updateProfile(auth.currentUser, { displayName });
      showMessage('success', 'تم تحديث الاسم بنجاح! ✅');
    } catch (error) {
      showMessage('error', 'فشل تحديث الاسم. حاول مرة أخرى.');
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      showMessage('error', 'كلمتا المرور غير متطابقتين!');
      return;
    }

    if (newPassword.length < 6) {
      showMessage('error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showMessage('success', 'تم تغيير كلمة المرور بنجاح! ✅');
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        showMessage('error', 'كلمة المرور الحالية غير صحيحة!');
      } else {
        showMessage('error', 'فشل تغيير كلمة المرور. حاول مرة أخرى.');
      }
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) {
      showMessage('error', 'الرجاء اختيار صورة أولاً');
      return;
    }

    try {
      const storageRef = ref(storage, `profile-photos/${user.uid}`);
      await uploadBytes(storageRef, photoFile);
      const photoURL = await getDownloadURL(storageRef);
      
      await updateProfile(auth.currentUser, { photoURL });
      showMessage('success', 'تم تحديث الصورة الشخصية بنجاح! ✅');
      setPhotoFile(null);
    } catch (error) {
      showMessage('error', 'فشل رفع الصورة. حاول مرة أخرى.');
    }
  };

  const handleResetData = async () => {
    if (!Object.values(resetOptions).some(v => v)) {
      showMessage('error', 'يرجى اختيار عنصر واحد على الأقل للحذف');
      return;
    }

    if (!confirm('⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه! هل أنت متأكد؟')) {
      return;
    }

    try {
      if (resetOptions.incomes) {
        const q = query(collection(db, 'incomes'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'incomes', d.id))));
      }

      if (resetOptions.expenses) {
        const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'expenses', d.id))));
      }

      if (resetOptions.accounts) {
        const q = query(collection(db, 'accounts'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'accounts', d.id))));
      }

      if (resetOptions.categories) {
        const q = query(collection(db, 'categories'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'categories', d.id))));
      }

      setResetOptions({ incomes: false, expenses: false, accounts: false, categories: false });
      setShowResetDialog(false);
      showMessage('success', 'تم حذف البيانات المحددة بنجاح! ✅');
    } catch (error) {
      showMessage('error', 'فشل حذف البيانات. حاول مرة أخرى.');
    }
  };

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border-2 border-green-200' : 'bg-red-50 text-red-700 border-2 border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <User className="w-6 h-6" />
          تعديل الاسم الظاهر
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-gray-700 font-semibold mb-2">الاسم</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="أدخل اسمك"
            />
          </div>
          <button
            onClick={handleUpdateProfile}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            تحديث الاسم
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Lock className="w-6 h-6" />
          تغيير كلمة المرور
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">كلمة المرور الحالية</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button
          onClick={handleUpdatePassword}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
        >
          تغيير كلمة المرور
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Image className="w-6 h-6" />
          الصورة الشخصية
        </h3>
        <div className="flex items-center gap-6">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-emerald-200"
            />
          )}
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files[0])}
              className="mb-4"
            />
            <button
              onClick={handlePhotoUpload}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              رفع الصورة
            </button>
          </div>
        </div>
      </div>

      <div className="bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-red-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          منطقة الخطر
        </h3>
        <p className="text-red-700 mb-4">حذف البيانات لا يمكن التراجع عنه!</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowResetDialog(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            حذف البيانات
          </button>
          <button
            onClick={handleSignOut}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </div>

      {showResetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">اختر البيانات المراد حذفها</h3>
            <div className="space-y-3 mb-6">
              {[
                { key: 'incomes', label: 'الدخل' },
                { key: 'expenses', label: 'المصروفات' },
                { key: 'accounts', label: 'الحسابات' },
                { key: 'categories', label: 'الفئات' }
              ].map(option => (
                <label key={option.key} className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetOptions[option.key]}
                    onChange={(e) => setResetOptions({ ...resetOptions, [option.key]: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="font-semibold">{option.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleResetData}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setShowResetDialog(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
