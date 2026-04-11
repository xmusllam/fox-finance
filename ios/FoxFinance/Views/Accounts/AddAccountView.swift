import SwiftUI

struct AddAccountView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: AccountsViewModel

    @State private var name = ""
    @State private var type: AccountType = .bank
    @State private var balance = ""
    @State private var bankName = ""
    @State private var cardLastFour = ""
    @State private var isCredit = false
    @State private var creditLimit = ""
    @State private var smsSender = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Name
                    inputField("اسم الحساب", text: $name, placeholder: "مثال: البنك الأهلي - ديبت")

                    // Type
                    VStack(alignment: .leading, spacing: 8) {
                        Text("نوع الحساب")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(AccountType.allCases) { t in
                                    Button {
                                        type = t
                                    } label: {
                                        HStack(spacing: 6) {
                                            Image(systemName: t.icon)
                                                .font(.caption)
                                            Text(t.rawValue)
                                                .font(.caption.weight(.medium))
                                        }
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(type == t ? Color.foxBlue : Color.gray.opacity(0.08))
                                        .foregroundStyle(type == t ? .white : .foxTextPrimary)
                                        .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                    }

                    // Credit card toggle
                    Toggle("بطاقة ائتمان (كريدت كارد)", isOn: $isCredit)
                        .font(.subheadline)
                        .tint(.foxOrange)

                    if isCredit {
                        inputField("الحد الائتماني", text: $creditLimit, placeholder: "100000", keyboard: .decimalPad)
                    } else {
                        inputField("الرصيد الحالي", text: $balance, placeholder: "0.00", keyboard: .decimalPad)
                    }

                    // Card last 4
                    inputField("آخر 4 أرقام للبطاقة", text: $cardLastFour, placeholder: "3600", keyboard: .numberPad)

                    // Bank name
                    inputField("اسم البنك", text: $bankName, placeholder: "البنك الأهلي المصري")

                    // SMS Sender
                    VStack(alignment: .leading, spacing: 8) {
                        Text("معرّف مرسل الـ SMS (اختياري)")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        Text("لربط الرسائل البنكية تلقائياً بهذا الحساب")
                            .font(.caption)
                            .foregroundStyle(.foxTextLight)
                        TextField("مثال: Bank-AlAhly", text: $smsSender)
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
                .padding(20)
            }
            .background(Color.foxBg)
            .navigationTitle("إضافة حساب")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إلغاء") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("حفظ")
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(isSaving || name.isEmpty)
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func inputField(_ title: String, text: Binding<String>, placeholder: String, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(.foxTextSecondary)
            TextField(placeholder, text: text)
                .keyboardType(keyboard)
                .padding()
                .background(Color.gray.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func save() async {
        isSaving = true
        let success = await viewModel.addAccount(
            name: name,
            type: type,
            balance: Double(balance) ?? 0,
            bankName: bankName.isEmpty ? nil : bankName,
            cardLastFour: cardLastFour.isEmpty ? nil : cardLastFour,
            isCredit: isCredit,
            creditLimit: Double(creditLimit) ?? 0,
            smsSender: smsSender.isEmpty ? nil : smsSender
        )
        isSaving = false
        if success { dismiss() }
    }
}

// MARK: - Account Detail Sheet
struct AccountDetailSheet: View {
    let account: Account
    @ObservedObject var viewModel: AccountsViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var editedName: String
    @State private var editedCardLastFour: String
    @State private var editedSMSSender: String
    @State private var isSaving = false

    init(account: Account, viewModel: AccountsViewModel) {
        self.account = account
        self.viewModel = viewModel
        _editedName = State(initialValue: account.name)
        _editedCardLastFour = State(initialValue: account.cardLastFour ?? "")
        _editedSMSSender = State(initialValue: account.smsSender ?? "")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Account info card
                    AccountCard(account: account)

                    // Edit fields
                    VStack(alignment: .leading, spacing: 8) {
                        Text("اسم الحساب")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        TextField("الاسم", text: $editedName)
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("آخر 4 أرقام للبطاقة")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        TextField("0000", text: $editedCardLastFour)
                            .keyboardType(.numberPad)
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("معرّف مرسل SMS")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        TextField("Bank-AlAhly", text: $editedSMSSender)
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    if account.isCredit {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("معلومات الائتمان")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.foxTextPrimary)
                            SummaryRow(title: "الحد الائتماني", value: account.creditLimit, icon: "creditcard", color: .foxBlue)
                            SummaryRow(title: "مديونية الشهر الماضي", value: account.lastMonthDebt, icon: "calendar.badge.minus", color: .foxOrange)
                            SummaryRow(title: "مديونية الشهر الحالي", value: account.currentMonthDebt, icon: "calendar", color: .foxRed)
                            SummaryRow(title: "أقساط نشطة", value: account.totalActiveInstallmentsRemaining, icon: "repeat", color: .foxAmber)
                            SummaryRow(title: "المتاح", value: account.availableCredit, icon: "checkmark.circle", color: .foxGreen)
                        }
                    }
                }
                .padding(20)
            }
            .background(Color.foxBg)
            .navigationTitle(account.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("حفظ")
                                .fontWeight(.semibold)
                        }
                    }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func save() async {
        isSaving = true
        var updated = account
        updated.name = editedName
        updated.cardLastFour = editedCardLastFour.isEmpty ? nil : editedCardLastFour
        updated.smsSender = editedSMSSender.isEmpty ? nil : editedSMSSender
        _ = await viewModel.updateAccount(updated)
        isSaving = false
        dismiss()
    }
}
