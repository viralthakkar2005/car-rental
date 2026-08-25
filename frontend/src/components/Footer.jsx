
import React from "react";
import { footerStyles as styles } from "../assets/dummyStyles";
import { Link } from "react-router-dom";
import logo from "../assets/logocar.png";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaYoutube, FaPhone, FaMapMarkedAlt, FaEnvelope } from "react-icons/fa";
import { GiCarKey } from "react-icons/gi";

const Footer = () => {
  return (
    <footer className={styles.container}>
      <div className={styles.topElements}>
        <div className={styles.circle1} />
        <div className={styles.circle2} />
        <div className={styles.roadLine} />
      </div>

      <div className={styles.innerContainer}>
        <div className={styles.grid}>
          <div className={styles.brandSection}>
            <Link to="/" className="flex items-center">
              <div className={styles.logoContainer}>
                <img
                  src={logo}
                  alt="logo"
                  className="h-[1em] w-auto block"
                  style={{
                    display: "block",
                    objectFit: "contain",
                  }}
                />
                <span className={styles.logoText}>KARZON</span>
              </div>
            </Link>

            <p className={styles.description}>
              Premium car rental service with the latest model and exceptional customer services. Drive your dream car Today!
            </p>


            <div className={styles.socialIcons}>
              {[
                FaFacebookF,
                FaTwitter,
                FaInstagram,
                FaLinkedinIn,
                FaYoutube,
              ].map((Icon, i) => (
                <a href="#" key={i} className={styles.socialIcon}>
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 className={styles.sectionTitle}>
              Quick Links
              <span className={styles.underline} />
            </h3>
            <ul className={styles.linkList}>
              {['Home', 'Cars', 'Contact Us'].map((link, i) => (
                <li key={i}>
                  <Link
                    to={link === 'Home'
                      ? '/'
                      : link === 'Contact Us'
                        ? '/contact'
                        : '/cars'} className={styles.linkItem}>
                    <span className={styles.bullet}></span>
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h3 className={styles.sectionTitle}>
              Contact Us
              <span className={styles.underline} />
            </h3>

            <ul className={styles.contactList}>
              <li className={styles.contactItem}>
                <FaMapMarkedAlt className={styles.contactIcon} />
                <span>123 Drive Avenue, Auto City, CA 90201</span>
              </li>

              <li className={styles.contactItem}>
                <FaPhone className={styles.contactIcon} />
                <span>+91 8299431275</span>
              </li>

              <li className={styles.contactItem}>
                <FaEnvelope className={styles.contactIcon} />
                <span>viralthakkar232@gmail.com</span>
              </li>
            </ul>

            <div className={styles.hoursContainer}>
              <h4 className={styles.hoursTitle}>Business Hours</h4>
              <div className={styles.hoursText}>
                <p>Monday - Friday: 8:00 AM - 8:00 PM</p>
                <p>Saturday: 9:00 AM - 6:00 PM</p>
                <p>Sunday: 10:00 AM - 4:00 PM</p>
              </div>
            </div>
          </div>

          {/* NEWSLETTER */}
          <div>
            <h3 className={styles.sectionTitle}>
              Newsletter
              <span className={styles.underline}></span>
            </h3>
            <p className={styles.newsletterText}>
              subscribe for special offer and updates
            </p>

            <form className=" space-y-3">
              <input
                type="email"
                placeholder="Your Email Address"
                className={styles.input}
              />

              <button type="submit" className={styles.subscribeButton}>
                <GiCarKey className=" mr-2 text-lg sm:text-xl" />
                Subscribe Now
              </button>
            </form>
          </div>
        </div>

              {/* Bottom Copyright */}
        <div className={styles.copyright}>
          <p>&copy; {new Date().getFullYear()} KARZONE. All rights reserved.</p>
          <p className="mt-3 md:mt-0">
            Designed by{" "}
            <a
              href="https://hexagondigitalservices.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.designerLink}
            >
              viral thakakr
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;