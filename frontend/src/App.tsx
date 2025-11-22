// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AwsResultPage from "./pages/AwsResultPage"; // <-- created earlier

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/aws/result" element={<AwsResultPage />} />
        {/* add other routes here if you need */}
      </Routes>
    </BrowserRouter>
  );
};

export default App;
