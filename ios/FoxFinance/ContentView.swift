import SwiftUI

// MARK: - App Tabs
enum AppTab: String, CaseIterable, Identifiable {
    case dashboard = "الرئيسية"
    case income = "الإيرادات"
    case accounts = "الحسابات"
    case expenses = "المصروفات"
    case sms = "SMS"
    case transfers = "التحويلات"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .dashboard: return "house.fill"
        case .income: return "arrow.down.circle.fill"
        case .accounts: return "wallet.pass.fill"
        case .expenses: return "arrow.up.circle.fill"
        case .sms: return "message.fill"
        case .transfers: return "arrow.left.arrow.right"
        }
    }

    var color: Color {
        switch self {
        case .dashboard: return .foxGreen
        case .income: return .foxGreen
        case .accounts: return .foxBlue
        case .expenses: return .foxRed
        case .sms: return .foxPurple
        case .transfers: return .foxIndigo
        }
    }
}

// MARK: - Content View
struct ContentView: View {
    @ObservedObject var authService: AuthService
    @State private var activeTab: AppTab = .dashboard
    @State private var showSettings = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Main content
            VStack(spacing: 0) {
                // Header
                headerView

                // Tab content
                tabContent
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            // Bottom tab bar
            customTabBar
        }
        .ignoresSafeArea(.keyboard)
        .environment(\.layoutDirection, .rightToLeft)
        .sheet(isPresented: $showSettings) {
            NavigationStack {
                SettingsView(authService: authService)
                    .navigationTitle("الإعدادات")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("إغلاق") { showSettings = false }
                        }
                    }
            }
            .environment(\.layoutDirection, .rightToLeft)
        }
    }

    // MARK: - Header
    private var headerView: some View {
        HStack(spacing: 12) {
            // Logo
            Image(systemName: "dollarsign.circle.fill")
                .font(.title2)
                .foregroundStyle(.foxGreen)

            VStack(alignment: .leading, spacing: 2) {
                Text("Fox Finance")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.foxTextPrimary)
                Text("مرحباً \(authService.displayName)")
                    .font(.caption)
                    .foregroundStyle(.foxTextSecondary)
            }

            Spacer()

            // Settings button
            Button { showSettings = true } label: {
                Image(systemName: "gearshape.fill")
                    .font(.body)
                    .foregroundStyle(.foxTextSecondary)
                    .frame(width: 36, height: 36)
                    .background(Color.gray.opacity(0.08))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Color.foxCard
                .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        )
    }

    // MARK: - Tab Content
    @ViewBuilder
    private var tabContent: some View {
        switch activeTab {
        case .dashboard:
            DashboardView(activeTab: $activeTab)
        case .income:
            TransactionsListView(viewModel: TransactionsViewModel(type: .income))
        case .expenses:
            TransactionsListView(viewModel: TransactionsViewModel(type: .expense))
        case .accounts:
            AccountsView()
        case .sms:
            SMSImportView()
        case .transfers:
            TransfersView()
        }
    }

    // MARK: - Custom Tab Bar
    private var customTabBar: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases) { tab in
                tabButton(tab)
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 8)
        .padding(.bottom, 24)
        .background(
            Color.foxCard
                .shadow(color: .black.opacity(0.08), radius: 12, y: -4)
                .ignoresSafeArea(edges: .bottom)
        )
    }

    private func tabButton(_ tab: AppTab) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                activeTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                // Special elevated style for income/expenses
                if tab == .income || tab == .expenses {
                    Image(systemName: tab == .income ? "plus" : "minus")
                        .font(.callout.weight(.bold))
                        .foregroundStyle(.white)
                        .frame(width: 40, height: 40)
                        .background(
                            activeTab == tab
                                ? tab.color
                                : tab.color.opacity(0.8)
                        )
                        .clipShape(Circle())
                        .shadow(color: tab.color.opacity(activeTab == tab ? 0.4 : 0.2), radius: 6, y: 3)
                        .offset(y: -8)

                    Text(tab.rawValue)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(activeTab == tab ? tab.color : .foxTextLight)
                        .offset(y: -6)
                } else {
                    Image(systemName: tab.icon)
                        .font(.system(size: 18))
                        .foregroundStyle(activeTab == tab ? tab.color : .foxTextLight)

                    Text(tab.rawValue)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(activeTab == tab ? tab.color : .foxTextLight)
                }
            }
            .frame(maxWidth: .infinity)
        }
    }
}
