interface GoogleLoginButtonProps {
  onClick?: () => void;
}

export default function GoogleLoginButton({
  onClick,
}: GoogleLoginButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px",
        marginTop: "15px",
        background: "#ffffff",
        color: "#333",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "15px",
        fontWeight: 500,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span style={{ fontSize: "18px" }}>🌐</span>
      Continue with Google
    </button>
  );
}