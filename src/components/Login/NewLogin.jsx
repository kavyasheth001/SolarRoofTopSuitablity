import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LuRefreshCw } from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import logo3 from "../../images/logo/BMC.png";
import logo from '../../images/logo/saar.svg';
import backgroundImage from "../../images/logo/bmcoffice.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { BeatLoader } from "react-spinners";
import './NewLogin.css';


const NewLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const [data, setData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });

  const [captcha, setCaptcha] = useState("");
  const [captchaErrorMessage, setCaptchaErrorMessage] = useState("");
  const [userAnswer, setUserAnswer] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  // ❤️ Your decoder (no jwt-decode)
  const decodeToken = (token) => {
    try {
      const base64Payload = token.split(".")[1];
      const payload = atob(base64Payload);
      return JSON.parse(payload);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const storedEmail = localStorage.getItem("email");
    const storedPassword = localStorage.getItem("password");
    if (storedEmail && storedPassword) {
      setData(prev => ({
        ...prev,
        email: storedEmail,
        password: storedPassword,
        rememberMe: true
      }));
    }
    generateCaptcha();
  }, []);

  const generateRandomLetter = () => {
    const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return letters.charAt(Math.floor(Math.random() * letters.length));
  };

  const generateCaptchaString = (length = 5) => {
    return Array.from({ length }, generateRandomLetter).join("");
  };

  const generateCaptcha = () => {
    setCaptcha(generateCaptchaString());
    setUserAnswer("");
    setCaptchaErrorMessage("");
  };

  const onChangeHandler = (event) => {
    const { name, value, type, checked } = event.target;
    setData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const onLogin = async (e) => {
    e.preventDefault();

    const trimmedEmail = data.email.trim();
    const trimmedPassword = data.password.trim();

    if (!userAnswer) {
      setCaptchaErrorMessage("Please enter the CAPTCHA answer.");
      toast.error("Please enter the CAPTCHA answer.");
      return;
    }

    if (userAnswer !== captcha) {
      setCaptchaErrorMessage("Incorrect CAPTCHA answer. Please try again.");
      toast.error("Incorrect CAPTCHA answer. Please try again.");
      generateCaptcha();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${BASE_URL}/auth/login/ad`,
        {
          username: trimmedEmail,
          password: trimmedPassword,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const responseData = response.data;

      if (responseData?.token) {
        const decoded = decodeToken(responseData.token);

        if (!decoded) {
          toast.error("Invalid token received.");
          setLoading(false);
          return;
        }

        // 🚫 BLOCK L1 USERS
        if (decoded?.designation_level === 1) {
          toast.error("Users with Level L1 are not allowed to login.");
          setLoading(false);
          return;
        }

        toast.success(responseData.message || "Login Successful!", { autoClose: 2000 });

        if (data.rememberMe) {
          localStorage.setItem("email", trimmedEmail);
          localStorage.setItem("password", trimmedPassword);
        } else {
          localStorage.removeItem("email");
          localStorage.removeItem("password");
        }

        login(responseData.token);
      } else {
        toast.error("Enter your valid Domain ID and Password.", { autoClose: 2000 });
      }

    } catch (err) {
      let errorMsg = "";

      if (err.response) {
        // Server responded (401, 500 etc.) — show only the clean server message
        errorMsg =
          err.response.data?.error ||
          err.response.data?.message ||
          err.response.statusText;

        toast.error(errorMsg, {
          autoClose: 4000,
        });

      } else if (err.request) {
        // No response at all — show full technical detail like the console
        const method = err.config?.method?.toUpperCase();
        const url = err.config?.url;
        const code = err.code || "NO_CODE";

        errorMsg = `${method} ${url}\n${code}: ${err.message}`;

        toast.error(errorMsg, {
          autoClose: 8000,
          style: {
            background: "#fff0f0",
            color: "#b91c1c",
            fontWeight: "600",
            border: "2px solid #b91c1c",
            fontSize: "13px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          },
        });

      } else {
        // JS error before request was sent
        errorMsg = err.message;

        toast.error(errorMsg, { autoClose: 4000 });
      }

      setError(errorMsg);
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full h-screen flex justify-end items-center overflow-hidden relative">
      <ToastContainer position="top-center" />

      <img
        src={backgroundImage}
        className="absolute top-0 left-0 min-w-full min-h-full object-cover -z-10 transform"
        alt="Background"
      />

      <div className="w-full max-w-3xl h-auto bg-white bg-opacity-80 rounded-3xl shadow-2xl mx-8 overflow-hidden flex show-card">

        {/* LEFT SIDE (unchanged UI) */}
        <div className="w-full p-6 pt-8 flex flex-col ">
          <h1 className="text-3xl font-extrabold text-gray-800 text-center mb-2">Sign In</h1>
          <p className="text-center text-gray-700 font-medium mb-4">use your domain id and password</p>

          <form onSubmit={onLogin} className="flex flex-col gap-2 w-full">

            {/* ❗ EMAIL BOX — EXACT SAME UI */}
            <div className="flex flex-col gap-2 mb-3">
              <input
                name="email"
                onChange={onChangeHandler}
                value={data.email}
                type="text"
                placeholder="EMP Code / User ID"
                className="bg-gray-100 border-none rounded-lg p-4 text-gray-800"
                required
              />
            </div>

            {/* PASSWORD BOX — EXACT SAME */}
            <div className="flex flex-col gap-2 mb-3 relative">
              <input
                name="password"
                onChange={onChangeHandler}
                value={data.password}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="bg-gray-100 border-none rounded-lg p-4 text-gray-800 pr-10"
                required
              />
              <span
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </span>
            </div>

            <div className="flex items-center mb-4">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={data.rememberMe}
                onChange={onChangeHandler}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            {/* CAPTCHA — unchanged */}
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-3">
                  <div
                  className="rounded p-2 min-w-[120px] flex justify-center"
                  style={{ background: "#0051bb" }}
                >
                  <span style={{ letterSpacing: "0.4em" }}>
                    {captcha.split("").map((letter, index) => (
                      <span
                        key={index}
                        className="inline-block text-white font-bold text-lg"
                        style={{ transform: `rotate(${Math.random() * 30 - 15}deg)`, display: "inline-block" }}
                      >
                        {letter}
                      </span>
                    ))}
                  </span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Enter captcha"
                    className="bg-gray-100 border-none rounded-lg p-3 text-gray-800 w-full"
                    style={{ maxWidth: "133px" }}
                    required
                  />

                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="p-2 bg-gray-200 rounded hover:bg-gray-300 flex-shrink-0"
                  >
                    <LuRefreshCw className="animate-spin-hover" size={20} />
                  </button>
                </div>
              </div>

              {captchaErrorMessage && (
                <p className="text-red-500 text-xs mt-1">{captchaErrorMessage}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: "#0051bb" }}
              className=" hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 sign-in-btn"
            >
              {loading ? <BeatLoader color="#ffffff" size={8} /> : "SIGN IN"}
            </button>
          </form>
        </div>

        <div className="hidden md:block w-1/2  rounded-l-[100px] flex-shrink-0 relative overflow-hidden" style={{ backgroundColor: '#0051bb' }}>
          <div className="flex flex-col items-center justify-center h-full text-white p-8">
            <div className="z-10 flex flex-col items-center">
              <div className="flex flex-col items-center">
                <img style={{ width: "15rem", height: "15rem" }} src={logo3} alt="Logo" className="mx-auto mb-3 relative rounded-full transform transition-transform duration-300 hover:scale-105 hover:-translate-y-1.5" />
                {/* Right Side text updates */}
                <h2 className="text-xl font-bold shadow-text text-white mb-1">Welcome To</h2>
                <h1 className="text-2xl font-extrabold text-white text-center shadow-text">3D Mumbai City</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 pt-2 text-center">
        <div className="flex justify-center items-center gap-2">
          <span className="text-white text-sm font-medium drop-shadow-sm mb-2 bg-blue-500">
            Brihanmumbai Municipal Corporation © All Rights Reserved.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default NewLogin;
