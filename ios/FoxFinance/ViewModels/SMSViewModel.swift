import Foundation

@MainActor
class SMSViewModel: ObservableObject {
    @Published var smsText: String = ""
    @Published var senderName: String = ""
    @Published var parseResult: SMSParseResult?
    @Published var matchedAccount: Account?
    @Published var isSaving = false
    @Published var savedMessage: String?
    @Published var errorMessage: String?
    @Published var customTemplates: [BankTemplate] = []
    @Published var accounts: [Account] = []

    private let firebase = FirebaseService.shared
    private let parser = SMSParserService.shared

    var allTemplates: [BankTemplate] {
        SMSParserService.builtInTemplates + customTemplates
    }

    var availableSenders: [String] {
        allTemplates.map { $0.smsSender }
    }

    func loadData() async {
        do {
            async let templates = firebase.fetchCustomBankTemplates()
            async let accs = firebase.fetchAccounts()
            self.customTemplates = try await templates
            self.accounts = try await accs
        } catch {
            errorMessage = "خطأ في تحميل البيانات"
        }
    }

    // MARK: - Parse SMS
    func parseSMS() {
        guard !smsText.isEmpty else {
            parseResult = nil
            return
        }

        // Auto-detect sender if not specified
        if senderName.isEmpty {
            senderName = detectSender(from: smsText) ?? ""
        }

        parseResult = parser.parse(
            smsBody: smsText,
            sender: senderName,
            customTemplates: customTemplates
        )

        // Find matching account
        if let result = parseResult {
            if let card = result.cardLastFour {
                matchedAccount = accounts.first { $0.cardLastFour == card }
            }
            if matchedAccount == nil {
                let sender = senderName.lowercased()
                matchedAccount = accounts.first {
                    $0.smsSender?.lowercased() == sender ||
                    ($0.smsSender?.lowercased().contains(sender) ?? false)
                }
            }
        }
    }

    // MARK: - Save Parsed Transaction
    func saveTransaction() async {
        guard !smsText.isEmpty, !senderName.isEmpty else {
            errorMessage = "أدخل نص الرسالة واسم المرسل"
            return
        }

        isSaving = true
        defer { isSaving = false }

        do {
            if let (tx, account) = try await firebase.processAndSaveSMS(body: smsText, sender: senderName) {
                let typeLabel = tx.type == .income ? "إيداع" : "خصم"
                let accLabel = account?.name ?? "غير محدد"
                savedMessage = "تم تسجيل \(typeLabel) \(tx.amount.egp) - \(tx.name) ← \(accLabel)"
                // Reset
                smsText = ""
                senderName = ""
                parseResult = nil
                matchedAccount = nil
            } else {
                errorMessage = "لم يتم التعرف على نمط الرسالة"
            }
        } catch {
            errorMessage = "خطأ في الحفظ: \(error.localizedDescription)"
        }
    }

    // MARK: - Custom Bank Templates
    func addCustomTemplate(_ template: BankTemplate) async -> Bool {
        do {
            try await firebase.saveBankTemplate(template)
            customTemplates.append(template)
            return true
        } catch {
            errorMessage = "خطأ في حفظ القالب"
            return false
        }
    }

    func deleteCustomTemplate(_ id: String) async {
        do {
            try await firebase.deleteBankTemplate(id)
            customTemplates.removeAll { $0.id == id }
        } catch {
            errorMessage = "خطأ في حذف القالب"
        }
    }

    // MARK: - Auto-detect sender
    private func detectSender(from text: String) -> String? {
        let keywords: [(sender: String, keywords: [String])] = [
            ("Bank-AlAhly", ["حسابكم", "البنك الأهلي", "الخصم المباشر", "بطاقة الائتمان"]),
            ("Bank NXT", ["Dear", "card ending", "was charged at"]),
            ("ArabBank", ["A Trx using Card", "Arab Bank"]),
            ("VF-Cash", ["محفظتك", "فودافون", "Vodafone"])
        ]

        for (sender, keys) in keywords {
            if keys.contains(where: { text.contains($0) }) {
                return sender
            }
        }

        // Check custom templates
        for template in customTemplates {
            for rule in template.rules {
                if text.contains(rule.keyword) {
                    return template.smsSender
                }
            }
        }

        return nil
    }
}
