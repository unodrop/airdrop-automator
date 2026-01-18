import { useState, createContext, useContext } from "react";
import "./App.css";
import { Layout } from "./components/Layout";
import { AccountsPage } from "./pages/AccountsPage";
import { AirdropProjectPage } from "./pages/AirdropProjectPage";
import { GalxePage } from "./pages/GalxePage";
import { SchedulerPage } from "./pages/SchedulerPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SidebarProvider } from "@/components/ui/sidebar";

type PageContextType = {
  currentPage: string;
  setCurrentPage: (page: string) => void;
};

export const PageContext = createContext<PageContextType>({
  currentPage: "accounts",
  setCurrentPage: () => {},
});

export const usePageContext = () => useContext(PageContext);

function App() {
  const [currentPage, setCurrentPage] = useState("accounts");

  const renderPage = () => {
    switch (currentPage) {
      case "accounts":
        return <AccountsPage />;
      case "airdrop":
        return <AirdropProjectPage />;
      case "galxe":
        return <GalxePage />;
      case "scheduler":
        return <SchedulerPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <AccountsPage />;
    }
  };

  return (
    <PageContext.Provider value={{ currentPage, setCurrentPage }}>
      <div className="dark">
        <SidebarProvider>
          <Layout>{renderPage()}</Layout>
        </SidebarProvider>
      </div>
    </PageContext.Provider>
  );
}

export default App;
