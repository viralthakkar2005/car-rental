import React from 'react'
import Navbar from './Navbar'
import HomeBanner from './HomeBanner'
import HomeCars from './HomeCars'
import Testimonial from './Testimonial'
import Footer from './Footer'

export default function Home() {
  return (
    <div>
      <Navbar/>
      <HomeBanner/>
      <HomeCars/>
      <Testimonial/>
      <Footer/>
    </div>
  )
}
