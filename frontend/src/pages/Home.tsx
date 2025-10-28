import CommonForm from "../components/CommonForm";
import Header from "../components/Header";

const Home = () => {
    return (
        <div className="min-h-screen bg-slate-200 flex flex-col items-center">
            <Header/>
            <CommonForm/>
        </div>
    )
}

export default Home;