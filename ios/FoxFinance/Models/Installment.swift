import Foundation
import FirebaseFirestore

// MARK: - Installment Model
struct Installment: Identifiable, Codable {
    var id: String
    var userId: String
    var creditCardAccountId: String
    var description: String
    var totalAmount: Double
    var monthlyAmount: Double
    var numberOfMonths: Int
    var paidMonths: Int
    var startDate: Date
    var isActive: Bool
    var createdAt: Date

    var remainingMonths: Int {
        numberOfMonths - paidMonths
    }

    var remainingAmount: Double {
        Double(remainingMonths) * monthlyAmount
    }

    var paidAmount: Double {
        Double(paidMonths) * monthlyAmount
    }

    var progressPercentage: Double {
        guard numberOfMonths > 0 else { return 0 }
        return Double(paidMonths) / Double(numberOfMonths)
    }

    var nextPaymentDate: Date? {
        guard isActive, remainingMonths > 0 else { return nil }
        return Calendar.current.date(byAdding: .month, value: paidMonths + 1, to: startDate)
    }

    init(
        id: String = UUID().uuidString,
        userId: String,
        creditCardAccountId: String,
        description: String,
        totalAmount: Double,
        numberOfMonths: Int,
        paidMonths: Int = 0,
        startDate: Date = Date(),
        isActive: Bool = true,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.creditCardAccountId = creditCardAccountId
        self.description = description
        self.totalAmount = totalAmount
        self.monthlyAmount = totalAmount / Double(numberOfMonths)
        self.numberOfMonths = numberOfMonths
        self.paidMonths = paidMonths
        self.startDate = startDate
        self.isActive = isActive
        self.createdAt = createdAt
    }

    // MARK: - Firestore
    var firestoreData: [String: Any] {
        [
            "userId": userId,
            "creditCardAccountId": creditCardAccountId,
            "description": description,
            "totalAmount": totalAmount,
            "monthlyAmount": monthlyAmount,
            "numberOfMonths": numberOfMonths,
            "paidMonths": paidMonths,
            "startDate": Timestamp(date: startDate),
            "isActive": isActive,
            "createdAt": Timestamp(date: createdAt)
        ]
    }

    static func from(document: DocumentSnapshot) -> Installment? {
        guard let data = document.data() else { return nil }
        let startTs = data["startDate"] as? Timestamp
        let createdTs = data["createdAt"] as? Timestamp
        var installment = Installment(
            id: document.documentID,
            userId: data["userId"] as? String ?? "",
            creditCardAccountId: data["creditCardAccountId"] as? String ?? "",
            description: data["description"] as? String ?? "",
            totalAmount: data["totalAmount"] as? Double ?? 0,
            numberOfMonths: data["numberOfMonths"] as? Int ?? 1,
            paidMonths: data["paidMonths"] as? Int ?? 0,
            startDate: startTs?.dateValue() ?? Date(),
            isActive: data["isActive"] as? Bool ?? true,
            createdAt: createdTs?.dateValue() ?? Date()
        )
        // Override monthlyAmount from stored value if available
        if let stored = data["monthlyAmount"] as? Double {
            installment.monthlyAmount = stored
        }
        return installment
    }
}
