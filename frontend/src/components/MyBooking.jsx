// src/pages/MyBookings.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FaCar,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaFilter,
  FaTimes,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaUser,
  FaCreditCard,
  FaReceipt,
  FaEdit,
  FaHourglassHalf,
} from "react-icons/fa";
import { myBookingsStyles as s } from "../assets/dummyStyles";

const API_BASE = "http://localhost:5000";
const TIMEOUT = 15000;

// ---------- Helpers ----------
const safeAccess = (fn, fallback = "") => {
  try {
    const v = fn();
    return v === undefined || v === null ? fallback : v;
  } catch {
    return fallback;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  return Number.isNaN(d.getTime())
    ? String(dateString)
    : d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const formatPrice = (price) => {
  const num = typeof price === "number" ? price : Number(price) || 0;
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

const daysBetween = (start, end) => {
  try {
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

const normalizeBooking = (booking) => {
  const getCarData = () => {
    if (!booking) return {};
    if (typeof booking.car === "string") return { name: booking.car };
    if (booking.car && typeof booking.car === "object") {
      const snapshot = { ...booking.car };
      if (snapshot.id && typeof snapshot.id === "object") {
        const populated = { ...snapshot.id };
        delete snapshot.id;
        return { ...snapshot, ...populated };
      }
      return snapshot;
    }
    return {};
  };

  const carObj = getCarData();
  const details = booking.details || {};
  const address = booking.address || {};

  const image =
    safeAccess(() => booking.carImage) ||
    safeAccess(() => carObj.image) ||
    "https://via.placeholder.com/800x450.png?text=No+Image";

  const pickupDate =
    safeAccess(() => booking.pickupDate) ||
    safeAccess(() => booking.dates?.pickup) ||
    booking.pickup ||
    null;

  const returnDate =
    safeAccess(() => booking.returnDate) ||
    safeAccess(() => booking.dates?.return) ||
    booking.return ||
    null;

  const rawStatus =
    booking.status ||
    (booking.paymentStatus === "paid" ? "active" : "") ||
    (booking.paymentStatus === "pending" ? "pending" : "") ||
    "pending";

  const normalized = {
    id: booking._id || booking.id || String(Math.random()).slice(2, 8),
    car: {
      make: carObj.make || carObj.name || "Unnamed Car",
      image,
      year: carObj.year || carObj.modelYear || "",
      category: carObj.category,
      seats: details.seats || carObj.seats || 4,
      transmission:
        details.transmission || carObj.transmission || carObj.gearbox || "",
      fuelType:
        details.fuelType ||
        details.fuel ||
        carObj.fuelType ||
        carObj.fuel ||
        carObj.fuel_type ||
        "",
      mileage:
        details.mileage || carObj.mileage || carObj.kmpl || carObj.mpg || "",
    },
    user: {
      name: booking.customer || safeAccess(() => booking.user?.name) || "Guest",
      email: booking.email || safeAccess(() => booking.user?.email) || "",
      phone: booking.phone || safeAccess(() => booking.user?.phone) || "",
      address:
        address.street || address.city || address.state
          ? `${address.street || ""}${address.city ? ", " + address.city : ""}${
              address.state ? ", " + address.state : ""
            }`
          : safeAccess(() => booking.user?.address) || "",
    },
    dates: { pickup: pickupDate, return: returnDate },
    pickupLocation: booking.pickupLocation || "",
    dropLocation: booking.dropLocation || "",
    location:
      address.city || booking.location || carObj.location || "Pickup location",
    price: Number(booking.amount || booking.price || booking.total || 0),
    // rawStatus is the true server-side workflow state (pending / approved /
    // rejected / active / completed / cancelled) — used to decide whether
    // payment is currently possible.
    rawStatus,
    status: rawStatus,
    paymentStatus: booking.paymentStatus || "pending",
    bookingDate:
      booking.bookingDate ||
      booking.createdAt ||
      booking.updatedAt ||
      Date.now(),
    paymentMethod: booking.paymentMethod || booking.payment?.method || "",
    paymentId:
      booking.paymentIntentId || booking.paymentId || booking.sessionId || "",
    raw: booking,
  };

  // Only re-derive upcoming/completed for bookings that are already paid and
  // underway — a paid-off booking that's already passed its return date is
  // "completed", one still ahead is "upcoming". Anything still pending
  // admin review, or approved-but-unpaid, keeps its real status so the
  // payment gate below reads correctly.
  try {
    const now = new Date();
    const _return = new Date(normalized.dates.return);
    if (normalized.status === "active") {
      normalized.status = _return > now ? "upcoming" : "completed";
    }
  } catch {
    // leave status as-is
  }

  return normalized;
};

// ---------- Small presentational components ----------
const FilterButton = ({ filterKey, currentFilter, icon, label, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(filterKey)}
    className={s.filterButton(currentFilter === filterKey, filterKey)}
  >
    {icon} {label}
  </button>
);

const StatusBadge = ({ status }) => {
  const map = {
    completed: {
      text: "Completed",
      color: "bg-green-500",
      icon: <FaCheckCircle />,
    },
    upcoming: { text: "Upcoming", color: "bg-blue-500", icon: <FaClock /> },
    pending: {
      text: "Awaiting Review",
      color: "bg-amber-500",
      icon: <FaHourglassHalf />,
    },
    approved: {
      text: "Approved — Pay Now",
      color: "bg-sky-500",
      icon: <FaCheckCircle />,
    },
    rejected: {
      text: "Rejected",
      color: "bg-red-500",
      icon: <FaTimesCircle />,
    },
    cancelled: {
      text: "Cancelled",
      color: "bg-red-500",
      icon: <FaTimesCircle />,
    },
    default: { text: "Unknown", color: "bg-gray-500", icon: null },
  };
  const { text, color, icon } = map[status] || map.default;
  return (
    <div
      className={`${color} text-white px-3 py-1 rounded-full inline-flex items-center gap-2 text-sm`}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
};

const PaymentBadge = ({ paymentStatus }) => (
  <div
    className={`${
      paymentStatus === "paid" ? "bg-green-700/30 text-green-300" : "bg-yellow-700/30 text-yellow-300"
    } px-3 py-1 rounded-full inline-flex items-center gap-2 text-sm`}
  >
    <FaCreditCard />
    <span>{paymentStatus === "paid" ? "Payment Completed" : "Payment Pending"}</span>
  </div>
);

const BookingCard = ({ booking, onViewDetails, onEdit }) => {
  const days = daysBetween(booking.dates.pickup, booking.dates.return);
  return (
    <div className={s.bookingCard}>
      <div className={s.cardImageContainer}>
        <img
          src={booking.car.image}
          alt={booking.car.make}
          className={s.cardImage}
        />
      </div>

      <div className={s.cardContent}>
        <div className={s.cardHeader}>
          <div>
            <h3 className={s.carTitle}>{booking.car.make}</h3>
            <p className={s.carSubtitle}>
              {booking.car.category} â€¢ {booking.car.year}
            </p>
          </div>
          <div className="text-right">
            <p className={s.priceText}>{formatPrice(booking.price)}</p>
            <p className={s.daysText}>
              for {days} {days > 1 ? "days" : "day"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge status={booking.status} />
          <PaymentBadge paymentStatus={booking.paymentStatus} />
        </div>

        <div className={s.detailSection}>
          <div className={s.detailItem}>
            <div className={s.detailIcon}>
              <FaCalendarAlt />
            </div>
            <div>
              <p className={s.detailLabel}>Dates</p>
              <p className={s.detailValue}>
                {formatDate(booking.dates.pickup)} -{" "}
                {formatDate(booking.dates.return)}
              </p>
            </div>
          </div>

          <div className={s.detailItem}>
            <div className={s.detailIcon}>
              <FaMapMarkerAlt />
            </div>
            <div>
              <p className={s.detailLabel}>Pickup Location</p>
              <p className={s.detailValue}>{booking.pickupLocation || "-"}</p>
            </div>
          </div>

          <div className={s.detailItem}>
            <div className={s.detailIcon}>
              <FaMapMarkerAlt />
            </div>
            <div>
              <p className={s.detailLabel}>Drop-off Location</p>
              <p className={s.detailValue}>{booking.dropLocation || "-"}</p>
            </div>
          </div>
        </div>

        <div className={s.cardActions}>
          <button
            type="button"
            onClick={() => onViewDetails(booking)}
            className={s.viewDetailsButton}
          >
            <FaReceipt /> View Details
          </button>
          <button
            type="button"
            onClick={() => onEdit(booking)}
            className={s.bookAgainButton}
          >
            <FaEdit />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingModal = ({ booking, onClose, onCancel, onPay, paying }) => {
  const days = daysBetween(booking.dates.pickup, booking.dates.return);
  const pricePerDay = days > 0 ? booking.price / days : booking.price;

  const canCancel =
    booking.paymentStatus !== "paid" &&
    !["rejected", "cancelled", "completed"].includes(booking.status);

  return (
    <div className={s.modalOverlay}>
      <div className={s.modalContainer}>
        <div className={s.modalContent}>
          <div className={s.modalHeader}>
            <h2 className={s.modalTitle}>
              <FaReceipt className="text-orange-400" /> Booking Details
            </h2>
            <div className="flex items-center gap-2">
              {canCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(booking.id)}
                  className={s.cancelButton}
                >
                  Cancel Booking
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={s.modalCloseButton}
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <div className={s.modalGrid}>
            <div>
              <img
                src={booking.car.image}
                alt={booking.car.make}
                className={s.carImageModal}
              />
            </div>

            <div>
              <h3 className={s.carTitle}>{booking.car.make}</h3>
              <div className={s.carTags}>
                <span className={s.carTag}>{booking.car.category}</span>
                <span className={s.carTag}>{booking.car.year}</span>
                <span className={s.carTag}>{booking.car.seats} seats</span>
                <span className={s.carTag}>{booking.car.transmission}</span>
              </div>

              <div className={s.infoGrid}>
                <div>
                  <p className={s.infoLabel}>Fuel Type</p>
                  <p className={s.infoValue}>{booking.car.fuelType}</p>
                </div>
                <div>
                  <p className={s.infoLabel}>Mileage</p>
                  <p className={s.infoValue}>{booking.car.mileage}</p>
                </div>
                <div>
                  <p className={s.infoLabel}>Price per day</p>
                  <p className={s.infoValue}>{formatPrice(pricePerDay)}</p>
                </div>
                <div>
                  <p className={s.infoLabel}>Total Price</p>
                  <p className={s.priceValue}>{formatPrice(booking.price)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={s.modalGrid}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FaCalendarAlt className="text-orange-400" /> Booking Dates
              </h3>
              <div className={s.infoCard}>
                <div className={s.infoRow}>
                  <p className={s.infoLabel}>Pickup Date:</p>
                  <p className={s.infoValue}>
                    {formatDate(booking.dates.pickup)}
                  </p>
                </div>
                <div className={s.infoRow}>
                  <p className={s.infoLabel}>Return Date:</p>
                  <p className={s.infoValue}>
                    {formatDate(booking.dates.return)}
                  </p>
                </div>
                <div className={`${s.infoRow} ${s.infoDivider}`}>
                  <p className={s.infoLabel}>Duration:</p>
                  <p className={s.infoValue}>{days} days</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                <FaMapMarkerAlt className="text-orange-400" /> Location Details
              </h3>
              <div className={s.infoCard}>
                <div className={s.infoRow}>
                  <p className={s.infoLabel}>Pickup Location:</p>
                  <p className={s.infoValue}>{booking.pickupLocation || "-"}</p>
                </div>
                <div className={s.infoRow}>
                  <p className={s.infoLabel}>Drop-off Location:</p>
                  <p className={s.infoValue}>{booking.dropLocation || "-"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                <FaUser className="text-orange-400" /> User Information
              </h3>
              <div className={s.infoCard}>
                <div className="mb-3">
                  <p className={s.infoLabel}>Full Name:</p>
                  <p className={s.infoValue}>{booking.user.name}</p>
                </div>
                <div className="mb-3">
                  <p className={s.infoLabel}>Email:</p>
                  <p className={s.infoValue}>{booking.user.email}</p>
                </div>
                <div className="mb-3">
                  <p className={s.infoLabel}>Phone:</p>
                  <p className={s.infoValue}>{booking.user.phone}</p>
                </div>
                <div>
                  <p className={s.infoLabel}>Address:</p>
                  <p className={s.infoValue}>{booking.user.address}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                <FaCreditCard className="text-orange-400" /> Payment Details
              </h3>
              <div className={s.infoCard}>
                <div className="mb-3">
                  <p className={s.infoLabel}>Payment Method:</p>
                  <p className={s.infoValue}>
                    {booking.paymentMethod || "â€”"}
                  </p>
                </div>
                <div>
                  <p className={s.infoLabel}>Transaction ID:</p>
                  <p className={s.infoValue}>
                    {booking.paymentId || booking.raw?.sessionId || "â€”"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={s.infoCard}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={s.infoLabel}>Booking Status:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <StatusBadge status={booking.status} />
                  <PaymentBadge paymentStatus={booking.paymentStatus} />
                </div>
              </div>
              <div>
                <p className={s.infoLabel}>Booking Date:</p>
                <p className={s.infoValue}>{formatDate(booking.bookingDate)}</p>
              </div>
            </div>
          </div>

          <div className={s.modalActions}>
            <button type="button" onClick={onClose} className={s.closeButton}>
              Close
            </button>

            {booking.paymentStatus === "paid" ? (
              <button
                type="button"
                disabled
                className="flex-1 py-3 px-4 bg-green-800/60 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed opacity-90"
              >
                <FaCheckCircle className="text-sm" /> Payment Completed
              </button>
            ) : booking.status === "approved" ? (
              <button
                type="button"
                onClick={() => onPay(booking.id)}
                disabled={paying}
                className={s.modalBookButton}
              >
                <FaCreditCard className="text-sm" />
                {paying ? "Redirecting..." : "Pay Now"}
              </button>
            ) : booking.status === "rejected" ? (
              <button
                type="button"
                disabled
                className="flex-1 py-3 px-4 bg-red-900/50 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
              >
                <FaTimesCircle className="text-sm" /> Booking Rejected
              </button>
            ) : booking.status === "cancelled" ? (
              <button
                type="button"
                disabled
                className="flex-1 py-3 px-4 bg-gray-700 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
              >
                Cancelled
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 py-3 px-4 bg-gray-700 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
              >
                <FaHourglassHalf className="text-sm" /> Awaiting Admin Approval
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditDetailsModal = ({ booking, onClose, onSave }) => {
  const [form, setForm] = useState({
    customer: booking.user.name || "",
    email: booking.user.email || "",
    phone: booking.user.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer.trim() || !form.email.trim()) {
      setErr("Name and email are required.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await onSave(booking.id, form);
      onClose();
    } catch (error) {
      setErr(
        error.response?.data?.message || error.message || "Failed to update details"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.modalOverlay}>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaUser className="text-orange-400" /> Edit Personal Details
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={s.modalCloseButton}
            >
              <FaTimes />
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Car and travel dates can't be changed here — only your name, email,
            and phone number.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="customer"
                value={form.customer}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {err && <p className="text-red-400 text-sm">{err}</p>}

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={s.closeButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={s.modalBookButton}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ---------- Main page ----------
const StatsCard = ({ value, label, color }) => (
  <div className={s.statsCard}>
    <div className={s.statsValue(color)}>{value}</div>
    <p className={s.statsLabel}>{label}</p>
  </div>
);

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const [editingBooking, setEditingBooking] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => () => (isMounted.current = false), []);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchBookings = useCallback(async () => {
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await axios.get(`${API_BASE}/api/bookings/mybooking`, {
        headers: authHeaders(),
        signal: controller.signal,
      });

      const rawData = Array.isArray(response.data)
        ? response.data
        : response.data?.data ||
          response.data?.bookings ||
          response.data?.rows ||
          response.data ||
          [];

      const normalized = (Array.isArray(rawData) ? rawData : []).map(
        normalizeBooking
      );

      if (!isMounted.current) return;
      setBookings(normalized);
      setLoading(false);
    } catch (err) {
      if (!isMounted.current) return;
      if (err?.name === "CanceledError" || err?.message === "canceled") {
        setError("Request cancelled / timed out");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load bookings"
        );
      }
      setLoading(false);
    } finally {
      clearTimeout(timeoutId);
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const cancelBooking = useCallback(
    async (bookingId) => {
      if (!window.confirm("Are you sure you want to cancel this booking?"))
        return;
      try {
        const response = await axios.patch(
          `${API_BASE}/api/bookings/${bookingId}/status`,
          { status: "cancelled" },
          { headers: authHeaders() }
        );

        const updated = normalizeBooking(
          response.data ||
            response.data?.data || { _id: bookingId, status: "cancelled" }
        );
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? updated : b))
        );
        if (selectedBooking?.id === bookingId) setSelectedBooking(updated);
      } catch (err) {
        alert(
          err.response?.data?.message ||
            err.message ||
            "Failed to cancel booking"
        );
      }
    },
    [selectedBooking]
  );

  const saveBookingDetails = useCallback(async (bookingId, form) => {
    const response = await axios.patch(
      `${API_BASE}/api/bookings/${bookingId}/details`,
      form,
      { headers: authHeaders() }
    );
    const updated = normalizeBooking(response.data);
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    setSelectedBooking((prev) =>
      prev && prev.id === bookingId ? updated : prev
    );
  }, []);

  // Starts Stripe checkout for a booking the admin has already approved.
  // The backend re-checks status==='approved' and paymentStatus!=='paid'
  // itself, so this is UX-only gating, not the real enforcement.
  const payForBooking = useCallback(async (bookingId) => {
    setPayingId(bookingId);
    try {
      const res = await axios.post(
        `${API_BASE}/api/payments/create-checkout-session/${bookingId}`,
        {},
        { headers: authHeaders() }
      );
      if (res?.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      alert("Could not start payment — no checkout URL returned.");
    } catch (err) {
      alert(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to start payment"
      );
    } finally {
      setPayingId(null);
    }
  }, []);

  const filteredBookings = useMemo(
    () =>
      filter === "all" ? bookings : bookings.filter((b) => b.status === filter),
    [bookings, filter]
  );

  const filterButtons = [
    { key: "all", label: "All Bookings", icon: <FaFilter /> },
    { key: "pending", label: "Awaiting Review", icon: <FaHourglassHalf /> },
    { key: "approved", label: "Approved", icon: <FaCheckCircle /> },
    { key: "upcoming", label: "Upcoming", icon: <FaClock /> },
    { key: "completed", label: "Completed", icon: <FaCheckCircle /> },
    { key: "cancelled", label: "Cancelled", icon: <FaTimes /> },
  ];

  const openDetails = (b) => {
    setSelectedBooking(b);
    setShowModal(true);
  };
  const closeModal = () => {
    setSelectedBooking(null);
    setShowModal(false);
  };

  const openEdit = (b) => {
    setEditingBooking(b);
    setShowEditModal(true);
  };
  const closeEdit = () => {
    setEditingBooking(null);
    setShowEditModal(false);
  };

  return (
    <div className={s.pageContainer}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className={s.title}>My Bookings</h1>
          <p className={s.subtitle}>
            View and manage all your current and past car rental bookings
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {filterButtons.map((btn) => (
            <FilterButton
              key={btn.key}
              filterKey={btn.key}
              currentFilter={filter}
              icon={btn.icon}
              label={btn.label}
              onClick={setFilter}
            />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className={s.loadingSpinner} />
          </div>
        )}

        {!loading && error && (
          <div className={s.errorContainer}>
            <p className={s.errorText}>{error}</p>
            <button
              type="button"
              onClick={fetchBookings}
              className={s.retryButton}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredBookings.length === 0 && (
          <div className={s.emptyState}>
            <div className={s.emptyIconContainer}>
              <FaCar className={s.emptyIcon} />
            </div>
            <h3 className={s.emptyTitle}>No bookings found</h3>
            <p className={s.emptyText}>
              {filter === "all"
                ? "You haven't made any bookings yet. Browse our collection to get started!"
                : `You don't have any ${filter} bookings.`}
            </p>
            <Link to="/cars" className={s.browseButton}>
              <FaCar /> Browse Cars
            </Link>
          </div>
        )}

        {!loading && !error && filteredBookings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onViewDetails={openDetails}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            value={bookings.length}
            label="Total Bookings"
            color="text-orange-400"
          />
          <StatsCard
            value={bookings.filter((b) => b.paymentStatus === "paid").length}
            label="Paid Bookings"
            color="text-green-400"
          />
          <StatsCard
            value={bookings.filter((b) => b.status === "approved").length}
            label="Awaiting Payment"
            color="text-blue-400"
          />
        </div>
      </div>

      {showModal && selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={closeModal}
          onCancel={cancelBooking}
          onPay={payForBooking}
          paying={payingId === selectedBooking.id}
        />
      )}

      {showEditModal && editingBooking && (
        <EditDetailsModal
          booking={editingBooking}
          onClose={closeEdit}
          onSave={saveBookingDetails}
        />
      )}
    </div>
  );
};

export default MyBookings;