import SwiftUI

struct AccountsView: View {
    @StateObject private var viewModel = AccountsViewModel()
    @State private var showAddAccount = false
    @State private var selectedAccount: Account?
    @State private var accountToDelete: Account?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary
                HStack(spacing: 12) {
                    SummaryCard(
                        title: "إجمالي الأرصدة",
                        value: viewModel.totalBalance,
                        icon: "wallet.pass.fill",
                        gradient: .foxBlueGradient
                    )
                    SummaryCard(
                        title: "إجمالي المديونيات",
                        value: viewModel.totalDebt,
                        icon: "creditcard.fill",
                        gradient: LinearGradient(colors: [.foxOrange, .foxRed], startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                }

                // Bank Accounts
                if !viewModel.bankAccounts.isEmpty {
                    sectionHeader("الحسابات البنكية", icon: "building.columns")
                    ForEach(viewModel.bankAccounts) { account in
                        AccountCard(account: account)
                            .onTapGesture { selectedAccount = account }
                            .contextMenu {
                                Button(role: .destructive) {
                                    accountToDelete = account
                                } label: {
                                    Label("حذف", systemImage: "trash")
                                }
                            }
                    }
                }

                // Credit Cards
                if !viewModel.creditCards.isEmpty {
                    sectionHeader("بطاقات الائتمان", icon: "creditcard")
                    ForEach(viewModel.creditCards) { account in
                        CreditCardView(account: account, viewModel: viewModel)
                            .onTapGesture { selectedAccount = account }
                            .contextMenu {
                                Button(role: .destructive) {
                                    accountToDelete = account
                                } label: {
                                    Label("حذف", systemImage: "trash")
                                }
                            }
                    }
                }

                // Empty state
                if viewModel.accounts.isEmpty && !viewModel.isLoading {
                    VStack(spacing: 16) {
                        Image(systemName: "wallet.pass")
                            .font(.system(size: 56))
                            .foregroundStyle(.foxTextLight)
                        Text("لا توجد حسابات")
                            .font(.headline)
                            .foregroundStyle(.foxTextSecondary)
                        Text("أضف حساباتك البنكية وبطاقاتك الائتمانية")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextLight)
                    }
                    .padding(40)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Color.foxBg)
        .overlay(alignment: .bottomTrailing) {
            Button { showAddAccount = true } label: {
                Image(systemName: "plus")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(width: 56, height: 56)
                    .background(Color.foxBlue)
                    .clipShape(Circle())
                    .shadow(color: Color.foxBlue.opacity(0.4), radius: 8, y: 4)
            }
            .padding(20)
            .padding(.bottom, 80)
        }
        .sheet(isPresented: $showAddAccount) {
            AddAccountView(viewModel: viewModel)
        }
        .sheet(item: $selectedAccount) { account in
            AccountDetailSheet(account: account, viewModel: viewModel)
        }
        .alert("حذف الحساب؟", isPresented: .init(
            get: { accountToDelete != nil },
            set: { if !$0 { accountToDelete = nil } }
        )) {
            Button("حذف", role: .destructive) {
                if let acc = accountToDelete {
                    Task { await viewModel.deleteAccount(acc.id) }
                }
            }
            Button("إلغاء", role: .cancel) {}
        }
        .refreshable { await viewModel.loadData() }
        .task { await viewModel.loadData() }
    }

    private func sectionHeader(_ title: String, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(.foxGreen)
            Text(title)
                .font(.headline)
                .foregroundStyle(.foxTextPrimary)
            Spacer()
        }
    }
}

// MARK: - Credit Card View with Installments
struct CreditCardView: View {
    let account: Account
    @ObservedObject var viewModel: AccountsViewModel
    @State private var showAddInstallment = false

    var activeInstallments: [Installment] {
        viewModel.installments(for: account.id)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Card header
            AccountCard(account: account)

            // Credit limit bar
            let used = account.lastMonthDebt + account.currentMonthDebt + account.totalActiveInstallmentsRemaining
            let total = account.creditLimit
            let pct = total > 0 ? min(used / total, 1.0) : 0

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("الحد الائتماني: \(total.egpClean)")
                        .font(.caption)
                        .foregroundStyle(.foxTextSecondary)
                    Spacer()
                    Text("\(Int(pct * 100))% مستخدم")
                        .font(.caption)
                        .foregroundStyle(pct > 0.8 ? .foxRed : .foxTextSecondary)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.15))
                        RoundedRectangle(cornerRadius: 4)
                            .fill(pct > 0.8 ? Color.foxRed : Color.foxOrange)
                            .frame(width: geo.size.width * pct)
                    }
                }
                .frame(height: 6)
            }
            .padding(.horizontal, 16)

            // Active Installments
            if !activeInstallments.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("أقساط نشطة")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.foxTextSecondary)
                        .padding(.horizontal, 16)

                    ForEach(activeInstallments) { inst in
                        InstallmentRow(installment: inst) {
                            Task { await viewModel.payInstallment(inst) }
                        }
                    }
                }
            }

            // Add installment button
            Button { showAddInstallment = true } label: {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("إضافة تقسيط")
                }
                .font(.caption.weight(.medium))
                .foregroundStyle(.foxGreen)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            }
        }
        .background(Color.foxCard)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        .sheet(isPresented: $showAddInstallment) {
            AddInstallmentView(accountId: account.id, accountName: account.name, viewModel: viewModel)
        }
    }
}

// MARK: - Installment Row
struct InstallmentRow: View {
    let installment: Installment
    let onPay: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(installment.description)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.foxTextPrimary)
                Text("القسط: \(installment.monthlyAmount.egpClean) / شهر")
                    .font(.caption2)
                    .foregroundStyle(.foxTextSecondary)
                Text("متبقي: \(installment.remainingMonths) من \(installment.numberOfMonths) شهر")
                    .font(.caption2)
                    .foregroundStyle(.foxTextSecondary)
            }

            Spacer()

            // Progress ring
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.15), lineWidth: 3)
                Circle()
                    .trim(from: 0, to: installment.progressPercentage)
                    .stroke(Color.foxGreen, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int(installment.progressPercentage * 100))%")
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .foregroundStyle(.foxGreen)
            }
            .frame(width: 36, height: 36)

            Button(action: onPay) {
                Text("سداد")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.foxGreen)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
    }
}
