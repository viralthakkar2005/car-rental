import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import AddCar from './components/AddCar'
import ManageCar from './components/ManageCar'
import Booking from './components/Booking'
import AdminLogin from './components/AdminLogin'
import ProtectedRoute from './components/ProtectedRoute'

function App() {

  return (
    <>
     <Routes>
        <Route path='/login' element={<AdminLogin />} />

        <Route
          path='/'
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <AddCar />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path='/manage-cars'
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <ManageCar />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path='/bookings'
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Booking />
              </>
            </ProtectedRoute>
          }
        />

        <Route path='*' element={<Navigate to='/' replace />} />
     </Routes>
    </>
  )
}

export default App