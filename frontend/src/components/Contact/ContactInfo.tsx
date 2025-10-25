import styles from "../../styles/ContactInfo.module.css";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";

export default function ContactInfo() {
  return (
    <section className={styles.infoSection}>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <MailOutlineIcon className={styles.icon} />
          <h3 className={styles.infoHeading}>Email</h3>
          <p className={styles.infoValue}>support@brainihi.com</p>
        </div>
        <div className={styles.infoItem}>
          <PhoneIcon className={styles.icon} />
          <h3 className={styles.infoHeading}>Phone</h3>
          <p className={styles.infoValue}>+1 (555) 123-4567</p>
        </div>
        <div className={styles.infoItem}>
          <LocationOnIcon className={styles.icon} />
          <h3 className={styles.infoHeading}>Address</h3>
          <p className={styles.infoValue}>123 Innovation Drive, Palo Alto, CA, USA</p>
        </div>
      </div>
    </section>
  );
}