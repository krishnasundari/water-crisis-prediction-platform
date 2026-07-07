import { useState } from "react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PasswordInput({
  value,
  onChange,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ position: "relative", marginBottom: "20px" }}>
      <input
        type={showPassword ? "text" : "password"}
        placeholder="Password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 45px 12px 12px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          fontSize: "15px",
          boxSizing: "border-box",
        }}
      />

      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "18px",
        }}
      >
        {showPassword ? "🙈" : "👁️"}
      </button>
    </div>
  );
}