import { Footer } from "@/components/footer"
import { ProfilePage } from "@/components/profile-page"

export default function Profile() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <ProfilePage />
      </main>
      <Footer />
    </div>
  )
}
