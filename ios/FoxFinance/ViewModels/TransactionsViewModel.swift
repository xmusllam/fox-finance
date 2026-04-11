import Foundation

@MainActor
class TransactionsViewModel: ObservableObject {
    @Published var transactions: [Transaction] = []
    @Published var categories: [String] = []
    @Published var accounts: [Account] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    let transactionType: TransactionType
    private let firebase = FirebaseService.shared

    init(type: TransactionType) {
        self.transactionType = type
    }

    var defaultCategories: [String] {
        transactionType == .income
            ? CategoryGroup.defaultIncomeCategories
            : CategoryGroup.defaultExpenseCategories
    }

    func loadData() async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let fetchedTx = firebase.fetchTransactions(type: transactionType)
            async let fetchedCat = firebase.fetchCategories(type: transactionType)
            async let fetchedAcc = firebase.fetchAccounts()

            let (tx, cat, acc) = try await (fetchedTx, fetchedCat, fetchedAcc)
            self.transactions = tx.sorted { $0.date > $1.date }
            self.categories = cat?.categories ?? defaultCategories
            self.accounts = acc
        } catch {
            errorMessage = "خطأ في تحميل البيانات"
        }
    }

    func addTransaction(
        name: String, amount: Double, category: String,
        accountId: String?, affectsAccount: Bool,
        date: Date, isRecurring: Bool
    ) async -> Bool {
        guard let uid = firebase.currentUserId else { return false }
        let tx = Transaction(
            userId: uid,
            type: transactionType,
            amount: amount,
            name: name,
            category: category,
            accountId: accountId,
            affectsAccount: affectsAccount,
            date: date,
            isRecurring: isRecurring
        )
        do {
            try await firebase.saveTransaction(tx)
            await loadData()
            return true
        } catch {
            errorMessage = "خطأ في حفظ العملية"
            return false
        }
    }

    func deleteTransaction(_ transaction: Transaction) async {
        do {
            try await firebase.deleteTransaction(transaction)
            transactions.removeAll { $0.id == transaction.id }
        } catch {
            errorMessage = "خطأ في حذف العملية"
        }
    }

    func addCategory(_ name: String) async {
        guard let uid = firebase.currentUserId else { return }
        var updated = categories
        updated.append(name)
        let group = CategoryGroup(userId: uid, type: transactionType, categories: updated)
        do {
            try await firebase.saveCategories(group)
            categories = updated
        } catch {
            errorMessage = "خطأ في إضافة الفئة"
        }
    }

    func deleteCategory(_ name: String) async {
        guard let uid = firebase.currentUserId else { return }
        var updated = categories
        updated.removeAll { $0 == name }
        let group = CategoryGroup(userId: uid, type: transactionType, categories: updated)
        do {
            try await firebase.saveCategories(group)
            categories = updated
        } catch {
            errorMessage = "خطأ في حذف الفئة"
        }
    }
}
