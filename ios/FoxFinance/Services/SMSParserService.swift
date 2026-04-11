import Foundation

// MARK: - SMS Parser Service
class SMSParserService {

    static let shared = SMSParserService()

    // MARK: - Built-in Bank Templates
    static let builtInTemplates: [BankTemplate] = [
        bankAlAhlyTemplate,
        bankNXTTemplate,
        arabBankTemplate,
        vfCashTemplate
    ]

    // MARK: - Main Parse Function
    func parse(smsBody: String, sender: String, customTemplates: [BankTemplate] = []) -> SMSParseResult? {
        let allTemplates = SMSParserService.builtInTemplates + customTemplates
        let normalizedSender = sender.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        // Find matching template
        guard let template = allTemplates.first(where: {
            normalizedSender.contains($0.smsSender.lowercased()) ||
            $0.smsSender.lowercased().contains(normalizedSender)
        }) else {
            // Try generic parsing if no template matches
            return parseGeneric(smsBody: smsBody, sender: sender)
        }

        // Try built-in parser first for known banks
        if template.isBuiltIn {
            switch template.smsSender.lowercased() {
            case "bank-alahly":
                return parseBankAlAhly(smsBody)
            case "bank nxt":
                return parseBankNXT(smsBody)
            case "arabbank":
                return parseArabBank(smsBody)
            case "vf-cash":
                return parseVFCash(smsBody)
            default:
                break
            }
        }

        // Use template rules for custom banks
        return parseWithTemplate(smsBody: smsBody, template: template)
    }

    // MARK: - Bank Al-Ahly Parser
    private func parseBankAlAhly(_ text: String) -> SMSParseResult? {
        // Type 1: Deposit (instant transfer IN)
        // "تم إضافة تحويل لحظي لحسابكم رقم 0100 بمبلغ 7900.00 جم من HASSAN رقم مرجعي 000 يوم 04-11 الساعة 20:06"
        if text.contains("تم إضافة") || text.contains("تم اضافة") {
            let amount = extractAmount(from: text, patterns: [
                #"بمبلغ\s*([\d,]+\.?\d*)\s*(?:جم|EGP|ج\.م)"#
            ])
            let card = extractPattern(from: text, pattern: #"حسابكم رقم\s*(\d{4})"#)
            let merchant = extractPattern(from: text, pattern: #"من\s+(.+?)\s+رقم مرجعي"#)
            let dateStr = extractPattern(from: text, pattern: #"يوم\s*(\d{2}-\d{2})"#)

            if let amount {
                return SMSParseResult(
                    transactionType: .income,
                    amount: amount,
                    cardLastFour: card,
                    merchantName: merchant?.trimmingCharacters(in: .whitespaces),
                    senderName: merchant?.trimmingCharacters(in: .whitespaces),
                    date: dateStr.flatMap { Date.parseSMSDate($0) },
                    isDebitCard: true
                )
            }
        }

        // Type 2: Debit card charge
        // "تم خصم 3000.00EGP من بطاقة الخصم المباشر رقم 3600 عند NBE ATM002 يوم 09/04 الساعه 18:40 المتاح 45193.82"
        if text.contains("بطاقة الخصم المباشر") || text.contains("بطاقه الخصم المباشر") {
            let amount = extractAmount(from: text, patterns: [
                #"تم خصم\s*([\d,]+\.?\d*)\s*(?:EGP|جم|ج\.م)"#
            ])
            let card = extractPattern(from: text, pattern: #"(?:الخصم المباشر|الخصم) رقم\s*(\d{4})"#)
            let merchant = extractPattern(from: text, pattern: #"عند\s+(.+?)\s+يوم"#)
            let balance = extractAmount(from: text, patterns: [#"المتاح\s*([\d,]+\.?\d*)"#])
            let dateStr = extractPattern(from: text, pattern: #"يوم\s*(\d{2}/\d{2})"#)

            if let amount {
                return SMSParseResult(
                    transactionType: .expense,
                    amount: amount,
                    cardLastFour: card,
                    merchantName: merchant?.trimmingCharacters(in: .whitespaces),
                    availableBalance: balance,
                    date: dateStr.flatMap { Date.parseSMSDate($0) },
                    isDebitCard: true
                )
            }
        }

        // Type 3: Debit transfer OUT
        // "تم تنفيذ تحويل لحظي من حسابكم رقم 0100 بمبلغ 2250.00 جم إلى ماجده رقم مرجعي 000 يوم 04-10 الساعة 18:59"
        if text.contains("تم تنفيذ تحويل") {
            let amount = extractAmount(from: text, patterns: [
                #"بمبلغ\s*([\d,]+\.?\d*)\s*(?:جم|EGP|ج\.م)"#
            ])
            let card = extractPattern(from: text, pattern: #"حسابكم رقم\s*(\d{4})"#)
            let merchant = extractPattern(from: text, pattern: #"إلى\s+(.+?)\s+رقم مرجعي"#) ??
                           extractPattern(from: text, pattern: #"الى\s+(.+?)\s+رقم مرجعي"#)
            let dateStr = extractPattern(from: text, pattern: #"يوم\s*(\d{2}-\d{2})"#)

            if let amount {
                return SMSParseResult(
                    transactionType: .expense,
                    amount: amount,
                    cardLastFour: card,
                    merchantName: merchant?.trimmingCharacters(in: .whitespaces),
                    senderName: merchant?.trimmingCharacters(in: .whitespaces),
                    date: dateStr.flatMap { Date.parseSMSDate($0) },
                    isDebitCard: true
                )
            }
        }

        // Type 4: Credit card charge
        // "تم خصم 140 جم من بطاقة الائتمان رقم 3717 بإستخدام Mobile payment عند CHILL OUT يوم 04-11 الساعة 17:26 المتاح 3898.18 جم"
        if text.contains("بطاقة الائتمان") || text.contains("بطاقه الائتمان") {
            let amount = extractAmount(from: text, patterns: [
                #"تم خصم\s*([\d,]+\.?\d*)\s*(?:جم|EGP|ج\.م)"#,
                #"خصم\s*([\d,]+\.?\d*)\s*(?:جم|EGP|ج\.م)"#
            ])
            let card = extractPattern(from: text, pattern: #"(?:الائتمان|الإئتمان) رقم\s*(\d{4})"#)
            let merchant = extractPattern(from: text, pattern: #"عند\s+(.+?)\s+يوم"#)
            let balance = extractAmount(from: text, patterns: [#"المتاح\s*([\d,]+\.?\d*)"#])
            let dateStr = extractPattern(from: text, pattern: #"يوم\s*(\d{2}-\d{2})"#)

            if let amount {
                return SMSParseResult(
                    transactionType: .expense,
                    amount: amount,
                    cardLastFour: card,
                    merchantName: merchant?.trimmingCharacters(in: .whitespaces),
                    availableBalance: balance,
                    date: dateStr.flatMap { Date.parseSMSDate($0) },
                    isDebitCard: false
                )
            }
        }

        // Fallback: generic charge from Al-Ahly
        if text.contains("تم خصم") {
            let amount = extractAmount(from: text, patterns: [
                #"تم خصم\s*([\d,]+\.?\d*)\s*(?:EGP|جم|ج\.م)"#,
                #"خصم\s*([\d,]+\.?\d*)"#
            ])
            let card = extractPattern(from: text, pattern: #"رقم\s*(\d{4})"#)
            let balance = extractAmount(from: text, patterns: [#"المتاح\s*([\d,]+\.?\d*)"#])

            if let amount {
                return SMSParseResult(
                    transactionType: .expense,
                    amount: amount,
                    cardLastFour: card,
                    availableBalance: balance,
                    isDebitCard: nil
                )
            }
        }

        return nil
    }

    // MARK: - Bank NXT Parser
    private func parseBankNXT(_ text: String) -> SMSParseResult? {
        // "Dear MOHAMED, your card ending **9915 was charged at Talabat with EGP 315.00 on 11-04-2026. Your new available balance EGP 20,832"
        if text.contains("was charged at") || text.contains("was charged") {
            let amount = extractAmount(from: text, patterns: [
                #"EGP\s*([\d,]+\.?\d*)"#,
                #"with\s*EGP\s*([\d,]+\.?\d*)"#
            ])
            let card = extractPattern(from: text, pattern: #"ending\s*\*{0,2}(\d{4})"#)
            let merchant = extractPattern(from: text, pattern: #"charged at\s+(.+?)\s+with"#)
            let balance = extractAmount(from: text, patterns: [#"balance\s*EGP\s*([\d,]+\.?\d*)"#])
            let dateStr = extractPattern(from: text, pattern: #"on\s+(\d{2}-\d{2}-\d{4})"#)

            if let amount {
                return SMSParseResult(
                    transactionType: .expense,
                    amount: amount,
                    cardLastFour: card,
                    merchantName: merchant?.trimmingCharacters(in: .whitespaces),
                    availableBalance: balance,
                    date: dateStr.flatMap { Date.parseSMSDate($0) },
                    isDebitCard: nil
                )
            }
        }

        // Deposit pattern
        if text.contains("was credited") || text.contains("received") {
            let amount = extractAmount(from: text, patterns: [
                #"EGP\s*([\d,]+\.?\d*)"#
            ])
            let card = extractPattern(from: text, pattern: #"ending\s*\*{0,2}(\d{4})"#)
            let balance = extractAmount(from: text, patterns: [#"balance\s*EGP\s*([\d,]+\.?\d*)"#])

            if let amount {
                return SMSParseResult(
                    transactionType: .income,
                    amount: amount,
                    cardLastFour: card,
                    availableBalance: balance,
                    isDebitCard: nil
                )
            }
        }

        return nil
    }

    // MARK: - Arab Bank Parser
    private func parseArabBank(_ text: String) -> SMSParseResult? {
        // "A Trx using Card XXXX6733 from APPLE COM BILL for EGP 360.48 on 11-Apr-2026 at 07:59 GMT+2. Available balance is EGP 49227.31"
        if text.contains("A Trx using Card") || text.contains("Trx using Card") {
            let amount = extractAmount(from: text, patterns: [
                #"for\s*EGP\s*([\d,]+\.?\d*)"#
            ])
            let card = extractPattern(from: text, pattern: #"Card\s*(?:XXXX|X{4}|x{4}|\*{4})(\d{4})"#)
            let merchant = extractPattern(from: text, pattern: #"from\s+(.+?)\s+for"#)
            let balance = extractAmount(from: text, patterns: [#"balance\s*(?:is\s*)?EGP\s*([\d,]+\.?\d*)"#])
            let dateStr = extractPattern(from: text, pattern: #"on\s+(\d{2}-\w{3}-\d{4})"#)

            if let amount {
                return SMSParseResult(
                    transactionType: .expense,
                    amount: amount,
                    cardLastFour: card,
                    merchantName: merchant?.trimmingCharacters(in: .whitespaces),
                    availableBalance: balance,
                    date: dateStr.flatMap { parseDateFlexible($0) },
                    isDebitCard: nil
                )
            }
        }

        // Credit/deposit pattern
        if text.contains("credited") || text.contains("Credit") {
            let amount = extractAmount(from: text, patterns: [#"EGP\s*([\d,]+\.?\d*)"#])
            let card = extractPattern(from: text, pattern: #"Card\s*(?:XXXX|X{4})(\d{4})"#)
            let balance = extractAmount(from: text, patterns: [#"balance\s*(?:is\s*)?EGP\s*([\d,]+\.?\d*)"#])

            if let amount {
                return SMSParseResult(
                    transactionType: .income,
                    amount: amount,
                    cardLastFour: card,
                    availableBalance: balance,
                    isDebitCard: nil
                )
            }
        }

        return nil
    }

    // MARK: - Vodafone Cash Parser
    private func parseVFCash(_ text: String) -> SMSParseResult? {
        // Payment: "تم دفع مبلغ 413.0جنية لCai-Resta. رصيد محفظتك الحالي 1389.84 جنيه..."
        if text.contains("تم دفع مبلغ") {
            let amount = extractAmount(from: text, patterns: [
                #"تم دفع مبلغ\s*([\d,]+\.?\d*)(?:جنية|جنيه)"#,
                #"تم دفع مبلغ\s*([\d,]+\.?\d*)"#
            ])
            let merchant = extractPattern(from: text, pattern: #"(?:جنية|جنيه)\s*ل(.+?)\."#) ??
                           extractPattern(from: text, pattern: #"ل(.+?)\.\s*رصيد"#)
            let balance = extractAmount(from: text, patterns: [
                #"رصيد محفظتك الحالي\s*([\d,]+\.?\d*)"#
            ])

            if let amount {
                return SMSParseResult(
                    transactionType: .expense,
                    amount: amount,
                    merchantName: merchant?.trimmingCharacters(in: .whitespaces),
                    availableBalance: balance,
                    isDebitCard: nil
                )
            }
        }

        // Receive money: "تم استلام مبلغ..."
        if text.contains("تم استلام") || text.contains("تم إيداع") || text.contains("تم ايداع") {
            let amount = extractAmount(from: text, patterns: [
                #"مبلغ\s*([\d,]+\.?\d*)(?:جنية|جنيه)"#,
                #"مبلغ\s*([\d,]+\.?\d*)"#
            ])
            let balance = extractAmount(from: text, patterns: [
                #"رصيد محفظتك الحالي\s*([\d,]+\.?\d*)"#
            ])

            if let amount {
                return SMSParseResult(
                    transactionType: .income,
                    amount: amount,
                    availableBalance: balance,
                    isDebitCard: nil
                )
            }
        }

        // Transfer out: "تم تحويل مبلغ..."
        if text.contains("تم تحويل") {
            let amount = extractAmount(from: text, patterns: [
                #"مبلغ\s*([\d,]+\.?\d*)(?:جنية|جنيه)"#,
                #"مبلغ\s*([\d,]+\.?\d*)"#
            ])
            let balance = extractAmount(from: text, patterns: [
                #"رصيد محفظتك الحالي\s*([\d,]+\.?\d*)"#
            ])

            if let amount {
                return SMSParseResult(
                    transactionType: .expense,
                    amount: amount,
                    availableBalance: balance,
                    isDebitCard: nil
                )
            }
        }

        return nil
    }

    // MARK: - Template-based Parser (Custom Banks)
    private func parseWithTemplate(smsBody: String, template: BankTemplate) -> SMSParseResult? {
        for rule in template.rules {
            guard smsBody.contains(rule.keyword) else { continue }

            // Extract amount
            var amount: Double?
            if !rule.amountPattern.isEmpty {
                amount = extractAmount(from: smsBody, patterns: [rule.amountPattern])
            }
            if amount == nil {
                // Fallback: find any number near currency keywords
                amount = extractAmount(from: smsBody, patterns: [
                    #"([\d,]+\.?\d*)\s*(?:جم|EGP|جنيه|جنية|ج\.م|LE)"#,
                    #"(?:EGP|LE)\s*([\d,]+\.?\d*)"#
                ])
            }

            guard let finalAmount = amount else { continue }

            // Extract card number
            var card: String?
            if let cardPattern = rule.cardPattern, !cardPattern.isEmpty {
                card = extractPattern(from: smsBody, pattern: cardPattern)
            }
            if card == nil {
                card = extractPattern(from: smsBody, pattern: #"(?:رقم|ending|Card\s*(?:XXXX)?)\s*\*{0,4}(\d{4})"#)
            }

            // Extract balance
            var balance: Double?
            if let balancePattern = rule.balancePattern, !balancePattern.isEmpty {
                balance = extractAmount(from: smsBody, patterns: [balancePattern])
            }
            if balance == nil {
                balance = extractAmount(from: smsBody, patterns: [
                    #"(?:المتاح|رصيد|balance)\s*(?:is\s*)?(?:EGP\s*)?([\d,]+\.?\d*)"#
                ])
            }

            // Extract merchant
            var merchant: String?
            if let merchantPattern = rule.merchantPattern, !merchantPattern.isEmpty {
                merchant = extractPattern(from: smsBody, pattern: merchantPattern)
            }

            return SMSParseResult(
                transactionType: rule.transactionType,
                amount: finalAmount,
                cardLastFour: card,
                merchantName: merchant?.trimmingCharacters(in: .whitespaces),
                availableBalance: balance,
                date: nil,
                isDebitCard: rule.isDebitCard
            )
        }

        return nil
    }

    // MARK: - Generic Parser (Unknown Banks)
    private func parseGeneric(smsBody: String, sender: String) -> SMSParseResult? {
        let isExpense = smsBody.contains("خصم") || smsBody.contains("دفع") ||
                        smsBody.contains("charged") || smsBody.contains("debit") ||
                        smsBody.contains("Trx") || smsBody.contains("purchase")
        let isIncome = smsBody.contains("إضافة") || smsBody.contains("اضافة") ||
                       smsBody.contains("إيداع") || smsBody.contains("ايداع") ||
                       smsBody.contains("استلام") || smsBody.contains("credited") ||
                       smsBody.contains("received")

        guard isExpense || isIncome else { return nil }

        let amount = extractAmount(from: smsBody, patterns: [
            #"([\d,]+\.?\d*)\s*(?:جم|EGP|جنيه|جنية|ج\.م|LE)"#,
            #"(?:EGP|LE)\s*([\d,]+\.?\d*)"#,
            #"مبلغ\s*([\d,]+\.?\d*)"#,
            #"بمبلغ\s*([\d,]+\.?\d*)"#
        ])

        guard let finalAmount = amount else { return nil }

        let card = extractPattern(from: smsBody, pattern: #"(?:رقم|ending|Card\s*(?:XXXX)?)\s*\*{0,4}(\d{4})"#)
        let balance = extractAmount(from: smsBody, patterns: [
            #"(?:المتاح|رصيد|balance)\s*(?:is\s*)?(?:EGP\s*)?([\d,]+\.?\d*)"#
        ])

        return SMSParseResult(
            transactionType: isIncome ? .income : .expense,
            amount: finalAmount,
            cardLastFour: card,
            availableBalance: balance,
            isDebitCard: nil
        )
    }

    // MARK: - Regex Helpers
    private func extractPattern(from text: String, pattern: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, options: [], range: range),
              match.numberOfRanges > 1,
              let captureRange = Range(match.range(at: 1), in: text) else { return nil }
        return String(text[captureRange])
    }

    private func extractAmount(from text: String, patterns: [String]) -> Double? {
        for pattern in patterns {
            if let valueStr = extractPattern(from: text, pattern: pattern) {
                let cleaned = valueStr.replacingOccurrences(of: ",", with: "")
                if let value = Double(cleaned), value > 0 {
                    return value
                }
            }
        }
        return nil
    }

    private func parseDateFlexible(_ dateString: String) -> Date? {
        let formats = [
            "dd-MMM-yyyy", "dd/MM/yyyy", "dd-MM-yyyy",
            "dd-MM-yy", "MM-dd-yyyy", "yyyy-MM-dd"
        ]
        for format in formats {
            let formatter = DateFormatter()
            formatter.dateFormat = format
            formatter.locale = Locale(identifier: "en_US_POSIX")
            if let date = formatter.date(from: dateString) {
                return date
            }
        }
        return Date.parseSMSDate(dateString)
    }
}

// MARK: - Built-in Template Definitions
extension SMSParserService {

    static let bankAlAhlyTemplate = BankTemplate(
        id: "builtin-alahly",
        bankName: "البنك الأهلي المصري",
        smsSender: "Bank-AlAhly",
        rules: [
            PatternRule(name: "إيداع / تحويل وارد", transactionType: .income,
                       keyword: "تم إضافة", isDebitCard: true),
            PatternRule(name: "خصم بطاقة الخصم", transactionType: .expense,
                       keyword: "بطاقة الخصم المباشر", isDebitCard: true),
            PatternRule(name: "تحويل صادر", transactionType: .expense,
                       keyword: "تم تنفيذ تحويل", isDebitCard: true),
            PatternRule(name: "خصم بطاقة ائتمان", transactionType: .expense,
                       keyword: "بطاقة الائتمان", isDebitCard: false)
        ],
        isBuiltIn: true
    )

    static let bankNXTTemplate = BankTemplate(
        id: "builtin-nxt",
        bankName: "بنك نكست",
        smsSender: "Bank NXT",
        rules: [
            PatternRule(name: "خصم من البطاقة", transactionType: .expense,
                       keyword: "was charged at"),
            PatternRule(name: "إيداع", transactionType: .income,
                       keyword: "was credited")
        ],
        isBuiltIn: true
    )

    static let arabBankTemplate = BankTemplate(
        id: "builtin-arabbank",
        bankName: "البنك العربي",
        smsSender: "ArabBank",
        rules: [
            PatternRule(name: "عملية شراء", transactionType: .expense,
                       keyword: "A Trx using Card"),
            PatternRule(name: "إيداع", transactionType: .income,
                       keyword: "credited")
        ],
        isBuiltIn: true
    )

    static let vfCashTemplate = BankTemplate(
        id: "builtin-vfcash",
        bankName: "فودافون كاش",
        smsSender: "VF-Cash",
        rules: [
            PatternRule(name: "دفع", transactionType: .expense,
                       keyword: "تم دفع مبلغ"),
            PatternRule(name: "استلام", transactionType: .income,
                       keyword: "تم استلام"),
            PatternRule(name: "تحويل", transactionType: .expense,
                       keyword: "تم تحويل")
        ],
        isBuiltIn: true
    )
}
