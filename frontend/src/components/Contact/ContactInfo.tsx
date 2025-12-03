import React from "react";
import styles from "../../styles/ContactInfo.module.css";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LocationOnIcon from "@mui/icons-material/LocationOn";

export default function ContactInfo(): JSX.Element {
  const address = "Astana, Kazakhstan";
  const email = "support@brainihi.com";

  return (
    <section className={styles.infoSection} aria-labelledby="contact-info-heading">
      <div className={styles.container}>
        <h2 id="contact-info-heading" className={styles.visuallyHidden}>
          Contact information
        </h2>

        <ul className={styles.grid} role="list" aria-label="Contact methods">
          <li className={styles.item}>
            <a
              href={`mailto:${email}`}
              className={styles.link}
              aria-label={`Email support at ${email}`}
            >
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
            <div
              className={styles.linkStatic}
              aria-label={`Address: ${address}`}
              role="group"
            >
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