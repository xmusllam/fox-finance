import Foundation
import FirebaseFirestore

// MARK: - Transaction Type
enum TransactionType: String, Codable {
    case income = "income"
    case expense = "expense"
}

// MARK: - Transaction Model
struct Transaction: Identifiable, Codable {
    var id: String
    var userId: String
    var type: TransactionType
    var amount: Double
    var name: String
    var category: String
    var accountId: String?
    var affectsAccount: Bool
    var date: Date
    var isRecurring: Bool
    var isAutoFromSMS: Bool
    var smsSender: String?
    var smsBody: String?
    var merchantName: String?
    var cardLastFour: String?
    var createdAt: Date

    init(
        id: String = UUID().uuidString,
        userId: String,
        type: TransactionType,
        amount: Double,
        name: String,
        category: String = "",
        accountId: String? = nil,
        affectsAccount: Bool = true,
        date: Date = Date(),
        isRecurring: Bool = false,
        isAutoFromSMS: Bool = false,
        smsSender: String? = nil,
        smsBody: String? = nil,
        merchantName: String? = nil,
        cardLastFour: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.type = type
        self.amount = amount
        self.name = name
        self.category = category
        self.accountId = accountId
        self.affectsAccount = affectsAccount
        self.date = date
        self.isRecurring = isRecurring
        self.isAutoFromSMS = isAutoFromSMS
        self.smsSender = smsSender
        self.smsBody = smsBody
        self.merchantName = merchantName
        self.cardLastFour = cardLastFour
        self.createdAt = createdAt
    }

    // MARK: - Firestore
    var firestoreData: [String: Any] {
        var data: [String: Any] = [
            "userId": userId,
            "type": type.rawValue,
            "amount": amount,
            "name": name,
            "category": category,
            "affectsAccount": affectsAccount,
            "date": Timestamp(date: date),
            "isRecurring": isRecurring,
            "isAutoFromSMS": isAutoFromSMS,
            "createdAt": Timestamp(date: createdAt)
        ]
        if let accountId { data["accountId"] = accountId }
        if let smsSender { data["smsSender"] = smsSender }
        if let smsBody { data["smsBody"] = smsBody }
        if let merchantName { data["merchantName"] = merchantName }
        if let cardLastFour { data["cardLastFour"] = cardLastFour }
        return data
    }

    // Firestore collection name based on type
    var collectionName: String {
        type == .income ? "incomes" : "expenses"
    }

    static func from(document: DocumentSnapshot, type: TransactionType) -> Transaction? {
        guard let data = document.data() else { return nil }
        let dateTs = data["date"] as? Timestamp
        let createdTs = data["createdAt"] as? Timestamp
        return Transaction(
            id: document.documentID,
            userId: data["userId"] as? String ?? "",
            type: type,
            amount: data["amount"] as? Double ?? 0,
            name: data["name"] as? String ?? "",
            category: data["category"] as? String ?? "",
            accountId: data["accountId"] as? String,
            affectsAccount: data["affectsAccount"] as? Bool ?? true,
            date: dateTs?.dateValue() ?? Date(),
            isRecurring: data["isRecurring"] as? Bool ?? false,
            isAutoFromSMS: data["isAutoFromSMS"] as? Bool ?? false,
            smsSender: data["smsSender"] as? String,
            smsBody: data["smsBody"] as? String,
            merchantName: data["merchantName"] as? String,
            cardLastFour: data["cardLastFour"] as? String,
            createdAt: createdTs?.dateValue() ?? Date()
        )
    }
}
