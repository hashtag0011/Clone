
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { BsWhatsapp, BsEye, BsEyeSlash } from "react-icons/bs";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
    const navigate = useNavigate();
    const [values, setValues] = useState({ email: "", password: "" });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const toastOptions = {
        position: "top-center",
        autoClose: 4000,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
        style: { fontWeight: 600, fontSize: "14px" },
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
        if (!email.trim()) {
            toast.error("⚠️ Please enter your email address.", toastOptions);
            return false;
        }
        if (!password) {
            toast.error("⚠️ Please enter your password.", toastOptions);
            return false;
        }
        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!handleValidation()) return;
        setLoading(true);
        const { password, email } = values;
        try {
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL || ""}/api/auth/login`, {
                email: email.trim().toLowerCase(),
                password,
            });
            localStorage.setItem("chat-app-user", JSON.stringify(data));
            navigate("/");
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || "Login failed. Check your credentials.";
            toast.error(`❌ ${msg}`, toastOptions);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen relative overflow-hidden flex items-center justify-center p-4 font-sans">
            {/* Animated liquid background */}
            <div className="liquid-bg absolute inset-0 z-[-1]" />

            <div className="relative z-10 w-full max-w-[420px] animate-fade-in">
                {/* Glass card */}
                <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">

                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 mb-5">
                            <BsWhatsapp className="text-3xl text-white" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Welcome Back</h1>
                        <p className="text-slate-400 text-sm">Sign in to continue to Chatx</p>
                    </div>

                    <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>

                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-slate-300 text-xs font-semibold uppercase tracking-wide px-1">Email Address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                name="email"
                                autoComplete="email"
                                onChange={handleChange}
                                className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:bg-white/10 transition-all text-sm caret-blue-400"
                                style={{ WebkitTextFillColor: "white" }}
                            />
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-slate-300 text-xs font-semibold uppercase tracking-wide px-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    placeholder="Your password"
                                    name="password"
                                    autoComplete="current-password"
                                    onChange={handleChange}
                                    className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:bg-white/10 transition-all text-sm pr-12 caret-blue-400"
                                    style={{ WebkitTextFillColor: "white" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                                >
                                    {showPass ? <BsEyeSlash className="text-lg" /> : <BsEye className="text-lg" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : "Sign In"}
                        </button>

                        <p className="text-center text-slate-400 text-sm mt-2">
                            Don't have an account?{" "}
                            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                                Create one
                            </Link>
                        </p>
                    </form>
                </div>
            </div>

            <ToastContainer />
        </div>
    );
};

export default Login;
