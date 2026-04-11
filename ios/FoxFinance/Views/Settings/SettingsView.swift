import SwiftUI

struct SettingsView: View {
    @ObservedObject var authService: AuthService
    @State private var newName = ""
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var showChangePassword = false
    @State private var showResetData = false
    @State private var isUpdating = false
    @State private var successMessage: String?
    @State private var showShortcutsGuide = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Profile header
                profileSection

                // Shortcuts guide
                shortcutsSection

                // Change name
                nameSection

                // Change password
                passwordSection

                // Reset data
                resetSection

                // Sign out
                signOutSection

                // App info
                appInfoSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Color.foxBg)
        .onAppear {
            newName = authService.displayName
        }
        .sheet(isPresented: $showShortcutsGuide) {
            ShortcutsGuideView()
        }
    }

    // MARK: - Profile
    private var profileSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(.foxGreen)

            Text(authService.displayName)
                .font(.title3.weight(.bold))

            Text(authService.currentUser?.email ?? "")
                .font(.subheadline)
                .foregroundStyle(.foxTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }

    // MARK: - Shortcuts Setup
    private var shortcutsSection: some View {
        Button { showShortcutsGuide = true } label: {
            HStack(spacing: 14) {
                Image(systemName: "shortcuts")
                    .font(.title2)
                    .foregroundStyle(.foxGreen)
                    .frame(width: 44, height: 44)
                    .background(Color.foxGreen.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    Text("إعداد الأتمتة عبر Shortcuts")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.foxTextPrimary)
                    Text("اضغط هنا لمعرفة كيفية ربط رسائل SMS البنكية تلقائياً")
                        .font(.caption)
                        .foregroundStyle(.foxTextSecondary)
                }

                Spacer()

                Image(systemName: "chevron.left")
                    .foregroundStyle(.foxTextLight)
            }
            .padding(16)
            .background(Color.foxCard)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
        }
    }

    // MARK: - Name
    private var nameSection: some View {
        settingsCard(title: "تغيير الاسم", icon: "person.text.rectangle") {
            VStack(spacing: 12) {
                TextField("الاسم الجديد", text: $newName)
                    .padding()
                    .background(Color.gray.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                Button {
                    Task {
                        isUpdating = true
                        await authService.updateDisplayName(newName)
                        isUpdating = false
                        successMessage = "تم تحديث الاسم"
                    }
                } label: {
                    HStack {
                        if isUpdating { ProgressView().tint(.white) }
                        else { Text("تحديث").fontWeight(.medium) }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.foxGreen)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(newName.isEmpty || isUpdating)
            }
        }
    }

    // MARK: - Password
    private var passwordSection: some View {
        settingsCard(title: "تغيير كلمة المرور", icon: "lock.rotation") {
            VStack(spacing: 12) {
                SecureField("كلمة المرور الحالية", text: $currentPassword)
                    .padding()
                    .background(Color.gray.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                SecureField("كلمة المرور الجديدة", text: $newPassword)
                    .padding()
                    .background(Color.gray.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                if let error = authService.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.foxRed)
                }
                if let success = successMessage {
                    Text(success)
                        .font(.caption)
                        .foregroundStyle(.foxGreen)
                }

                Button {
                    Task {
                        let success = await authService.changePassword(
                            currentPassword: currentPassword,
                            newPassword: newPassword
                        )
                        if success {
                            successMessage = "تم تغيير كلمة المرور"
                            currentPassword = ""
                            newPassword = ""
                        }
                    }
                } label: {
                    Text("تغيير كلمة المرور")
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.foxBlue)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(currentPassword.isEmpty || newPassword.isEmpty)
            }
        }
    }

    // MARK: - Reset
    private var resetSection: some View {
        settingsCard(title: "إعادة تعيين البيانات", icon: "exclamationmark.triangle") {
            Text("هذا الإجراء لا يمكن التراجع عنه!")
                .font(.caption)
                .foregroundStyle(.foxRed)

            Button {
                showResetData = true
            } label: {
                Text("إعادة تعيين")
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.foxRed.opacity(0.1))
                    .foregroundStyle(.foxRed)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .alert("تأكيد إعادة التعيين", isPresented: $showResetData) {
                Button("إعادة تعيين", role: .destructive) {
                    // TODO: Implement reset
                }
                Button("إلغاء", role: .cancel) {}
            } message: {
                Text("سيتم حذف جميع البيانات نهائياً")
            }
        }
    }

    // MARK: - Sign Out
    private var signOutSection: some View {
        Button {
            authService.signOut()
        } label: {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("تسجيل الخروج")
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.foxRed)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    // MARK: - App Info
    private var appInfoSection: some View {
        VStack(spacing: 4) {
            Text("Fox Finance")
                .font(.caption.weight(.medium))
                .foregroundStyle(.foxTextSecondary)
            Text("الإصدار 1.0.0")
                .font(.caption2)
                .foregroundStyle(.foxTextLight)
        }
        .padding(.top, 8)
    }

    // MARK: - Settings Card Helper
    private func settingsCard<Content: View>(title: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .foregroundStyle(.foxGreen)
                Text(title)
                    .font(.subheadline.weight(.semibold))
            }
            content()
        }
        .padding(16)
        .background(Color.foxCard)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }
}

// MARK: - Shortcuts Guide
struct ShortcutsGuideView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Intro
                    VStack(spacing: 12) {
                        Image(systemName: "shortcuts")
                            .font(.system(size: 50))
                            .foregroundStyle(.foxGreen)
                        Text("ربط SMS تلقائياً")
                            .font(.title2.weight(.bold))
                        Text("اتبع الخطوات التالية لربط رسائل البنك تلقائياً مع Fox Finance")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)

                    // Steps
                    stepCard(
                        number: 1,
                        title: "افتح تطبيق Shortcuts",
                        description: "اذهب إلى تبويب Automation (الأتمتة) في أسفل الشاشة"
                    )

                    stepCard(
                        number: 2,
                        title: "أنشئ أتمتة جديدة",
                        description: "اضغط + ثم اختر \"Personal Automation\" ثم \"Message\""
                    )

                    stepCard(
                        number: 3,
                        title: "حدد المرسل",
                        description: "في حقل \"Sender\" اكتب اسم مرسل البنك (مثل Bank-AlAhly) واختر \"Contains\""
                    )

                    stepCard(
                        number: 4,
                        title: "أضف الإجراء",
                        description: "ابحث عن \"Fox Finance\" أو \"معالجة رسالة بنكية\" واختره. حدد نص الرسالة كـ SMS Body واسم المرسل كـ Sender"
                    )

                    stepCard(
                        number: 5,
                        title: "فعّل التشغيل التلقائي",
                        description: "أوقف خيار \"Ask Before Running\" ليتم التسجيل تلقائياً بدون تدخل منك"
                    )

                    stepCard(
                        number: 6,
                        title: "كرر لكل بنك",
                        description: "أنشئ أتمتة منفصلة لكل بنك (Bank-AlAhly, Bank NXT, ArabBank, VF-Cash)"
                    )

                    // Important notes
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundStyle(.foxAmber)
                            Text("ملاحظات مهمة")
                                .font(.subheadline.weight(.semibold))
                        }
                        Text("• تأكد من إضافة حساباتك في التطبيق أولاً مع رقم آخر 4 أرقام للبطاقة")
                            .font(.caption)
                        Text("• اضبط معرّف SMS المرسل في كل حساب (مثل Bank-AlAhly)")
                            .font(.caption)
                        Text("• الأتمتة تعمل فقط عندما يكون الجهاز مفتوحاً (غير مقفل)")
                            .font(.caption)
                    }
                    .foregroundStyle(.foxTextSecondary)
                    .padding(16)
                    .background(Color.foxAmber.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(20)
            }
            .background(Color.foxBg)
            .navigationTitle("دليل الإعداد")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func stepCard(number: Int, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Text("\(number)")
                .font(.headline)
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(Color.foxGreen)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.foxTextSecondary)
            }
        }
    }
}
