import './App.css';
import SignUp from './Components/signup';
import LoginPage from './Components/login';
import Tester from './Components/test';


import React, { useEffect, useState } from "react";
import { useNavigate, BrowserRouter as Router, Routes, Route  } from 'react-router-dom';
import axios from "axios";
import Cookies from 'js-cookie';
import Verification from './Components/verification';

function Home() {
    const navigate = useNavigate();
    axios.defaults.withCredentials=true;


    return (
        <div className="container-fluid">
            <div className="row">
                <div className="scrolling_text col-7">
                    <header className="p-3">
                        <h4>Medical Vqa</h4>
                    </header>
                    <br />
                    <br />
                    <br />
                    <div className="my-5">
                        <h1 className="p-4 my-5 ">This is the project interface <br /> So hello welcome </h1>
                    </div>
                </div>

                <div className="start_page col-5">
                    <div className="start_page d-flex justify-content-center align-items-center text-center">
                        <div className="col">
                            <div>
                                <h2>Get Started</h2>
                            </div>
                            <div className="d-grid gap-2 d-md-block">
                                <button className="btn btn-primary btn-lg mx-2 col-4" onClick={() => navigate('/signup')}>
                                    Sign Up
                                </button>
                                <button className="btn btn-primary btn-lg mx-2 col-4" onClick={() => navigate('/login')}>Log in</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [loggedIn, setLoggedIn] = useState(false);

    const [token, setToken] = useState(""); // Added token state

    useEffect(() => {
        const tokenval = localStorage.getItem('jwt');

        if (tokenval) setToken(tokenval);

        if (tokenval) {
            const checkAuthenticationStatus = async () => {
                try {
                    const response = await axios.post(
                        "https://medicalbert-api.onrender.com/profile",
                        {
                            jwttoken: tokenval
                        },
                        {
                            withCredentials: true
                        }
                    );
                    const { username } = response.data;

                    setLoggedIn(true);
                } catch (error) {
                    console.error(error);
                } finally {
                    console.log("hello ");
                }
            };
            checkAuthenticationStatus();
        }
    }, []);



    return (
        <Router basename='/'>
            <Routes>
                <Route
                    path="/"
                    element={
                        loggedIn ? (
                            <Tester/>
                        ) : (
                            <Home />
                        )
                    }
                />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/test" element={<Tester />} />
                <Route path="/verify" element={<Verification />} />
            </Routes>
        </Router>
    );
}

export default App;
