import Foundation
import FirebaseFirestore

// MARK: - Account Types
enum AccountType: String, Codable, CaseIterable, Identifiable {
    case bank = "بنك"
    case cash = "نقدي"
    case ewallet = "محفظة إلكترونية"
    case investment = "استثمار"
    case savings = "مدخرات"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .bank: return "building.columns"
        case .cash: return "banknote"
        case .ewallet: return "iphone"
        case .investment: return "chart.line.uptrend.xyaxis"
        case .savings: return "safe"
        }
    }
}

// MARK: - Account Model
struct Account: Identifiable, Codable {
    var id: String
    var userId: String
    var name: String
    var type: AccountType
    var balance: Double
    var bankName: String?
    var cardLastFour: String?
    var isCredit: Bool
    var creditLimit: Double
    var lastMonthDebt: Double
    var currentMonthDebt: Double
    var smsSender: String?
    var createdAt: Date

    var availableCredit: Double {
        isCredit ? creditLimit - currentMonthDebt - lastMonthDebt - totalActiveInstallmentsRemaining : balance
    }

    // This will be computed from installments, not stored
    var totalActiveInstallmentsRemaining: Double = 0

    enum CodingKeys: String, CodingKey {
        case id, userId, name, type, balance, bankName, cardLastFour
        case isCredit, creditLimit, lastMonthDebt, currentMonthDebt
        case smsSender, createdAt
    }

    init(
        id: String = UUID().uuidString,
        userId: String,
        name: String,
        type: AccountType = .bank,
        balance: Double = 0,
        bankName: String? = nil,
        cardLastFour: String? = nil,
        isCredit: Bool = false,
        creditLimit: Double = 0,
        lastMonthDebt: Double = 0,
        currentMonthDebt: Double = 0,
        smsSender: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.type = type
        self.balance = balance
        self.bankName = bankName
        self.cardLastFour = cardLastFour
        self.isCredit = isCredit
        self.creditLimit = creditLimit
        self.lastMonthDebt = lastMonthDebt
        self.currentMonthDebt = currentMonthDebt
        self.smsSender = smsSender
        self.createdAt = createdAt
    }

    // MARK: - Firestore Conversion
    var firestoreData: [String: Any] {
        var data: [String: Any] = [
            "userId": userId,
            "name": name,
            "type": type.rawValue,
            "balance": balance,
            "isCredit": isCredit,
            "creditLimit": creditLimit,
            "lastMonthDebt": lastMonthDebt,
            "currentMonthDebt": currentMonthDebt,
            "createdAt": Timestamp(date: createdAt)
        ]
        if let bankName { data["bankName"] = bankName }
        if let cardLastFour { data["cardLastFour"] = cardLastFour }
        if let smsSender { data["smsSender"] = smsSender }
        return data
    }

    static func from(document: DocumentSnapshot) -> Account? {
        guard let data = document.data() else { return nil }
        let timestamp = data["createdAt"] as? Timestamp
        return Account(
            id: document.documentID,
            userId: data["userId"] as? String ?? "",
            name: data["name"] as? String ?? "",
            type: AccountType(rawValue: data["type"] as? String ?? "") ?? .bank,
            balance: data["balance"] as? Double ?? 0,
            bankName: data["bankName"] as? String,
            cardLastFour: data["cardLastFour"] as? String,
            isCredit: data["isCredit"] as? Bool ?? false,
            creditLimit: data["creditLimit"] as? Double ?? 0,
            lastMonthDebt: data["lastMonthDebt"] as? Double ?? 0,
            currentMonthDebt: data["currentMonthDebt"] as? Double ?? 0,
            smsSender: data["smsSender"] as? String,
            createdAt: timestamp?.dateValue() ?? Date()
        )
    }
}
