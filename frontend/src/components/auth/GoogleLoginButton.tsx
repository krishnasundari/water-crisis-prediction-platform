import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

export default function GoogleLoginButton() {
  const navigate = useNavigate();

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        const response = await fetch(
          "https://water-crisis-prediction-platform-1.onrender.com/api/v1/auth/google",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              credential: credentialResponse.credential,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          alert(data.detail);
          return;
        }

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);

        navigate("/dashboard");
      }}
      onError={() => alert("Google Login Failed")}
    />
  );
}