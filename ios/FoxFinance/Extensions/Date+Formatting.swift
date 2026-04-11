import Foundation

extension Date {
    // MARK: - Arabic Formatters
    private static let arabicDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar_EG")
        f.dateFormat = "dd MMMM yyyy"
        return f
    }()

    private static let shortDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar_EG")
        f.dateFormat = "dd/MM/yyyy"
        return f
    }()

    private static let monthYearFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar_EG")
        f.dateFormat = "MMMM yyyy"
        return f
    }()

    private static let dayMonthFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar_EG")
        f.dateFormat = "dd MMMM"
        return f
    }()

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar_EG")
        f.dateFormat = "hh:mm a"
        return f
    }()

    var arabicDate: String { Date.arabicDateFormatter.string(from: self) }
    var shortDate: String { Date.shortDateFormatter.string(from: self) }
    var monthYear: String { Date.monthYearFormatter.string(from: self) }
    var dayMonth: String { Date.dayMonthFormatter.string(from: self) }
    var timeString: String { Date.timeFormatter.string(from: self) }

    // MARK: - Helpers
    var startOfDay: Date {
        Calendar.current.startOfDay(for: self)
    }

    var startOfMonth: Date {
        let components = Calendar.current.dateComponents([.year, .month], from: self)
        return Calendar.current.date(from: components) ?? self
    }

    var endOfMonth: Date {
        guard let next = Calendar.current.date(byAdding: .month, value: 1, to: startOfMonth) else { return self }
        return Calendar.current.date(byAdding: .day, value: -1, to: next) ?? self
    }

    var startOfYear: Date {
        let components = Calendar.current.dateComponents([.year], from: self)
        return Calendar.current.date(from: components) ?? self
    }

    var endOfYear: Date {
        var components = Calendar.current.dateComponents([.year], from: self)
        components.month = 12
        components.day = 31
        return Calendar.current.date(from: components) ?? self
    }

    var isToday: Bool {
        Calendar.current.isDateInToday(self)
    }

    var isYesterday: Bool {
        Calendar.current.isDateInYesterday(self)
    }

    var relativeLabel: String {
        if isToday { return "اليوم" }
        if isYesterday { return "أمس" }
        return dayMonth
    }

    // MARK: - SMS Date Parsing
    static func parseSMSDate(_ dateString: String) -> Date? {
        let formats = [
            "dd-MM", "dd/MM", "MM-dd", "dd-MM-yyyy",
            "dd/MM/yyyy", "dd-MMM-yyyy", "dd-MM-yy"
        ]
        for format in formats {
            let formatter = DateFormatter()
            formatter.dateFormat = format
            formatter.locale = Locale(identifier: "en_US_POSIX")
            if let date = formatter.date(from: dateString) {
                // If no year in format, use current year
                if !format.contains("yyyy") && !format.contains("yy") {
                    let currentYear = Calendar.current.component(.year, from: Date())
                    var components = Calendar.current.dateComponents([.month, .day], from: date)
                    components.year = currentYear
                    return Calendar.current.date(from: components)
                }
                return date
            }
        }
        return nil
    }
}
