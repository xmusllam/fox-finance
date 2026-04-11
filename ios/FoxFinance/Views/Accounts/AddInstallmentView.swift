import SwiftUI

struct AddInstallmentView: View {
    @Environment(\.dismiss) private var dismiss
    let accountId: String
    let accountName: String
    @ObservedObject var viewModel: AccountsViewModel

    @State private var description = ""
    @State private var totalAmount = ""
    @State private var numberOfMonths = ""
    @State private var isSaving = false

    private var monthlyAmount: Double {
        guard let total = Double(totalAmount),
              let months = Int(numberOfMonths),
              months > 0 else { return 0 }
        return total / Double(months)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Info header
                    VStack(spacing: 8) {
                        Image(systemName: "calendar.badge.plus")
                            .font(.system(size: 40))
                            .foregroundStyle(.foxOrange)
                        Text("تقسيط جديد")
                            .font(.title3.weight(.bold))
                        Text("على بطاقة: \(accountName)")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                    }
                    .padding(.top, 10)

                    // Description
                    VStack(alignment: .leading, spacing: 8) {
                        Text("وصف المشتريات")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        TextField("مثال: آيفون 16 برو", text: $description)
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    // Total Amount
                    VStack(alignment: .leading, spacing: 8) {
                        Text("المبلغ الإجمالي")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        HStack {
                            TextField("12000", text: $totalAmount)
                                .keyboardType(.decimalPad)
                                .font(.system(size: 24, weight: .bold, design: .rounded))
                            Text("ج.م")
                                .foregroundStyle(.foxTextSecondary)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    // Number of months
                    VStack(alignment: .leading, spacing: 8) {
                        Text("عدد الأشهر")
                            .font(.subheadline)
                            .foregroundStyle(.foxTextSecondary)
                        TextField("12", text: $numberOfMonths)
                            .keyboardType(.numberPad)
                            .padding()
                            .background(Color.gray.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    // Preview
                    if monthlyAmount > 0 {
                        VStack(spacing: 12) {
                            Divider()
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("القسط الشهري")
                                        .font(.caption)
                                        .foregroundStyle(.foxTextSecondary)
                                    Text(monthlyAmount.egp)
                                        .font(.system(.title2, design: .rounded, weight: .bold))
                                        .foregroundStyle(.foxOrange)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text("يُخصم من الحد")
                                        .font(.caption)
                                        .foregroundStyle(.foxTextSecondary)
                                    Text((Double(totalAmount) ?? 0).egp)
                                        .font(.system(.body, design: .rounded, weight: .semibold))
                                        .foregroundStyle(.foxRed)
                                }
                            }

                            // Explanation
                            HStack(spacing: 8) {
                                Image(systemName: "info.circle.fill")
                                    .foregroundStyle(.foxBlue)
                                Text("سيتم خصم \((Double(totalAmount) ?? 0).egpClean) من الحد الائتماني. كل شهر يُضاف القسط للمديونية، وعند السداد يعود الحد.")
                                    .font(.caption)
                                    .foregroundStyle(.foxTextSecondary)
                            }
                            .padding(12)
                            .background(Color.foxBlue.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
                .padding(20)
            }
            .background(Color.foxBg)
            .navigationTitle("تقسيط جديد")
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
                            Text("إضافة")
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(isSaving || description.isEmpty || totalAmount.isEmpty || numberOfMonths.isEmpty)
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func save() async {
        guard let total = Double(totalAmount), let months = Int(numberOfMonths), months > 0 else { return }
        isSaving = true
        let success = await viewModel.addInstallment(
            creditCardAccountId: accountId,
            description: description,
            totalAmount: total,
            numberOfMonths: months
        )
        isSaving = false
        if success { dismiss() }
    }
}
