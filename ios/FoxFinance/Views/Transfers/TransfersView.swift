import SwiftUI

struct TransfersView: View {
    @State private var accounts: [Account] = []
    @State private var transfers: [Transfer] = []
    @State private var fromAccountId: String?
    @State private var toAccountId: String?
    @State private var amount = ""
    @State private var note = ""
    @State private var date = Date()
    @State private var isSaving = false
    @State private var successMessage: String?
    @State private var errorMessage: String?
    @State private var isLoading = false

    private let firebase = FirebaseService.shared

    var fromAccount: Account? {
        accounts.first { $0.id == fromAccountId }
    }

    var toAccount: Account? {
        accounts.first { $0.id == toAccountId }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Transfer form
                VStack(spacing: 16) {
                    Text("تحويل بين الحسابات")
                        .font(.headline)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    // From account
                    VStack(alignment: .leading, spacing: 8) {
                        Text("من حساب")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        accountPicker(selected: $fromAccountId, exclude: toAccountId)
                    }

                    // Arrow
                    Image(systemName: "arrow.down.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.foxGreen)

                    // To account
                    VStack(alignment: .leading, spacing: 8) {
                        Text("إلى حساب")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        accountPicker(selected: $toAccountId, exclude: fromAccountId)
                    }

                    // Amount
                    VStack(alignment: .leading, spacing: 8) {
                        Text("المبلغ")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        HStack {
                            TextField("0.00", text: $amount)
                                .keyboardType(.decimalPad)
                                .font(.system(size: 24, weight: .bold, design: .rounded))
                            Text("ج.م")
                                .foregroundStyle(.foxTextSecondary)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 14))

                        // Balance hint
                        if let from = fromAccount {
                            let available = from.isCredit ? from.availableCredit : from.balance
                            Text("المتاح: \(available.egp)")
                                .font(.caption)
                                .foregroundStyle(.foxTextSecondary)
                        }
                    }

                    // Note
                    TextField("ملاحظة (اختياري)", text: $note)
                        .padding()
                        .background(Color.gray.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 14))

                    // Date
                    DatePicker("التاريخ", selection: $date, displayedComponents: .date)
                        .environment(\.locale, Locale(identifier: "ar_EG"))

                    // Messages
                    if let success = successMessage {
                        Text(success)
                            .font(.callout)
                            .foregroundStyle(.foxGreen)
                            .padding(12)
                            .frame(maxWidth: .infinity)
                            .background(Color.foxGreen.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    if let error = errorMessage {
                        Text(error)
                            .font(.callout)
                            .foregroundStyle(.foxRed)
                            .padding(12)
                            .frame(maxWidth: .infinity)
                            .background(Color.foxRed.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    // Submit
                    Button {
                        Task { await executeTransfer() }
                    } label: {
                        HStack {
                            if isSaving {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "arrow.left.arrow.right")
                                Text("تنفيذ التحويل")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(canTransfer ? LinearGradient.foxPrimary : LinearGradient(colors: [.gray], startPoint: .leading, endPoint: .trailing))
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(!canTransfer || isSaving)
                }
                .padding(20)
                .background(Color.foxCard)
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)

                // Recent transfers
                if !transfers.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("آخر التحويلات")
                            .font(.headline)

                        ForEach(transfers.prefix(10)) { transfer in
                            transferRow(transfer)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Color.foxBg)
        .task { await loadData() }
        .refreshable { await loadData() }
    }

    private var canTransfer: Bool {
        fromAccountId != nil && toAccountId != nil &&
        fromAccountId != toAccountId &&
        (Double(amount) ?? 0) > 0
    }

    private func accountPicker(selected: Binding<String?>, exclude: String?) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(accounts.filter { $0.id != exclude }) { acc in
                    Button {
                        selected.wrappedValue = acc.id
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: acc.isCredit ? "creditcard.fill" : acc.type.icon)
                                .font(.caption)
                            Text(acc.name)
                                .font(.caption.weight(.medium))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(selected.wrappedValue == acc.id ? Color.foxGreen : Color.gray.opacity(0.08))
                        .foregroundStyle(selected.wrappedValue == acc.id ? .white : .foxTextPrimary)
                        .clipShape(Capsule())
                    }
                }
            }
        }
    }

    private func transferRow(_ transfer: Transfer) -> some View {
        let from = accounts.first { $0.id == transfer.fromAccountId }?.name ?? "?"
        let to = accounts.first { $0.id == transfer.toAccountId }?.name ?? "?"

        return HStack(spacing: 12) {
            Image(systemName: "arrow.left.arrow.right.circle.fill")
                .foregroundStyle(.foxBlue)
                .font(.title3)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(from) → \(to)")
                    .font(.subheadline.weight(.medium))
                if !transfer.note.isEmpty {
                    Text(transfer.note)
                        .font(.caption)
                        .foregroundStyle(.foxTextSecondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(transfer.amount.egpClean)
                    .font(.subheadline.weight(.semibold))
                Text(transfer.date.shortDate)
                    .font(.caption2)
                    .foregroundStyle(.foxTextLight)
            }
        }
        .padding(14)
        .background(Color.foxCard)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
    }

    private func loadData() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let accs = firebase.fetchAccounts()
            async let txs = firebase.fetchTransfers()
            self.accounts = try await accs
            self.transfers = try await txs.sorted { $0.date > $1.date }
        } catch {
            errorMessage = "خطأ في تحميل البيانات"
        }
    }

    private func executeTransfer() async {
        guard let fromId = fromAccountId, let toId = toAccountId,
              let amountVal = Double(amount), amountVal > 0,
              let uid = firebase.currentUserId else { return }

        // Validate balance
        if let from = fromAccount {
            let available = from.isCredit ? from.availableCredit : from.balance
            guard amountVal <= available else {
                errorMessage = "الرصيد غير كافي"
                return
            }
        }

        isSaving = true
        errorMessage = nil
        successMessage = nil

        do {
            let transfer = Transfer(
                userId: uid, fromAccountId: fromId, toAccountId: toId,
                amount: amountVal, note: note, date: date
            )
            try await firebase.saveTransfer(transfer)
            successMessage = "تم التحويل بنجاح"
            amount = ""
            note = ""
            await loadData()
        } catch {
            errorMessage = "خطأ في التحويل"
        }

        isSaving = false
    }
}
