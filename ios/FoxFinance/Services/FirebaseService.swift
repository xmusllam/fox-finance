import Foundation
import FirebaseCore
import FirebaseFirestore
import FirebaseAuth

// MARK: - Firebase Service
@MainActor
class FirebaseService: ObservableObject {

    static let shared = FirebaseService()
    private let db = Firestore.firestore()

    var currentUserId: String? {
        Auth.auth().currentUser?.uid
    }

    // MARK: - Accounts
    func fetchAccounts() async throws -> [Account] {
        guard let uid = currentUserId else { return [] }
        let snapshot = try await db.collection("accounts")
            .whereField("userId", isEqualTo: uid)
            .getDocuments()
        return snapshot.documents.compactMap { Account.from(document: $0) }
    }

    func saveAccount(_ account: Account) async throws {
        try await db.collection("accounts")
            .document(account.id)
            .setData(account.firestoreData)
    }

    func deleteAccount(_ id: String) async throws {
        try await db.collection("accounts").document(id).delete()
    }

    func updateAccountBalance(accountId: String, newBalance: Double) async throws {
        try await db.collection("accounts").document(accountId)
            .updateData(["balance": newBalance])
    }

    func updateCreditCardDebt(accountId: String, lastMonthDebt: Double?, currentMonthDebt: Double?) async throws {
        var data: [String: Any] = [:]
        if let lastMonthDebt { data["lastMonthDebt"] = lastMonthDebt }
        if let currentMonthDebt { data["currentMonthDebt"] = currentMonthDebt }
        guard !data.isEmpty else { return }
        try await db.collection("accounts").document(accountId).updateData(data)
    }

    // MARK: - Transactions (Income & Expenses)
    func fetchTransactions(type: TransactionType, startDate: Date? = nil, endDate: Date? = nil) async throws -> [Transaction] {
        guard let uid = currentUserId else { return [] }
        let collection = type == .income ? "incomes" : "expenses"
        var query: Query = db.collection(collection)
            .whereField("userId", isEqualTo: uid)

        if let start = startDate {
            query = query.whereField("date", isGreaterThanOrEqualTo: Timestamp(date: start))
        }
        if let end = endDate {
            query = query.whereField("date", isLessThanOrEqualTo: Timestamp(date: end))
        }

        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { Transaction.from(document: $0, type: type) }
    }

    func saveTransaction(_ transaction: Transaction) async throws {
        try await db.collection(transaction.collectionName)
            .document(transaction.id)
            .setData(transaction.firestoreData)

        // Update account balance if affects account
        if transaction.affectsAccount, let accountId = transaction.accountId {
            let accountDoc = try await db.collection("accounts").document(accountId).getDocument()
            guard var account = Account.from(document: accountDoc) else { return }

            if account.isCredit {
                // Credit card: increase debt
                if transaction.type == .expense {
                    account.currentMonthDebt += transaction.amount
                    try await updateCreditCardDebt(
                        accountId: accountId,
                        lastMonthDebt: nil,
                        currentMonthDebt: account.currentMonthDebt
                    )
                }
            } else {
                // Debit: adjust balance
                let delta = transaction.type == .income ? transaction.amount : -transaction.amount
                try await updateAccountBalance(accountId: accountId, newBalance: account.balance + delta)
            }
        }
    }

    func deleteTransaction(_ transaction: Transaction) async throws {
        try await db.collection(transaction.collectionName).document(transaction.id).delete()

        // Reverse account balance change
        if transaction.affectsAccount, let accountId = transaction.accountId {
            let accountDoc = try await db.collection("accounts").document(accountId).getDocument()
            guard let account = Account.from(document: accountDoc) else { return }

            if account.isCredit {
                if transaction.type == .expense {
                    let newDebt = max(0, account.currentMonthDebt - transaction.amount)
                    try await updateCreditCardDebt(accountId: accountId, lastMonthDebt: nil, currentMonthDebt: newDebt)
                }
            } else {
                let delta = transaction.type == .income ? -transaction.amount : transaction.amount
                try await updateAccountBalance(accountId: accountId, newBalance: account.balance + delta)
            }
        }
    }

    // MARK: - Transfers
    func fetchTransfers() async throws -> [Transfer] {
        guard let uid = currentUserId else { return [] }
        let snapshot = try await db.collection("transfers")
            .whereField("userId", isEqualTo: uid)
            .getDocuments()
        return snapshot.documents.compactMap { Transfer.from(document: $0) }
    }

    func saveTransfer(_ transfer: Transfer) async throws {
        try await db.collection("transfers")
            .document(transfer.id)
            .setData(transfer.firestoreData)

        // Update source account
        let fromDoc = try await db.collection("accounts").document(transfer.fromAccountId).getDocument()
        if let fromAccount = Account.from(document: fromDoc) {
            if fromAccount.isCredit {
                let newDebt = fromAccount.currentMonthDebt + transfer.amount
                try await updateCreditCardDebt(accountId: transfer.fromAccountId, lastMonthDebt: nil, currentMonthDebt: newDebt)
            } else {
                try await updateAccountBalance(accountId: transfer.fromAccountId, newBalance: fromAccount.balance - transfer.amount)
            }
        }

        // Update destination account
        let toDoc = try await db.collection("accounts").document(transfer.toAccountId).getDocument()
        if let toAccount = Account.from(document: toDoc) {
            if toAccount.isCredit {
                // Paying off credit card debt
                var lastDebt = toAccount.lastMonthDebt
                var currentDebt = toAccount.currentMonthDebt
                var remaining = transfer.amount

                // Pay last month first
                if lastDebt > 0 {
                    let pay = min(remaining, lastDebt)
                    lastDebt -= pay
                    remaining -= pay
                }
                if remaining > 0 && currentDebt > 0 {
                    let pay = min(remaining, currentDebt)
                    currentDebt -= pay
                }
                try await updateCreditCardDebt(accountId: transfer.toAccountId, lastMonthDebt: lastDebt, currentMonthDebt: currentDebt)
            } else {
                try await updateAccountBalance(accountId: transfer.toAccountId, newBalance: toAccount.balance + transfer.amount)
            }
        }
    }

    // MARK: - Categories
    func fetchCategories(type: TransactionType) async throws -> CategoryGroup? {
        guard let uid = currentUserId else { return nil }
        let snapshot = try await db.collection("categories")
            .whereField("userId", isEqualTo: uid)
            .whereField("type", isEqualTo: type.rawValue)
            .getDocuments()
        return snapshot.documents.first.flatMap { CategoryGroup.from(document: $0) }
    }

    func saveCategories(_ group: CategoryGroup) async throws {
        try await db.collection("categories")
            .document(group.id)
            .setData(group.firestoreData)
    }

    func createDefaultCategories(userId: String) async throws {
        let incomeGroup = CategoryGroup(
            userId: userId,
            type: .income,
            categories: CategoryGroup.defaultIncomeCategories
        )
        let expenseGroup = CategoryGroup(
            userId: userId,
            type: .expense,
            categories: CategoryGroup.defaultExpenseCategories
        )
        try await saveCategories(incomeGroup)
        try await saveCategories(expenseGroup)
    }

    // MARK: - Installments
    func fetchInstallments(forAccount accountId: String? = nil) async throws -> [Installment] {
        guard let uid = currentUserId else { return [] }
        var query: Query = db.collection("installments")
            .whereField("userId", isEqualTo: uid)

        if let accountId {
            query = query.whereField("creditCardAccountId", isEqualTo: accountId)
        }

        let snapshot = try await query.getDocuments()
        return snapshot.documents.compactMap { Installment.from(document: $0) }
    }

    func saveInstallment(_ installment: Installment) async throws {
        try await db.collection("installments")
            .document(installment.id)
            .setData(installment.firestoreData)

        // If new installment, the credit limit is effectively reduced
        // (handled via totalActiveInstallmentsRemaining in account display)
    }

    func payInstallment(_ installment: Installment) async throws {
        var updated = installment
        updated.paidMonths += 1
        if updated.paidMonths >= updated.numberOfMonths {
            updated.isActive = false
        }
        try await db.collection("installments")
            .document(updated.id)
            .setData(updated.firestoreData)
    }

    func deleteInstallment(_ id: String) async throws {
        try await db.collection("installments").document(id).delete()
    }

    // MARK: - Bank Templates (Custom)
    func fetchCustomBankTemplates() async throws -> [BankTemplate] {
        guard let uid = currentUserId else { return [] }
        let snapshot = try await db.collection("bankTemplates")
            .whereField("userId", isEqualTo: uid)
            .getDocuments()
        return snapshot.documents.compactMap { BankTemplate.from(document: $0) }
    }

    func saveBankTemplate(_ template: BankTemplate) async throws {
        try await db.collection("bankTemplates")
            .document(template.id)
            .setData(template.firestoreData)
    }

    func deleteBankTemplate(_ id: String) async throws {
        try await db.collection("bankTemplates").document(id).delete()
    }

    // MARK: - SMS Auto-Processing
    func processAndSaveSMS(body: String, sender: String) async throws -> (Transaction, Account?)? {
        guard let uid = currentUserId else { return nil }

        // Fetch custom templates
        let customTemplates = try await fetchCustomBankTemplates()

        // Parse SMS
        guard let result = SMSParserService.shared.parse(
            smsBody: body, sender: sender, customTemplates: customTemplates
        ) else { return nil }

        // Find matching account by card last four or SMS sender
        let accounts = try await fetchAccounts()
        var matchedAccount: Account?

        if let cardLast4 = result.cardLastFour {
            matchedAccount = accounts.first { $0.cardLastFour == cardLast4 }
        }
        if matchedAccount == nil {
            let normalizedSender = sender.lowercased()
            matchedAccount = accounts.first {
                $0.smsSender?.lowercased() == normalizedSender ||
                ($0.smsSender?.lowercased().contains(normalizedSender) ?? false)
            }
        }

        // Build transaction name
        let name: String
        if let merchant = result.merchantName, !merchant.isEmpty {
            name = merchant
        } else {
            name = result.transactionType == .income ? "إيداع من \(sender)" : "خصم عبر \(sender)"
        }

        // Create transaction
        let transaction = Transaction(
            userId: uid,
            type: result.transactionType,
            amount: result.amount,
            name: name,
            category: result.transactionType == .income ? "أخرى" : "مصروفات عامة",
            accountId: matchedAccount?.id,
            affectsAccount: matchedAccount != nil,
            date: result.date ?? Date(),
            isAutoFromSMS: true,
            smsSender: sender,
            smsBody: body,
            merchantName: result.merchantName,
            cardLastFour: result.cardLastFour
        )

        try await saveTransaction(transaction)

        // Update balance from SMS if available
        if let balance = result.availableBalance, let account = matchedAccount {
            if account.isCredit {
                // For credit: available balance means creditLimit - debt
                // So debt = creditLimit - availableBalance
                let newDebt = max(0, account.creditLimit - balance)
                try await updateCreditCardDebt(accountId: account.id, lastMonthDebt: nil, currentMonthDebt: newDebt)
            } else {
                try await updateAccountBalance(accountId: account.id, newBalance: balance)
            }
        }

        return (transaction, matchedAccount)
    }
}
