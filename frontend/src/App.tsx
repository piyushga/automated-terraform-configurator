// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AwsResultPage from "./pages/AwsResultPage";
import GCPResultPage from "./pages/GCPResultPage";


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/aws/result" element={<AwsResultPage />} />
        <Route path="/gcp/result" element={<GCPResultPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
