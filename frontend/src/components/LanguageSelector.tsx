export default function LanguageSelector() {
  return (
    <select aria-label="Select language" style={{
      marginLeft: 16,
      padding: "4px 8px",
      borderRadius: 4,
      border: "1px solid #ccc",
      fontSize: 14,
      background: "#fff"
    }}>
      <option value="en">EN</option>
      <option value="fr">FR</option>
      <option value="es">ES</option>
    </select>
  );
}