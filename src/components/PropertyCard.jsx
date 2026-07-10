export default function PropertyCard({ title, location, price, bedrooms, imageUrl }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "12px", width: "260px" }}>
      <img src={imageUrl} alt={title} style={{ width: "100%", borderRadius: "6px" }} />
      <h3>{title}</h3>
      <p>{location}</p>
      <p>{bedrooms} bedroom(s)</p>
      <p><strong>₦{price.toLocaleString()}/year</strong></p>
    </div>
  );
}