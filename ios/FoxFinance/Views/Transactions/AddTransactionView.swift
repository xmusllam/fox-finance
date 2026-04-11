import SwiftUI

struct AddTransactionView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: TransactionsViewModel

    @State private var name = ""
    @State private var amount = ""
    @State private var selectedCategory = ""
    @State private var selectedAccountId: String?
    @State private var affectsAccount = true
    @State private var date = Date()
    @State private var isRecurring = false
    @State private var isSaving = false
    @State private var showNewCategory = false
    @State private var newCategoryName = ""

    var isIncome: Bool { viewModel.transactionType == .income }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Amount
                    VStack(spacing: 8) {
                        Text(isIncome ? "مبلغ الإيراد" : "مبلغ المصروف")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        HStack {
                            TextField("0.00", text: $amount)
                                .keyboardType(.decimalPad)
                                .font(.system(size: 32, weight: .bold, design: .rounded))
                                .multilineTextAlignment(.center)
                            Text("ج.م")
                                .font(.title3.weight(.medium))
                                .foregroundStyle(.foxTextSecondary)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    // Name
                    VStack(spacing: 8) {
                        Text("الوصف")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        TextField(isIncome ? "مثال: راتب شهري" : "مثال: فاتورة كهرباء", text: $name)
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    // Category
                    VStack(spacing: 8) {
                        HStack {
                            Text("الفئة")
                                .font(.subheadline)
                                .foregroundStyle(.foxTextSecondary)
                            Spacer()
                            Button {
                                showNewCategory = true
                            } label: {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundStyle(.foxGreen)
                            }
                        }

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(viewModel.categories, id: \.self) { cat in
                                    Button {
                                        selectedCategory = cat
                                    } label: {
                                        Text(cat)
                                            .font(.caption.weight(.medium))
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(selectedCategory == cat ? Color.foxGreen : Color.gray.opacity(0.08))
                                            .foregroundStyle(selectedCategory == cat ? .white : .foxTextPrimary)
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                    }

                    // Account
                    if !viewModel.accounts.isEmpty {
                        VStack(spacing: 8) {
                            Toggle("يؤثر على حساب", isOn: $affectsAccount)
                                .font(.subheadline)
                                .tint(.foxGreen)

                            if affectsAccount {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(viewModel.accounts) { acc in
                                            Button {
                                                selectedAccountId = acc.id
                                            } label: {
                                                HStack(spacing: 6) {
                                                    Image(systemName: acc.isCredit ? "creditcard.fill" : acc.type.icon)
                                                        .font(.caption)
                                                    Text(acc.name)
                                                        .font(.caption.weight(.medium))
                                                    if let card = acc.cardLastFour {
                                                        Text(card)
                                                            .font(.caption2.monospaced())
                                                    }
                                                }
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 8)
                                                .background(selectedAccountId == acc.id ? Color.foxBlue : Color.gray.opacity(0.08))
                                                .foregroundStyle(selectedAccountId == acc.id ? .white : .foxTextPrimary)
                                                .clipShape(Capsule())
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Date
                    DatePicker("التاريخ", selection: $date, displayedComponents: [.date])
                        .font(.subheadline)
                        .environment(\.locale, Locale(identifier: "ar_EG"))

                    // Recurring
                    Toggle("متكرر شهرياً", isOn: $isRecurring)
                        .font(.subheadline)
                        .tint(.foxGreen)
                }
                .padding(20)
            }
            .background(Color.foxBg)
            .navigationTitle(isIncome ? "إضافة إيراد" : "إضافة مصروف")
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
                    .disabled(isSaving || amount.isEmpty || name.isEmpty || selectedCategory.isEmpty)
                }
            }
            .alert("فئة جديدة", isPresented: $showNewCategory) {
                TextField("اسم الفئة", text: $newCategoryName)
                Button("إضافة") {
                    Task {
                        await viewModel.addCategory(newCategoryName)
                        selectedCategory = newCategoryName
                        newCategoryName = ""
                    }
                }
                Button("إلغاء", role: .cancel) { newCategoryName = "" }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .onAppear {
            if selectedCategory.isEmpty, let first = viewModel.categories.first {
                selectedCategory = first
            }
        }
    }

    private func save() async {
        guard let amountValue = Double(amount), amountValue > 0 else { return }
        isSaving = true
        let success = await viewModel.addTransaction(
            name: name, amount: amountValue, category: selectedCategory,
            accountId: affectsAccount ? selectedAccountId : nil,
            affectsAccount: affectsAccount, date: date, isRecurring: isRecurring
        )
        isSaving = false
        if success { dismiss() }
    }
}
