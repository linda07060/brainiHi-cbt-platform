import React from "react";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import styles from "../../styles/ContactInfo.module.css";

/**
 * Minimal, responsive ContactInfo component.
 * - Shows Email and Address.
 * - Accessible (aria labels, semantic list).
 * - Email is non-breaking on normal viewports; wraps on very small screens.
 */
export default function ContactInfo(): JSX.Element {
  const email = "support@brainihi.com";
  const address = "Astana, Kazakhstan";

  return (
    <section className={styles.infoSection} aria-labelledby="contact-info-heading">
      <div className={styles.container}>
        <h2 id="contact-info-heading" className={styles.visuallyHidden}>
          Contact information
        </h2>

        <ul className={styles.grid} role="list" aria-label="Contact methods">
          <li className={styles.item}>
            <a href={`mailto:${email}`} className={styles.card} aria-label={`Email ${email}`}>
              <span className={styles.iconWrap} aria-hidden="true">
                <MailOutlineIcon className={styles.icon} />
              </span>

              <div className={styles.text}>
                <div className={styles.heading}>Email</div>
                <div className={styles.value}>
                  <span className={styles.noBreak}>{email}</span>
                </div>
              </div>
            </a>
          </li>

          <li className={styles.item}>
            <div className={styles.cardStatic} role="group" aria-label={`Address: ${address}`}>
              <span className={styles.iconWrap} aria-hidden="true">
                <LocationOnIcon className={styles.icon} />
              </span>

              <div className={styles.text}>
                <div className={styles.heading}>Address</div>
                <div className={styles.value}>{address}</div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}