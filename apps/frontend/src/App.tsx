import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { PlatformsPage } from "./pages/PlatformsPage";
import { PlatformGamesPage } from "./pages/PlatformGamesPage";
import { GameDetailPage } from "./pages/GameDetailPage";
import { AddGamePage } from "./pages/AddGamePage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="platforms" element={<PlatformsPage />} />
        <Route path="platforms/:id" element={<PlatformGamesPage />} />
        <Route path="games/new" element={<AddGamePage />} />
        <Route path="games/:id" element={<GameDetailPage />} />
      </Route>
    </Routes>
  );
}
