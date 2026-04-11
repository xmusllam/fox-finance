import SwiftUI

struct AddBankTemplateView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: SMSViewModel

    @State private var bankName = ""
    @State private var smsSender = ""
    @State private var rules: [PatternRule] = []
    @State private var showAddRule = false
    @State private var sampleSMS = ""
    @State private var testResult: SMSParseResult?
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Bank info
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("اسم البنك")
                                .font(.subheadline)
                                .foregroundStyle(.foxTextSecondary)
                            TextField("مثال: بنك مصر", text: $bankName)
                                .padding()
                                .background(Color.gray.opacity(0.06))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("معرّف المرسل في الـ SMS")
                                .font(.subheadline)
                                .foregroundStyle(.foxTextSecondary)
                            Text("هذا الاسم يظهر كمرسل الرسالة (مثل Bank-AlAhly)")
                                .font(.caption)
                                .foregroundStyle(.foxTextLight)
                            TextField("مثال: BankMisr", text: $smsSender)
                                .padding()
                                .background(Color.gray.opacity(0.06))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    }

                    Divider()

                    // Rules
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("قواعد التحليل")
                                .font(.headline)
                            Spacer()
                            Button { showAddRule = true } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "plus.circle.fill")
                                    Text("إضافة قاعدة")
                                }
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.foxGreen)
                            }
                        }

                        Text("كل قاعدة تحدد نوع عملية (إيداع/خصم) بناءً على كلمة مفتاحية في الرسالة")
                            .font(.caption)
                            .foregroundStyle(.foxTextSecondary)

                        if rules.isEmpty {
                            Text("لا توجد قواعد بعد. أضف قاعدة واحدة على الأقل.")
                                .font(.caption)
                                .foregroundStyle(.foxTextLight)
                                .padding()
                                .frame(maxWidth: .infinity)
                                .background(Color.gray.opacity(0.04))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        ForEach(rules) { rule in
                            ruleRow(rule)
                        }
                    }

                    Divider()

                    // Test section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("اختبار")
                            .font(.headline)
                        Text("الصق رسالة SMS من هذا البنك لاختبار القواعد")
                            .font(.caption)
                            .foregroundStyle(.foxTextSecondary)

                        TextEditor(text: $sampleSMS)
                            .font(.subheadline)
                            .frame(minHeight: 80)
                            .padding(12)
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))

                        Button {
                            testParsing()
                        } label: {
                            HStack {
                                Image(systemName: "play.fill")
                                Text("اختبار التحليل")
                            }
                            .font(.subheadline.weight(.medium))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.foxBlue.opacity(0.1))
                            .foregroundStyle(.foxBlue)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(sampleSMS.isEmpty || smsSender.isEmpty)

                        if let result = testResult {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(.foxGreen)
                                    Text("نجح التحليل!")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(.foxGreen)
                                }
                                Text("النوع: \(result.transactionType == .income ? "إيداع" : "خصم")")
                                    .font(.caption)
                                Text("المبلغ: \(result.amount.egp)")
                                    .font(.caption)
                                if let card = result.cardLastFour {
                                    Text("البطاقة: \(card)")
                                        .font(.caption)
                                }
                            }
                            .padding(12)
                            .background(Color.foxGreen.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
                .padding(20)
            }
            .background(Color.foxBg)
            .navigationTitle("إضافة بنك جديد")
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
                    .disabled(isSaving || bankName.isEmpty || smsSender.isEmpty || rules.isEmpty)
                }
            }
            .sheet(isPresented: $showAddRule) {
                AddRuleView { rule in
                    rules.append(rule)
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func ruleRow(_ rule: PatternRule) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(rule.transactionType == .income ? Color.foxGreen.opacity(0.15) : Color.foxRed.opacity(0.15))
                .frame(width: 32, height: 32)
                .overlay(
                    Image(systemName: rule.transactionType == .income ? "arrow.down" : "arrow.up")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(rule.transactionType == .income ? .foxGreen : .foxRed)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(rule.name)
                    .font(.subheadline.weight(.medium))
                Text("الكلمة المفتاحية: \(rule.keyword)")
                    .font(.caption)
                    .foregroundStyle(.foxTextSecondary)
            }

            Spacer()

            Button {
                rules.removeAll { $0.id == rule.id }
            } label: {
                Image(systemName: "trash")
                    .font(.caption)
                    .foregroundStyle(.foxRed)
            }
        }
        .padding(12)
        .background(Color.foxCard)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func testParsing() {
        let template = BankTemplate(
            bankName: bankName, smsSender: smsSender,
            rules: rules, isBuiltIn: false
        )
        testResult = SMSParserService.shared.parse(
            smsBody: sampleSMS, sender: smsSender,
            customTemplates: [template]
        )
    }

    private func save() async {
        guard let uid = FirebaseService.shared.currentUserId else { return }
        isSaving = true
        let template = BankTemplate(
            userId: uid, bankName: bankName, smsSender: smsSender,
            rules: rules, isBuiltIn: false
        )
        let success = await viewModel.addCustomTemplate(template)
        isSaving = false
        if success { dismiss() }
    }
}

// MARK: - Add Rule View
struct AddRuleView: View {
    @Environment(\.dismiss) private var dismiss
    var onSave: (PatternRule) -> Void

    @State private var name = ""
    @State private var transactionType: TransactionType = .expense
    @State private var keyword = ""
    @State private var amountPattern = ""
    @State private var cardPattern = ""
    @State private var balancePattern = ""
    @State private var merchantPattern = ""
    @State private var isDebitCard = true

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Name
                    VStack(alignment: .leading, spacing: 8) {
                        Text("اسم القاعدة")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        TextField("مثال: خصم من البطاقة", text: $name)
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    // Type
                    VStack(alignment: .leading, spacing: 8) {
                        Text("نوع العملية")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        HStack(spacing: 12) {
                            Button {
                                transactionType = .expense
                            } label: {
                                HStack {
                                    Image(systemName: "arrow.up.circle.fill")
                                    Text("خصم / مصروف")
                                }
                                .font(.subheadline.weight(.medium))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(transactionType == .expense ? Color.foxRed : Color.gray.opacity(0.08))
                                .foregroundStyle(transactionType == .expense ? .white : .foxTextPrimary)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }

                            Button {
                                transactionType = .income
                            } label: {
                                HStack {
                                    Image(systemName: "arrow.down.circle.fill")
                                    Text("إيداع / إيراد")
                                }
                                .font(.subheadline.weight(.medium))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(transactionType == .income ? Color.foxGreen : Color.gray.opacity(0.08))
                                .foregroundStyle(transactionType == .income ? .white : .foxTextPrimary)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                    }

                    // Keyword
                    VStack(alignment: .leading, spacing: 8) {
                        Text("الكلمة المفتاحية")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        Text("كلمة أو عبارة موجودة في الرسالة تحدد نوع العملية")
                            .font(.caption)
                            .foregroundStyle(.foxTextLight)
                        TextField("مثال: تم خصم", text: $keyword)
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    // Advanced patterns (collapsible)
                    DisclosureGroup("أنماط متقدمة (اختياري)") {
                        VStack(spacing: 12) {
                            patternField("نمط المبلغ (Regex)", text: $amountPattern,
                                        hint: #"مثال: مبلغ\s*([\d,]+\.?\d*)"#)
                            patternField("نمط رقم البطاقة", text: $cardPattern,
                                        hint: #"مثال: رقم\s*(\d{4})"#)
                            patternField("نمط الرصيد", text: $balancePattern,
                                        hint: #"مثال: المتاح\s*([\d,]+\.?\d*)"#)
                            patternField("نمط الجهة/التاجر", text: $merchantPattern,
                                        hint: #"مثال: عند\s+(.+?)\s+يوم"#)
                        }
                        .padding(.top, 8)
                    }
                    .font(.subheadline)
                    .tint(.foxGreen)

                    // Debit/Credit
                    VStack(alignment: .leading, spacing: 8) {
                        Text("نوع البطاقة (اختياري)")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        HStack(spacing: 12) {
                            chipButton("Debit / خصم مباشر", isSelected: isDebitCard) {
                                isDebitCard = true
                            }
                            chipButton("Credit / ائتمان", isSelected: !isDebitCard) {
                                isDebitCard = false
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(Color.foxBg)
            .navigationTitle("قاعدة جديدة")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إلغاء") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("إضافة") {
                        let rule = PatternRule(
                            name: name,
                            transactionType: transactionType,
                            keyword: keyword,
                            amountPattern: amountPattern,
                            cardPattern: cardPattern.isEmpty ? nil : cardPattern,
                            balancePattern: balancePattern.isEmpty ? nil : balancePattern,
                            merchantPattern: merchantPattern.isEmpty ? nil : merchantPattern,
                            isDebitCard: isDebitCard
                        )
                        onSave(rule)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(name.isEmpty || keyword.isEmpty)
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func patternField(_ title: String, text: Binding<String>, hint: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.foxTextSecondary)
            TextField(hint, text: text)
                .font(.system(.caption, design: .monospaced))
                .padding(10)
                .background(Color.gray.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private func chipButton(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? Color.foxBlue : Color.gray.opacity(0.08))
                .foregroundStyle(isSelected ? .white : .foxTextPrimary)
                .clipShape(Capsule())
        }
    }
}
