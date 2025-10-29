import AzurePanel from "../components/AzurePanel";
import CommonForm from "../components/CommonForm";
import GCPPanel from "../components/GCPPanel";
import Header from "../components/Header";
import ProviderPanel from "../components/ProviderPanel";

const Home = () => {
    return (
        <div className="min-h-screen bg-slate-200 flex flex-col items-center">
            <Header />
            <CommonForm />
            <ProviderPanel />
            <GCPPanel />
            <AzurePanel />
        </div>
    )
}

export default Home;