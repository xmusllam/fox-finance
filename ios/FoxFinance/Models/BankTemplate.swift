import Foundation
import FirebaseFirestore

// MARK: - SMS Transaction Result
struct SMSParseResult {
    var transactionType: TransactionType
    var amount: Double
    var cardLastFour: String?
    var merchantName: String?
    var availableBalance: Double?
    var senderName: String?
    var date: Date?
    var isDebitCard: Bool?
}

// MARK: - Pattern Rule
struct PatternRule: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var transactionType: TransactionType
    var keyword: String
    var amountPattern: String
    var cardPattern: String?
    var balancePattern: String?
    var merchantPattern: String?
    var isDebitCard: Bool?

    init(
        id: String = UUID().uuidString,
        name: String,
        transactionType: TransactionType,
        keyword: String,
        amountPattern: String = "",
        cardPattern: String? = nil,
        balancePattern: String? = nil,
        merchantPattern: String? = nil,
        isDebitCard: Bool? = nil
    ) {
        self.id = id
        self.name = name
        self.transactionType = transactionType
        self.keyword = keyword
        self.amountPattern = amountPattern
        self.cardPattern = cardPattern
        self.balancePattern = balancePattern
        self.merchantPattern = merchantPattern
        self.isDebitCard = isDebitCard
    }

    var firestoreData: [String: Any] {
        var data: [String: Any] = [
            "id": id,
            "name": name,
            "transactionType": transactionType.rawValue,
            "keyword": keyword,
            "amountPattern": amountPattern
        ]
        if let cardPattern { data["cardPattern"] = cardPattern }
        if let balancePattern { data["balancePattern"] = balancePattern }
        if let merchantPattern { data["merchantPattern"] = merchantPattern }
        if let isDebitCard { data["isDebitCard"] = isDebitCard }
        return data
    }

    static func from(dict: [String: Any]) -> PatternRule {
        PatternRule(
            id: dict["id"] as? String ?? UUID().uuidString,
            name: dict["name"] as? String ?? "",
            transactionType: TransactionType(rawValue: dict["transactionType"] as? String ?? "") ?? .expense,
            keyword: dict["keyword"] as? String ?? "",
            amountPattern: dict["amountPattern"] as? String ?? "",
            cardPattern: dict["cardPattern"] as? String,
            balancePattern: dict["balancePattern"] as? String,
            merchantPattern: dict["merchantPattern"] as? String,
            isDebitCard: dict["isDebitCard"] as? Bool
        )
    }
}

// MARK: - Bank Template
struct BankTemplate: Identifiable, Codable {
    var id: String
    var userId: String?
    var bankName: String
    var smsSender: String
    var rules: [PatternRule]
    var isBuiltIn: Bool
    var createdAt: Date

    init(
        id: String = UUID().uuidString,
        userId: String? = nil,
        bankName: String,
        smsSender: String,
        rules: [PatternRule],
        isBuiltIn: Bool = false,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.bankName = bankName
        self.smsSender = smsSender
        self.rules = rules
        self.isBuiltIn = isBuiltIn
        self.createdAt = createdAt
    }

    var firestoreData: [String: Any] {
        var data: [String: Any] = [
            "bankName": bankName,
            "smsSender": smsSender,
            "rules": rules.map { $0.firestoreData },
            "isBuiltIn": isBuiltIn,
            "createdAt": Timestamp(date: createdAt)
        ]
        if let userId { data["userId"] = userId }
        return data
    }

    static func from(document: DocumentSnapshot) -> BankTemplate? {
        guard let data = document.data() else { return nil }
        let createdTs = data["createdAt"] as? Timestamp
        let rulesData = data["rules"] as? [[String: Any]] ?? []
        return BankTemplate(
            id: document.documentID,
            userId: data["userId"] as? String,
            bankName: data["bankName"] as? String ?? "",
            smsSender: data["smsSender"] as? String ?? "",
            rules: rulesData.map { PatternRule.from(dict: $0) },
            isBuiltIn: data["isBuiltIn"] as? Bool ?? false,
            createdAt: createdTs?.dateValue() ?? Date()
        )
    }
}
