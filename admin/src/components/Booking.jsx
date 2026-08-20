import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { BookingPageStyles, statusConfig } from '../assets/dummyStyles'
import {
  FaChevronDown,
  FaEdit,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaCreditCard,
  FaMapMarkerAlt,
  FaCity,
  FaGlobeAsia,
  FaMapPin,
  FaCar,
  FaUserFriends,
  FaGasPump,
  FaTachometerAlt,
  FaCheckCircle,
  FaSearch,
  FaFilter,
  FaSync,
} from 'react-icons/fa'

const baseURL = "http://localhost:5000";
const api = axios.create({ baseURL, headers: { Accept: 'application/json' } });

// Utility functions
const formatDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d)
    ? ""
    : `${d.getDate()}`.padStart(2, "0") +
        "/" +
        `${d.getMonth() + 1}`.padStart(2, "0") +
        "/" +
        d.getFullYear();
};

const makeImageUrl = (filename) =>
  filename ? `${baseURL}/uploads/${filename}` : "";

const normalizeDetails = (d = {}, car = {}) => ({
  seats: d.seats ?? d.numSeats ?? car.seats ?? "",
  fuel: String(d.fuelType ?? d.fuel ?? car.fuelType ?? car.fuel ?? ""),
  mileage: d.mileage ?? d.miles ?? car.mileage ?? car.miles ?? "",
  transmission: String(d.transmission ?? car.transmission ?? d.trans ?? ""),
});

const extractCarInfo = (b) => {
  const snap =
    b.carSnapshot &&
    typeof b.carSnapshot === "object" &&
    Object.keys(b.carSnapshot).length
      ? b.carSnapshot
      : null;
  const car = snap || (b.car && typeof b.car === "object" ? b.car : null);

  if (car)
    return {
      title:
        `${car.make || ""} ${car.model || ""}`.trim() ||
        car.make ||
        car.model ||
        "",
      make: car.make || "",
      model: car.model || "",
      year: car.year ?? "",
      dailyRate: car.dailyRate ?? 0,
      seats: car.seats ?? "",
      transmission: car.transmission ?? "",
      fuel: car.fuelType ?? car.fuel ?? "",
      mileage: car.mileage ?? "",
      image: car.image || b.carImage || b.image || "",
    };

  return typeof b.car === "string"
    ? { title: b.car, image: b.carImage || b.image || "" }
    : {
        title: b.carName || b.vehicle || "",
        image: b.carImage || b.image || "",
      };
};

const Panel = ({ title, icon, children }) => (
  <div className={BookingPageStyles.panel}>
    <h3 className={BookingPageStyles.panelTitle}>
      {icon}
      <span className={BookingPageStyles.panelIcon}>{title}</span>
    </h3>
    <div className='space-y-3'>{children}</div>
  </div>
);

const Detail = ({ icon, label, value }) => (
  <div className={BookingPageStyles.detailContainer}>
    <div className={BookingPageStyles.detailIcon}>{icon}</div>
    <div className='flex-1'>
      <div className={BookingPageStyles.detailLabel}>{label}</div>
      <div className={BookingPageStyles.detailValue}>{value ?? ""}</div>
    </div>
  </div>
);

const Spec = ({ icon, label, value }) => (
  <div className={BookingPageStyles.specContainer}>
    <div className={BookingPageStyles.specIcon}>{icon}</div>
    <p className={BookingPageStyles.specLabel}>{label}</p>
    <p className={BookingPageStyles.specValue}>{value ?? ""}</p>
  </div>
);

const StatusIndicator = ({ status, isEditing, newStatus, onStatusChange }) => {
  return isEditing ? (
    <select
      value={newStatus}
      onChange={onStatusChange}
      className=" bg-gray-800/50 text-sm px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
    >
      {Object.keys(statusConfig)
        .filter((k) => k !== 'default')
        .map((opt) => (
          <option value={opt} key={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
    </select>
  ) : (
    <span className={BookingPageStyles.statusIndicator(status)}>
      <div className={BookingPageStyles.statusIcon(status)} />
      {String(status || 'unknown')
        .charAt(0)
        .toUpperCase() + String(status || 'unknown').slice(1)}
    </span>
  );
};

const BookingCardHeader = ({ booking }) => (
  <div className="flex items-center mb-3 md:mb-0">
    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mr-3">
      <FaCar className="text-orange-400" />
    </div>
    <div>
      <div className="text-white font-medium">{booking.customer || "Unknown Customer"}</div>
      <div className="text-sm text-gray-400">{booking.car || ""}</div>
    </div>
  </div>
);

const BookingCardInfo = ({ booking, isEditing, newStatus, onStatusChange }) => (
  <div className={BookingPageStyles.bookingInfoGrid}>
    <div className="text-center">
      <div className={BookingPageStyles.bookingInfoLabel}>Car</div>
      <div className={BookingPageStyles.bookingInfoValue}>
        {booking.car || ""}
      </div>
    </div>
    <div className="text-center">
      <div className={BookingPageStyles.bookingInfoLabel}>Pickup</div>
      <div className={BookingPageStyles.bookingInfoValue}>
        {formatDate(booking.pickupDate)}
      </div>
    </div>
    <div className="text-center">
      <div className={BookingPageStyles.bookingInfoLabel}>Amount</div>
      <div className={BookingPageStyles.bookingAmount}>${booking.amount}</div>
    </div>
    <div className="text-center">
      <div className={BookingPageStyles.bookingInfoLabel}>Status</div>
      <StatusIndicator
        status={booking.status}
        isEditing={isEditing}
        newStatus={newStatus}
        onStatusChange={onStatusChange}
      />
    </div>
  </div>
);

const BookingCardActions = ({
  isEditing,
  onEditStatus,
  onSaveStatus,
  onCancelEdit,
  onToggleDetails,
  isExpanded
}) => (
  <div className={BookingPageStyles.bookingActions}>
    <div className=' items-center text-orange-400 hidden md:flex'>
      <FaChevronDown
        className={`transition-transform duration-300 ${
          isExpanded ? 'rotate-180' : ''
        }`}
      />
      <span className=' ml-2 text-sm'>
        {isExpanded ? 'Hide Details' : 'Show Details'}
      </span>
    </div>

    <div className=' flex space-x-3 ml-auto'>
      {isEditing ? (
        <>
          <button
            className={BookingPageStyles.bookingActionButton('green')}
            onClick={onSaveStatus}
          >
            Save
          </button>

          <button
            className={BookingPageStyles.bookingActionButton('gray')}
            onClick={onCancelEdit}
          >
            Cancel
          </button>
        </>
      ) : (
        <button onClick={onEditStatus} className={BookingPageStyles.bookingEditButton} title='Edit Status'>
          <FaEdit className=' inline mr-1'/> Edit
        </button>
      )}
    </div>
  </div>
);

const BookingCardDetails = ({ booking }) => (
  <div className={BookingPageStyles.bookingDetails}>
    <div className={BookingPageStyles.bookingDetailsGrid}>
      <Panel
        title="Customer Details"
        icon={<FaUser className={BookingPageStyles.panelIcon} />}
      >
        <Detail icon={<FaUser />} label="Full Name" value={booking.customer} />
        <Detail icon={<FaEnvelope />} label="Email" value={booking.email} />
        <Detail icon={<FaPhone />} label="Phone" value={booking.phone} />
      </Panel>

      <Panel
        title="Booking Details"
        icon={<FaCalendarAlt className={BookingPageStyles.panelIcon} />}
      >
        <Detail
          icon={<FaCalendarAlt />}
          label="Pickup Date"
          value={formatDate(booking.pickupDate)}
        />
        <Detail
          icon={<FaCalendarAlt />}
          label="Return Date"
          value={formatDate(booking.returnDate)}
        />
        <Detail
          icon={<FaCalendarAlt />}
          label="Booking Date"
          value={formatDate(booking.bookingDate)}
        />
        <Detail
          icon={<FaCreditCard />}
          label="Total Amount"
          value={`$${booking.amount}`}
        />
      </Panel>

      <Panel
        title="Address Details"
        icon={<FaMapMarkerAlt className={BookingPageStyles.panelIcon} />}
      >
        <Detail
          icon={<FaMapMarkerAlt />}
          label="Street"
          value={booking.address.street}
        />
        <Detail icon={<FaCity />} label="City" value={booking.address.city} />
        <Detail
          icon={<FaGlobeAsia />}
          label="State"
          value={booking.address.state}
        />
        <Detail
          icon={<FaMapPin />}
          label="ZIP Code"
          value={booking.address.zipCode}
        />
      </Panel>

      <Panel
        title="Car Details"
        icon={<FaCar className={BookingPageStyles.panelIcon} />}
      >
        <div className="flex items-center mb-4">
          <div className={BookingPageStyles.carImageContainer}>
            <img
              src={makeImageUrl(booking.carImage)}
              alt={booking.car || "car image"}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="ml-4">
            <div className={BookingPageStyles.bookingCustomer}>
              {booking.car || ""}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Spec
            icon={<FaUserFriends />}
            label="Seats"
            value={booking.details.seats}
          />
          <Spec
            icon={<FaGasPump />}
            label="Fuel"
            value={booking.details.fuel}
          />
          <Spec
            icon={<FaTachometerAlt />}
            label="Mileage"
            value={booking.details.mileage}
          />
          <Spec
            icon={<FaCheckCircle />}
            label="Transmission"
            value={booking.details.transmission}
          />
        </div>
      </Panel>
    </div>
  </div>
);

const BookingCard = ({
  booking,
  isExpanded,
  isEditing,
  newStatus,
  onToggleDetails,
  onEditStatus,
  onStatusChange,
  onSaveStatus,
  onCancelEdit,
}) => (
  <div className={BookingPageStyles.bookingCard}>
    <div className=" p-5 cursor-pointer" onClick={onToggleDetails}>
      <div className=" flex flex-col md:flex-row justify-between items-start md:items-center">
        <BookingCardHeader
          booking={booking}
          onToggleDetails={onToggleDetails}
          isExpanded={isExpanded}
        />

        <BookingCardInfo
          booking={booking}
          isEditing={isEditing}
          newStatus={newStatus}
          onStatusChange={onStatusChange}
        />
      </div>

      <BookingCardActions
        isEditing={isEditing}
        onEditStatus={onEditStatus}
        onSaveStatus={onSaveStatus}
        onCancelEdit={onCancelEdit}
        onToggleDetails={onToggleDetails}
        isExpanded={isExpanded}
      />
    </div>
    {isExpanded && <BookingCardDetails booking={booking} />}
  </div>
);

const SearchFilterBar = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  totalBookings,
}) => (
  <div className={BookingPageStyles.searchFilterContainer}>
    <div className={BookingPageStyles.searchFilterGrid}>
      <div>
        <label className={BookingPageStyles.filterLabel}>Search Bookings</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by customer, car, or email..."
            value={searchTerm}
            onChange={onSearchChange}
            className={BookingPageStyles.filterInput}
          />
          <div className={BookingPageStyles.filterIconContainer}>
            <FaSearch />
          </div>
        </div>
      </div>

      <div>
        <label className={BookingPageStyles.filterLabel}>
          Filter by Status
        </label>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={onStatusChange}
            className={BookingPageStyles.filterInput}
          >
            <option value="all">All Statuses</option>
            {Object.keys(statusConfig)
              .filter((k) => k !== "default")
              .map((opt) => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
          </select>
          <div className={BookingPageStyles.filterIconContainer}>
            <FaFilter />
          </div>
        </div>
      </div>

      <div className={BookingPageStyles.totalBookingsContainer}>
        <div className="text-center">
          <div className={BookingPageStyles.totalBookingsLabel}>
            Total Bookings
          </div>
          <div className={BookingPageStyles.totalBookingsValue}>
            {totalBookings}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const NoBookingsView = ({ onResetFilters }) => (
  <div className={BookingPageStyles.noBookingsContainer}>
    <div className={BookingPageStyles.noBookingsIconContainer}>
      <div className={BookingPageStyles.noBookingsIcon}>
        <FaSearch className={BookingPageStyles.noBookingsIconSvg} />
      </div>
    </div>
    <h3 className={BookingPageStyles.noBookingsTitle}>No Bookings Found</h3>
    <p className={BookingPageStyles.noBookingsText}>
      Try adjusting your search or filter criteria.
    </p>

    <button onClick={onResetFilters} className={BookingPageStyles.noBookingsButton}>
      <FaSync className=" mr-2" /> Reset Filter
    </button>
  </div>
);

const BackgroundGradient = () => (
  <div className={BookingPageStyles.fixedBackground}>
    <div className={BookingPageStyles.gradientBlob1}></div>
    <div className={BookingPageStyles.gradientBlob2}></div>
    <div className={BookingPageStyles.gradientBlob3}></div>
  </div>
);

const PageHeader = () => (
  <div className={BookingPageStyles.headerContainer}>
    <div className={BookingPageStyles.headerDivider}>
      <div className={BookingPageStyles.headerDividerLine}></div>
    </div>
    <h1 className={BookingPageStyles.title}>
      <span className={BookingPageStyles.titleGradient}>Booking Dashboard</span>
    </h1>
    <p className={BookingPageStyles.subtitle}>
      Manage all bookings with detailed information and status updates.
    </p>
  </div>
);

const Booking = () => {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get("/api/bookings?limit=200");
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.bookings || [];
      const mapped = raw.map((b, i) => {
        const id = b._id || b.id || `local-${i + 1}`;
        const carInfo = extractCarInfo(b);
        const details = normalizeDetails(b.details || {}, carInfo);
        return {
          id,
          _id: b._id || b.id || null,
          customer: b.customer || b.customerName || "",
          email: b.email || "",
          phone: b.phone || "",
          car: carInfo.title || "",
          carImage: carInfo.image || "",
          pickupDate: b.pickupDate || b.pickup || b.startDate || "",
          returnDate: b.returnDate || b.return || b.endDate || "",
          bookingDate: b.bookingDate || b.createdAt || "",
          status: (b.status || "pending").toString(),
          amount: b.amount ?? b.total ?? 0,
          details,
          address: {
            street:
              (b.address && (b.address.street || b.address.addressLine)) || "",
            city: (b.address && (b.address.city || "")) || "",
            state: (b.address && (b.address.state || "")) || "",
            zipCode:
              (b.address && (b.address.zipCode || b.address.postalCode)) || "",
          },
        };
      });
      setBookings(mapped);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      window.alert("Failed to load bookings from server.");
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    const stringForSearch = (v) =>
      v === null || v === undefined ? '' : String(v).toLowerCase();

    return bookings.filter((b) => {
      const matchesSearch =
        !q ||
        stringForSearch(b.customer).includes(q) ||
        stringForSearch(b.car).includes(q) ||
        stringForSearch(b.email).includes(q);
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  // UPDATE STATUS
  const updateStatus = async (id) => {
    try {
      const booking = bookings.find((b) => b.id === id || b._id === id);
      if (!booking || !booking._id) {
        setEditingStatus(null);
        setNewStatus("");
        return;
      }

      if (!newStatus) {
        window.alert("Please select a status before saving.");
        return;
      }
      await api.patch(`/api/bookings/${booking._id}/status`, {
        status: newStatus,
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status: newStatus,
              }
            : b
        )
      );
      setEditingStatus(null);
      setNewStatus('');
    } catch (err) {
      console.error('Failed to update status:', err);
      window.alert(
        err.response?.data?.message || 'Failed to update booking status '
      );
    }
  };

  const handleToggleDetails = (id) =>
    setExpandedBooking(expandedBooking === id ? null : id);
  const handleEditStatus = (id, currentStatus) => {
    setEditingStatus(id);
    setNewStatus(currentStatus);
  };
  const handleCancelEdit = () => {
    setEditingStatus(null);
    setNewStatus("");
  };
  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  return (
    <div className={BookingPageStyles.pageContainer}>
      <BackgroundGradient />
      <PageHeader />

      <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        statusFilter={statusFilter}
        onStatusChange={(e) => setStatusFilter(e.target.value)}
        totalBookings={bookings.length}
      />

      <div className=" space-y-4">
        {filteredBookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            isExpanded={expandedBooking === booking.id}
            isEditing={editingStatus === booking.id}
            newStatus={newStatus}
            onToggleDetails={() => handleToggleDetails(booking.id)}
            onEditStatus={(e) => {
              e.stopPropagation();
              handleEditStatus(booking.id, booking.status);
            }}
            onStatusChange={(e) => setNewStatus(e.target.value)}
            onSaveStatus={(e) => {
              e.stopPropagation();
              updateStatus(booking.id);
            }}
            onCancelEdit={(e) => {
              e.stopPropagation();
              handleCancelEdit();
            }}
          />
        ))}

        {filteredBookings.length === 0 && (
          <NoBookingsView onResetFilters={handleResetFilters} />
        )}
      </div>
    </div>
  );
};

export default Booking;