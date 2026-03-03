
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
                const { data } = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login`, {
                    email: email.trim(),
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
        <div className="h-screen w-screen relative overflow-hidden flex items-center justify-center p-4 font-sans bg-transparent">
            {/* Liquid Background restored */}
            <div className="liquid-bg z-[-1] absolute inset-0">
                <div className="liquid-blob blob-1"></div>
                <div className="liquid-blob blob-2"></div>
                <div className="liquid-blob blob-3"></div>
            </div>

            <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2rem] p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] animate-fade-in">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 relative group">
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity rounded-2xl"></div>
                        <BsWhatsapp className="text-3xl text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-blue-200/60 text-sm">Sign in to continue to Chatx</p>
                </div>

                <form className="flex flex-col gap-5 w-full" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="email"
                                placeholder="Email Address"
                                name="email"
                                onChange={handleChange}
                                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/50 focus:outline-none focus:border-white/50 focus:bg-white/20 transition-all text-sm shadow-sm"
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="password"
                                placeholder="Password"
                                name="password"
                                onChange={handleChange}
                                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/50 focus:outline-none focus:border-white/50 focus:bg-white/20 transition-all text-sm shadow-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] transition-all"
                    >
                        Sign In
                    </button>

                    <p className="text-center text-white/50 text-sm mt-6">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Create one
                        </Link>
                    </p>
                </form>
            </div>
            <ToastContainer />
        </div>
    );
};

export default Login;
