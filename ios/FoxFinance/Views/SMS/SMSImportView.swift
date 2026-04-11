import SwiftUI

struct SMSImportView: View {
    @StateObject private var viewModel = SMSViewModel()
    @State private var showBankTemplates = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header info
                infoHeader

                // Sender selection
                senderSection

                // SMS Text input
                smsInputSection

                // Parse & preview
                if let result = viewModel.parseResult {
                    previewSection(result)
                }

                // Messages
                if let success = viewModel.savedMessage {
                    messageCard(success, color: .foxGreen, icon: "checkmark.circle.fill")
                }
                if let error = viewModel.errorMessage {
                    messageCard(error, color: .foxRed, icon: "exclamationmark.circle.fill")
                }

                // Action buttons
                actionButtons

                Divider().padding(.vertical, 8)

                // Bank templates management
                bankTemplatesSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Color.foxBg)
        .task { await viewModel.loadData() }
        .sheet(isPresented: $showBankTemplates) {
            AddBankTemplateView(viewModel: viewModel)
        }
    }

    // MARK: - Info Header
    private var infoHeader: some View {
        VStack(spacing: 12) {
            Image(systemName: "message.badge.filled.fill")
                .font(.system(size: 40))
                .foregroundStyle(.foxGreen)

            Text("استيراد من SMS")
                .font(.title3.weight(.bold))

            Text("الصق رسالة SMS البنكية وسيتم تحليلها وتسجيل العملية تلقائياً")
                .font(.subheadline)
                .foregroundStyle(.foxTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 8)
    }

    // MARK: - Sender
    private var senderSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("المرسل (البنك)")
                .font(.subheadline)
                .foregroundStyle(.foxTextSecondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(viewModel.allTemplates) { template in
                        Button {
                            viewModel.senderName = template.smsSender
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "building.columns")
                                    .font(.caption2)
                                Text(template.bankName)
                                    .font(.caption.weight(.medium))
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                viewModel.senderName == template.smsSender
                                    ? Color.foxGreen : Color.gray.opacity(0.08)
                            )
                            .foregroundStyle(
                                viewModel.senderName == template.smsSender
                                    ? .white : .foxTextPrimary
                            )
                            .clipShape(Capsule())
                        }
                    }
                }
            }

            // Manual sender input
            TextField("أو اكتب اسم المرسل يدوياً", text: $viewModel.senderName)
                .font(.subheadline)
                .padding(12)
                .background(Color.gray.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - SMS Input
    private var smsInputSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("نص الرسالة")
                    .font(.subheadline)
                    .foregroundStyle(.foxTextSecondary)
                Spacer()
                Button {
                    if let clipboard = UIPasteboard.general.string {
                        viewModel.smsText = clipboard
                        viewModel.parseSMS()
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "doc.on.clipboard")
                        Text("لصق")
                    }
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.foxGreen)
                }
            }

            TextEditor(text: $viewModel.smsText)
                .font(.subheadline)
                .frame(minHeight: 100)
                .padding(12)
                .background(Color.gray.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .onChange(of: viewModel.smsText) { _, _ in
                    viewModel.parseSMS()
                }
        }
    }

    // MARK: - Preview
    private func previewSection(_ result: SMSParseResult) -> some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundStyle(.foxGreen)
                Text("تم التعرف على العملية")
                    .font(.subheadline.weight(.semibold))
                Spacer()
            }

            VStack(spacing: 8) {
                previewRow("النوع", value: result.transactionType == .income ? "إيداع ↓" : "خصم ↑",
                          color: result.transactionType == .income ? .foxGreen : .foxRed)
                previewRow("المبلغ", value: result.amount.egp, color: .foxTextPrimary)
                if let card = result.cardLastFour {
                    previewRow("البطاقة", value: "•••• \(card)", color: .foxBlue)
                }
                if let merchant = result.merchantName {
                    previewRow("الجهة", value: merchant, color: .foxTextPrimary)
                }
                if let balance = result.availableBalance {
                    previewRow("الرصيد المتاح", value: balance.egp, color: .foxTextSecondary)
                }
                if let isDebit = result.isDebitCard {
                    previewRow("نوع البطاقة", value: isDebit ? "خصم مباشر (Debit)" : "ائتمان (Credit)",
                              color: .foxTextSecondary)
                }
                if let account = viewModel.matchedAccount {
                    previewRow("الحساب", value: account.name, color: .foxGreen)
                } else {
                    previewRow("الحساب", value: "⚠️ لم يتم العثور على حساب مطابق", color: .foxOrange)
                }
            }
        }
        .padding(16)
        .background(Color.foxGreen.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func previewRow(_ label: String, value: String, color: Color) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(.foxTextSecondary)
                .frame(width: 80, alignment: .leading)
            Text(value)
                .font(.caption.weight(.medium))
                .foregroundStyle(color)
            Spacer()
        }
    }

    // MARK: - Action Buttons
    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button {
                viewModel.smsText = ""
                viewModel.senderName = ""
                viewModel.parseResult = nil
                viewModel.matchedAccount = nil
                viewModel.savedMessage = nil
                viewModel.errorMessage = nil
            } label: {
                HStack {
                    Image(systemName: "xmark")
                    Text("مسح")
                }
                .font(.subheadline.weight(.medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.gray.opacity(0.1))
                .foregroundStyle(.foxTextSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            Button {
                Task { await viewModel.saveTransaction() }
            } label: {
                HStack {
                    if viewModel.isSaving {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: "square.and.arrow.down")
                        Text("حفظ العملية")
                    }
                }
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(viewModel.parseResult != nil ? LinearGradient.foxPrimary : LinearGradient(colors: [.gray.opacity(0.3)], startPoint: .leading, endPoint: .trailing))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(viewModel.parseResult == nil || viewModel.isSaving)
        }
    }

    // MARK: - Bank Templates
    private var bankTemplatesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("البنوك المدعومة")
                    .font(.headline)
                Spacer()
                Button { showBankTemplates = true } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus.circle.fill")
                        Text("إضافة بنك")
                    }
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.foxGreen)
                }
            }

            ForEach(viewModel.allTemplates) { template in
                HStack(spacing: 12) {
                    Image(systemName: "building.columns.fill")
                        .foregroundStyle(template.isBuiltIn ? .foxBlue : .foxPurple)
                        .frame(width: 36, height: 36)
                        .background((template.isBuiltIn ? Color.foxBlue : Color.foxPurple).opacity(0.1))
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 2) {
                        Text(template.bankName)
                            .font(.subheadline.weight(.medium))
                        Text("المرسل: \(template.smsSender)")
                            .font(.caption)
                            .foregroundStyle(.foxTextSecondary)
                        Text("\(template.rules.count) أنماط")
                            .font(.caption2)
                            .foregroundStyle(.foxTextLight)
                    }

                    Spacer()

                    if template.isBuiltIn {
                        Text("مدمج")
                            .font(.caption2)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.foxBlue.opacity(0.1))
                            .foregroundStyle(.foxBlue)
                            .clipShape(Capsule())
                    } else {
                        Button {
                            Task { await viewModel.deleteCustomTemplate(template.id) }
                        } label: {
                            Image(systemName: "trash")
                                .font(.caption)
                                .foregroundStyle(.foxRed)
                        }
                    }
                }
                .padding(12)
                .background(Color.foxCard)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func messageCard(_ text: String, color: Color, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(text)
                .font(.callout)
                .foregroundStyle(color)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
