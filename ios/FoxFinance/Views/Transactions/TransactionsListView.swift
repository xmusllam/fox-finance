import SwiftUI

struct TransactionsListView: View {
    @StateObject var viewModel: TransactionsViewModel
    @State private var showAddSheet = false
    @State private var transactionToDelete: Transaction?

    var isIncome: Bool { viewModel.transactionType == .income }

    var body: some View {
        VStack(spacing: 0) {
            // Header stats
            headerStats

            // Transactions list
            if viewModel.transactions.isEmpty && !viewModel.isLoading {
                emptyState
            } else {
                List {
                    ForEach(viewModel.transactions) { tx in
                        TransactionRow(
                            transaction: tx,
                            accountName: viewModel.accounts.first { $0.id == tx.accountId }?.name
                        )
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                transactionToDelete = tx
                            } label: {
                                Label("حذف", systemImage: "trash")
                            }
                        }
                        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                        .listRowSeparator(.hidden)
                    }
                }
                .listStyle(.plain)
            }
        }
        .background(Color.foxBg)
        .overlay(alignment: .bottomTrailing) {
            addButton
        }
        .sheet(isPresented: $showAddSheet) {
            AddTransactionView(viewModel: viewModel)
        }
        .alert("حذف العملية؟", isPresented: .init(
            get: { transactionToDelete != nil },
            set: { if !$0 { transactionToDelete = nil } }
        )) {
            Button("حذف", role: .destructive) {
                if let tx = transactionToDelete {
                    Task { await viewModel.deleteTransaction(tx) }
                }
            }
            Button("إلغاء", role: .cancel) {}
        } message: {
            if let tx = transactionToDelete {
                Text("هل تريد حذف \(tx.name) بقيمة \(tx.amount.egp)؟")
            }
        }
        .refreshable { await viewModel.loadData() }
        .task { await viewModel.loadData() }
    }

    // MARK: - Header
    private var headerStats: some View {
        let total = viewModel.transactions.reduce(0) { $0 + $1.amount }
        return VStack(spacing: 6) {
            Text(isIncome ? "إجمالي الإيرادات" : "إجمالي المصروفات")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.85))
            Text(total.egp)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text("\(viewModel.transactions.count) عملية")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(isIncome ? LinearGradient.foxIncome : LinearGradient.foxExpense)
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: isIncome ? "arrow.down.circle" : "arrow.up.circle")
                .font(.system(size: 56))
                .foregroundStyle(.foxTextLight)
            Text(isIncome ? "لا توجد إيرادات" : "لا توجد مصروفات")
                .font(.headline)
                .foregroundStyle(.foxTextSecondary)
            Text("اضغط + لإضافة عملية جديدة")
                .font(.subheadline)
                .foregroundStyle(.foxTextLight)
            Spacer()
        }
    }

    // MARK: - Add Button
    private var addButton: some View {
        Button { showAddSheet = true } label: {
            Image(systemName: "plus")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(isIncome ? Color.foxGreen : Color.foxRed)
                .clipShape(Circle())
                .shadow(color: (isIncome ? Color.foxGreen : Color.foxRed).opacity(0.4), radius: 8, y: 4)
        }
        .padding(20)
        .padding(.bottom, 80)
    }
}
