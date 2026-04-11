import Foundation
import FirebaseFirestore

// MARK: - Transfer Model
struct Transfer: Identifiable, Codable {
    var id: String
    var userId: String
    var fromAccountId: String
    var toAccountId: String
    var amount: Double
    var note: String
    var date: Date
    var createdAt: Date

    init(
        id: String = UUID().uuidString,
        userId: String,
        fromAccountId: String,
        toAccountId: String,
        amount: Double,
        note: String = "",
        date: Date = Date(),
        createdAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.fromAccountId = fromAccountId
        self.toAccountId = toAccountId
        self.amount = amount
        self.note = note
        self.date = date
        self.createdAt = createdAt
    }

    var firestoreData: [String: Any] {
        [
            "userId": userId,
            "fromAccountId": fromAccountId,
            "toAccountId": toAccountId,
            "amount": amount,
            "note": note,
            "date": Timestamp(date: date),
            "createdAt": Timestamp(date: createdAt)
        ]
    }

    static func from(document: DocumentSnapshot) -> Transfer? {
        guard let data = document.data() else { return nil }
        let dateTs = data["date"] as? Timestamp
        let createdTs = data["createdAt"] as? Timestamp
        return Transfer(
            id: document.documentID,
            userId: data["userId"] as? String ?? "",
            fromAccountId: data["fromAccountId"] as? String ?? "",
            toAccountId: data["toAccountId"] as? String ?? "",
            amount: data["amount"] as? Double ?? 0,
            note: data["note"] as? String ?? "",
            date: dateTs?.dateValue() ?? Date(),
            createdAt: createdTs?.dateValue() ?? Date()
        )
    }
}
