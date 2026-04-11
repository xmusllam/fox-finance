import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @Binding var activeTab: AppTab

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Date Filter
                dateFilterSection

                // Summary Cards Grid
                summaryGrid

                // Accounts Quick View
                if !viewModel.accounts.isEmpty {
                    accountsSection
                }

                // Recent Transactions
                recentTransactionsSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Color.foxBg)
        .refreshable { await viewModel.loadData() }
        .task { await viewModel.loadData() }
        .onChange(of: viewModel.dateFilter) { _, _ in
            Task { await viewModel.loadData() }
        }
    }

    // MARK: - Date Filter
    private var dateFilterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(DateFilter.allCases.filter { $0 != .custom }) { filter in
                    Button {
                        viewModel.dateFilter = filter
                    } label: {
                        Text(filter.rawValue)
                            .font(.caption.weight(.medium))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(
                                viewModel.dateFilter == filter
                                    ? AnyShapeStyle(LinearGradient.foxPrimary)
                                    : AnyShapeStyle(Color.white)
                            )
                            .foregroundStyle(viewModel.dateFilter == filter ? .white : .foxTextSecondary)
                            .clipShape(Capsule())
                            .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    // MARK: - Summary Grid
    private var summaryGrid: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                SummaryCard(
                    title: "إجمالي الإيرادات",
                    value: viewModel.totalIncome,
                    icon: "arrow.down.circle.fill",
                    gradient: .foxIncome
                )
                .onTapGesture { activeTab = .income }

                SummaryCard(
                    title: "إجمالي المصروفات",
                    value: viewModel.totalExpenses,
                    icon: "arrow.up.circle.fill",
                    gradient: .foxExpense
                )
                .onTapGesture { activeTab = .expenses }
            }

            HStack(spacing: 12) {
                SummaryCard(
                    title: "صافي الرصيد",
                    value: viewModel.netBalance,
                    icon: "banknote.fill",
                    gradient: .foxBlueGradient
                )

                SummaryCard(
                    title: "إجمالي الحسابات",
                    value: viewModel.totalAccountBalance,
                    icon: "wallet.pass.fill",
                    gradient: .foxPurpleGradient
                )
                .onTapGesture { activeTab = .accounts }
            }

            if viewModel.totalCreditDebt > 0 || viewModel.totalInstallmentsRemaining > 0 {
                HStack(spacing: 12) {
                    if viewModel.totalCreditDebt > 0 {
                        SummaryCard(
                            title: "مديونية البطاقات",
                            value: viewModel.totalCreditDebt,
                            icon: "creditcard.fill",
                            gradient: LinearGradient(colors: [.foxOrange, .foxRed], startPoint: .topLeading, endPoint: .bottomTrailing)
                        )
                    }
                    if viewModel.totalInstallmentsRemaining > 0 {
                        SummaryCard(
                            title: "أقساط متبقية",
                            value: viewModel.totalInstallmentsRemaining,
                            icon: "calendar.badge.clock",
                            gradient: LinearGradient(colors: [.foxAmber, .foxOrange], startPoint: .topLeading, endPoint: .bottomTrailing)
                        )
                    }
                }
            }
        }
    }

    // MARK: - Accounts Section
    private var accountsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("الحسابات")
                    .font(.headline)
                    .foregroundStyle(.foxTextPrimary)
                Spacer()
                Button { activeTab = .accounts } label: {
                    Text("عرض الكل")
                        .font(.caption)
                        .foregroundStyle(.foxGreen)
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.accounts) { account in
                        AccountCard(account: account)
                            .frame(width: 220)
                    }
                }
            }
        }
    }

    // MARK: - Recent Transactions
    private var recentTransactionsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("آخر العمليات")
                    .font(.headline)
                    .foregroundStyle(.foxTextPrimary)
                Spacer()
            }

            if viewModel.recentTransactions.isEmpty {
                emptyState
            } else {
                VStack(spacing: 0) {
                    ForEach(viewModel.recentTransactions) { tx in
                        TransactionRow(
                            transaction: tx,
                            accountName: viewModel.accounts.first { $0.id == tx.accountId }?.name
                        )
                        if tx.id != viewModel.recentTransactions.last?.id {
                            Divider().padding(.leading, 54)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color.foxCard)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 40))
                .foregroundStyle(.foxTextLight)
            Text("لا توجد عمليات في هذه الفترة")
                .font(.subheadline)
                .foregroundStyle(.foxTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(40)
        .background(Color.foxCard)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
