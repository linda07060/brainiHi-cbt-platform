import Link from "next/link";
import React from "react";

export default function Navbar() {
  return (
    <nav className="w-full bg-gray-200 p-4 flex justify-between">
      <div className="font-bold">CBT Platform</div>
      <div>
        <Link href="/dashboard" className="mx-2">Dashboard</Link>
        <Link href="/login" className="mx-2">Login</Link>
      </div>
    </nav>
  );
}