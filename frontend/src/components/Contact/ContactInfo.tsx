import React from "react";
import styles from "../../styles/ContactInfo.module.css";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LocationOnIcon from "@mui/icons-material/LocationOn";

/**
 * ContactInfo: simplified visual contact cards.
 * - Phone entry removed per request.
 * - Address is a non-clickable card (no external link).
 * - Email remains a mailto: link and will not break onto multiple lines in production.
 */

export default function ContactInfo(): JSX.Element {
  return (
    <section className={styles.infoSection} aria-labelledby="contact-info-heading">
      <div className={styles.container}>
        <h2 id="contact-info-heading" className={styles.visuallyHidden}>
          Contact information
        </h2>

        <ul className={styles.grid} role="list" aria-label="Contact methods">
          <li className={styles.item}>
            <a href="mailto:support@brainihi.com" className={styles.link} aria-label="Email support at support@brainihi.com">
              <span className={styles.iconWrap} aria-hidden="true">
                <MailOutlineIcon className={styles.icon} />
              </span>

              <div className={styles.text}>
                <div className={styles.heading}>Email</div>
                {/* Use a dedicated no-wrap class for email to avoid mid-word wrapping in production */}
                <div className={`${styles.value} ${styles.noWrap}`}>support@brainihi.com</div>
              </div>
            </a>
          </li>

          {/* Phone entry intentionally removed */}

          <li className={styles.item}>
            {/* Address is not a link per request */}
            <div className={styles.link} role="group" aria-label="Company address">
              <span className={styles.iconWrap} aria-hidden="true">
                <LocationOnIcon className={styles.icon} />
              </span>

              <div className={styles.text}>
                <div className={styles.heading}>Address</div>
                <div className={styles.value}>
                  Imanbaeva Street 2
                  <br />
                  Astana, Kazakhstan
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}