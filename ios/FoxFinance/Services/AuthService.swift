import Foundation
import FirebaseAuth
import FirebaseFirestore

// MARK: - Auth Service
@MainActor
class AuthService: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var errorMessage: String?
    @Published var displayName: String = ""

    private var authStateListener: AuthStateDidChangeListenerHandle?

    init() {
        listenToAuthState()
    }

    deinit {
        if let listener = authStateListener {
            Auth.auth().removeStateDidChangeListener(listener)
        }
    }

    private func listenToAuthState() {
        authStateListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.currentUser = user
                self?.isAuthenticated = user != nil
                self?.displayName = user?.displayName ?? user?.email ?? ""
                self?.isLoading = false
            }
        }
    }

    // MARK: - Sign In
    func signIn(email: String, password: String) async {
        errorMessage = nil
        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            currentUser = result.user
            isAuthenticated = true
            displayName = result.user.displayName ?? result.user.email ?? ""
        } catch {
            errorMessage = mapAuthError(error)
        }
    }

    // MARK: - Sign Up
    func signUp(email: String, password: String, name: String) async {
        errorMessage = nil
        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)

            // Update display name
            let changeRequest = result.user.createProfileChangeRequest()
            changeRequest.displayName = name
            try await changeRequest.commitChanges()

            currentUser = Auth.auth().currentUser
            displayName = name
            isAuthenticated = true

            // Create default categories
            try await FirebaseService.shared.createDefaultCategories(userId: result.user.uid)
        } catch {
            errorMessage = mapAuthError(error)
        }
    }

    // MARK: - Sign Out
    func signOut() {
        do {
            try Auth.auth().signOut()
            currentUser = nil
            isAuthenticated = false
            displayName = ""
        } catch {
            errorMessage = "حدث خطأ أثناء تسجيل الخروج"
        }
    }

    // MARK: - Update Profile
    func updateDisplayName(_ name: String) async {
        guard let user = Auth.auth().currentUser else { return }
        let changeRequest = user.createProfileChangeRequest()
        changeRequest.displayName = name
        do {
            try await changeRequest.commitChanges()
            displayName = name
        } catch {
            errorMessage = "خطأ في تحديث الاسم"
        }
    }

    func changePassword(currentPassword: String, newPassword: String) async -> Bool {
        guard let user = Auth.auth().currentUser, let email = user.email else {
            errorMessage = "لا يوجد مستخدم مسجل"
            return false
        }
        do {
            // Re-authenticate
            let credential = EmailAuthProvider.credential(withEmail: email, password: currentPassword)
            try await user.reauthenticate(with: credential)
            try await user.updatePassword(to: newPassword)
            return true
        } catch {
            errorMessage = mapAuthError(error)
            return false
        }
    }

    // MARK: - Error Mapping
    private func mapAuthError(_ error: Error) -> String {
        let code = (error as NSError).code
        switch code {
        case AuthErrorCode.wrongPassword.rawValue:
            return "كلمة المرور غير صحيحة"
        case AuthErrorCode.invalidEmail.rawValue:
            return "البريد الإلكتروني غير صالح"
        case AuthErrorCode.userNotFound.rawValue:
            return "لا يوجد حساب بهذا البريد"
        case AuthErrorCode.emailAlreadyInUse.rawValue:
            return "البريد الإلكتروني مسجل مسبقاً"
        case AuthErrorCode.weakPassword.rawValue:
            return "كلمة المرور ضعيفة (6 أحرف على الأقل)"
        case AuthErrorCode.networkError.rawValue:
            return "خطأ في الاتصال بالإنترنت"
        default:
            return "حدث خطأ: \(error.localizedDescription)"
        }
    }
}
