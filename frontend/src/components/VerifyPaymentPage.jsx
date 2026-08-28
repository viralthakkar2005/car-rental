import React from 'react'
import axios from 'axios'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { API_BASE } from '../utils/api';

const VerifyPaymentPage = () => {

  const [statusMsg, setStatusMsg] = useState('Verifying Payment...');
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const search = location.search || '';

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      const params = new URLSearchParams(search);
      const rawSession = params.get('session_id');
      const session_id = rawSession ? rawSession.trim() : null;
      const payment_status = params.get('payment_status');
      const token = localStorage.getItem('token');

      if (payment_status === 'cancel') {
        navigate('/cars', { replace: true });
        return;
      }

      if (!session_id) {
        setStatusMsg('No session id provided in the URL');
        setFailed(true);
        return;
      }

      try {
        setStatusMsg('Confirming payment with server....');

        const res = await axios.get(`${API_BASE}/api/payments/confirm`, {
          params: { session_id },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 20000,
        });

        if (cancelled) return;

        if (res?.data?.success) {
          setStatusMsg("Payment confirmed. Redirecting...");
          navigate("/bookings", { replace: true });
          return;
        } else {
          const msg = res?.data?.message || "Payment not completed.";
          setStatusMsg(msg);
          setFailed(true);
        }
      } catch (err) {
        console.error("Verification failed:", err);

        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message;

        if (err.code === 'ECONNABORTED') {
          setStatusMsg('Confirming payment took too long — the server may be unreachable. Your card may still have been charged; check My Bookings or try again.');
        } else if (status === 404) {
          setStatusMsg(serverMsg || "Payment session not found.");
        } else if (status === 400) {
          setStatusMsg(serverMsg || "Payment not completed");
        } else {
          setStatusMsg(serverMsg || "There was an error confirming your payment.");
        }
        setFailed(true);
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="text-center max-w-lg">
        <p className="mb-2">{statusMsg}</p>
        {failed && (
          <>
            <p className="text-sm opacity-70 mb-6">
              If this keeps happening, copy the 'session_id' from the URL above
              and check it against your backend logs.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/bookings', { replace: true })}
                className="px-5 py-2 rounded-lg border border-gray-500 hover:bg-gray-800 transition-colors"
              >
                Go to My Bookings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyPaymentPage;