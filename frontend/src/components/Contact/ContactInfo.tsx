import React from "react";
import styles from "../../styles/ContactInfo.module.css";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";

export default function ContactInfo(): JSX.Element {
  return (
    <section className={styles.infoSection} aria-labelledby="contact-info-heading">
      <div className={styles.container}>
        <h2 id="contact-info-heading" className={styles.visuallyHidden}>
          Contact information
        </h2>

        <ul className={styles.grid} role="list" aria-label="Contact methods">
          <li className={styles.item}>
            <a href="mailto:support@brainihi.com" className={styles.link}>
              <span className={styles.iconWrap} aria-hidden="true">
                <MailOutlineIcon className={styles.icon} />
              </span>

              <div className={styles.text}>
                <div className={styles.heading}>Email</div>
                <div className={styles.value}>support@brainihi.com</div>
              </div>
            </a>
          </li>

          <li className={styles.item}>
            <a href="tel:+77769222999" className={styles.link}>
              <span className={styles.iconWrap} aria-hidden="true">
                <PhoneIcon className={styles.icon} />
              </span>

              <div className={styles.text}>
                <div className={styles.heading}>Phone</div>
                <div className={styles.value}>+77769222999</div>
              </div>
            </a>
          </li>

          <li className={styles.item}>
            <a
              href="https://www.google.com/maps/search/?api=1&query=123+Innovation+Drive+Palo+Alto+CA"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              <span className={styles.iconWrap} aria-hidden="true">
                <LocationOnIcon className={styles.icon} />
              </span>

              <div className={styles.text}>
                <div className={styles.heading}>Address</div>
                <div className={styles.value}>
                  123 Innovation Drive
                  <br />
                  Palo Alto, CA, USA
                </div>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}