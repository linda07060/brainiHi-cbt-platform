import React, {
  createContext,
  useState,
  ReactNode,
  useContext,
  Dispatch,
  SetStateAction,
  useEffect,
} from 'react';

type AuthUser = {
  token: string;
  email: string;
  name: string;
  role?: string;
  plan?: string;
  level?: string;
  plan_expiry?: string;
  // ...other fields as needed
};

type AuthContextType = {
  user: AuthUser | null;
  admin: any;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  setAdmin: Dispatch<SetStateAction<any>>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  admin: null,
  setUser: () => {},
  setAdmin: () => {},
  logout: () => {},
});

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [admin, setAdmin] = useState<any>(null);

  // Load user/admin from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('auth');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    const storedAdmin = localStorage.getItem('admin');
    if (storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
    }
  }, []);

  // Sync user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('auth', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth');
    }
  }, [user]);

  // Sync admin to localStorage
  useEffect(() => {
    if (admin) {
      localStorage.setItem('admin', JSON.stringify(admin));
    } else {
      localStorage.removeItem('admin');
    }
  }, [admin]);

  // Logout function
  const logout = () => {
    setUser(null);
    setAdmin(null);
    localStorage.removeItem('auth');
    localStorage.removeItem('admin');
  };

  return (
    <AuthContext.Provider value={{ user, admin, setUser, setAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;