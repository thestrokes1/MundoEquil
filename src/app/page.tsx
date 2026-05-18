import { Header } from '@/components/shared/header'
import { FavoritesBar } from '@/components/shared/favorites-bar'
import { Footer } from '@/components/shared/footer'
import { Dashboard } from './dashboard'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <FavoritesBar />
      <div className="flex-1">
        <Dashboard />
      </div>
      <Footer />
    </div>
  )
}
