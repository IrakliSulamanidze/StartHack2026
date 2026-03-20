import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-arena-bg flex flex-col">
      <Outlet />
    </div>
  );
}
