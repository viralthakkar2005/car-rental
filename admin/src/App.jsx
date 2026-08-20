
import { Route, Routes } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import AddCar from './components/AddCar'
import ManageCar from './components/ManageCar'
import Booking from './components/Booking'

function App() {

  return (
    <>
     <Navbar/>

     <Routes>
        <Route path='/' element={<AddCar/>} />
        <Route path='/manage-cars' element={<ManageCar/>} />
        <Route path='/bookings' element={<Booking/>} />
     </Routes>
    </>
  )
}

export default App
