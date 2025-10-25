import React, { useState } from "react";

interface AuthFormProps {
  onSubmit: (email: string, password: string) => void;
  buttonLabel: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSubmit, buttonLabel }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(email, password);
      }}
      style={{ maxWidth: 320, margin: "0 auto" }}
    >
      <input
        type="email"
        placeholder="Email"
        value={email}
        required
        onChange={e => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        required
        onChange={e => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      />
      <button type="submit" style={{ width: "100%" }}>{buttonLabel}</button>
    </form>
  );
};