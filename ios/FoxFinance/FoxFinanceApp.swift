import SwiftUI
import FirebaseCore

@main
struct FoxFinanceApp: App {
    @StateObject private var authService = AuthService()

    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if authService.isLoading {
                    splashView
                } else if authService.isAuthenticated {
                    ContentView(authService: authService)
                } else {
                    AuthView(authService: authService)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: authService.isAuthenticated)
            .animation(.easeInOut(duration: 0.3), value: authService.isLoading)
        }
    }

    private var splashView: some View {
        ZStack {
            LinearGradient(
                colors: [.foxGreen, .foxGreenDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 16) {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 72))
                    .foregroundStyle(.white)

                Text("Fox Finance")
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.2)
                    .padding(.top, 20)
            }
        }
    }
}
