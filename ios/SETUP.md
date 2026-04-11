# Fox Finance iOS - دليل الإعداد

## المتطلبات
- macOS 14+ (Sonoma)
- Xcode 15.0+
- iOS 17.0+ (للجهاز أو المحاكي)
- حساب Apple Developer (مجاني للاختبار على جهازك، مدفوع للنشر على App Store)

## خطوات الإعداد

### 1. إنشاء مشروع Xcode

1. افتح Xcode
2. اختر **File → New → Project**
3. اختر **iOS → App**
4. املأ البيانات:
   - **Product Name**: `FoxFinance`
   - **Organization Identifier**: `com.foxfinance` (أو ما تريد)
   - **Interface**: SwiftUI
   - **Language**: Swift
5. اختر مكان الحفظ (مؤقتاً)
6. **احذف** الملفات المولّدة تلقائياً (`ContentView.swift`, `FoxFinanceApp.swift`, `Assets.xcassets`)
7. **اسحب** كل ملفات `ios/FoxFinance/` إلى المشروع في Xcode
   - تأكد من تفعيل "Copy items if needed"
   - تأكد من إضافتها للـ Target

### 2. إضافة Firebase SDK

1. في Xcode: **File → Add Package Dependencies**
2. أدخل الرابط: `https://github.com/firebase/firebase-ios-sdk`
3. اختر الإصدار الأخير
4. أضف هذه المكتبات:
   - `FirebaseAuth`
   - `FirebaseFirestore`
   - `FirebaseStorage`

### 3. إعداد Firebase

1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. افتح مشروع `foxfinance-2a489`
3. أضف تطبيق iOS جديد:
   - **Bundle ID**: نفس الـ Organization Identifier + `.FoxFinance`
4. حمّل ملف `GoogleService-Info.plist`
5. اسحبه إلى مشروع Xcode (في مجلد FoxFinance الرئيسي)

### 4. إعدادات المشروع

في Xcode → Target → General:
- **Minimum Deployments**: iOS 17.0
- **Display Name**: Fox Finance
- **Bundle Identifier**: تأكد أنه يطابق Firebase

في Target → Signing:
- اختر حساب Apple Developer
- فعّل **Automatically manage signing**

### 5. التشغيل على جهازك

1. وصّل جهاز الآيفون عبر USB
2. في Xcode اختر جهازك كـ Run Destination
3. أول مرة: ثق بالمطور من الإعدادات:
   - **الإعدادات → عام → VPN وإدارة الأجهزة → Developer App → ثق**
4. اضغط ▶️ Run

---

## إعداد أتمتة SMS عبر Shortcuts

بعد تثبيت التطبيق وتسجيل الدخول:

### لكل بنك تريد ربطه:

1. افتح تطبيق **Shortcuts** (الاختصارات)
2. اذهب إلى تبويب **Automation** (الأتمتة)
3. اضغط **+** → **Personal Automation**
4. اختر **Message**
5. في **Sender**: اكتب اسم المرسل (مثل `Bank-AlAhly`)
6. اختر **Contains** وتابع
7. اضغط **New Blank Automation**
8. ابحث عن **Fox Finance** أو **معالجة رسالة بنكية**
9. حدد:
   - **نص الرسالة** = Shortcut Input (Message Body)
   - **اسم المرسل** = اكتب اسم المرسل يدوياً (مثل `Bank-AlAhly`)
10. **أوقف** خيار "Ask Before Running"
11. اضغط **Done**

### البنوك المدعومة حالياً:

| البنك | معرّف المرسل |
|-------|-------------|
| البنك الأهلي المصري | `Bank-AlAhly` |
| بنك نكست | `Bank NXT` |
| البنك العربي | `ArabBank` |
| فودافون كاش | `VF-Cash` |

### إضافة بنك جديد:
1. اذهب إلى تبويب **SMS** في التطبيق
2. اضغط **إضافة بنك**
3. أدخل اسم البنك ومعرّف المرسل
4. أضف قواعد التحليل (كلمات مفتاحية)
5. اختبر بلصق رسالة SMS حقيقية
6. احفظ

---

## ملاحظات مهمة

### ربط الحسابات:
- عند إضافة حساب جديد في التطبيق، أدخل:
  - **آخر 4 أرقام للبطاقة**: ليتعرف التطبيق على البطاقة من الرسالة
  - **معرّف المرسل**: لربط الرسائل بالحساب الصحيح
- مثال: بطاقة أهلي ديبت (آخر 4: `3600`, مرسل: `Bank-AlAhly`)
- مثال: بطاقة أهلي كريدت (آخر 4: `3717`, مرسل: `Bank-AlAhly`)

### التقسيط:
- أضف تقسيط من صفحة الحسابات → بطاقة الائتمان → "إضافة تقسيط"
- التقسيط يخصم من الحد الائتماني المتاح
- عند سداد قسط، يعود مبلغ القسط للحد الائتماني

### النشر على App Store لاحقاً:
1. اشترك في Apple Developer Program ($99/سنة)
2. أنشئ App ID و Provisioning Profile
3. في Xcode: Product → Archive
4. وزّع عبر App Store Connect
5. أضف أيقونة 1024x1024 في Assets.xcassets/AppIcon

---

## هيكل المشروع

```
FoxFinance/
├── FoxFinanceApp.swift          # نقطة دخول التطبيق
├── ContentView.swift            # الشاشة الرئيسية + Tab Bar
├── Models/                      # نماذج البيانات
│   ├── Account.swift            # الحسابات البنكية
│   ├── Transaction.swift        # المعاملات (إيراد/مصروف)
│   ├── Category.swift           # الفئات
│   ├── Installment.swift        # الأقساط
│   ├── BankTemplate.swift       # قوالب البنوك
│   └── Transfer.swift           # التحويلات
├── Services/                    # خدمات الخلفية
│   ├── FirebaseService.swift    # قاعدة البيانات
│   ├── AuthService.swift        # المصادقة
│   └── SMSParserService.swift   # محلل الرسائل
├── Intents/                     # تكامل Shortcuts
│   └── ProcessSMSIntent.swift   # معالجة SMS تلقائياً
├── ViewModels/                  # منطق العرض
├── Views/                       # واجهات المستخدم
│   ├── Auth/                    # تسجيل الدخول
│   ├── Dashboard/               # لوحة التحكم
│   ├── Transactions/            # الإيرادات والمصروفات
│   ├── Accounts/                # الحسابات والأقساط
│   ├── Transfers/               # التحويلات
│   ├── SMS/                     # استيراد SMS
│   └── Settings/                # الإعدادات
├── Components/                  # مكونات مشتركة
├── Extensions/                  # إضافات Swift
└── Resources/                   # الأصول والأيقونات
```
