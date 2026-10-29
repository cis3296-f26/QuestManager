import { supabase } from "./supabaseClient.js";
import { setUserFromSession } from "./userSession.js";

export function initLogin() {
  const loginView = document.getElementById("loginView");
  const form = document.getElementById("login-form");
  const title = document.getElementById("auth-title");
  const playerGroup = document.getElementById("playerNameGroup");
  const playerInput = document.getElementById("login-player");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const button = document.getElementById("login-button");
  const toggle = document.getElementById("auth-toggle");
  const status = document.getElementById("login-status");
  const accountView = document.getElementById("accountView");
  const accountName = document.getElementById("account-name");
  const signOutButton = document.getElementById("signout-button");

  let mode = "login";

  function setMode(newMode) {
    mode = newMode;
    const signingUp = mode === "signup";

    title.textContent = signingUp ? "Create Account" : "Log In";
    button.textContent = signingUp ? "Create Account" : "Log In";
    toggle.textContent = signingUp
      ? "Have an account? Log in"
      : "Need an account? Create one";

    playerGroup.hidden = !signingUp;
    playerInput.required = signingUp;
    passwordInput.autocomplete = signingUp ? "new-password" : "current-password";
    status.textContent = "";
  }

  toggle.addEventListener("click", () => {
    setMode(mode === "login" ? "signup" : "login");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    button.disabled = true;
    status.textContent = mode === "signup" ? "Creating account..." : "Logging in...";

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
             emailRedirectTo: window.location.origin + window.location.pathname,
             data: { player_name: playerInput.value.trim() } }
        });

        if (error) {
          status.textContent = error.message;
          return;
        }

        if (!data.session) {
          setMode("login");
          status.textContent = "Huzzah! Account created. Check your email to confirm.";
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          status.textContent = "Bummer, unable to login.";
          return;
        }
      }

      passwordInput.value = "";
    } catch (error) {
      status.textContent = "Could not login.";
      console.error("Auth request failed:", error);
    } finally {
      button.disabled = false;
    }
  });


  signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out failed:", error);
  }

  signOutButton.disabled = false;
  });


  supabase.auth.onAuthStateChange((_event, session) => {

  // Update the shared User when a session is restored, signed in, or signed out.
  setUserFromSession(session);
  
  loginView.hidden = Boolean(session);
  accountView.hidden = !session;

  if (session) {
    accountName.textContent =
      session.user.user_metadata?.player_name || session.user.email;
  } else {
    status.textContent = "";
  }
  });
}
