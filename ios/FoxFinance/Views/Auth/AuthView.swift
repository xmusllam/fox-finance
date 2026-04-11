import SwiftUI

struct AuthView: View {
    @ObservedObject var authService: AuthService
    @State private var isLogin = true
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var isLoading = false

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [.foxGreen, .foxGreenDark, Color(red: 6/255, green: 95/255, blue: 70/255)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    Spacer().frame(height: 60)

                    // Logo
                    VStack(spacing: 12) {
                        Image(systemName: "dollarsign.circle.fill")
                            .font(.system(size: 72))
                            .foregroundStyle(.white)

                        Text("Fox Finance")
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)

                        Text("إدارة الحياة المالية")
                            .font(.title3)
                            .foregroundStyle(.white.opacity(0.85))
                    }

                    // Form Card
                    VStack(spacing: 20) {
                        // Toggle
                        HStack(spacing: 0) {
                            toggleButton("تسجيل الدخول", isSelected: isLogin) {
                                withAnimation { isLogin = true }
                            }
                            toggleButton("حساب جديد", isSelected: !isLogin) {
                                withAnimation { isLogin = false }
                            }
                        }
                        .background(Color.gray.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                        // Name field (signup only)
                        if !isLogin {
                            HStack(spacing: 12) {
                                Image(systemName: "person")
                                    .foregroundStyle(.foxTextSecondary)
                                    .frame(width: 24)
                                TextField("الاسم", text: $name)
                                    .textContentType(.name)
                            }
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        // Email field
                        HStack(spacing: 12) {
                            Image(systemName: "envelope")
                                .foregroundStyle(.foxTextSecondary)
                                .frame(width: 24)
                            TextField("البريد الإلكتروني", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                        // Password field
                        HStack(spacing: 12) {
                            Image(systemName: "lock")
                                .foregroundStyle(.foxTextSecondary)
                                .frame(width: 24)
                            SecureField("كلمة المرور", text: $password)
                                .textContentType(isLogin ? .password : .newPassword)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                        // Error message
                        if let error = authService.errorMessage {
                            Text(error)
                                .font(.callout)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }

                        // Submit button
                        Button {
                            Task { await submit() }
                        } label: {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text(isLogin ? "دخول" : "إنشاء حساب")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(LinearGradient.foxPrimary)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty || (!isLogin && name.isEmpty))
                        .opacity(isLoading || email.isEmpty || password.isEmpty ? 0.6 : 1)
                    }
                    .padding(24)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 24))
                    .shadow(color: .black.opacity(0.1), radius: 20, y: 10)
                    .padding(.horizontal, 20)

                    Spacer()
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func toggleButton(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(isSelected ? Color.foxGreen : .clear)
                .foregroundStyle(isSelected ? .white : .foxTextSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func submit() async {
        isLoading = true
        defer { isLoading = false }

        if isLogin {
            await authService.signIn(email: email, password: password)
        } else {
            await authService.signUp(email: email, password: password, name: name)
        }
    }
}
