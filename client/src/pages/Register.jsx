
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { BsWhatsapp } from "react-icons/bs";
import "react-toastify/dist/ReactToastify.css";

const Register = () => {
    const navigate = useNavigate();
    const [values, setValues] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

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
        const { password, confirmPassword, username, email } = values;
        if (password !== confirmPassword) {
            toast.error("Password and confirm password should be same.", toastOptions);
            return false;
        } else if (username.length < 3) {
            toast.error("Username should be greater than 3 characters.", toastOptions);
            return false;
        } else if (password.length < 8) {
            toast.error("Password should be equal or greater than 8 characters.", toastOptions);
            return false;
        } else if (email === "") {
            toast.error("Email is required.", toastOptions);
            return false;
        }
        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (handleValidation()) {
            const { password, username, email } = values;
            try {
                const { data } = await axios.post(`${import.meta.env.VITE_API_URL || ""}/api/auth/register`, {
                    username: username.trim(),
                    email: email.trim(),
                    password,
                });
                localStorage.setItem("chat-app-user", JSON.stringify(data));
                navigate("/");
            } catch (err) {
                toast.error(err.response?.data || "An error occurred", toastOptions);
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
                    <div className="flex items-center gap-3 mb-6 relative group">
                        <div className="absolute inset-0 bg-ios-primary blur-2xl opacity-30 rounded-full group-hover:opacity-50 transition-opacity"></div>
                        <BsWhatsapp className="text-ios-primary text-5xl relative z-10 drop-shadow-lg" />
                    </div>

                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 mb-2 tracking-tight">
                        Join Us
                    </h1>
                    <p className="text-ios-text-secondary mb-8 text-sm">Create your liquid account</p>

                    <form className="flex flex-col gap-4 w-full" onSubmit={(event) => handleSubmit(event)}>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Username"
                                name="username"
                                onChange={(e) => handleChange(e)}
                                className="glass-input w-full px-5 py-3.5 rounded-xl text-sm placeholder-white/40 border border-white/5 focus:border-ios-primary/50 focus:bg-white/10 transition-all font-medium"
                            />
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
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                name="confirmPassword"
                                onChange={(e) => handleChange(e)}
                                className="glass-input w-full px-5 py-3.5 rounded-xl text-sm placeholder-white/40 border border-white/5 focus:border-ios-primary/50 focus:bg-white/10 transition-all font-medium"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-ios-primary text-white font-semibold py-3.5 rounded-xl hover:bg-ios-primary/90 hover:scale-[1.02] transform transition-all duration-300 shadow-lg shadow-ios-primary/30 mt-4"
                        >
                            Create Account
                        </button>

                        <div className="text-center mt-6 text-ios-text-secondary text-sm">
                            Already have an account? <Link to="/login" className="text-ios-primary font-bold hover:underline ml-1">Login</Link>
                        </div>
                    </form>
                </div>
                <ToastContainer />
            </div>
        </>
    );
};

export default Register;
