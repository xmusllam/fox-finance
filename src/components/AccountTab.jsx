import React, { useState } from 'react';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db, storage } from '../firebase';
import { User, Lock, Image, Trash2, AlertTriangle, LogOut, Settings, Eye, EyeOff, ArrowUp, ArrowDown, Plus, Edit2, X, Check, Home as HomeIcon, Wallet, ArrowRightLeft, Minus } from 'lucide-react';

export default function AccountTab({ user, userSettings, updateUserSettings }) {
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

  // إعدادات التطبيق
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(userSettings);
  const [showFilterManager, setShowFilterManager] = useState(false);
  const [newFilterId, setNewFilterId] = useState('');
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [editingFilter, setEditingFilter] = useState(null);
  const [editFilterData, setEditFilterData] = useState({ id: '', label: '' });

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

  // إدارة إعدادات التطبيق
  const handleSaveAppSettings = async () => {
    await updateUserSettings(localSettings);
    showMessage('success', 'تم حفظ إعدادات التطبيق بنجاح! ✅');
    setShowAppSettings(false);
  };

  const handleAddFilter = () => {
    if (!newFilterId || !newFilterLabel) {
      showMessage('error', 'يرجى ملء جميع الحقول');
      return;
    }

    if (localSettings.dateFilters.some(f => f.id === newFilterId)) {
      showMessage('error', 'هذا المعرف مستخدم بالفعل');
      return;
    }

    setLocalSettings({
      ...localSettings,
      dateFilters: [...localSettings.dateFilters, { id: newFilterId, label: newFilterLabel }]
    });

    setNewFilterId('');
    setNewFilterLabel('');
    showMessage('success', 'تم إضافة الفلتر بنجاح! ✅');
  };

  const handleMoveFilterUp = (index) => {
    if (index === 0) return;
    const newFilters = [...localSettings.dateFilters];
    [newFilters[index], newFilters[index - 1]] = [newFilters[index - 1], newFilters[index]];
    setLocalSettings({ ...localSettings, dateFilters: newFilters });
  };

  const handleMoveFilterDown = (index) => {
    if (index === localSettings.dateFilters.length - 1) return;
    const newFilters = [...localSettings.dateFilters];
    [newFilters[index], newFilters[index + 1]] = [newFilters[index + 1], newFilters[index]];
    setLocalSettings({ ...localSettings, dateFilters: newFilters });
  };

  const handleEditFilter = (filter) => {
    setEditingFilter(filter.id);
    setEditFilterData({ id: filter.id, label: filter.label });
  };

  const handleSaveFilterEdit = (oldId) => {
    if (!editFilterData.id || !editFilterData.label) {
      showMessage('error', 'يرجى ملء جميع الحقول');
      return;
    }

    if (editFilterData.id !== oldId && localSettings.dateFilters.some(f => f.id === editFilterData.id)) {
      showMessage('error', 'هذا المعرف مستخدم بالفعل');
      return;
    }

    const newFilters = localSettings.dateFilters.map(f => 
      f.id === oldId ? { id: editFilterData.id, label: editFilterData.label } : f
    );
    
    setLocalSettings({ ...localSettings, dateFilters: newFilters });
    setEditingFilter(null);
    showMessage('success', 'تم تعديل الفلتر بنجاح! ✅');
  };

  const handleDeleteFilter = (filterId) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفلتر؟')) return;
    
    const newFilters = localSettings.dateFilters.filter(f => f.id !== filterId);
    setLocalSettings({ ...localSettings, dateFilters: newFilters });
    showMessage('success', 'تم حذف الفلتر بنجاح! ✅');
  };

  const pageOptions = [
    { id: 'dashboard', label: 'الرئيسية', icon: HomeIcon },
    { id: 'income', label: 'الدخل', icon: Plus },
    { id: 'expenses', label: 'المصروفات', icon: Minus },
    { id: 'accounts', label: 'الحسابات', icon: Wallet },
    { id: 'transfers', label: 'التحويلات', icon: ArrowRightLeft }
  ];
  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border-2 border-green-200' : 'bg-red-50 text-red-700 border-2 border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* إعدادات التطبيق */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            إعدادات التطبيق
          </h3>
          <button
            onClick={() => setShowAppSettings(!showAppSettings)}
            className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-semibold"
          >
            {showAppSettings ? 'إخفاء' : 'عرض'} الإعدادات
          </button>
        </div>

        {showAppSettings && (
          <div className="space-y-6">
            {/* الصفحة الافتراضية */}
            <div className="p-6 bg-emerald-50 rounded-xl border-2 border-emerald-200">
              <h4 className="font-bold text-emerald-800 mb-4 text-lg">الصفحة الافتراضية عند فتح التطبيق</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {pageOptions.map(page => (
                  <button
                    key={page.id}
                    onClick={() => setLocalSettings({ ...localSettings, defaultPage: page.id })}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      localSettings.defaultPage === page.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    <page.icon className="w-6 h-6" />
                    <span className="text-sm font-semibold">{page.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* إدارة فلاتر الفترة */}
            <div className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-blue-800 text-lg">إدارة فلاتر الفترة</h4>
                <button
                  onClick={() => setShowFilterManager(!showFilterManager)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                >
                  {showFilterManager ? 'إخفاء' : 'إدارة'} الفلاتر
                </button>
              </div>

              {showFilterManager && (
                <div className="space-y-4">
                  {/* إضافة فلتر جديد */}
                  <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
                    <h5 className="font-semibold text-gray-800 mb-3">إضافة فلتر جديد</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={newFilterId}
                        onChange={(e) => setNewFilterId(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="معرف الفلتر (مثال: last-7-days)"
                      />
                      <input
                        type="text"
                        value={newFilterLabel}
                        onChange={(e) => setNewFilterLabel(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="اسم الفلتر (مثال: آخر 7 أيام)"
                      />
                      <button
                        onClick={handleAddFilter}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة
                      </button>
                    </div>
                  </div>

                  {/* قائمة الفلاتر */}
                  <div className="space-y-2">
                    {localSettings.dateFilters.map((filter, idx) => (
                      <div key={filter.id} className="bg-white p-3 rounded-lg border-2 border-blue-300 flex items-center gap-2">
                        {editingFilter === filter.id ? (
                          <>
                            <input
                              type="text"
                              value={editFilterData.id}
                              onChange={(e) => setEditFilterData({ ...editFilterData, id: e.target.value })}
                              className="flex-1 px-2 py-1 border border-blue-400 rounded"
                              placeholder="المعرف"
                            />
                            <input
                              type="text"
                              value={editFilterData.label}
                              onChange={(e) => setEditFilterData({ ...editFilterData, label: e.target.value })}
                              className="flex-1 px-2 py-1 border border-blue-400 rounded"
                              placeholder="الاسم"
                            />
                            <button
                              onClick={() => handleSaveFilterEdit(filter.id)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingFilter(null)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1">
                              <span className="font-semibold text-gray-800">{filter.label}</span>
                              <span className="text-xs text-gray-500 mr-2">({filter.id})</span>
                            </div>
                            <button
                              onClick={() => handleMoveFilterUp(idx)}
                              disabled={idx === 0}
                              className={`${idx === 0 ? 'text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveFilterDown(idx)}
                              disabled={idx === localSettings.dateFilters.length - 1}
                              className={`${idx === localSettings.dateFilters.length - 1 ? 'text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditFilter(filter)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFilter(filter.id)}
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
              )}
            </div>

            {/* زر حفظ الإعدادات */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveAppSettings}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold"
              >
                حفظ إعدادات التطبيق
              </button>
              <button
                onClick={() => {
                  setLocalSettings(userSettings);
                  setShowAppSettings(false);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

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
