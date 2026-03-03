function Button({ children, variant = "primary", type = "button" }) {
  return (
    <button
      type={type}
      className={`button ${variant}`}
    >
      {children}
    </button>
  );
}

export default Button;