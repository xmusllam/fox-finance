import Foundation
import FirebaseFirestore

// MARK: - Category Group Model
struct CategoryGroup: Identifiable, Codable {
    var id: String
    var userId: String
    var type: TransactionType
    var categories: [String]

    init(
        id: String = UUID().uuidString,
        userId: String,
        type: TransactionType,
        categories: [String]
    ) {
        self.id = id
        self.userId = userId
        self.type = type
        self.categories = categories
    }

    var firestoreData: [String: Any] {
        [
            "userId": userId,
            "type": type.rawValue,
            "categories": categories
        ]
    }

    static func from(document: DocumentSnapshot) -> CategoryGroup? {
        guard let data = document.data() else { return nil }
        return CategoryGroup(
            id: document.documentID,
            userId: data["userId"] as? String ?? "",
            type: TransactionType(rawValue: data["type"] as? String ?? "") ?? .income,
            categories: data["categories"] as? [String] ?? []
        )
    }

    // MARK: - Default Categories
    static let defaultIncomeCategories = ["راتب", "أرباح", "استثمار", "هدية", "أخرى"]
    static let defaultExpenseCategories = ["إيجار", "فواتير", "أقساط", "طعام", "مواصلات", "ترفيه", "صحة", "مصروفات عامة"]
}
