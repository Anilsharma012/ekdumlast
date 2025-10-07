import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

export default function Maps() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-4 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Maps</h1>
        <p className="text-gray-600">Interactive property maps coming soon.</p>
      </div>
      <BottomNavigation />
    </div>
  );
}
