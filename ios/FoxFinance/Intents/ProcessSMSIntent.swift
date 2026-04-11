import AppIntents
import Foundation

// MARK: - Process SMS App Intent
// This intent is exposed to iOS Shortcuts, allowing automation:
// When SMS arrives from a bank → Run Shortcut → Call this intent with the SMS body

struct ProcessSMSIntent: AppIntent {
    static var title: LocalizedStringResource = "معالجة رسالة بنكية"
    static var description = IntentDescription("يحلل رسالة SMS بنكية ويسجل العملية تلقائياً في Fox Finance")

    @Parameter(title: "نص الرسالة", description: "محتوى رسالة الـ SMS")
    var smsBody: String

    @Parameter(title: "اسم المرسل", description: "اسم مرسل الرسالة (مثل Bank-AlAhly)")
    var smsSender: String

    static var parameterSummary: some ParameterSummary {
        Summary("معالجة رسالة من \(\.$smsSender): \(\.$smsBody)")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        let service = FirebaseService.shared

        // Check if user is authenticated
        guard service.currentUserId != nil else {
            return .result(value: "⚠️ يجب تسجيل الدخول في Fox Finance أولاً")
        }

        do {
            if let (transaction, account) = try await service.processAndSaveSMS(body: smsBody, sender: smsSender) {
                let typeLabel = transaction.type == .income ? "إيداع" : "خصم"
                let accountLabel = account?.name ?? "غير محدد"
                let message = "✅ تم تسجيل \(typeLabel) \(transaction.amount.egp) - \(transaction.name) ← \(accountLabel)"
                return .result(value: message)
            } else {
                return .result(value: "⚠️ لم يتم التعرف على نمط الرسالة من \(smsSender)")
            }
        } catch {
            return .result(value: "❌ خطأ: \(error.localizedDescription)")
        }
    }
}

// MARK: - App Shortcuts Provider
struct FoxFinanceShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ProcessSMSIntent(),
            phrases: [
                "سجل عملية بنكية في \(.applicationName)",
                "Process bank SMS in \(.applicationName)",
                "تحليل رسالة بنكية في \(.applicationName)"
            ],
            shortTitle: "معالجة رسالة بنكية",
            systemImageName: "message.badge.filled.fill"
        )
    }
}

// MARK: - Quick Paste SMS Intent (for manual paste flow)
struct PasteSMSIntent: AppIntent {
    static var title: LocalizedStringResource = "لصق رسالة بنكية"
    static var description = IntentDescription("يلصق رسالة بنكية من الحافظة ويحللها")

    @Parameter(title: "نص الرسالة")
    var smsBody: String

    @Parameter(title: "اسم المرسل")
    var smsSender: String

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        // Reuse the same logic
        let intent = ProcessSMSIntent()
        intent.smsBody = smsBody
        intent.smsSender = smsSender
        return try await intent.perform()
    }
}
