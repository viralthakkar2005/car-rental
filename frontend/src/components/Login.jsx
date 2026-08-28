import React, { useEffect, useState } from 'react'
import { loginStyles } from '../assets/dummyStyles'
import { useNavigate, Link } from 'react-router-dom'
import { FaArrowLeft, FaLock, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import logo from '../assets/logocar.png'
import axios from 'axios';
import { API_BASE } from '../utils/api';

const Login = () => {

  const navigate = useNavigate();

  const [credentials, setCredentails] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [loading,setLoading]=useState(false);

  useEffect(() => {
    setIsActive(true);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentails((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    setLoading(true);
    try{
    const base = API_BASE;
      const url = `${base}/api/auth/login`;

      const res = await axios.post(url, credentials , {
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.status >= 200 && res.status < 300) {
        const { token, user,message } = res.data || {};

        if (token) localStorage.setItem('token', token);
        if (user) localStorage.setItem('user', JSON.stringify(user));


    toast.success(message || 'Login Successful! Welcome back', {
      position: 'top-right',
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: 'colored',
      onClose: () => {
        const redirectPath = "/";
        navigate(redirectPath, { replace: true });
      },
      autoClose:1000,
    });
  }
  else{
    toast.error('Unexpected server response during registration', {
            theme: 'dark'
          });
  }
    }
  
    catch (err) {
      console.error("Login error (frontend):", err);
      if (err.response) {
        const serverMessage =
          err.response.data?.message ||
          err.response.data?.error ||
          `Server error: ${err.response.status}`;
        toast.error(serverMessage, { theme: "colored" });
      } else if (err.request) {
        toast.error("No response from server — is backend running?", {
          theme: "colored",
        });
      } else {
        toast.error(err.message || "Login failed", { theme: "colored" });
      }
    }
    finally{
      setLoading(false);
    }
  };

  const togglePasswordVisibilty = () => setShowPassword((prev) => !prev)

  return (
    <div className={loginStyles.pageContainer}>
      {/* Animated Dark background */}
      <div className={loginStyles.animatedBackground.base}>
        <div className={`${loginStyles.animatedBackground.orb1} ${isActive ? 'translate-x-20 translate-y-10' : ''}`} />
        <div className={`${loginStyles.animatedBackground.orb2} ${isActive ? '-translate-x-20 -translate-y-10' : ''}`} />
        <div className={`${loginStyles.animatedBackground.orb3} ${isActive ? '-translate-x-10 translate-y-20' : ''}`} />
      </div>

      <Link to="/" className={loginStyles.backButton}>
        <FaArrowLeft className=" text-sm sm:text-base" />
        <span className=" font-medium text-xs sm:text-sm">Back to Home</span>
      </Link>

      {/* LOGIN CARD */}
      <div
        className={`${loginStyles.loginCard.container} ${isActive ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
      >
        <div className={loginStyles.loginCard.card}>
          <div className={loginStyles.loginCard.decor1} />
          <div className={loginStyles.loginCard.decor2} />

          {/* HEADER */}
          <div className={loginStyles.loginCard.headerContainer}>
            <div className={loginStyles.loginCard.logoContainer}>
              <div className={loginStyles.loginCard.logoText}>
                <img
                  src={logo}
                  alt="logo"
                  className="h-[1em] w-auto block "
                  style={{
                    display: 'block',
                    objectFit: "contain"
                  }}
                />
                <span className='font-bold tracking-wider'>KARZONE</span>
              </div>
            </div>

            <h1 className={loginStyles.loginCard.title}>PremiumDrive</h1>
            <p className={loginStyles.loginCard.subtitle}>
              LUXURY MOBILITY EXPERIENCE
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className={loginStyles.form.container}>

            <div className={loginStyles.form.inputContainer}>
              <div className={loginStyles.form.inputWrapper}>
                <div className={loginStyles.form.inputIcon}>
                  <FaUser />
                </div>
                <input
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className={loginStyles.form.input} />
              </div>
            </div>

            <div className={loginStyles.form.inputContainer}>
              <div className={loginStyles.form.inputWrapper}>
                <div className={loginStyles.form.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className={loginStyles.form.input} />
              </div>

              <div
                onClick={togglePasswordVisibilty}
                className={loginStyles.form.passwordToggle}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>

            <button type="submit" disabled={loading} className={loginStyles.form.submitButton}>
              <span className={loginStyles.form.buttonText}>
                {loading ? 'Signin in...' : 'ACCESS premimum GARADGE' }
              </span>
              <div className={loginStyles.form.buttonHover} />
            </button>
          </form>

          <div className={loginStyles.signupSection}>
            <p className={loginStyles.signupText}>Don't have an account?</p>
            <Link to="/signup" className={loginStyles.signupButton}>
             CREATE ACCOUNT
            </Link>
          </div>
        </div>
      </div>

        <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        toastStyle={{
          backgroundColor: '#fb923c',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(249, 115, 22, 0.25)'
        }}
      />

    </div>
  );
};

export default Login;