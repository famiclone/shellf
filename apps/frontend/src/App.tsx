import { Navigate, Routes, Route, useParams } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { PlatformsPage } from "./pages/PlatformsPage";
import { PlatformGamesPage } from "./pages/PlatformGamesPage";
import { ItemsPage } from "./pages/ItemsPage";
import { GameDetailPage } from "./pages/GameDetailPage";
import { EditGamePage } from "./pages/EditGamePage";
import { AddGamePage } from "./pages/AddGamePage";

function RedirectToGroup() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/groups/${id}`} replace />;
}

function RedirectToItem() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/items/${id}`} replace />;
}

function RedirectToItemEdit() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/items/${id}/edit`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="groups" element={<PlatformsPage />} />
        <Route path="groups/:id" element={<PlatformGamesPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="items/new" element={<AddGamePage />} />
        <Route path="items/:id/edit" element={<EditGamePage />} />
        <Route path="items/:id" element={<GameDetailPage />} />

        <Route path="platforms" element={<Navigate to="/groups" replace />} />
        <Route path="platforms/:id" element={<RedirectToGroup />} />
        <Route path="games/new" element={<Navigate to="/items/new" replace />} />
        <Route path="games/:id/edit" element={<RedirectToItemEdit />} />
        <Route path="games/:id" element={<RedirectToItem />} />
      </Route>
    </Routes>
  );
}
