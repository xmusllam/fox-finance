import Foundation

@MainActor
class AccountsViewModel: ObservableObject {
    @Published var accounts: [Account] = []
    @Published var installments: [Installment] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let firebase = FirebaseService.shared

    var bankAccounts: [Account] { accounts.filter { !$0.isCredit } }
    var creditCards: [Account] { accounts.filter { $0.isCredit } }
    var totalBalance: Double { bankAccounts.reduce(0) { $0 + $1.balance } }
    var totalDebt: Double { creditCards.reduce(0) { $0 + $1.lastMonthDebt + $1.currentMonthDebt } }

    func loadData() async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let fetchedAccounts = firebase.fetchAccounts()
            async let fetchedInstallments = firebase.fetchInstallments()

            let (acc, inst) = try await (fetchedAccounts, fetchedInstallments)
            self.installments = inst

            self.accounts = acc.map { account in
                var a = account
                if a.isCredit {
                    a.totalActiveInstallmentsRemaining = inst
                        .filter { $0.creditCardAccountId == a.id && $0.isActive }
                        .reduce(0) { $0 + $1.remainingAmount }
                }
                return a
            }
        } catch {
            errorMessage = "خطأ في تحميل الحسابات"
        }
    }

    func addAccount(
        name: String, type: AccountType, balance: Double,
        bankName: String?, cardLastFour: String?,
        isCredit: Bool, creditLimit: Double, smsSender: String?
    ) async -> Bool {
        guard let uid = firebase.currentUserId else { return false }
        let account = Account(
            userId: uid, name: name, type: type, balance: balance,
            bankName: bankName, cardLastFour: cardLastFour,
            isCredit: isCredit, creditLimit: creditLimit,
            smsSender: smsSender
        )
        do {
            try await firebase.saveAccount(account)
            await loadData()
            return true
        } catch {
            errorMessage = "خطأ في حفظ الحساب"
            return false
        }
    }

    func deleteAccount(_ id: String) async {
        do {
            try await firebase.deleteAccount(id)
            accounts.removeAll { $0.id == id }
        } catch {
            errorMessage = "خطأ في حذف الحساب"
        }
    }

    func updateAccount(_ account: Account) async -> Bool {
        do {
            try await firebase.saveAccount(account)
            await loadData()
            return true
        } catch {
            errorMessage = "خطأ في تحديث الحساب"
            return false
        }
    }

    // MARK: - Installments
    func addInstallment(
        creditCardAccountId: String, description: String,
        totalAmount: Double, numberOfMonths: Int
    ) async -> Bool {
        guard let uid = firebase.currentUserId else { return false }
        let installment = Installment(
            userId: uid,
            creditCardAccountId: creditCardAccountId,
            description: description,
            totalAmount: totalAmount,
            numberOfMonths: numberOfMonths
        )
        do {
            try await firebase.saveInstallment(installment)
            await loadData()
            return true
        } catch {
            errorMessage = "خطأ في إضافة التقسيط"
            return false
        }
    }

    func payInstallment(_ installment: Installment) async {
        do {
            try await firebase.payInstallment(installment)

            // Add the monthly amount to credit card debt
            if let account = accounts.first(where: { $0.id == installment.creditCardAccountId }) {
                let newDebt = account.currentMonthDebt + installment.monthlyAmount
                try await firebase.updateCreditCardDebt(
                    accountId: account.id,
                    lastMonthDebt: nil,
                    currentMonthDebt: newDebt
                )
            }

            await loadData()
        } catch {
            errorMessage = "خطأ في سداد القسط"
        }
    }

    func deleteInstallment(_ id: String) async {
        do {
            try await firebase.deleteInstallment(id)
            installments.removeAll { $0.id == id }
            await loadData()
        } catch {
            errorMessage = "خطأ في حذف التقسيط"
        }
    }

    func installments(for accountId: String) -> [Installment] {
        installments.filter { $0.creditCardAccountId == accountId && $0.isActive }
    }
}
