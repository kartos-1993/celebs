import { Outlet, useLoaderData } from "react-router-dom";
import { ProtectedLoaderData } from "./types";

function App() {
  const data = useLoaderData() as ProtectedLoaderData;

  return (
    <div>
      <header>
        <h1>Welcome, {data.user.name}</h1>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
