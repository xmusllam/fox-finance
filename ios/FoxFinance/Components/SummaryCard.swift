import SwiftUI

struct SummaryCard: View {
    let title: String
    let value: Double
    let icon: String
    let gradient: LinearGradient
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(.white.opacity(0.9))
                Spacer()
            }

            Text(title)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.8))

            Text(value.egp)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            if let subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(gradient)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Compact Summary Row
struct SummaryRow: View {
    let title: String
    let value: Double
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
                .frame(width: 40, height: 40)
                .background(color.opacity(0.12))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.foxTextSecondary)
                Text(value.egp)
                    .font(.system(.body, design: .rounded, weight: .semibold))
                    .foregroundStyle(.foxTextPrimary)
            }

            Spacer()
        }
        .padding(14)
        .background(Color.foxCard)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }
}

// MARK: - Transaction Row
struct TransactionRow: View {
    let transaction: Transaction
    let accountName: String?

    var body: some View {
        HStack(spacing: 12) {
            // Type indicator
            Circle()
                .fill(transaction.type == .income ? Color.foxGreen.opacity(0.15) : Color.foxRed.opacity(0.15))
                .frame(width: 42, height: 42)
                .overlay(
                    Image(systemName: transaction.type == .income ? "arrow.down.left" : "arrow.up.right")
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(transaction.type == .income ? .foxGreen : .foxRed)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(transaction.name)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.foxTextPrimary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    Text(transaction.category)
                        .font(.caption)
                        .foregroundStyle(.foxTextSecondary)

                    if let acc = accountName {
                        Text("•")
                            .font(.caption2)
                            .foregroundStyle(.foxTextLight)
                        Text(acc)
                            .font(.caption)
                            .foregroundStyle(.foxTextSecondary)
                    }

                    if transaction.isAutoFromSMS {
                        Image(systemName: "message.fill")
                            .font(.caption2)
                            .foregroundStyle(.foxBlue)
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                Text(transaction.type == .income ? "+\(transaction.amount.egpClean)" : "-\(transaction.amount.egpClean)")
                    .font(.system(.subheadline, design: .rounded, weight: .semibold))
                    .foregroundStyle(transaction.type == .income ? .foxGreen : .foxRed)

                Text(transaction.date.relativeLabel)
                    .font(.caption2)
                    .foregroundStyle(.foxTextLight)
            }
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Account Card
struct AccountCard: View {
    let account: Account

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: account.isCredit ? "creditcard.fill" : account.type.icon)
                    .foregroundStyle(account.isCredit ? .foxOrange : .foxBlue)
                Text(account.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.foxTextPrimary)
                Spacer()
                if let card = account.cardLastFour {
                    Text("•••• \(card)")
                        .font(.caption.monospaced())
                        .foregroundStyle(.foxTextSecondary)
                }
            }

            if account.isCredit {
                // Credit card info
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("المديونية")
                            .font(.caption2)
                            .foregroundStyle(.foxTextSecondary)
                        Text((account.lastMonthDebt + account.currentMonthDebt).egp)
                            .font(.system(.callout, design: .rounded, weight: .bold))
                            .foregroundStyle(.foxOrange)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("الحد المتاح")
                            .font(.caption2)
                            .foregroundStyle(.foxTextSecondary)
                        Text(account.availableCredit.egp)
                            .font(.system(.callout, design: .rounded, weight: .bold))
                            .foregroundStyle(.foxGreen)
                    }
                }
            } else {
                Text(account.balance.egp)
                    .font(.system(.title3, design: .rounded, weight: .bold))
                    .foregroundStyle(.foxTextPrimary)
            }
        }
        .padding(16)
        .background(Color.foxCard)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
    }
}
