import React, { useState } from 'react';
import axios from 'axios';

const ProfilePage = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleChangeOld = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOldPassword(e.target.value);
  };

  const handleChangeNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`,
        {
          oldPassword,
          newPassword,
        }
      );
      setMsg(response.data.message || 'Password changed successfully!');
    } catch (error: any) {
      setMsg(
        error.response?.data?.message ||
          'An error occurred while changing the password.'
      );
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Change Password</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Old Password:</label>
          <input
            type="password"
            value={oldPassword}
            onChange={handleChangeOld}
            required
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={handleChangeNew}
            required
          />
        </div>
        <button type="submit" style={{ marginTop: '1rem' }}>
          Change Password
        </button>
      </form>
      {msg && <p style={{ marginTop: '1rem' }}>{msg}</p>}
    </div>
  );
};

export default ProfilePage;