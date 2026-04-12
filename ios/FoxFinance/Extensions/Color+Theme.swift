import SwiftUI

// MARK: - Fox Finance Theme Colors
extension Color {
    // Primary
    static let foxGreen = Color(red: 16/255, green: 185/255, blue: 129/255)       // #10b981 emerald-500
    static let foxGreenDark = Color(red: 5/255, green: 150/255, blue: 105/255)    // #059669 emerald-600
    static let foxGreenLight = Color(red: 167/255, green: 243/255, blue: 208/255) // #a7f3d0 emerald-200

    // Backgrounds
    static let foxBg = Color(red: 249/255, green: 250/255, blue: 251/255)         // #f9fafb gray-50
    static let foxCard = Color.white
    static let foxDarkBg = Color(red: 17/255, green: 24/255, blue: 39/255)        // #111827 gray-900

    // Status
    static let foxRed = Color(red: 239/255, green: 68/255, blue: 68/255)          // #ef4444 red-500
    static let foxOrange = Color(red: 249/255, green: 115/255, blue: 22/255)      // #f97316 orange-500
    static let foxBlue = Color(red: 59/255, green: 130/255, blue: 246/255)        // #3b82f6 blue-500
    static let foxIndigo = Color(red: 99/255, green: 102/255, blue: 241/255)      // #6366f1 indigo-500
    static let foxPurple = Color(red: 168/255, green: 85/255, blue: 247/255)      // #a855f7 purple-500
    static let foxTeal = Color(red: 20/255, green: 184/255, blue: 166/255)        // #14b8a6 teal-500
    static let foxAmber = Color(red: 245/255, green: 158/255, blue: 11/255)       // #f59e0b amber-500

    // Text
    static let foxTextPrimary = Color(red: 17/255, green: 24/255, blue: 39/255)   // #111827
    static let foxTextSecondary = Color(red: 107/255, green: 114/255, blue: 128/255) // #6b7280
    static let foxTextLight = Color(red: 156/255, green: 163/255, blue: 175/255)  // #9ca3af
}

// MARK: - ShapeStyle Compatibility
extension ShapeStyle where Self == Color {
    static var foxGreen: Color { Color.foxGreen }
    static var foxGreenDark: Color { Color.foxGreenDark }
    static var foxGreenLight: Color { Color.foxGreenLight }
    static var foxBg: Color { Color.foxBg }
    static var foxCard: Color { Color.foxCard }
    static var foxDarkBg: Color { Color.foxDarkBg }
    static var foxRed: Color { Color.foxRed }
    static var foxOrange: Color { Color.foxOrange }
    static var foxBlue: Color { Color.foxBlue }
    static var foxIndigo: Color { Color.foxIndigo }
    static var foxPurple: Color { Color.foxPurple }
    static var foxTeal: Color { Color.foxTeal }
    static var foxAmber: Color { Color.foxAmber }
    static var foxTextPrimary: Color { Color.foxTextPrimary }
    static var foxTextSecondary: Color { Color.foxTextSecondary }
    static var foxTextLight: Color { Color.foxTextLight }
}

// MARK: - Gradient Presets
extension LinearGradient {
    static let foxPrimary = LinearGradient(
        colors: [.foxGreen, .foxGreenDark],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
    static let foxIncome = LinearGradient(
        colors: [.foxGreen, Color(red: 6/255, green: 182/255, blue: 212/255)],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
    static let foxExpense = LinearGradient(
        colors: [.foxRed, .foxOrange],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
    static let foxBlueGradient = LinearGradient(
        colors: [.foxBlue, .foxIndigo],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
    static let foxPurpleGradient = LinearGradient(
        colors: [.foxPurple, .foxIndigo],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
}
