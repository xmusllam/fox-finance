import Foundation

extension Double {
    // MARK: - EGP Currency Formatting
    var egp: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.groupingSeparator = ","
        formatter.decimalSeparator = "."
        let formatted = formatter.string(from: NSNumber(value: self)) ?? String(format: "%.2f", self)
        return "\(formatted) ج.م"
    }

    var egpShort: String {
        if self >= 1_000_000 {
            return String(format: "%.1fM ج.م", self / 1_000_000)
        } else if self >= 1_000 {
            return String(format: "%.1fK ج.م", self / 1_000)
        }
        return egp
    }

    var egpSigned: String {
        let sign = self >= 0 ? "+" : ""
        return "\(sign)\(egp)"
    }

    /// Formats with no decimal if whole, 2 decimals otherwise
    var egpClean: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = ","
        formatter.decimalSeparator = "."
        if self.truncatingRemainder(dividingBy: 1) == 0 {
            formatter.minimumFractionDigits = 0
            formatter.maximumFractionDigits = 0
        } else {
            formatter.minimumFractionDigits = 2
            formatter.maximumFractionDigits = 2
        }
        let formatted = formatter.string(from: NSNumber(value: self)) ?? String(format: "%.2f", self)
        return "\(formatted) ج.م"
    }
}
