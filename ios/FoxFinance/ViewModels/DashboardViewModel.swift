import Foundation
import Combine

// MARK: - Date Filter
enum DateFilter: String, CaseIterable, Identifiable {
    case today = "اليوم"
    case yesterday = "أمس"
    case thisMonth = "هذا الشهر"
    case lastMonth = "الشهر الماضي"
    case yearToDate = "من بداية السنة"
    case all = "الكل"
    case custom = "مخصص"

    var id: String { rawValue }

    func dateRange() -> (start: Date?, end: Date?) {
        let cal = Calendar.current
        let now = Date()
        switch self {
        case .today:
            return (now.startOfDay, now)
        case .yesterday:
            let yesterday = cal.date(byAdding: .day, value: -1, to: now)!
            return (yesterday.startOfDay, cal.date(byAdding: .day, value: 1, to: yesterday.startOfDay)!)
        case .thisMonth:
            return (now.startOfMonth, now)
        case .lastMonth:
            let lastMonth = cal.date(byAdding: .month, value: -1, to: now.startOfMonth)!
            return (lastMonth, now.startOfMonth)
        case .yearToDate:
            return (now.startOfYear, now)
        case .all:
            return (nil, nil)
        case .custom:
            return (nil, nil)
        }
    }
}

// MARK: - Dashboard ViewModel
@MainActor
class DashboardViewModel: ObservableObject {
    @Published var incomes: [Transaction] = []
    @Published var expenses: [Transaction] = []
    @Published var accounts: [Account] = []
    @Published var installments: [Installment] = []
    @Published var isLoading = false
    @Published var dateFilter: DateFilter = .thisMonth
    @Published var customStartDate = Date().startOfMonth
    @Published var customEndDate = Date()

    private let firebase = FirebaseService.shared

    var totalIncome: Double { incomes.reduce(0) { $0 + $1.amount } }
    var totalExpenses: Double { expenses.reduce(0) { $0 + $1.amount } }
    var netBalance: Double { totalIncome - totalExpenses }
    var totalAccountBalance: Double { accounts.filter { !$0.isCredit }.reduce(0) { $0 + $1.balance } }
    var totalCreditDebt: Double {
        accounts.filter { $0.isCredit }.reduce(0) { $0 + $1.lastMonthDebt + $0 + $1.currentMonthDebt }
    }
    var totalInstallmentsRemaining: Double {
        installments.filter { $0.isActive }.reduce(0) { $0 + $1.remainingAmount }
    }
    var grandTotal: Double {
        totalAccountBalance - totalCreditDebt
    }

    // Income by category
    var incomeByCategory: [(category: String, amount: Double)] {
        Dictionary(grouping: incomes, by: { $0.category })
            .map { (category: $0.key, amount: $0.value.reduce(0) { $0 + $1.amount }) }
            .sorted { $0.amount > $1.amount }
    }

    // Expenses by category
    var expenseByCategory: [(category: String, amount: Double)] {
        Dictionary(grouping: expenses, by: { $0.category })
            .map { (category: $0.key, amount: $0.value.reduce(0) { $0 + $1.amount }) }
            .sorted { $0.amount > $1.amount }
    }

    // Monthly data for charts
    var monthlyData: [(month: String, income: Double, expense: Double)] {
        let cal = Calendar.current
        let allTransactions = incomes + expenses
        guard !allTransactions.isEmpty else { return [] }

        var monthMap: [String: (income: Double, expense: Double)] = [:]
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ar_EG")
        formatter.dateFormat = "MMM yyyy"

        for tx in incomes {
            let key = formatter.string(from: tx.date)
            var entry = monthMap[key] ?? (income: 0, expense: 0)
            entry.income += tx.amount
            monthMap[key] = entry
        }
        for tx in expenses {
            let key = formatter.string(from: tx.date)
            var entry = monthMap[key] ?? (income: 0, expense: 0)
            entry.expense += tx.amount
            monthMap[key] = entry
        }

        return monthMap.map { (month: $0.key, income: $0.value.income, expense: $0.value.expense) }
            .sorted { $0.month < $1.month }
    }

    // Recent transactions (combined)
    var recentTransactions: [Transaction] {
        (incomes + expenses)
            .sorted { $0.date > $1.date }
            .prefix(20)
            .map { $0 }
    }

    // MARK: - Load Data
    func loadData() async {
        isLoading = true
        defer { isLoading = false }

        let (start, end) = dateFilter == .custom
            ? (customStartDate as Date?, customEndDate as Date?)
            : dateFilter.dateRange()

        do {
            async let fetchedIncomes = firebase.fetchTransactions(type: .income, startDate: start, endDate: end)
            async let fetchedExpenses = firebase.fetchTransactions(type: .expense, startDate: start, endDate: end)
            async let fetchedAccounts = firebase.fetchAccounts()
            async let fetchedInstallments = firebase.fetchInstallments()

            let (inc, exp, acc, inst) = try await (fetchedIncomes, fetchedExpenses, fetchedAccounts, fetchedInstallments)

            self.incomes = inc
            self.expenses = exp
            self.installments = inst

            // Compute installment remaining for each credit card
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
            print("Error loading dashboard: \(error)")
        }
    }
}
