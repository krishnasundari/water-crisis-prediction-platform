import { GoogleLogin } from "@react-oauth/google";

export default function GoogleLoginButton() {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        try {
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

          console.log(data);

          if (response.ok) {
            alert("Google Token Verified Successfully!");
          } else {
            alert(data.detail || "Google Login Failed");
          }
        } catch (err) {
          console.error(err);
          alert("Server Error");
        }
      }}
      onError={() => {
        alert("Google Login Failed");
      }}
    />
  );
}