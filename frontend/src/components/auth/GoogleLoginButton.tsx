import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";

export default function GoogleLoginButton() {
  const navigate = useNavigate();

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        try {
          if (!credentialResponse.credential) {
            alert("No credential returned from Google");
            return;
          }
          const data = await authAPI.googleLogin(credentialResponse.credential);
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          navigate("/dashboard");
        } catch (err: any) {
          alert(err.message || "Google Login Failed");
        }
      }}
      onError={() => alert("Google Login Failed")}
    />
  );
}