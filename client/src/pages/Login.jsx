
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { BsWhatsapp } from "react-icons/bs";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
    const navigate = useNavigate();
    const [values, setValues] = useState({ email: "", password: "" });

    const toastOptions = {
        position: "bottom-right",
        autoClose: 5000,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
    };

    useEffect(() => {
        if (localStorage.getItem("chat-app-user")) {
            navigate("/");
        }
    }, [navigate]);

    const handleChange = (event) => {
        setValues({ ...values, [event.target.name]: event.target.value });
    };

    const handleValidation = () => {
        const { password, email } = values;
        if (password === "") {
            toast.error("Email and Password are required.", toastOptions);
            return false;
        } else if (email === "") {
            toast.error("Email and Password are required.", toastOptions);
            return false;
        }
        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (handleValidation()) {
            const { password, email } = values;
            try {
                const { data } = await axios.post("http://localhost:5000/api/auth/login", {
                    email,
                    password,
                });
                localStorage.setItem("chat-app-user", JSON.stringify(data));
                navigate("/");
            } catch (err) {
                toast.error(err.response?.data || "Error", toastOptions);
            }
        }
    };

    return (
        <>
            {/* Liquid Background */}
            <div className="liquid-bg z-[-1]">
                <div className="liquid-blob blob-1"></div>
                <div className="liquid-blob blob-2"></div>
                <div className="liquid-blob blob-3"></div>
            </div>

            <div className="h-screen w-screen flex flex-col justify-center items-center overflow-hidden">
                <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-2xl p-10 sm:p-14 w-full max-w-[420px] flex flex-col items-center animate-scale-in">
                    <div className="flex items-center gap-3 mb-8 relative group">
                        <div className="absolute inset-0 bg-ios-primary blur-2xl opacity-30 rounded-full group-hover:opacity-50 transition-opacity"></div>
                        <BsWhatsapp className="text-ios-primary text-5xl relative z-10 drop-shadow-lg" />
                    </div>

                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 mb-2 tracking-tight">
                        Welcome Back
                    </h1>
                    <p className="text-ios-text-secondary mb-8 text-sm">Log in to your liquid account</p>

                    <form className="flex flex-col gap-5 w-full" onSubmit={(event) => handleSubmit(event)}>
                        <div className="space-y-4">
                            <input
                                type="email"
                                placeholder="Email Address"
                                name="email"
                                onChange={(e) => handleChange(e)}
                                className="glass-input w-full px-5 py-3.5 rounded-xl text-sm placeholder-white/40 border border-white/5 focus:border-ios-primary/50 focus:bg-white/10 transition-all font-medium"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                name="password"
                                onChange={(e) => handleChange(e)}
                                className="glass-input w-full px-5 py-3.5 rounded-xl text-sm placeholder-white/40 border border-white/5 focus:border-ios-primary/50 focus:bg-white/10 transition-all font-medium"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-ios-primary text-white font-semibold py-3.5 rounded-xl hover:bg-ios-primary/90 hover:scale-[1.02] transform transition-all duration-300 shadow-lg shadow-ios-primary/30 mt-2"
                        >
                            Log In
                        </button>

                        <div className="text-center mt-6 text-ios-text-secondary text-sm">
                            Don't have an account? <Link to="/register" className="text-ios-primary font-bold hover:underline ml-1">Register</Link>
                        </div>
                    </form>
                </div>
                <ToastContainer />
            </div>
        </>
    );
};

export default Login;
